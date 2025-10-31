import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ReplayPageClient } from "./page-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ "trading-roomId": string }>;
}): Promise<Metadata> {
  const resolved = await params;
  const roomId = resolved["trading-roomId"];
  const supabase = await createClient();
  const { data: room } = await supabase
    .from("trading_rooms")
    .select("name")
    .eq("id", roomId)
    .single();
  return {
    title: room?.name ? `${room.name} - Replay | Weetoo` : "Replay | Weetoo",
    description: room?.name
      ? `Watch the recorded livestream of ${room.name} on Weetoo.`
      : "Watch recorded livestreams on Weetoo.",
  };
}

export default async function ReplayPage({
  params,
}: {
  params: Promise<{ "trading-roomId": string }>;
}) {
  const roomId = (await params)["trading-roomId"];
  return <ReplayPageClient roomId={roomId} />;
}


