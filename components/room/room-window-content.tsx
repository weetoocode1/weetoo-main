"use client";

// import LightweightChart from "@/components/room/lightweight-chart";
import { LiveKitErrorBoundary } from "@/components/room/livekit-error-boundary";
import { LivektParticipantAudio } from "@/components/room/livekit-participant-audio";
// MarketOverview will be lazy loaded for host only
// ParticipantsList will be lazy loaded
import { useBinanceFutures } from "@/hooks/use-binance-futures";
import { useRoomParticipant } from "@/hooks/use-room-participant";
import { createClient } from "@/lib/supabase/client";
import React, { useEffect, useRef, useState } from "react";
// TradingViewChartComponent will be lazy loaded
import dynamic from "next/dynamic";

// Lazy load heavy components
const Chat = dynamic(
  () => import("@/components/room/chat").then((mod) => ({ default: mod.Chat })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading chat...</p>
        </div>
      </div>
    ),
  }
);

const OrderBook = dynamic(
  () =>
    import("@/components/room/order-book").then((mod) => ({
      default: mod.OrderBook,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-xs text-muted-foreground">Loading order book...</p>
        </div>
      </div>
    ),
  }
);

const TradeHistoryTabs = dynamic(
  () =>
    import("@/components/room/trade-history-tabs").then((mod) => ({
      default: mod.TradeHistoryTabs,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-xs text-muted-foreground">
            Loading trade history...
          </p>
        </div>
      </div>
    ),
  }
);

const TradingForm = dynamic(
  () =>
    import("@/components/room/trading-form").then((mod) => ({
      default: mod.TradingForm,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-xs text-muted-foreground">
            Loading trading form...
          </p>
        </div>
      </div>
    ),
  }
);

const MarketOverview = dynamic(
  () =>
    import("@/components/room/market-overview").then((mod) => ({
      default: mod.MarketOverview,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-xs text-muted-foreground">
            Loading market data...
          </p>
        </div>
      </div>
    ),
  }
);

// Lazy load TradingView chart - this is the heaviest component
const TradingViewChartComponent = dynamic(
  () =>
    import("./trading-view-chart").then((mod) => ({
      default: mod.TradingViewChartComponent,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-background border border-border">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Loading Trading Chart
          </h3>
          <p className="text-sm text-muted-foreground">
            Preparing advanced charting tools...
          </p>
        </div>
      </div>
    ),
  }
);

// Lazy load ParticipantsList
const ParticipantsList = dynamic(
  () =>
    import("@/components/room/participants-list").then((mod) => ({
      default: mod.ParticipantsList,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-xs text-muted-foreground">
            Loading participants...
          </p>
        </div>
      </div>
    ),
  }
);

function RoomJoiner({ roomId }: { roomId: string }) {
  const [user, setUser] = useState<{ id: string } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ? { id: data.user.id } : null);
    });
  }, []);

  const { joinRoom } = useRoomParticipant(roomId, user);

  useEffect(() => {
    if (user && roomId) {
      joinRoom();
    }
  }, [user, roomId, joinRoom]);

  return null;
}

export function RoomWindowContent({
  symbol,
  roomId,
  hostId,
  virtualBalance,
  roomType,
  onCurrentPrice,
}: {
  symbol: string;
  roomId: string;
  hostId: string;
  virtualBalance: number;
  roomType: "regular" | "voice";
  onCurrentPrice?: (price: number | undefined) => void;
}) {
  // Check if current user is the host
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    const checkIfHost = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const hostStatus = user.id === hostId;
        setIsHost(hostStatus);
      }
    };
    checkIfHost();
  }, [hostId]);

  // Fetch all market data using the enhanced hook
  const marketData = useBinanceFutures(symbol);

  // Notify parent of current price
  React.useEffect(() => {
    if (onCurrentPrice) {
      onCurrentPrice(
        marketData?.ticker?.lastPrice
          ? parseFloat(marketData.ticker.lastPrice)
          : undefined
      );
    }
  }, [marketData?.ticker?.lastPrice, onCurrentPrice]);

  const chartOuterRef = useRef<HTMLDivElement>(null);

  return (
    <LiveKitErrorBoundary>
      <div className="h-[calc(100%-0rem)] bg-background flex flex-col gap-2 px-3 py-2">
        <RoomJoiner roomId={roomId} />
        {/* LiveKit participant audio playback */}
        {roomType === "voice" && (
          <LivektParticipantAudio roomId={roomId} hostId={hostId} />
        )}

        {/* Top overview bar only for host */}
        {isHost && (
          <div className="w-full flex flex-col xl:flex-row gap-2">
            <div className="w-full xl:flex-[2] border md:min-h-[80px] h-auto">
              <MarketOverview
                symbol={symbol}
                data={marketData}
                roomId={roomId}
              />
            </div>
            {/* <div className="w-full xl:flex-[1] border min-h-[120px] xl:min-h-[80px] h-auto xl:overflow-visible">
              <TradingOverviewContainer roomId={roomId} key={roomId} />
            </div> */}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-6 gap-2 h-full w-full">
          {/* Left side */}
          <div className="md:col-span-5 w-full h-full">
            {/* Host: show full trading workstation. Participants: only the stream area full-size */}
            {isHost ? (
              <div className="flex flex-col gap-2 w-full h-full">
                <div className="flex w-full gap-2 flex-col md:flex-row md:h-[550px] h-auto">
                  <div
                    ref={chartOuterRef}
                    className="md:max-w-[972px] max-w-full border-border border w-full bg-background md:h-full h-[320px]"
                  >
                    <TradingViewChartComponent
                      symbol={symbol}
                      isHost={isHost}
                      roomId={roomId}
                      hostId={hostId}
                    />
                  </div>
                  <div className="flex-1 border border-border w-full bg-background p-2 md:h-full h-[280px]">
                    <OrderBook symbol={symbol} data={marketData} />
                  </div>
                  <div className="flex-1 border border-border w-full bg-background p-2 md:h-full h-[320px]">
                    <TradingForm
                      currentPrice={
                        marketData?.ticker?.lastPrice
                          ? parseFloat(marketData.ticker.lastPrice)
                          : undefined
                      }
                      virtualBalance={virtualBalance}
                      hostId={hostId}
                      roomId={roomId}
                      symbol={symbol}
                    />
                  </div>
                </div>
                <div className="flex flex-1 w-full border md:min-h-0 min-h-[260px]">
                  <TradeHistoryTabs
                    roomId={roomId}
                    currentPrice={
                      marketData?.ticker?.lastPrice
                        ? parseFloat(marketData.ticker.lastPrice)
                        : undefined
                    }
                    hostId={hostId}
                  />
                </div>
              </div>
            ) : (
              // Participant: show only the stream area and let it fill available space
              <div className="w-full h-full">
                <div className="w-full border border-border bg-background md:h-full h-[360px]">
                  <TradingViewChartComponent
                    symbol={symbol}
                    isHost={false}
                    roomId={roomId}
                    hostId={hostId}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar: participants + chat, sticky */}
          <div className="md:col-span-1 w-full h-full">
            <div className="flex w-full h-full flex-col gap-2 md:sticky md:top-2">
              <div
                className="w-full border border-border bg-background md:h-[300px] h-[220px]"
                data-testid="participants-list"
              >
                <ParticipantsList roomId={roomId} hostId={hostId} />
              </div>
              <div className="w-full md:h-[400px] lg:h-[514px] h-[320px] overflow-y-auto border border-border bg-background">
                <Chat roomId={roomId} creatorId={hostId} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </LiveKitErrorBoundary>
  );
}
