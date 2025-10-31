import { NextRequest, NextResponse } from "next/server";
import Mux from "@mux/mux-node";
import { createClient } from "@/lib/supabase/server";

const muxClient = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      roomId,
      latency_mode,
      reconnect_window,
      enable_dvr,
      unlist_replay,
    } = body;

    if (!roomId) {
      return NextResponse.json(
        { error: "roomId is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: room, error: roomError } = await supabase
      .from("trading_rooms")
      .select("id, creator_id")
      .eq("id", roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json(
        { error: "Trading room not found" },
        { status: 404 }
      );
    }

    if (room.creator_id !== user.id) {
      return NextResponse.json(
        { error: "Only room creator can create streams" },
        { status: 403 }
      );
    }

    const existingStream = await supabase
      .from("user_streams")
      .select("*")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingStream.data) {
      const updatedSettings = await supabase
        .from("user_streams")
        .update({
          latency_mode: latency_mode || "low",
          reconnect_window: reconnect_window || 60,
          enable_dvr: enable_dvr ?? true,
          unlist_replay: unlist_replay ?? false,
          status: "idle",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingStream.data.id)
        .select()
        .single();

      if (updatedSettings.error) {
        return NextResponse.json(
          { error: "Failed to update stream settings" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        id: updatedSettings.data.id,
        streamId: updatedSettings.data.stream_id,
        streamKey: updatedSettings.data.stream_key,
        rtmpUrl: updatedSettings.data.rtmp_url,
        backupRtmpUrl: updatedSettings.data.backup_rtmp_url,
        playbackId: updatedSettings.data.playback_id,
        status: updatedSettings.data.status,
        latencyMode: updatedSettings.data.latency_mode,
        reconnectWindow: updatedSettings.data.reconnect_window,
      });
    }

    const liveStream = await muxClient.video.liveStreams.create({
      playback_policy: ["public"],
      reconnect_window: reconnect_window || 60,
      latency_mode: latency_mode || "low",
      ...(enable_dvr !== false && { enable_dvr: true }),
      new_asset_settings: {
        playback_policy: unlist_replay ? ["signed"] : ["public"],
      },
      passthrough: JSON.stringify({
        room_id: roomId,
        user_id: user.id,
      }),
    });

    const primaryRtmpUrl = "rtmp://global-live.mux.com:5222/app/";

    const streamData = {
      user_id: user.id,
      room_id: roomId,
      stream_id: liveStream.id,
      stream_key: liveStream.stream_key || "",
      rtmp_url: primaryRtmpUrl,
      playback_id: liveStream.playback_ids?.[0]?.id || "",
      latency_mode: latency_mode || "low",
      reconnect_window: reconnect_window || 60,
      enable_dvr: enable_dvr ?? true,
      unlist_replay: unlist_replay ?? false,
      status: "idle",
    };

    const { data: insertedStream, error: insertError } = await supabase
      .from("user_streams")
      .insert(streamData)
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting stream:", insertError);
      return NextResponse.json(
        { error: "Failed to save stream data" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: insertedStream.id,
      streamId: insertedStream.stream_id,
      streamKey: insertedStream.stream_key,
      rtmpUrl: insertedStream.rtmp_url,
      backupRtmpUrl: insertedStream.backup_rtmp_url,
      playbackId: insertedStream.playback_id,
      status: insertedStream.status,
      latencyMode: insertedStream.latency_mode,
      reconnectWindow: insertedStream.reconnect_window,
    });
  } catch (error) {
    console.error("Error creating stream:", error);
    return NextResponse.json(
      { error: "Failed to create live stream" },
      { status: 500 }
    );
  }
}
