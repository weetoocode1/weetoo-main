import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get("roomId");
  if (!roomId) {
    return NextResponse.json(
      { error: "Missing roomId parameter" },
      { status: 400 }
    );
  }
  const supabase = await createClient();

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;

  const { data: todayData, error: todayError } = await supabase
    .from("trading_room_positions")
    .select("side, opened_at")
    .eq("room_id", roomId)
    .gte("opened_at", todayStr)
    .order("opened_at", { ascending: false });

  const { data: totalData, error: totalError } = await supabase
    .from("trading_room_positions")
    .select("side")
    .eq("room_id", roomId);

  if (todayError || totalError) {
    return NextResponse.json(
      { error: todayError?.message || totalError?.message },
      { status: 500 }
    );
  }

  const todayStats = { buy: 0, sell: 0 };
  for (const row of todayData || []) {
    if ((row.side || "").toLowerCase() === "long") todayStats.buy++;
    if ((row.side || "").toLowerCase() === "short") todayStats.sell++;
  }
  const totalStats = { buy: 0, sell: 0 };
  for (const row of totalData || []) {
    if ((row.side || "").toLowerCase() === "long") totalStats.buy++;
    if ((row.side || "").toLowerCase() === "short") totalStats.sell++;
  }

  return NextResponse.json({ today: todayStats, total: totalStats });
}
