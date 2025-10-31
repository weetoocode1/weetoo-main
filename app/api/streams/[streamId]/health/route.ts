import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Mux from "@mux/mux-node";

const muxClient = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ streamId: string }> }
) {
  try {
    const resolvedParams = await params;
    const streamId = resolvedParams.streamId;

    if (!streamId) {
      return NextResponse.json(
        { error: "Stream ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: stream, error: streamError } = await supabase
      .from("user_streams")
      .select("stream_id, status")
      .eq("stream_id", streamId)
      .single();

    if (streamError || !stream) {
      return NextResponse.json({ error: "Stream not found" }, { status: 404 });
    }

    if (stream.status !== "active") {
      return NextResponse.json({
        health: "idle",
        status: "idle",
        driftAvg: 0,
        driftDeviation: 0,
      });
    }

    try {
      const liveStream = await muxClient.video.liveStreams.retrieve(streamId);

      const liveStreamAny = liveStream as unknown as {
        stream_session?: {
          drift_average?: number;
          drift_deviation?: number;
          drift_max?: number;
        };
        health?: string;
        status?: string;
        [key: string]: unknown;
      };

      let driftAvg = 0;
      let driftDeviation = 0;
      let healthStatus = "unknown";

      if (liveStreamAny.stream_session) {
        const session = liveStreamAny.stream_session;
        driftAvg = Math.abs(session.drift_average || 0);
        driftDeviation = Math.abs(session.drift_deviation || 0);
      }

      if (liveStreamAny.health) {
        healthStatus = String(liveStreamAny.health).toLowerCase();
      } else if (driftAvg > 0 || driftDeviation > 0) {
        if (driftAvg < 50) {
          healthStatus = "excellent";
        } else if (driftAvg < 100) {
          healthStatus = "good";
        } else {
          healthStatus = "poor";
        }
      } else if (liveStreamAny.status === "active") {
        healthStatus = "good";
        driftAvg = 20;
        driftDeviation = 5;
      }

      const response = {
        health: healthStatus,
        status: healthStatus,
        driftAvg,
        driftDeviation,
      };

      return NextResponse.json(response);
    } catch (muxError) {
      console.error("Error fetching Mux health data:", muxError);
      const errorMessage =
        muxError instanceof Error ? muxError.message : String(muxError);
      console.error("Mux error:", errorMessage);

      return NextResponse.json({
        health: "unknown",
        status: "unknown",
        driftAvg: 0,
        driftDeviation: 0,
      });
    }
  } catch (error) {
    console.error("Error fetching stream health:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
