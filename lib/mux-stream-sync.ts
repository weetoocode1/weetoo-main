import Mux from "@mux/mux-node";
import { createServiceClient } from "@/lib/supabase/server";

const muxClient = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

const lastSyncTime = new Map<string, number>();
const SYNC_COOLDOWN_MS = 15000; // 15 seconds cooldown per stream
const MAX_STREAMS_PER_BATCH = 5; // Process max 5 streams per sync cycle
const BATCH_DELAY_MS = 500; // 500ms delay between batches

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

    // Filter streams that are due for sync
    const streamsToSync = streams
      .filter((stream) => {
        const lastSync = lastSyncTime.get(stream.stream_id) || 0;
        return now - lastSync >= SYNC_COOLDOWN_MS;
      })
      .slice(0, MAX_STREAMS_PER_BATCH); // Limit to batch size

    if (streamsToSync.length === 0) {
      return; // No streams need syncing
    }

    // Process streams with delays between requests
    for (let i = 0; i < streamsToSync.length; i++) {
      const stream = streamsToSync[i];

      // Add delay between requests (except for the first one)
      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
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
      } catch (muxError: unknown) {
        const error = muxError as { status?: number; message?: string };

        // Handle rate limit errors (429) with exponential backoff
        if (error.status === 429) {
          console.warn(
            `⚠️ Rate limit hit for stream ${stream.stream_id.substring(
              0,
              8
            )}..., backing off`
          );
          // Set a longer cooldown for this stream
          lastSyncTime.set(stream.stream_id, now + 60000); // 60 seconds cooldown
          errors++;
          // Stop processing remaining streams to avoid more rate limits
          break;
        } else {
          console.error(
            `Error syncing stream ${stream.stream_id.substring(0, 8)}...:`,
            error.message || muxError
          );
          errors++;
        }
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
