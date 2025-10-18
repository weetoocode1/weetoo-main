import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  tradingRoomId: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { tradingRoomId } = await params;
    const body = await request.json();

    const {
      positionId,
      closePrice,
      feeRate = 0.0005,
    }: { positionId: string; closePrice: number; feeRate?: number } = body;

    if (!tradingRoomId || !positionId || !closePrice) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Use service client for server-managed fields guarded by RLS
    const supabase = await createServiceClient();

    // Ensure authenticated user
    // const {
    //   data: { user },
    // } = await supabase.auth.getUser();

    // First try SECURITY DEFINER RPC which bypasses trigger/RLS
    const userClient = await createClient();
    const { error: rpcErr } = await userClient.rpc(
      "close_position_and_update_balance",
      {
        p_position_id: positionId,
        p_close_price: closePrice,
      }
    );
    if (!rpcErr) {
      return NextResponse.json({ ok: true });
    }

    // Fallback to service-role direct updates if RPC not installed
    // Fetch position
    const { data: pos, error: posErr } = await supabase
      .from("trading_room_positions")
      .select(
        "id, room_id, symbol, side, quantity, entry_price, initial_margin, fee, leverage"
      )
      .eq("id", positionId)
      .eq("room_id", tradingRoomId)
      .is("closed_at", null)
      .single();

    if (posErr || !pos) {
      return NextResponse.json(
        { error: "Position not found or already closed" },
        { status: 404 }
      );
    }

    const orderValueOpen = Number(pos.quantity) * Number(pos.entry_price);
    const closeValue = Number(pos.quantity) * Number(closePrice);
    const realizedPnl = closeValue - orderValueOpen;
    const closeFee = closeValue * Number(feeRate);

    // Update position as closed
    const { error: updErr } = await supabase
      .from("trading_room_positions")
      .update({
        closed_at: new Date().toISOString(),
        close_price: closePrice,
        pnl: realizedPnl,
        status: "filled",
      })
      .eq("id", positionId)
      .eq("room_id", tradingRoomId);

    if (updErr) {
      return NextResponse.json(
        { error: "Failed to close position", details: updErr.message },
        { status: 500 }
      );
    }

    // Balance settlement: return margin + PnL - closeFee
    const settlement = Number(pos.initial_margin) + realizedPnl - closeFee;

    // Update balance directly
    const { data: roomNow } = await supabase
      .from("trading_rooms")
      .select("virtual_balance")
      .eq("id", tradingRoomId)
      .single();
    const current = Number(roomNow?.virtual_balance ?? 0);
    const nextBalance = current + settlement;
    const { error: balErr } = await supabase
      .from("trading_rooms")
      .update({ virtual_balance: nextBalance })
      .eq("id", tradingRoomId);
    if (balErr) {
      return NextResponse.json(
        { error: "Failed to update virtual balance", details: balErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        pnl: realizedPnl,
        closeFee,
        settlement,
      },
      { status: 200 }
    );
  } catch (_e) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
