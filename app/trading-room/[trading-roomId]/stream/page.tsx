import { StreamChat } from "@/components/test-components/test-stream/stream-chat";
import { StreamDashboard } from "@/components/test-components/test-stream/stream-dashboard";
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

export default function TestStream() {
  return (
    <div className="flex h-full w-full gap-3 p-4">
      <StreamDashboard />
      <StreamChat />
    </div>
  );
}
