import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const UID_REGEX = /^[0-9]{3,20}$/;
const LBANK_UID_REGEX = /^[A-Za-z0-9_-]{1,64}$/;
const EXCHANGE_ID_REGEX = /^[a-zA-Z0-9_-]{1,50}$/; // Safe exchange ID format

// Input sanitization functions
function sanitizeString(input: string, maxLength: number = 100): string {
  if (typeof input !== "string") return "";
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>'"]/g, "");
}

function validateExchangeId(exchangeId: string): boolean {
  return EXCHANGE_ID_REGEX.test(exchangeId) && exchangeId.length <= 50;
}

// Simple in-memory rate limiter (per instance)
type RateLimitBucket = { tokens: number; last: number };
const RATE_LIMIT_BUCKETS = new Map<string, RateLimitBucket>();
const MAX_TOKENS = 30; // 30 operations per minute per IP
const REFILL_MS = 60_000; // 1 minute

// Cache for exchange existence checks (5 minute TTL)
type ExchangeCacheEntry = { exists: boolean; timestamp: number };
const EXCHANGE_CACHE = new Map<string, ExchangeCacheEntry>();
const EXCHANGE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function checkRateLimit(req: NextRequest): boolean {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const now = Date.now();
  const bucket = RATE_LIMIT_BUCKETS.get(ip) || {
    tokens: MAX_TOKENS,
    last: now,
  };

  // Refill tokens based on time elapsed
  const elapsed = now - bucket.last;
  if (elapsed > 0) {
    const refill = Math.floor((elapsed / REFILL_MS) * MAX_TOKENS);
    bucket.tokens = Math.min(MAX_TOKENS, bucket.tokens + refill);
    bucket.last = now;
  }

  if (bucket.tokens <= 0) return false;

  bucket.tokens -= 1;
  RATE_LIMIT_BUCKETS.set(ip, bucket);
  return true;
}

async function requireSessionUserId() {
  const supabase = await createClient();
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user?.id) throw new Error("unauthorized");
  return { supabase, userId: userData.user.id } as const;
}

// Cleanup functions to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  // Clean up old rate limit entries
  for (const [ip, bucket] of RATE_LIMIT_BUCKETS.entries()) {
    if (now - bucket.last > 10 * 60 * 1000) {
      // 10 minutes
      RATE_LIMIT_BUCKETS.delete(ip);
    }
  }
  // Clean up old exchange cache entries
  for (const [exchangeId, entry] of EXCHANGE_CACHE.entries()) {
    if (now - entry.timestamp > EXCHANGE_CACHE_TTL) {
      EXCHANGE_CACHE.delete(exchangeId);
    }
  }
}, 5 * 60 * 1000); // Clean every 5 minutes

export async function GET() {
  try {
    const { supabase, userId } = await requireSessionUserId();

    const { data, error } = await supabase
      .from("user_broker_uids")
      .select(
        "id, exchange_id, uid, is_active, created_at, updated_at, accumulated_24h_payback, last_24h_value, last_24h_fetch_date, withdrawn_amount, withdrawable_balance"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ uids: data || [] });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "unknown";
    const status = message === "unauthorized" ? 401 : 500;
    return NextResponse.json({ error: "Failed to load UIDs" }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Check rate limit for write operations
    if (!checkRateLimit(req)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Check request size limit (1MB)
    const contentLength = parseInt(req.headers.get("content-length") || "0");
    if (contentLength > 1024 * 1024) {
      return NextResponse.json({ error: "Request too large" }, { status: 413 });
    }

    const body = await req.json();
    const { uid, exchange_id } = body || {};
    let { is_active } = body || {};

    // Input validation and sanitization
    if (!uid || !exchange_id) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Sanitize and validate UID
    const sanitizedExchangeId = sanitizeString(String(exchange_id), 50);
    const isLbank = sanitizedExchangeId === "lbank";
    const sanitizedUid = sanitizeString(String(uid), isLbank ? 64 : 20);
    if (
      !(isLbank
        ? LBANK_UID_REGEX.test(sanitizedUid)
        : UID_REGEX.test(sanitizedUid))
    ) {
      return NextResponse.json(
        { error: "Invalid UID format for selected broker" },
        { status: 400 }
      );
    }

    // Sanitize and validate exchange_id
    // (already sanitized above)
    if (!validateExchangeId(sanitizedExchangeId)) {
      return NextResponse.json(
        { error: "Invalid exchange ID" },
        { status: 400 }
      );
    }

    // Validate is_active
    if (typeof is_active !== "boolean") {
      is_active = !!is_active;
    }

    const { supabase, userId } = await requireSessionUserId();

    // Check if this is the first UID for this exchange
    const { data: existingUids, error: checkError } = await supabase
      .from("user_broker_uids")
      .select("id")
      .eq("user_id", userId)
      .eq("exchange_id", sanitizedExchangeId);

    if (checkError) {
      console.error("Failed to check existing UIDs:", checkError);
      return NextResponse.json(
        { error: "Failed to create UID" },
        { status: 500 }
      );
    }

    // Auto-activate if this is the first UID for this exchange
    const shouldActivate = existingUids.length === 0;

    const insertData: {
      user_id: string;
      uid: string;
      exchange_id: string;
      is_active: boolean;
      updated_by: string;
      accumulated_24h_payback?: number;
      last_24h_value?: number;
      last_24h_fetch_date?: string;
      initial_90d_60d_fetched_date?: string;
    } = {
      user_id: userId,
      uid: sanitizedUid,
      exchange_id: sanitizedExchangeId,
      is_active: shouldActivate || !!is_active,
      updated_by: userId,
    };

    const today = new Date().toISOString().split("T")[0];

    try {
      const { fetch90d60dRebateFromBroker } = await import(
        "@/lib/utils/fetch-90d-60d-rebate"
      );

      const initResult = await fetch90d60dRebateFromBroker(
        sanitizedExchangeId as "deepcoin" | "orangex" | "lbank" | "bingx",
        sanitizedUid
      );

      if (initResult.success) {
        const periodLabel = sanitizedExchangeId === "deepcoin" ? "60d" : "90d";
        insertData.accumulated_24h_payback = initResult.rebate90d60d || 0;
        insertData.initial_90d_60d_fetched_date = today;
        console.log(
          `[UID Registration] Initial ${periodLabel} rebate for ${sanitizedExchangeId} UID ${sanitizedUid}: $${initResult.rebate90d60d}`
        );
      } else {
        insertData.accumulated_24h_payback = 0;
        insertData.initial_90d_60d_fetched_date = today;
        if (initResult.error) {
          console.warn(
            `[UID Registration] Failed to fetch initial 90d/60d rebate for ${sanitizedExchangeId} UID ${sanitizedUid}:`,
            initResult.error
          );
        }
      }
    } catch (rebateError) {
      console.error(
        `[UID Registration] Error fetching initial 90d/60d rebate:`,
        rebateError
      );
      insertData.accumulated_24h_payback = 0;
      insertData.initial_90d_60d_fetched_date = today;
    }

    const { data, error } = await supabase
      .from("user_broker_uids")
      .insert(insertData)
      .select("id, exchange_id, uid, is_active, created_at, updated_at")
      .single();
    if (error) throw error;
    return NextResponse.json({ uid: data });
  } catch (e: unknown) {
    // Log detailed error server-side for debugging
    console.error("POST /api/user-uids error:", e);
    const message = e instanceof Error ? e.message : "unknown";
    const status = message === "unauthorized" ? 401 : 500;
    return NextResponse.json({ error: "Failed to create UID" }, { status });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    // Check rate limit for write operations
    if (!checkRateLimit(req)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Check request size limit (1MB)
    const contentLength = parseInt(req.headers.get("content-length") || "0");
    if (contentLength > 1024 * 1024) {
      return NextResponse.json({ error: "Request too large" }, { status: 413 });
    }

    const body = await req.json();
    const { id } = body || {};
    const { uid, exchange_id, is_active } = body || {};

    if (!id)
      return NextResponse.json({ error: "id required" }, { status: 400 });

    const { supabase, userId } = await requireSessionUserId();

    // First verify the UID belongs to this user
    const { data: existingUid, error: checkError } = await supabase
      .from("user_broker_uids")
      .select("id, user_id")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (checkError || !existingUid) {
      return NextResponse.json(
        { error: "UID not found or access denied" },
        { status: 403 }
      );
    }

    const update: Partial<{
      uid: string;
      exchange_id: string;
      is_active: boolean;
      updated_by: string;
    }> = {};

    // Sanitize and validate UID if provided
    if (uid !== undefined) {
      const sanitizedUid = sanitizeString(String(uid), 20);
      if (!UID_REGEX.test(sanitizedUid)) {
        return NextResponse.json(
          { error: "Invalid UID format" },
          { status: 400 }
        );
      }
      update.uid = sanitizedUid;
    }

    // Sanitize and validate exchange_id if provided
    if (exchange_id !== undefined) {
      const sanitizedExchangeId = sanitizeString(String(exchange_id), 50);
      if (!validateExchangeId(sanitizedExchangeId)) {
        return NextResponse.json(
          { error: "Invalid exchange ID" },
          { status: 400 }
        );
      }
      update.exchange_id = sanitizedExchangeId;
    }

    if (is_active !== undefined) update.is_active = !!is_active;

    // Add audit trail
    update.updated_by = userId;

    const { data, error } = await supabase
      .from("user_broker_uids")
      .update(update)
      .eq("id", id)
      .select("id, exchange_id, uid, is_active, created_at, updated_at")
      .single();
    if (error) throw error;
    return NextResponse.json({ uid: data });
  } catch (e: unknown) {
    // Log detailed error server-side for debugging
    console.error("PATCH /api/user-uids error:", e);
    const message = e instanceof Error ? e.message : "unknown";
    const status = message === "unauthorized" ? 401 : 500;
    return NextResponse.json({ error: "Failed to update UID" }, { status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Check rate limit for write operations
    if (!checkRateLimit(req)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Check request size limit (1MB)
    const contentLength = parseInt(req.headers.get("content-length") || "0");
    if (contentLength > 1024 * 1024) {
      return NextResponse.json({ error: "Request too large" }, { status: 413 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id)
      return NextResponse.json({ error: "id required" }, { status: 400 });

    // Validate and sanitize ID
    const sanitizedId = sanitizeString(id, 50);
    if (!sanitizedId) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const { supabase, userId } = await requireSessionUserId();
    const { error } = await supabase
      .from("user_broker_uids")
      .delete()
      .eq("id", sanitizedId)
      .eq("user_id", userId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    // Log detailed error server-side for debugging
    console.error("DELETE /api/user-uids error:", e);
    const message = e instanceof Error ? e.message : "unknown";
    const status = message === "unauthorized" ? 401 : 500;
    return NextResponse.json({ error: "Failed to delete UID" }, { status });
  }
}
