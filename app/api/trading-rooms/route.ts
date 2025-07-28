import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { TRADING_SYMBOLS } from "@/lib/trading/symbols-config";

// interface TradingRoomDb {
//   id: string;
//   name: string;
//   creator_id: string;
//   symbol: string;
//   category: "regular" | "voice";
//   privacy: "public" | "private";
//   pnl_percentage: number | null;
//   created_at: string;
//   room_status: string;
// }

// interface UserDb {
//   id: string;
//   first_name?: string;
//   last_name?: string;
//   avatar_url?: string;
// }

// interface ParticipantCountDb {
//   room_id: string;
//   user_id: string;
// }

// interface TradeDb {
//   room_id: string;
//   pnl: number | null;
// }

// Type for a row from the fast_trading_rooms view
interface TradingRoomView {
  id: string;
  name: string;
  symbol: string;
  category: "regular" | "voice";
  privacy: "public" | "private";
  created_at: string;
  creator_id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  participants: number | null;
  total_pnl: number | null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") || 1);
  const pageSize = Number(url.searchParams.get("pageSize") || 20);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createClient();
  const start = Date.now();

  // Fetch paginated rooms and total count from the view
  const {
    data: roomsData,
    error: roomsError,
    count: totalCount,
  } = await supabase
    .from("fast_trading_rooms")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (roomsError || !roomsData) {
    return NextResponse.json({ data: [], total: 0 });
  }

  // Map final result to match frontend expectations
  const mapped = roomsData.map((room: TradingRoomView) => {
    const fullName =
      [room.first_name, room.last_name].filter(Boolean).join(" ") || "-";
    const dateObj = new Date(room.created_at);
    const isValidDate = !isNaN(dateObj.getTime());
    const createdAt = isValidDate ? dateObj.toISOString() : "-";
    const createdAtTimestamp = isValidDate ? dateObj.getTime() : 0;
    // You may want to fetch startingBalance from app_settings if needed for pnlPercentage
    // For now, assume 100000 as before
    const startingBalance = 100000;
    const pnlPercent = startingBalance
      ? (Number(room.total_pnl) / startingBalance) * 100
      : 0;
    return {
      id: room.id,
      name: room.name,
      creator: {
        id: room.creator_id,
        name: fullName,
        avatar: room.avatar_url || "",
      },
      symbol: room.symbol,
      category: room.category,
      createdAt,
      createdAtTimestamp,
      isPublic: room.privacy === "public",
      participants: Number(room.participants) || 0,
      pnlPercentage: pnlPercent,
    };
  });
  const end = Date.now();
  console.log("API /api/trading-rooms total time (view):", end - start, "ms");
  return NextResponse.json({ data: mapped, total: totalCount || 0 });
}

// Add PATCH handler for backend validation
export async function PATCH(request: Request) {
  const body = await request.json();
  const { id, name, symbol, privacy, password, updatedAt } = body;
  // Allowed symbols (no hardcoding elsewhere)
  const allowedSymbols = TRADING_SYMBOLS.map((s) => s.value);
  if (!id) {
    return new Response(JSON.stringify({ error: "Room ID is required." }), {
      status: 400,
    });
  }
  if (!name || typeof name !== "string" || !name.trim()) {
    return new Response(JSON.stringify({ error: "Room name is required." }), {
      status: 400,
    });
  }
  if (
    !symbol ||
    typeof symbol !== "string" ||
    !allowedSymbols.includes(symbol)
  ) {
    return new Response(JSON.stringify({ error: "Invalid symbol." }), {
      status: 400,
    });
  }
  if (
    privacy === "private" &&
    (!password || typeof password !== "string" || !password.trim())
  ) {
    return new Response(
      JSON.stringify({ error: "Password is required for private rooms." }),
      { status: 400 }
    );
  }
  if (privacy !== "public" && privacy !== "private") {
    return new Response(JSON.stringify({ error: "Invalid privacy value." }), {
      status: 400,
    });
  }
  if (!updatedAt) {
    return new Response(
      JSON.stringify({
        error: "updatedAt is required for concurrency control.",
      }),
      { status: 400 }
    );
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trading_rooms")
    .update({
      name: name.trim(),
      symbol,
      privacy,
      password: privacy === "private" ? password : null,
    })
    .eq("id", id)
    .eq("updated_at", updatedAt)
    .select("updated_at")
    .maybeSingle();
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
  if (!data) {
    return new Response(
      JSON.stringify({
        error: "Room was updated elsewhere. Please refresh and try again.",
      }),
      { status: 409 }
    );
  }
  return new Response(
    JSON.stringify({ success: true, updatedAt: data.updated_at }),
    { status: 200 }
  );
}
