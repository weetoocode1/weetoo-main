export const format2 = (value: unknown): string => {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : "-";
};

export type SymbolMeta = {
  qtyStep: number;
  minQty: number;
  maxQty: number;
  priceTick: number;
};

export const getSymbolMeta = (sym: string): SymbolMeta => {
  const s = (sym || "").toUpperCase();
  if (s.includes("BTC"))
    return {
      qtyStep: 0.001,
      minQty: 0.001,
      maxQty: 1_000_000,
      priceTick: 0.01,
    };
  if (s.includes("ETH"))
    return { qtyStep: 0.01, minQty: 0.01, maxQty: 1_000_000, priceTick: 0.01 };
  return { qtyStep: 0.001, minQty: 0.001, maxQty: 1_000_000, priceTick: 0.01 };
};

export const roundToStep = (value: number, step: number): number =>
  step > 0 ? Math.round(value / step) * step : value;

export const clamp = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v));

export type RiskReward = {
  stopPrice: number | null;
  takeProfitPrice: number | null;
  riskAmount: number; // absolute currency
  rewardAmount: number; // absolute currency
  rr: number; // reward / risk (0 if undefined)
};

export const computeRiskReward = (
  entry: number,
  quantity: number,
  slPercent: number | null | undefined,
  tpPercent: number | null | undefined,
  side: "long" | "short"
): RiskReward => {
  const slPct = Number(slPercent) || 0;
  const tpPct = Number(tpPercent) || 0;
  const hasSL = slPct > 0;
  const hasTP = tpPct > 0;

  const stopPrice = hasSL
    ? side === "long"
      ? entry * (1 - slPct / 100)
      : entry * (1 + slPct / 100)
    : null;
  const takeProfitPrice = hasTP
    ? side === "long"
      ? entry * (1 + tpPct / 100)
      : entry * (1 - tpPct / 100)
    : null;

  const priceMoveRisk = hasSL ? Math.abs(entry - (stopPrice as number)) : entry; // if no SL, entire position priced at risk
  const riskAmount = priceMoveRisk * (Number(quantity) || 0);

  const priceMoveReward = hasTP
    ? Math.abs((takeProfitPrice as number) - entry)
    : 0;
  const rewardAmount = priceMoveReward * (Number(quantity) || 0);
  const rr = riskAmount > 0 && rewardAmount > 0 ? rewardAmount / riskAmount : 0;

  return { stopPrice, takeProfitPrice, riskAmount, rewardAmount, rr };
};
