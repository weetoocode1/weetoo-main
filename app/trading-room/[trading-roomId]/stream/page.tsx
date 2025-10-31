import { StreamPageClient } from "./page-client";
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
    title: `Stream | ${room?.name}`,
    description: `Stream the ${room?.name} trading room on Weetoo and compete in a risk-free environment.`,
  };
}

export default async function StreamPage({
  params,
}: {
  params: Promise<{ "trading-roomId": string }>;
}) {
  const resolvedParams = await params;
  const roomId = resolvedParams["trading-roomId"];

  return <StreamPageClient roomId={roomId} />;
}
