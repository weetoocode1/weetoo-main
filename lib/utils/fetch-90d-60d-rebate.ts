export interface Fetch90d60dRebateResult {
  rebate90d60d: number;
  success: boolean;
  error?: string;
}

export async function fetch90d60dRebateFromBroker(
  broker: "deepcoin" | "orangex" | "lbank" | "bingx",
  uid: string
): Promise<Fetch90d60dRebateResult> {
  try {
    const BrokerAPI = await import(`@/lib/broker/${broker}-api`).then(
      (m) => m.default
    );
    const brokerInstance = new BrokerAPI();

    if (!brokerInstance.isAPIActive()) {
      return {
        rebate90d60d: 0,
        success: false,
        error: "Broker API is not active",
      };
    }

    const tradingHistory = await brokerInstance.getTradingHistory(uid);

    if (!Array.isArray(tradingHistory) || tradingHistory.length === 0) {
      return { rebate90d60d: 0, success: true };
    }

    const firstTrade = tradingHistory[0] as {
      _summaries?: {
        last90d?: { commissionUsdt?: number };
        last60d?: { commissionUsdt?: number };
      };
    };

    const rebate90d60d =
      broker === "deepcoin"
        ? firstTrade?._summaries?.last60d?.commissionUsdt || 0
        : firstTrade?._summaries?.last90d?.commissionUsdt || 0;

    return { rebate90d60d, success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `Error fetching 90d/60d rebate for ${broker} UID ${uid}:`,
      errorMessage
    );
    return { rebate90d60d: 0, success: false, error: errorMessage };
  }
}

