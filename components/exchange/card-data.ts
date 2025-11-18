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

export interface CardDataWithExchanges {
  cardData: CardData[];
  sortedExchanges: Exchange[];
}

export const createCardData = (
  exchanges: Exchange[]
): CardDataWithExchanges => {
  // Filter to only exchanges with buttons (same as comparison table)
  const exchangesWithUidAndSignup = ["deepcoin", "orangex", "lbank", "bingx"];
  const filtered = exchanges.filter((exchange) =>
    exchangesWithUidAndSignup.includes(exchange.id)
  );

  // Helper function to format null/empty values
  const formatValue = (
    value: string | null | undefined,
    defaultValue = "—"
  ): string => {
    if (!value || value.trim() === "" || value === "-" || value === "null") {
      return defaultValue;
    }
    return value;
  };

  // Calculate score for each exchange (same logic as the table)
  const calculateScore = (exchange: Exchange): number => {
    let score = 0;
    score += Math.min(exchange.paybackRate * 0.4, 40);
    const tradingDiscount = formatValue(exchange.tradingDiscount);
    if (tradingDiscount !== "—" && tradingDiscount !== "0%") {
      score += 20;
    }
    const limitFeeStr = formatValue(exchange.limitOrderFee, "0%");
    const marketFeeStr = formatValue(exchange.marketOrderFee, "0%");
    const limitFee = parseFloat(limitFeeStr.replace("%", "")) || 0;
    const marketFee = parseFloat(marketFeeStr.replace("%", "")) || 0;
    score += Math.max(0, 20 - (limitFee + marketFee) * 2);
    const event = formatValue(exchange.event);
    if (event !== "—") {
      score += 20;
    }
    return Math.round(score);
  };

  // Sort exchanges by score (descending - highest first)
  const sortedExchanges = [...filtered].sort((a, b) => {
    return calculateScore(b) - calculateScore(a);
  });

  // Take top 3 exchanges
  const top3 = sortedExchanges.slice(0, 3);

  return {
    cardData: [
      {
        rank: 2,
        name: top3[1]?.name || "",
        username: `@${top3[1]?.id || ""}`,
        totalReturn: top3[1]?.paybackRate || 0,
        portfolio: 0,
        winRate: 0,
        trades: 0,
        winStreak: 0,
        position: "left",
        color: "silver",
      },
      {
        rank: 1,
        name: top3[0]?.name || "",
        username: `@${top3[0]?.id || ""}`,
        totalReturn: top3[0]?.paybackRate || 0,
        portfolio: 0,
        winRate: 0,
        trades: 0,
        winStreak: 0,
        position: "center",
        color: "gold",
      },
      {
        rank: 3,
        name: top3[2]?.name || "",
        username: `@${top3[2]?.id || ""}`,
        totalReturn: top3[2]?.paybackRate || 0,
        portfolio: 0,
        winRate: 0,
        trades: 0,
        winStreak: 0,
        position: "right",
        color: "bronze",
      },
    ],
    sortedExchanges: top3,
  };
};
