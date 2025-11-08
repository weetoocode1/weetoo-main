import {
  BrokerAPI,
  CommissionData,
  ReferralData,
  UIDVerificationResult,
} from "@/lib/broker/broker-types";
import { signLbankHmacSha256 } from "@/lib/broker/lbank-signature";

// LBank API Response Types
interface LBankAPIResponse<T = unknown> {
  result: string;
  error_code: number;
  msg?: string;
  data?: T;
}

interface LBankUserInfo {
  inviteResult: boolean;
  openId?: string;
  userLevel?: number;
  createTime?: number;
  contractFeeAmt?: string;
  currencyFeeAmt?: string;
  [key: string]: unknown;
}

interface LBankCommissionItem {
  amount?: string;
  usdtAmount?: string;
  coinSymbol?: string;
  statsDate?: string;
  [key: string]: unknown;
}

const LBANK_BASE_URL =
  process.env.LBANK_AFFILIATE_BASE_URL || "https://affiliate.lbankverify.com";
const LBANK_API_KEY = process.env.LBANK_API_KEY || "";
const LBANK_API_SECRET = process.env.LBANK_API_SECRET || "";
const FIXIE_URL = process.env.FIXIE_URL || "";
// const LBANK_DEBUG = process.env.LBANK_DEBUG === "true";

// Lightweight cache for 90d totals to avoid recomputation on repeated calls
export const LBANK_90D_CACHE = new Map<string, { value: number; ts: number }>();
const LBANK_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function hasCreds(): boolean {
  return Boolean(LBANK_API_KEY && LBANK_API_SECRET);
}

async function doSignedGet<T = unknown>(
  path: string,
  params: Record<string, unknown>
): Promise<T> {
  const timestamp = Date.now();
  // LBank docs: alphanumeric echostr; use longer nonce for stricter checks (30-40 chars)
  const echostr = Array.from(crypto.getRandomValues(new Uint8Array(35)))
    .map((b) => (b % 36).toString(36))
    .join("");

  const baseParams: Record<
    string,
    string | number | boolean | null | undefined
  > = {
    api_key: LBANK_API_KEY,
    signature_method: "HmacSHA256",
    timestamp,
    echostr,
    ...params,
  };

  const { sign } = signLbankHmacSha256(baseParams, LBANK_API_SECRET, "hex");

  // Silent in production – no signature debug logs

  const finalParams = new URLSearchParams();
  for (const [k, v] of Object.entries(baseParams)) {
    if (v === undefined || v === null) continue;
    finalParams.append(k, String(v));
  }
  finalParams.append("sign", sign);

  const url = `${LBANK_BASE_URL}${path}?${finalParams.toString()}`;

  const fetchOptions: RequestInit = {
    method: "GET",
    headers: {
      Accept: "application/json, text/plain, */*",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
  };
  const isServerSide = typeof window === "undefined";
  if (isServerSide && FIXIE_URL) {
    try {
      const undici = await import("undici");
      // @ts-expect-error Node fetch proxy dispatcher
      fetchOptions.dispatcher = new undici.ProxyAgent(FIXIE_URL);
      // Quiet proxy info
    } catch (_error) {
      // Quiet proxy failures
    }
  }

  const res = await fetch(url, fetchOptions);
  if (!res.ok) {
    let body: string | null = null;
    try {
      body = await res.text();
    } catch {
      // Ignore text parsing errors
    }
    throw new Error(`LBank API HTTP ${res.status}${body ? ` - ${body}` : ""}`);
  }
  const data = (await res.json()) as LBankAPIResponse<T>;
  if (data?.result !== "true" && data?.error_code !== 0) {
    throw new Error(
      `LBank API error: ${data?.msg || data?.error_code || "unknown"}`
    );
  }
  return (data?.data ?? data) as T;
}

export default class LbankAPI implements BrokerAPI {
  isAPIActive(): boolean {
    // Basic creds check; deeper check is attempted below
    if (!hasCreds()) return false;
    return true;
  }

  async verifyUID(uid: string): Promise<UIDVerificationResult> {
    if (!hasCreds()) {
      return { verified: false, reason: "LBank affiliate API not configured" };
    }
    // LBank identifies users by openId; if you only have UID, treat uid as openId input
    try {
      const data = await doSignedGet<LBankUserInfo>(
        "/affiliate-api/v2/invite/user/info",
        {
          openId: uid,
        }
      );
      const inviteResult = Boolean(data?.inviteResult);
      return {
        verified: inviteResult,
        isReferral: inviteResult,
        data,
      };
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Verify failed";
      return { verified: false, reason: errorMessage };
    }
  }

  async getReferrals(): Promise<ReferralData[]> {
    if (!hasCreds()) return [];
    try {
      const now = Date.now();
      const startTime = now - 365 * 24 * 60 * 60 * 1000;
      const endTime = now;
      const pageSize = 100;
      let start = 0;
      const results: ReferralData[] = [];

      for (let page = 0; page < 200; page++) {
        const data = await doSignedGet(
          "/affiliate-api/v2/invite/user/team/list",
          {
            startTime,
            endTime,
            start,
            pageSize,
          }
        );

        const list = Array.isArray(data) ? data : [];
        for (const item of list) {
          results.push({
            uid: item?.openId,
            level: item?.userLevel,
            rebateRate: item?.contractFeeAmt ?? item?.currencyFeeAmt,
            createTime: item?.createTime,
            ...item,
          });
        }

        if (list.length < pageSize) break;
        start = start + pageSize;
      }

      return results;
    } catch (_e) {
      // Graceful fallback to avoid crashing UI when CF blocks
      return [];
    }
  }

  async getCommissionData(
    uid: string,
    sourceType?: string
  ): Promise<CommissionData[]> {
    if (!hasCreds()) return [];

    const tStart = Date.now();
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const thirtyDaysMs = 30 * oneDayMs;
    const ninetyDaysMs = 90 * oneDayMs;

    // Up to yesterday to respect T+1 settlement per docs
    const endTime = now - oneDayMs;
    const fastStartTime = endTime - thirtyDaysMs + 1;
    const fullStartTime = endTime - ninetyDaysMs + 1;

    // tradeType: 0 spot, 1 futures; "PERPETUAL" => 1 else 0
    const tradeType = sourceType === "PERPETUAL" ? 1 : 0;

    const fetchPaged = async (startTime: number, endTime: number) => {
      const pageSize = 100;
      let start = 0;
      const out: LBankCommissionItem[] = [];
      for (let page = 0; page < 50; page++) {
      const data = await doSignedGet<LBankCommissionItem[]>(
        "/affiliate-api/v2/commission/stats/symbol/list",
        {
          openId: uid,
          tradeType,
          startTime,
          endTime,
          coin: "",
            start,
            pageSize,
        }
      );
      const list = Array.isArray(data) ? data : [];
        out.push(...list);
        if (list.length < pageSize) break;
        start += pageSize;
        await new Promise((r) => setTimeout(r, 120));
      }
      return out;
    };

    try {
      // Fast path: only last 30 days synchronously
      const recent = await fetchPaged(fastStartTime, endTime);
      const recentMapped: CommissionData[] = recent.map((row) => ({
        uid,
        tradeAmount: row?.amount ?? "0",
        fee: row?.usdtAmount ?? row?.amount ?? "0",
        commission: row?.usdtAmount ?? "0",
        sourceType,
        coinSymbol: row?.coinSymbol,
        statsDate: row?.statsDate,
      }));

      // Compute immediate 24h/30d and log
      const toNum = (v: unknown) =>
        typeof v === "number" ? v : typeof v === "string" ? parseInt(v, 10) : 0;
      const sum = (rows: CommissionData[]) =>
        rows.reduce((s, r) => s + (parseFloat(r.commission as string) || 0), 0);

      const last24hStart = endTime - oneDayMs + 1;
      const rows24h = recentMapped.filter(
        (r) =>
          toNum(r.statsDate) >= last24hStart && toNum(r.statsDate) <= endTime
      );
      const last24h = sum(rows24h);
      const last30d = sum(recentMapped);

      const durationMs = Date.now() - tStart;
      console.log("[LBank] Commission Summary", {
        uid,
        last24h: Number(last24h.toFixed(8)),
        last30d: Number(last30d.toFixed(8)),
        recordsFetched: recentMapped.length,
        durationMs,
      });

      // Background: fetch prior 60d to compute 90d; use cache if available
      const cache = LBANK_90D_CACHE.get(uid);
      const cacheValid = cache && Date.now() - cache.ts < LBANK_CACHE_TTL_MS;
      if (!cacheValid) {
        (async () => {
          try {
            const older = await fetchPaged(fullStartTime, fastStartTime - 1);
            const olderSum = older.reduce((s, row) => {
              const c = row?.usdtAmount ?? row?.amount ?? "0";
              return s + (parseFloat(String(c)) || 0);
            }, 0);
            const full90 = last30d + olderSum;
            LBANK_90D_CACHE.set(uid, { value: full90, ts: Date.now() });
            console.log("[LBank] Commission Summary (90d ready)", {
              uid,
              last90d: Number(full90.toFixed(8)),
            });
            console.log("[LBank] Commission Summary (final)", {
              uid,
              last24h: Number(last24h.toFixed(8)),
              last30d: Number(last30d.toFixed(8)),
              last90d: Number(full90.toFixed(8)),
            });
          } catch {
            // ignore background errors
          }
        })();
      } else {
        console.log("[LBank] Commission Summary (cached 90d)", {
          uid,
          last90d: Number((cache?.value || 0).toFixed(8)),
        });
        console.log("[LBank] Commission Summary (final)", {
          uid,
          last24h: Number(last24h.toFixed(8)),
          last30d: Number(last30d.toFixed(8)),
          last90d: Number((cache?.value || 0).toFixed(8)),
        });
      }

      // Return last 30d for UI
      return recentMapped;
    } catch {
      return [];
    }
  }

  async getTradingHistory(uid: string) {
    // Optional for affiliate views; not strictly required by current UI
    return [];
  }

  async getTradingVolume(uid: string): Promise<string> {
    // Optional; can be implemented via /affiliate-api/v2/trade/user/team or /trade/user
    return "0";
  }
}
