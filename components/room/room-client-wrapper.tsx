"use client";

import { TradingRoomWindow } from "./room-window";

interface RoomClientWrapperProps {
  hostId: string;
  roomName: string;
  isPublic: boolean;
  roomType: "regular" | "voice";
  symbol: string;
  roomId: string;
  virtualBalance: number;
  initialUpdatedAt: string;
}

export function RoomClientWrapper({
  hostId,
  roomName,
  isPublic,
  roomType,
  symbol,
  roomId,
  virtualBalance,
  initialUpdatedAt,
}: RoomClientWrapperProps) {
  return (
    <TradingRoomWindow
      hostId={hostId}
      roomName={roomName}
      isPublic={isPublic}
      roomType={roomType}
      symbol={symbol}
      roomId={roomId}
      virtualBalance={virtualBalance}
      initialUpdatedAt={initialUpdatedAt}
    />
  );
}
