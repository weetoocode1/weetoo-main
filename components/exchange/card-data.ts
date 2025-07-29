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

export const createCardData = (exchanges: Exchange[]): CardData[] => {
  // Sort exchanges by score (same logic as the table)
  const sortedExchanges = [...exchanges].sort((a, b) => {
    // Calculate score for each exchange
    const calculateScore = (exchange: Exchange): number => {
      let score = 0;
      score += Math.min(exchange.paybackRate * 0.4, 40);
      if (exchange.tradingDiscount !== "-") {
        score += 20;
      }
      const limitFee = parseFloat(exchange.limitOrderFee.replace("%", ""));
      const marketFee = parseFloat(exchange.marketOrderFee.replace("%", ""));
      score += Math.max(0, 20 - (limitFee + marketFee) * 2);
      if (exchange.event && exchange.event !== "-") {
        score += 20;
      }
      return Math.round(score);
    };

    return calculateScore(b) - calculateScore(a);
  });

  // Take top 3 exchanges
  const top3 = sortedExchanges.slice(0, 3);

  return [
    {
      rank: 2,
      name: top3[1]?.name || "Bitget",
      username: `@${top3[1]?.id || "bitget"}`,
      totalReturn: top3[1]?.paybackRate || 55,
      portfolio: 0,
      winRate: 0,
      trades: 0,
      winStreak: 0,
      position: "left",
      color: "silver",
    },
    {
      rank: 1,
      name: top3[0]?.name || "Binance",
      username: `@${top3[0]?.id || "binance"}`,
      totalReturn: top3[0]?.paybackRate || 35,
      portfolio: 986200,
      winRate: 79.1,
      trades: 287,
      winStreak: 8,
      position: "center",
      color: "gold",
    },
    {
      rank: 3,
      name: top3[2]?.name || "OKX",
      username: `@${top3[2]?.id || "okx"}`,
      totalReturn: top3[2]?.paybackRate || 55,
      portfolio: 0,
      winRate: 0,
      trades: 0,
      winStreak: 0,
      position: "right",
      color: "bronze",
    },
  ];
};
