import { NextResponse } from "next/server";
import Mux from "@mux/mux-node";

const muxClient = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

interface LiveStreamResolution {
  recent_asset_ids?: string[];
}

interface AssetResolution {
  playback_ids?: Array<{ id: string; policy: string }>;
}

interface PlaybackResolution {
  object?: { id?: string; type?: string };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ streamId: string }> }
) {
  try {
    const resolved = await params;
    const streamId = resolved.streamId;
    if (!streamId) {
      return NextResponse.json(
        { error: "Stream ID required" },
        { status: 400 }
      );
    }

    // Retrieve the live stream to find recent asset ids (recordings)
    const liveStream = (await muxClient.video.liveStreams.retrieve(
      streamId
    )) as unknown as LiveStreamResolution;
    const recentAssetIds = liveStream?.recent_asset_ids;

    if (!recentAssetIds || recentAssetIds.length === 0) {
      return NextResponse.json({ playbackId: null }, { status: 200 });
    }

    // Use the most recent asset
    const assetId = recentAssetIds[0];
    const asset = (await muxClient.video.assets.retrieve(
      assetId
    )) as unknown as AssetResolution;
    const playbackIds = asset?.playback_ids;

    const publicPlayback = playbackIds?.find((p) => p.policy === "public");
    const playbackId = publicPlayback?.id || playbackIds?.[0]?.id || null;

    return NextResponse.json({ playbackId });
  } catch (_e) {
    // If streamId is a playback id, resolve to live stream then look up recent assets
    try {
      const resolvedPlayback = (await muxClient.video.playbackIds.retrieve(
        (
          await params
        ).streamId
      )) as unknown as PlaybackResolution;
      const liveId = resolvedPlayback?.object?.id;
      if (liveId) {
        const ls = (await muxClient.video.liveStreams.retrieve(
          liveId
        )) as unknown as LiveStreamResolution;
        const recentAssetIds = ls?.recent_asset_ids;
        if (recentAssetIds && recentAssetIds.length > 0) {
          const asset = (await muxClient.video.assets.retrieve(
            recentAssetIds[0]
          )) as unknown as AssetResolution;
          const playbackIds = asset?.playback_ids;
          const publicPlayback = playbackIds?.find(
            (p) => p.policy === "public"
          );
          const playbackId = publicPlayback?.id || playbackIds?.[0]?.id || null;
          return NextResponse.json({ playbackId });
        }
      }
    } catch {}
    return NextResponse.json({ playbackId: null }, { status: 200 });
  }
}
