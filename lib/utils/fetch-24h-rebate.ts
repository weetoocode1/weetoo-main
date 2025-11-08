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

    let last24h: number;

    if (broker === "orangex") {
      const { OrangeXAPI } = await import("@/lib/broker/orangex-api");
      const orangexInstance = new OrangeXAPI();

      const endTime = queryEndTime;
      const start24 = endTime - oneDayMs + 1;

      try {
        const pageSize = 100;
        let offset = 1;
        const out: Array<{ myCommission: string }> = [];

        for (let page = 0; page < 200; page++) {
          const res = await (
            orangexInstance as unknown as {
              makeRequest: <T, R>(endpoint: string, params: T) => Promise<R>;
            }
          ).makeRequest<
            {
              offset: number;
              count: number;
              uid: string;
              sourceType: string;
              startTime: number;
              endTime: number;
            },
            { result?: { data?: Array<{ myCommission: string }> } }
          >("/multilevelPartnerDataStatistics/userCommissionStatistics", {
            offset,
            count: pageSize,
            uid,
            sourceType,
            startTime: start24,
            endTime: endTime,
          });

          const list = Array.isArray(res.result?.data) ? res.result.data : [];
          out.push(...list);
          if (list.length < pageSize) break;
          offset += 1;
          await new Promise((r) => setTimeout(r, 120));
        }

        last24h = out.reduce(
          (sum, r) => sum + (parseFloat(String(r?.myCommission || 0)) || 0),
          0
        );
      } catch (error) {
        console.error(`Error fetching OrangeX 24h data:`, error);
        last24h = 0;
      }
    } else {
      const rows24h = commissionData.filter((r: CommissionData) => {
        const statsDate = toNum(r.statsDate);
        return statsDate >= last24hStart && statsDate <= queryEndTime;
      });

      last24h = rows24h.reduce(
        (sum: number, r: CommissionData) =>
          sum + (parseFloat(String(r?.commission || 0)) || 0),
        0
      );
    }

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
