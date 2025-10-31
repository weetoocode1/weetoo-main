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
    const finalUnlistReplay =
      unlist_replay !== undefined
        ? unlist_replay
        : stream.unlist_replay ?? false;

    try {
      const updatePayload: {
        reconnect_window?: number;
        latency_mode?: "standard" | "reduced" | "low";
        enable_dvr?: boolean;
        new_asset_settings?: {
          playback_policy?: ("public" | "signed")[];
        };
      } = {
        reconnect_window: reconnect_window || stream.reconnect_window || 60,
        latency_mode: muxLatencyMode as "standard" | "reduced" | "low",
      };

      if (finalEnableDvr !== false) {
        updatePayload.enable_dvr = true;
      } else {
        updatePayload.enable_dvr = false;
      }

      updatePayload.new_asset_settings = {
        playback_policy: finalUnlistReplay
          ? (["signed"] as const)
          : (["public"] as const),
      };

      await muxClient.video.liveStreams.update(
        streamId,
        updatePayload as unknown as Parameters<
          typeof muxClient.video.liveStreams.update
        >[1]
      );
    } catch (muxError) {
      console.error("Error updating Mux stream:", muxError);
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

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error("Error updating stream:", error);
    return NextResponse.json(
      { error: "Failed to update stream" },
      { status: 500 }
    );
  }
}
