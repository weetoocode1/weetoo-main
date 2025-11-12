import type { CommissionData } from "@/lib/broker/broker-types";

export interface Fetch24hRebateResult {
  last24h: number;
  success: boolean;
  error?: string;
}

export async function fetch24hRebateFromBroker(
  broker: "deepcoin" | "orangex" | "lbank" | "bingx",
  uid: string,
  sourceType: string = "PERPETUAL"
): Promise<Fetch24hRebateResult> {
  try {
    const BrokerAPI = await import(`@/lib/broker/${broker}-api`).then(
      (m) => m.default
    );
    const brokerInstance = new BrokerAPI();

    if (!brokerInstance.isAPIActive()) {
      return { last24h: 0, success: false, error: "Broker API is not active" };
    }

    // For LBank, OrangeX, and DeepCoin, use getTradingHistory to get accurate 24h summaries
    if (broker === "lbank" || broker === "orangex" || broker === "deepcoin") {
      try {
        const tradingHistory = await brokerInstance.getTradingHistory(uid);

        if (!Array.isArray(tradingHistory) || tradingHistory.length === 0) {
          return { last24h: 0, success: true };
        }

        // Extract 24h summary from the first trade's _summaries
        const firstTrade = tradingHistory[0] as {
          _summaries?: {
            last24h?: { commissionUsdt?: number };
          };
        };

        const last24h = firstTrade?._summaries?.last24h?.commissionUsdt || 0;

        return { last24h, success: true };
      } catch (tradingHistoryError) {
        const errorMessage =
          tradingHistoryError instanceof Error
            ? tradingHistoryError.message
            : String(tradingHistoryError);
        console.error(
          `Error fetching ${broker} 24h rebate from trading history:`,
          errorMessage
        );
        return { last24h: 0, success: false, error: errorMessage };
      }
    }

    const commissionData = await brokerInstance.getCommissionData(
      uid,
      sourceType
    );

    if (!Array.isArray(commissionData) || commissionData.length === 0) {
      return { last24h: 0, success: true };
    }

    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const queryEndTime = now - oneDayMs;
    const last24hStart = queryEndTime - oneDayMs + 1;

    const toNum = (v: unknown): number => {
      if (typeof v === "number") return v;
      if (typeof v === "string") {
        const n = parseInt(v, 10);
        return Number.isFinite(n) ? n : 0;
      }
      return 0;
    };

    // For other brokers (DeepCoin, BingX), calculate from commission data
    const rows24h = commissionData.filter((r: CommissionData) => {
      const statsDate = toNum(r.statsDate);
      return statsDate >= last24hStart && statsDate <= queryEndTime;
    });

    const last24h = rows24h.reduce(
      (sum: number, r: CommissionData) =>
        sum + (parseFloat(String(r?.commission || 0)) || 0),
      0
    );

    return { last24h, success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `Error fetching 24h rebate for ${broker} UID ${uid}:`,
      errorMessage
    );
    return { last24h: 0, success: false, error: errorMessage };
  }
}
