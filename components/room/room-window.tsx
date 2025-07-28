"use client";

import { useVirtualBalance } from "@/hooks/use-virtual-balance";
import { RoomWindowContent } from "./room-window-content";
import { WindowTitleBar } from "./window-title-bar";
import React, { useState } from "react";
import { useRoomRealtimeSync } from "@/hooks/use-room-realtime-sync";

interface TradingRoomWindowProps {
  roomName: string;
  isPublic: boolean;
  roomType: "regular" | "voice";
  symbol: string;
  roomId: string;
  hostId: string;
  virtualBalance: number;
  initialUpdatedAt: string;
}

export function TradingRoomWindow({
  roomName: initialRoomName,
  isPublic: initialIsPublic,
  roomType,
  symbol: initialSymbol,
  roomId,
  hostId,
  virtualBalance: _virtualBalance, // ignore static prop
  initialUpdatedAt,
}: TradingRoomWindowProps) {
  const virtualBalance = useVirtualBalance(roomId);
  const [currentPrice, setCurrentPrice] = useState<number | undefined>(
    undefined
  );
  // Use real-time sync hook
  const { roomName, isPublic, symbol, setSymbol } = useRoomRealtimeSync({
    roomId,
    initialRoomName,
    initialIsPublic,
    initialSymbol,
  });
  return (
    <div className="w-full min-h-screen bg-background flex flex-col">
      <WindowTitleBar
        roomName={roomName}
        isPublic={isPublic}
        roomType={roomType}
        onCloseRoom={() => {}}
        onTitleBarMouseDown={() => {}}
        virtualBalance={virtualBalance ?? 0}
        hostId={hostId}
        roomId={roomId}
        symbol={symbol}
        currentPrice={currentPrice}
        setSymbol={setSymbol}
        initialUpdatedAt={initialUpdatedAt}
      />
      <div className="flex-1">
        <RoomWindowContent
          symbol={symbol}
          roomId={roomId}
          hostId={hostId}
          virtualBalance={virtualBalance ?? 0}
          roomType={roomType}
          onCurrentPrice={setCurrentPrice}
        />
      </div>
    </div>
  );
}
