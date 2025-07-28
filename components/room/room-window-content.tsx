"use client";

import { Chat } from "@/components/room/chat";
import LightweightChart from "@/components/room/lightweight-chart";
import { LivektParticipantAudio } from "@/components/room/livekit-participant-audio";
import { MarketOverview } from "@/components/room/market-overview";
import { OrderBook } from "@/components/room/order-book";
import { ParticipantsList } from "@/components/room/participants-list";
import { TradeHistoryTabs } from "@/components/room/trade-history-tabs";
import { TradingForm } from "@/components/room/trading-form";
import { Separator } from "@/components/ui/separator";
import { useBinanceFutures } from "@/hooks/use-binance-futures";
import { usePositions } from "@/hooks/use-positions";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "next-themes";
import React, { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { TradingOverviewContainer } from "./trading-overview-container";

function RoomJoiner({ roomId }: { roomId: string }) {
  useEffect(() => {
    async function joinRoom() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      // console.log("[RoomJoiner] Current user:", user);
      if (!user) return;
      const { data: existing } = await supabase
        .from("trading_room_participants")
        .select("id")
        .eq("room_id", roomId)
        .eq("user_id", user.id)
        .is("left_at", null)
        .maybeSingle();
      // console.log("[RoomJoiner] Existing participant:", existing, checkError);
      if (!existing) {
        const {} = await supabase.from("trading_room_participants").insert({
          room_id: roomId,
          user_id: user.id,
        });
        // console.log("[RoomJoiner] Insert participant error:", insertError);
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
  const fetcher = (url: string) => fetch(url).then((res) => res.json());
  const { data } = useSWR(
    `/api/market-data?symbol=${symbol}&include=all`,
    fetcher,
    { refreshInterval: 1000 }
  );

  const { theme } = useTheme();

  // Check if current user is the host
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    const checkIfHost = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setIsHost(user.id === hostId);
      }
    };
    checkIfHost();
  }, [hostId]);

  // Notify parent of current price
  React.useEffect(() => {
    if (onCurrentPrice) {
      onCurrentPrice(data?.ticker?.lastPrice);
    }
  }, [data?.ticker?.lastPrice, onCurrentPrice]);

  // Fetch open interest and funding data from binance futures directly (client-side)
  const { openInterest, fundingRate, nextFundingTime } =
    useBinanceFutures(symbol);
  // Merge with existing data
  const mergedData = {
    ...data,
    openInterest,
    lastFundingRate: fundingRate,
    nextFundingTime,
  };

  // Fetch open positions for the chart
  const { openPositions } = usePositions(roomId) as {
    openPositions: Array<{
      id: string;
      symbol: string;
      side: string;
      quantity: number;
      entry_price: number;
      initial_margin?: number;
      stop_loss?: number;
      take_profit?: number;
    }>;
  };

  // Debug: Log when openPositions changes
  // console.log(
  //   "RoomWindowContent: openPositions updated:",
  //   openPositions?.length,
  //   "positions"
  // );

  // const candles = (data?.candles || []).map((candle: CandlestickData) => ({
  //   time: candle.time,
  //   open: candle.open,
  //   high: candle.high,
  //   low: candle.low,
  //   close: candle.close,
  // }));

  const chartOuterRef = useRef<HTMLDivElement>(null);

  return (
    <div className="h-[calc(100%-3rem)] bg-background flex flex-col gap-2 px-3 py-2">
      <RoomJoiner roomId={roomId} />
      {/* LiveKit participant audio playback */}
      {roomType === "voice" && (
        <LivektParticipantAudio roomId={roomId} hostId={hostId} />
      )}
      <div className="border h-[80px] w-full flex">
        <div className="w-full flex-[1]">
          <MarketOverview symbol={symbol} data={mergedData} />
        </div>
        <Separator className="h-full" orientation="vertical" />
        <div className="w-full flex-1">
          <TradingOverviewContainer roomId={roomId} key={roomId} />
        </div>
      </div>
      <div className="grid grid-cols-6 gap-2 h-full w-full">
        <div className="col-span-5  w-full h-full gap-5">
          <div className="flex flex-col gap-2 w-full h-full">
            <div className="flex w-full h-[550px] gap-2">
              <div
                ref={chartOuterRef}
                className="max-w-[972px] border-border border h-full w-full bg-background"
              >
                <LightweightChart
                  key={`${symbol}-${openPositions?.length || 0}`}
                  theme={theme === "dark" ? "dark" : "light"}
                  symbol={symbol}
                  openPositions={openPositions}
                  ticker={data?.ticker}
                  roomId={roomId}
                  hostId={hostId}
                  isHost={isHost}
                />
              </div>
              <div className="flex-1 border border-border h-full w-full bg-background p-2">
                <OrderBook symbol={symbol} data={data} />
              </div>
              <div className="flex-1 border border-border h-full w-full bg-background p-2">
                <TradingForm
                  currentPrice={data?.ticker?.lastPrice}
                  virtualBalance={virtualBalance}
                  hostId={hostId}
                  roomId={roomId}
                  symbol={symbol}
                />
              </div>
            </div>
            <div className="flex flex-1 w-full border">
              <TradeHistoryTabs
                roomId={roomId}
                currentPrice={data?.ticker?.lastPrice}
                hostId={hostId}
              />
            </div>
          </div>
        </div>
        <div className="col-span-1 w-full h-full">
          <div className="flex w-full h-full flex-col gap-2">
            <div className="w-full h-[300px] border border-border bg-background">
              <ParticipantsList roomId={roomId} hostId={hostId} />
            </div>
            <div className="w-full h-[515px] border border-border bg-background">
              <Chat roomId={roomId} creatorId={hostId} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
