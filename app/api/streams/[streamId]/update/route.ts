import { NextRequest, NextResponse } from "next/server";
import Mux from "@mux/mux-node";
import { createClient } from "@/lib/supabase/server";

const muxClient = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ streamId: string }> }
) {
  try {
    const { streamId } = await params;
    const body = await request.json();
    const { latency_mode, reconnect_window, enable_dvr, unlist_replay } = body;

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: stream, error: fetchError } = await supabase
      .from("user_streams")
      .select("*")
      .eq("stream_id", streamId)
      .single();

    if (fetchError || !stream) {
      return NextResponse.json({ error: "Stream not found" }, { status: 404 });
    }

    if (stream.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const validLatencyModes = ["standard", "reduced", "low"];
    const muxLatencyMode = validLatencyModes.includes(
      latency_mode || stream.latency_mode || "low"
    )
      ? latency_mode || stream.latency_mode || "low"
      : "low";

    const finalEnableDvr =
      enable_dvr !== undefined ? enable_dvr : stream.enable_dvr ?? true;
    // const finalUnlistReplay =
    //   unlist_replay !== undefined
    //     ? unlist_replay
    //     : stream.unlist_replay ?? false;

    let isStreamActive = false;
    let muxUpdateError: string | null = null;

    try {
      const liveStream = await muxClient.video.liveStreams.retrieve(streamId);
      const muxStatus = (liveStream as { status?: string }).status || "idle";
      isStreamActive = muxStatus === "active";

      if (isStreamActive) {
        muxUpdateError =
          "Stream settings (latency, reconnect window, DVR) cannot be changed while the stream is active. Settings have been saved and will apply to the next stream.";
      } else {
        const updatePayload: {
          reconnect_window?: number;
          latency_mode?: "standard" | "reduced" | "low";
          enable_dvr?: boolean;
        } = {
          reconnect_window: reconnect_window || stream.reconnect_window || 60,
          latency_mode: muxLatencyMode as "standard" | "reduced" | "low",
        };

        if (finalEnableDvr !== false) {
          updatePayload.enable_dvr = true;
        } else {
          updatePayload.enable_dvr = false;
        }

        await muxClient.video.liveStreams.update(
          streamId,
          updatePayload as unknown as Parameters<
            typeof muxClient.video.liveStreams.update
          >[1]
        );

        const updatedLiveStream = await muxClient.video.liveStreams.retrieve(
          streamId
        );
        const verifiedLatency = (updatedLiveStream as { latency_mode?: string })
          .latency_mode;
        const verifiedReconnectWindow = (
          updatedLiveStream as { reconnect_window?: number }
        ).reconnect_window;
        const verifiedEnableDvr = (
          updatedLiveStream as { enable_dvr?: boolean }
        ).enable_dvr;

        const latencyMatches = verifiedLatency === muxLatencyMode;
        const reconnectMatches =
          verifiedReconnectWindow === updatePayload.reconnect_window;
        const dvrMatches =
          updatePayload.enable_dvr === true
            ? verifiedEnableDvr === true || verifiedEnableDvr === undefined
            : verifiedEnableDvr === false;

        if (!latencyMatches || !reconnectMatches || !dvrMatches) {
          console.warn(
            "Mux stream settings update verification failed. Expected:",
            {
              latency_mode: muxLatencyMode,
              reconnect_window: updatePayload.reconnect_window,
              enable_dvr: updatePayload.enable_dvr,
            },
            "Got:",
            {
              latency_mode: verifiedLatency,
              reconnect_window: verifiedReconnectWindow,
              enable_dvr: verifiedEnableDvr,
            }
          );
          muxUpdateError =
            "Settings were saved to database, but Mux stream update verification failed. Please try again or restart the stream.";
        }
      }
    } catch (muxError) {
      console.error("Error updating Mux stream:", muxError);
      const errorMessage =
        muxError instanceof Error ? muxError.message : String(muxError);
      muxUpdateError = `Failed to update Mux stream: ${errorMessage}`;
    }

    const { data: updatedStream, error: updateError } = await supabase
      .from("user_streams")
      .update({
        latency_mode: muxLatencyMode,
        reconnect_window: reconnect_window || stream.reconnect_window,
        enable_dvr: enable_dvr ?? stream.enable_dvr,
        unlist_replay: unlist_replay ?? stream.unlist_replay,
        updated_at: new Date().toISOString(),
      })
      .eq("stream_id", streamId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating stream:", updateError);
      return NextResponse.json(
        { error: "Failed to update stream settings" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        stream: {
          streamKey: updatedStream.stream_key,
          rtmpUrl: updatedStream.rtmp_url,
          playbackId: updatedStream.playback_id,
          latencyMode: updatedStream.latency_mode,
          reconnectWindow: updatedStream.reconnect_window,
          enableDvr: updatedStream.enable_dvr,
          unlistReplay: updatedStream.unlist_replay,
        },
        warning: muxUpdateError || undefined,
      },
      { status: muxUpdateError ? 200 : 200 }
    );
  } catch (error) {
    console.error("Error updating stream:", error);
    return NextResponse.json(
      { error: "Failed to update stream" },
      { status: 500 }
    );
  }
}
