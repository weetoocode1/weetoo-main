import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  // Next.js requires awaiting dynamic APIs in route handlers
  const { roomId } = await params;
  const supabase = await createClient();

  // Optional soft-reset filter
  const since = req.nextUrl.searchParams.get("since");

  // 1. Get the room owner (creator)
  const { data: room, error: roomError } = await supabase
    .from("trading_rooms")
    .select("creator_id")
    .eq("id", roomId)
    .single();

  if (roomError || !room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  const ownerId = room.creator_id;

  // 2. Helper to get PNL stats
  type PnlStatsRow = { side: "long" | "short"; profit_percent: number };
  async function getPnlStats(today: boolean) {
    // If the RPC supports p_since, pass it; otherwise backend will ignore it gracefully
    const args: Record<string, unknown> = {
      p_room_id: roomId,
      p_user_id: ownerId,
      p_today: today,
      // Always include p_since to disambiguate overloaded functions on the DB
      p_since: since ?? null,
    };
    const { data, error } = await supabase.rpc("trader_pnl_stats", args);
    if (error) throw error;
    // data: [{ side: "long", profit_percent: 3.2 }, { side: "short", profit_percent: -1.1 }]
    const rows = data as PnlStatsRow[];
    return {
      buy: rows.find((d) => d.side === "long")?.profit_percent ?? 0,
      sell: rows.find((d) => d.side === "short")?.profit_percent ?? 0,
    };
  }

  try {
    const [today, total] = await Promise.all([
      getPnlStats(true),
      getPnlStats(false),
    ]);
    return NextResponse.json({ today, total });
  } catch (_e) {
    const e = _e as { message?: string };
    console.error("trader-pnl error", e?.message || _e);
    return NextResponse.json(
      { error: "Failed to fetch PNL stats", detail: e?.message || null },
      { status: 500 }
    );
  }
}
