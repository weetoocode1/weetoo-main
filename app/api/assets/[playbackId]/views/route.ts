import { NextResponse } from "next/server";
import Mux from "@mux/mux-node";

const muxClient = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

interface PlaybackResolution {
  object?: { type?: string; id?: string };
}

interface OverallViewsResult {
  total_views?: number;
  value?: number;
  data?: Array<{ value?: number }>;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ playbackId: string }> }
) {
  try {
    const { playbackId } = await params;
    if (!playbackId) {
      return NextResponse.json(
        { error: "playbackId required" },
        { status: 400 }
      );
    }

    // Resolve playbackId -> asset id
    const playback = (await muxClient.video.playbackIds.retrieve(
      playbackId
    )) as unknown as PlaybackResolution;
    const assetId =
      playback?.object?.type === "asset" ? playback?.object?.id : undefined;
    if (!assetId) {
      return NextResponse.json(
        { views: 0 },
        { status: 200, headers: { "Cache-Control": "public, max-age=30" } }
      );
    }

    // Use Mux Data metrics overall views filtered by asset_id
    let views = 0;
    try {
      const metrics = (
        muxClient as unknown as {
          data?: {
            metrics?: {
              overall?: (
                metric: string,
                opts: { filters: string[] }
              ) => Promise<unknown>;
            };
          };
        }
      ).data?.metrics;
      if (metrics?.overall) {
        const overallUnknown = (await metrics.overall("views", {
          filters: [`asset_id:${assetId}`],
        })) as unknown as OverallViewsResult;
        views = Number(
          overallUnknown?.total_views || overallUnknown?.value || 0
        );
        if (!Number.isFinite(views)) {
          const v = overallUnknown?.data?.[0]?.value;
          views = Number(v || 0);
        }
      }
    } catch {
      views = 0;
    }

    return NextResponse.json(
      { views },
      { status: 200, headers: { "Cache-Control": "public, max-age=30" } }
    );
  } catch (_e) {
    return NextResponse.json({ views: 0 }, { status: 200 });
  }
}
