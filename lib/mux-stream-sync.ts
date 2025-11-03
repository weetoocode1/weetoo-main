import Mux from "@mux/mux-node";
import { createServiceClient } from "@/lib/supabase/server";

const muxClient = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

const lastSyncTime = new Map<string, number>();
const SYNC_COOLDOWN_MS = 2000;

export async function syncAllStreamStatuses() {
  try {
    const supabase = await createServiceClient();

    const { data: streams, error: fetchError } = await supabase
      .from("user_streams")
      .select("stream_id, status, started_at, updated_at")
      .in("status", ["active", "idle"]);

    if (fetchError) {
      console.error("Error fetching streams for sync:", fetchError);
      return;
    }

    if (!streams || streams.length === 0) {
      return;
    }

    let synced = 0;
    let errors = 0;
    const now = Date.now();

    for (const stream of streams) {
      const lastSync = lastSyncTime.get(stream.stream_id) || 0;
      if (now - lastSync < SYNC_COOLDOWN_MS) {
        continue;
      }

      try {
        const liveStream = await muxClient.video.liveStreams.retrieve(
          stream.stream_id
        );
        const muxStatus = (liveStream as { status?: string }).status || "idle";

        if (muxStatus === "active" && stream.status !== "active") {
          const startedAt = stream.started_at || new Date().toISOString();
          await supabase
            .from("user_streams")
            .update({
              status: "active",
              started_at: startedAt,
              updated_at: new Date().toISOString(),
            })
            .eq("stream_id", stream.stream_id);
          synced++;
          lastSyncTime.set(stream.stream_id, now);
        } else if (muxStatus === "idle" && stream.status === "active") {
          await supabase
            .from("user_streams")
            .update({
              status: "idle",
              started_at: null,
              updated_at: new Date().toISOString(),
            })
            .eq("stream_id", stream.stream_id);
          synced++;
          lastSyncTime.set(stream.stream_id, now);
        } else {
          lastSyncTime.set(stream.stream_id, now);
        }
      } catch (muxError) {
        console.error(`Error syncing stream ${stream.stream_id}:`, muxError);
        errors++;
      }
    }

    if (synced > 0 || errors > 0) {
      console.log(
        `✅ Mux sync complete: ${synced} streams updated, ${errors} errors`
      );
    }
  } catch (error) {
    console.error("Error in syncAllStreamStatuses:", error);
  }
}
