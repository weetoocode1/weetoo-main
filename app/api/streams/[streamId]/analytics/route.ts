import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Mux from "@mux/mux-node";

const muxClient = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

async function fetchMuxDataMetricTimeseries(
  metric: string,
  filterKey: "playback_id" | "video_id",
  filterValue: string
) {
  const url = new URL(
    `https://api.mux.com/data/v1/metrics/${metric}/timeseries`
  );
  url.searchParams.append("filters", `${filterKey}:${filterValue}`);
  // Default timeframe (Mux defaults to last 24h)

  const res = await fetch(url.toString(), {
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(
          `${process.env.MUX_TOKEN_ID}:${process.env.MUX_TOKEN_SECRET}`
        ).toString("base64"),
    },
  });

  if (!res.ok) {
    return [] as Array<{ timestamp: string; value: number }>;
  }

  const data = await res.json();
  const formatTime = (iso?: string) => {
    if (!iso) return "";
    try {
      const dt = new Date(iso);
      const hh = dt.getHours().toString().padStart(2, "0");
      const mm = dt.getMinutes().toString().padStart(2, "0");
      return `${hh}:${mm}`;
    } catch {
      return "";
    }
  };
  const series: Array<{ timestamp: string; value: number }> =
    data?.data
      ?.map((d: { timestamp?: string; value?: number }) => ({
        timestamp: formatTime(d?.timestamp),
        value: Number(d?.value ?? 0),
      }))
      .filter((p: { timestamp: string }) => Boolean(p.timestamp)) ?? [];
  return series;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ streamId: string }> }
) {
  try {
    const { streamId } = await params;
    if (!streamId) {
      return NextResponse.json(
        { error: "Stream ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: row, error } = await supabase
      .from("user_streams")
      .select("playback_id, status")
      .eq("stream_id", streamId)
      .single();

    if (error || !row) {
      return NextResponse.json({ error: "Stream not found" }, { status: 404 });
    }

    const playbackId: string | null = row.playback_id ?? null;

    // Concurrent viewers (live value)
    let concurrentViewers = 0;
    try {
      const live = await muxClient.video.liveStreams.retrieve(streamId);
      concurrentViewers = Number(
        (live as { active_viewer_count?: number })?.active_viewer_count ?? 0
      );
    } catch {
      concurrentViewers = 0;
    }

    if (!playbackId) {
      return NextResponse.json({
        concurrentViewers,
        views: 0,
        averageViewDuration: 0,
        rebufferingPercentage: 0,
        series: {
          concurrent: Array.from({ length: 6 }, (_, i) => ({
            timestamp: `${i * 5}:00`,
            value: concurrentViewers,
          })),
          views: [],
          avgView: [],
          rebuffer: [],
        },
      });
    }

    // Fetch timeseries from Mux Data API
    // First attempt: filter by playback_id (works when the player used that id)
    let viewsSeries = await fetchMuxDataMetricTimeseries(
      "views",
      "playback_id",
      playbackId
    );
    let watchTimeSeries = await fetchMuxDataMetricTimeseries(
      "watch_time",
      "playback_id",
      playbackId
    );
    let rebufferSeries = await fetchMuxDataMetricTimeseries(
      "rebuffer_percentage",
      "playback_id",
      playbackId
    );

    // Fallback: some live sessions report under the active asset id (video_id)
    if (viewsSeries.length === 0) {
      try {
        const live = await muxClient.video.liveStreams.retrieve(streamId);
        const assetId = (live as { active_asset_id?: string }).active_asset_id;
        if (assetId) {
          viewsSeries = await fetchMuxDataMetricTimeseries(
            "views",
            "video_id",
            assetId
          );
          watchTimeSeries = await fetchMuxDataMetricTimeseries(
            "watch_time",
            "video_id",
            assetId
          );
          rebufferSeries = await fetchMuxDataMetricTimeseries(
            "rebuffer_percentage",
            "video_id",
            assetId
          );
        }
      } catch {}
    }

    const viewsTotal = viewsSeries.reduce(
      (s, p) => s + (Number(p.value) || 0),
      0
    );
    const watchTimeTotal = watchTimeSeries.reduce(
      (s, p) => s + (Number(p.value) || 0),
      0
    );

    const averageViewDuration =
      viewsTotal > 0 ? Math.round(watchTimeTotal / viewsTotal) : 0; // seconds
    const rebufferingPercentage = rebufferSeries.length
      ? Number(
          (
            rebufferSeries.reduce((s, p) => s + (Number(p.value) || 0), 0) /
            rebufferSeries.length
          ).toFixed(2)
        )
      : 0;

    return NextResponse.json({
      concurrentViewers,
      views: viewsTotal,
      averageViewDuration,
      rebufferingPercentage,
      series: {
        concurrent: Array.from({ length: 6 }, (_, i) => ({
          timestamp: `${i * 5}:00`,
          value: concurrentViewers,
        })),
        views: viewsSeries,
        avgView: watchTimeSeries.map((d, i) => ({
          timestamp: d.timestamp,
          value:
            viewsSeries[i] && viewsSeries[i].value > 0
              ? Number(d.value) / Number(viewsSeries[i].value)
              : 0,
        })),
        rebuffer: rebufferSeries,
      },
    });
  } catch (err) {
    console.error("analytics error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
