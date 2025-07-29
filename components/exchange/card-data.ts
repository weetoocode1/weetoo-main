import { type Exchange } from "./exchanges-data";

// Card types and data
export type CardColor = "gold" | "silver" | "bronze";
export type CardPosition = "left" | "center" | "right";

export interface CardData {
  rank: number;
  name: string;
  username: string;
  totalReturn: number;
  portfolio: number;
  winRate: number;
  trades: number;
  winStreak: number;
  position: CardPosition;
  color: CardColor;
}

export const createCardData = (exchanges: Exchange[]): CardData[] => [
  {
    rank: 2,
    name: exchanges[1]?.name || "Bitget",
    username: `@${exchanges[1]?.id || "bitget"}`,
    totalReturn: exchanges[1]?.paybackRate || 55,
    portfolio: 0,
    winRate: 0,
    trades: 0,
    winStreak: 0,
    position: "left",
    color: "silver",
  },
  {
    rank: 1,
    name: exchanges[0]?.name || "Binance",
    username: `@${exchanges[0]?.id || "binance"}`,
    totalReturn: exchanges[0]?.paybackRate || 35,
    portfolio: 986200,
    winRate: 79.1,
    trades: 287,
    winStreak: 8,
    position: "center",
    color: "gold",
  },
  {
    rank: 3,
    name: exchanges[2]?.name || "OKX",
    username: `@${exchanges[2]?.id || "okx"}`,
    totalReturn: exchanges[2]?.paybackRate || 55,
    portfolio: 0,
    winRate: 0,
    trades: 0,
    winStreak: 0,
    position: "right",
    color: "bronze",
  },
];
