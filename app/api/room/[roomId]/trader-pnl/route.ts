import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const supabase = await createClient();

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
    const { data, error } = await supabase.rpc("trader_pnl_stats", {
      p_room_id: roomId,
      p_user_id: ownerId,
      p_today: today,
    });
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
    return NextResponse.json(
      { error: "Failed to fetch PNL stats" },
      { status: 500 }
    );
  }
}
