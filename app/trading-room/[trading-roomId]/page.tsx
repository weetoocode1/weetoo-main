import { TradingRoomPageClient } from "./page-client";
import { createClient } from "@/lib/supabase/server";
import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ "trading-roomId": string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const tradingRoomId = resolvedParams["trading-roomId"];

  const supabase = await createClient();
  const { data: room } = await supabase
    .from("trading_rooms")
    .select("name")
    .eq("id", tradingRoomId)
    .single();

  return {
    title: room?.name ? `${room.name} | Weetoo` : "Room | Weetoo",
    description: room?.name
      ? `Join the ${room.name} trading room on Weetoo and compete in a risk-free environment.`
      : "Join a trading room on Weetoo and compete in a risk-free environment.",
  };
}

export default async function TradingRoomPage({
  params,
}: {
  params: Promise<{ "trading-roomId": string }>;
}) {
  const tradingRoomId = (await params)["trading-roomId"];
  const supabase = await createClient();
  const { data: room, error } = await supabase
    .from("trading_rooms")
    .select(
      "id, name, creator_id, symbol, category, privacy, is_active, room_status, virtual_balance, updated_at"
    )
    .eq("id", tradingRoomId)
    .single();

  if (error || !room) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        Room not found.
      </div>
    );
  }

  return <TradingRoomPageClient room={room} creatorId={room.creator_id} />;
}
