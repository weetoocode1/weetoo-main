"use client";

import { Chat } from "@/components/room/chat";
// import LightweightChart from "@/components/room/lightweight-chart";
import { LivektParticipantAudio } from "@/components/room/livekit-participant-audio";
import { MarketOverview } from "@/components/room/market-overview";
import { OrderBook } from "@/components/room/order-book";
import { ParticipantsList } from "@/components/room/participants-list";
import { TradeHistoryTabs } from "@/components/room/trade-history-tabs";
import { TradingForm } from "@/components/room/trading-form";
import { useBinanceFutures } from "@/hooks/use-binance-futures";
import { createClient } from "@/lib/supabase/client";
import React, { useEffect, useRef, useState } from "react";
import { TradingOverviewContainer } from "./trading-overview-container";
import { TradingViewChartComponent } from "./trading-view-chart";

function RoomJoiner({ roomId }: { roomId: string }) {
  useEffect(() => {
    async function joinRoom() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      try {
        const { data: existing } = await supabase
          .from("trading_room_participants")
          .select("id")
          .eq("room_id", roomId)
          .eq("user_id", user.id)
          .is("left_at", null)
          .maybeSingle();

        if (!existing) {
          const { error } = await supabase
            .from("trading_room_participants")
            .insert({
              room_id: roomId,
              user_id: user.id,
            });

          if (error) {
            // Handle duplicate key constraint gracefully
            if (error.code === "23505") {
              console.log("User already in room, skipping duplicate insert");
            } else {
              console.error("Error joining room:", error);
            }
          } else {
            console.log("Successfully joined room via RoomJoiner");
          }
        }
      } catch (error) {
        console.error("Error in RoomJoiner:", error);
      }
    }
    joinRoom();
  }, [roomId]);
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
            <MarketOverview symbol={symbol} data={marketData} />
          </div>
          <div className="w-full xl:flex-[1] border min-h-[120px] xl:min-h-[80px] h-auto xl:overflow-visible">
            <TradingOverviewContainer roomId={roomId} key={roomId} />
          </div>
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
  );
}
