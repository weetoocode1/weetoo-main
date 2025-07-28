import { TradingRoomWindow } from "@/components/room/room-window";
import { createClient } from "@/lib/supabase/server";
import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ roomId: string }>;
}): Promise<Metadata> {
  const { roomId } = await params;
  const supabase = await createClient();
  const { data: room } = await supabase
    .from("trading_rooms")
    .select("name")
    .eq("id", roomId)
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
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const supabase = await createClient();
  const { data: room, error } = await supabase
    .from("trading_rooms")
    .select(
      "id, name, creator_id, symbol, category, privacy, is_active, room_status, virtual_balance, updated_at"
    )
    .eq("id", roomId)
    .single();

  if (error || !room) {
    return <div className="p-8 text-center">Room not found.</div>;
  }

  return (
    <TradingRoomWindow
      hostId={room.creator_id}
      roomName={room.name}
      isPublic={room.privacy === "public"}
      roomType={room.category}
      symbol={room.symbol}
      roomId={roomId}
      virtualBalance={room.virtual_balance}
      initialUpdatedAt={room.updated_at}
    />
  );
}
