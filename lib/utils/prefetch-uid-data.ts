export interface PrefetchUIDDataResult {
  verification?: {
    verified: boolean;
    isReferral?: boolean;
  };
  referrals?: unknown[];
  tradingHistory?: unknown[];
  success: boolean;
  error?: string;
}

export async function prefetchUIDData(
  brokerId: string,
  uid: string
): Promise<PrefetchUIDDataResult> {
  try {
    const results: PrefetchUIDDataResult = {
      success: true,
    };

    const broker = brokerId.toLowerCase();

    if (!["deepcoin", "orangex", "lbank", "bingx"].includes(broker)) {
      return {
        success: false,
        error: `Unsupported broker: ${brokerId}`,
      };
    }

    const fetchPromises: Promise<void>[] = [];

    const fetchVerification = async () => {
      try {
        if (broker === "deepcoin") {
          return;
        }

        const response = await fetch("/api/broker", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            broker: brokerId,
            action: "verifyUID",
            uid,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          results.verification = {
            verified: data.verified || false,
            isReferral: data.isReferral || false,
          };
        }
      } catch (error) {
        console.error(`Error fetching verification for ${brokerId}:`, error);
      }
    };

    const fetchReferrals = async () => {
      try {
        if (broker === "bingx") {
          return;
        }

        const response = await fetch("/api/broker", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            broker: brokerId,
            action: "getReferrals",
          }),
        });

        if (response.ok) {
          const data = await response.json();
          results.referrals = Array.isArray(data) ? data : [];
        }
      } catch (error) {
        console.error(`Error fetching referrals for ${brokerId}:`, error);
      }
    };

    const fetchTradingHistory = async () => {
      try {
        const response = await fetch("/api/broker", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            broker: brokerId,
            action: "getTradingHistory",
            uid,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          results.tradingHistory = Array.isArray(data) ? data : [];
        }
      } catch (error) {
        console.error(`Error fetching trading history for ${brokerId}:`, error);
      }
    };

    fetchPromises.push(fetchVerification());
    fetchPromises.push(fetchReferrals());
    fetchPromises.push(fetchTradingHistory());

    await Promise.allSettled(fetchPromises);

    return results;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `Error prefetching UID data for ${brokerId} ${uid}:`,
      errorMessage
    );
    return {
      success: false,
      error: errorMessage,
    };
  }
}
