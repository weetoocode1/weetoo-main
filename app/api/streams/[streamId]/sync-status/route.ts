import { NextRequest, NextResponse } from "next/server";
import Mux from "@mux/mux-node";
import { createClient } from "@/lib/supabase/server";

const muxClient = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ streamId: string }> }
) {
  try {
    const { streamId } = await params;

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

    try {
      const liveStream = await muxClient.video.liveStreams.retrieve(streamId);
      const muxStatus = (liveStream as { status?: string }).status || "idle";

      let dbStatus = stream.status;
      let startedAt = stream.started_at;

      if (muxStatus === "active" && stream.status !== "active") {
        dbStatus = "active";
        if (!stream.started_at) {
          startedAt = new Date().toISOString();
        }

        await supabase
          .from("user_streams")
          .update({
            status: "active",
            started_at: startedAt,
            updated_at: new Date().toISOString(),
          })
          .eq("stream_id", streamId);
      } else if (muxStatus === "idle" && stream.status === "active") {
        dbStatus = "idle";
        startedAt = null;
        await supabase
          .from("user_streams")
          .update({
            status: "idle",
            started_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("stream_id", streamId);
      }

      return NextResponse.json({
        status: dbStatus,
        muxStatus,
        startedAt,
      });
    } catch (muxError) {
      console.error("Error fetching Mux status:", muxError);
      return NextResponse.json({
        status: stream.status,
        muxStatus: "unknown",
        startedAt: stream.started_at,
      });
    }
  } catch (error) {
    console.error("Error syncing stream status:", error);
    return NextResponse.json(
      { error: "Failed to sync stream status" },
      { status: 500 }
    );
  }
}
