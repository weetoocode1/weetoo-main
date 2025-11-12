import {
  BrokerAPI,
  ReferralData,
  CommissionData,
  TradingHistory,
} from "./broker-types";

export interface OrangeXAuthResponse {
  code: number;
  result: {
    account: string;
    token: string;
  };
}

export interface OrangeXTradingHistoryResponse {
  code: number;
  result: {
    count: number;
    total: number;
    totalPage: number;
    offset: number;
    data: Array<{
      uid: string;
      email: string;
      account: string;
      showName: string;
      instrumentName: string;
      direction: string;
      amount: string;
      price: string;
      orderType: string;
      orderId: string;
      tradeId: string;
      fee: string;
      feeCoinType: string;
      rpl: string;
      role: string;
      createTime: number;
    }>;
  };
}

export interface OrangeXCommissionResponse {
  code: number;
  result: {
    count: number;
    total: number;
    totalPage: number;
    offset: number;
    data: Array<{
      uid: string;
      tradeAmount: string;
      fee: string;
      incentiveMoneyDeduction: string;
      deductionAfterFee: string;
      partnerCommission: string;
      myCommission: string;
    }>;
  };
}

// Generic API response wrapper used by OrangeX endpoints
export interface OrangeXApiResponse<ResultType> {
  code: number;
  result: ResultType;
}

// Helper types for readability
export type OrangeXTrade =
  OrangeXTradingHistoryResponse["result"]["data"][number];
export type OrangeXTradingHistoryResult =
  OrangeXTradingHistoryResponse["result"];
export type OrangeXCommissionResult = OrangeXCommissionResponse["result"];

export class OrangeXAPI implements BrokerAPI {
  private baseURL: string;
  private clientId: string;
  private clientSecret: string;
  private token: string | null = null;
  private tokenExpiry: number | null = null;
  private fixieURL: string;
  // 90d cache (uid -> { value, ts })
  static NINETY_DAY_CACHE: Map<string, { value: number; ts: number }> =
    new Map();
  private static CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

  constructor() {
    this.baseURL =
      process.env.ORANGEX_API_URL || "https://api.orangex.com/affiliates";
    this.clientId = process.env.ORANGEX_CLIENT_ID || "";
    this.clientSecret = process.env.ORANGEX_CLIENT_SECRET || "";
    this.fixieURL = process.env.FIXIE_URL || "";
  }

  private async authenticate(): Promise<string> {
    // Check if we have a valid token
    if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    // Check if credentials are configured
    if (!this.clientId || !this.clientSecret) {
      throw new Error(
        "OrangeX API credentials not configured. Please set ORANGEX_CLIENT_ID and ORANGEX_CLIENT_SECRET environment variables."
      );
    }

    try {
      const isServerSide = typeof window === "undefined";
      const fetchOptions: RequestInit = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: this.clientId,
          password: this.clientSecret,
        }),
      };

      // Add Fixie proxy on server-side
      if (isServerSide && this.fixieURL) {
        try {
          const undici = await import("undici");
          // @ts-expect-error - Proxy configuration for Node.js fetch
          fetchOptions.dispatcher = new undici.ProxyAgent(this.fixieURL);
        } catch (_error) {
          // silent proxy setup failures
        }
      }

      const response = await fetch(`${this.baseURL}/auth/login`, fetchOptions);

      if (!response.ok) {
        let errorCode: number | null = null;
        let errorMsg: string | null = null;

        try {
          const errorData = await response.json();
          // Try to extract code and msg if they exist
          if (errorData && typeof errorData === "object") {
            errorCode = errorData.code ?? errorData.error_code ?? null;
            errorMsg =
              errorData.msg ?? errorData.message ?? errorData.error ?? null;
          }
        } catch {
          // errorDetails = await response.text().catch(() => "");
        }

        let errorMessage = "";

        if (response.status === 403) {
          if (errorCode !== null || errorMsg) {
            errorMessage = `OrangeX authentication failed: 403 Forbidden. Code: ${
              errorCode ?? "unknown"
            }, Message: ${errorMsg ?? "No message"}. API URL: ${this.baseURL}`;
          } else {
            errorMessage = `OrangeX authentication failed: 403 Forbidden. Possible causes: 1) IP address not whitelisted, 2) Wrong API credentials, 3) Account doesn't have affiliate API access. API URL: ${this.baseURL}`;
          }
        } else {
          errorMessage = `Authentication failed: ${response.status} ${response.statusText}`;
          if (errorCode !== null || errorMsg) {
            errorMessage += `. Code: ${errorCode ?? "unknown"}, Message: ${
              errorMsg ?? "No message"
            }`;
          }
        }

        // suppress verbose auth error detail logs

        throw new Error(errorMessage);
      }

      const authContentType = response.headers.get("content-type");
      if (!authContentType || !authContentType.includes("application/json")) {
        throw new Error(
          `OrangeX auth returned non-JSON response from ${this.baseURL}/auth/login: ${authContentType}`
        );
      }

      const data: OrangeXAuthResponse = await response.json();

      if (data.code !== 0) {
        const errorMessage = `OrangeX authentication failed with code ${data.code}. Please verify your credentials are correct.`;
        throw new Error(errorMessage);
      }

      this.token = data.result.token;
      // Token is valid for 2 days (2 * 24 * 60 * 60 * 1000 milliseconds)
      this.tokenExpiry = Date.now() + 2 * 24 * 60 * 60 * 1000;

      return this.token;
    } catch (error) {
      throw error;
    }
  }

  private async makeRequest<
    RequestBody extends Record<string, unknown>,
    ResultType
  >(
    endpoint: string,
    body: RequestBody
  ): Promise<OrangeXApiResponse<ResultType>> {
    const token = await this.authenticate();

    const url = `${this.baseURL}${endpoint}`;
    const isServerSide = typeof window === "undefined";
    const fetchOptions: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        token: token,
      },
      body: JSON.stringify(body),
    };

    // Add Fixie proxy on server-side
    if (isServerSide && this.fixieURL) {
      try {
        const undici = await import("undici");
        // @ts-expect-error - Proxy configuration for Node.js fetch
        fetchOptions.dispatcher = new undici.ProxyAgent(this.fixieURL);
      } catch (_error) {
        // silent proxy setup failures
      }
    }

    const response = await fetch(url, fetchOptions);

    const contentType = response.headers.get("content-type");
    const isJson = contentType && contentType.includes("application/json");

    if (!response.ok) {
      let errorText = "Unknown error";
      try {
        if (isJson) {
          const errorData = await response.json();
          errorText = JSON.stringify(errorData);
        } else {
          errorText = await response.text();
        }
      } catch {
        errorText = response.statusText || "Unknown error";
      }

      const errorMessage = `OrangeX API error: ${response.status} ${response.statusText}. ${errorText}`;
      throw new Error(errorMessage);
    }

    if (!isJson) {
      const errorText = await response.text().catch(() => "Unknown");
      throw new Error(
        `OrangeX API returned non-JSON response from ${url}: ${contentType}. Response: ${errorText}`
      );
    }

    const data: OrangeXApiResponse<ResultType> = await response.json();

    if (data.code !== 0) {
      const errorMessage = `OrangeX API error: code ${data.code}`;
      throw new Error(errorMessage);
    }

    return data;
  }

  async verifyUID(
    uid: string
  ): Promise<{ verified: boolean; isReferral: boolean }> {
    try {
      // Check if UID exists in trading history
      const tradingHistoryResponse = await this.makeRequest<
        { offset: number; count: number; uid: string },
        OrangeXTradingHistoryResult
      >("/multilevelPartnerDataStatistics/historicalTransaction", {
        offset: 1,
        count: 1,
        uid: uid,
      });

      const hasTradingHistory =
        tradingHistoryResponse.result.data &&
        tradingHistoryResponse.result.data.length > 0;

      // Check if UID is a referral by looking at commission data
      const commissionResponse = await this.makeRequest<
        { offset: number; count: number; uid: string; sourceType: string },
        OrangeXCommissionResult
      >("/multilevelPartnerDataStatistics/userCommissionStatistics", {
        offset: 1,
        count: 1,
        uid: uid,
        sourceType: "PERPETUAL",
      });

      const hasCommission =
        commissionResponse.result.data &&
        commissionResponse.result.data.length > 0;

      // UID is verified if it appears in either trading history OR commission data
      const verified = hasTradingHistory || hasCommission;

      // UID is a referral if it has commission data (regardless of amount)
      const isReferral = hasCommission;

      return { verified, isReferral };
    } catch (_error) {
      return { verified: false, isReferral: false };
    }
  }

  async getTradingHistory(
    uid: string,
    startTime?: number,
    endTime?: number,
    userType?: string
  ): Promise<TradingHistory[]> {
    const tStart = Date.now();
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const thirtyDaysMs = 30 * oneDayMs;
    const ninetyDaysMs = 90 * oneDayMs;

    const defaultEndTime = endTime ?? now - oneDayMs;
    const defaultStartTime = startTime ?? defaultEndTime - ninetyDaysMs + 1;

    try {
      const pageSize = 100;
      const maxPages = 200;
      let offset = 1;
      const allTrades: OrangeXTradingHistoryResponse["result"]["data"] = [];

      for (let page = 0; page < maxPages; page++) {
        const response = await this.makeRequest<
          {
            offset: number;
            count: number;
            uid: string;
            startTime?: number;
            endTime?: number;
          },
          OrangeXTradingHistoryResult
        >("/multilevelPartnerDataStatistics/historicalTransaction", {
          offset,
          count: pageSize,
          uid: uid,
          startTime: defaultStartTime,
          endTime: defaultEndTime,
        });

        const items = response.result?.data ?? [];
        allTrades.push(...items);

        if (
          items.length < pageSize ||
          offset >= (response.result?.totalPage ?? 1)
        ) {
          break;
        }

        offset += 1;
        await new Promise((r) => setTimeout(r, 120));
      }

      const mapped: TradingHistory[] = allTrades.map((trade) => ({
        uid: trade.uid,
        tradeAmount: trade.amount,
        timestamp: trade.createTime,
        instrumentName: trade.instrumentName,
        direction: trade.direction,
        price: trade.price,
        orderType: trade.orderType,
        orderId: trade.orderId,
        tradeId: trade.tradeId,
        fee: trade.fee,
        feeCoinType: trade.feeCoinType,
        rpl: trade.rpl,
        role: trade.role,
        commissionUsdt: "0",
        status: "Not Distributed",
      }));

      // const last24hStart = now - oneDayMs;
      // const last30dStart = now - thirtyDaysMs;
      // const last90dStart = now - ninetyDaysMs;

      const endTimeForCommission = now - oneDayMs;
      const start24ForCommission = endTimeForCommission - oneDayMs + 1;
      const start30ForCommission = endTimeForCommission - thirtyDaysMs + 1;
      const start90ForCommission = endTimeForCommission - ninetyDaysMs + 1;

      const fetchCommissionRange = async (
        startTime: number,
        endTimeMs: number
      ): Promise<number> => {
        const pageSize = 100;
        let offset = 1;
        let total = 0;
        for (let page = 0; page < 200; page++) {
          const res = await this.makeRequest<
            {
              offset: number;
              count: number;
              uid: string;
              sourceType: string;
              startTime: number;
              endTime: number;
            },
            OrangeXCommissionResult
          >("/multilevelPartnerDataStatistics/userCommissionStatistics", {
            offset,
            count: pageSize,
            uid,
            sourceType: "PERPETUAL",
            startTime,
            endTime: endTimeMs,
          });
          const list = Array.isArray(res.result?.data) ? res.result.data : [];
          total += list.reduce(
            (sum, r) => sum + (parseFloat(String(r?.myCommission || 0)) || 0),
            0
          );
          if (list.length < pageSize) break;
          offset += 1;
          await new Promise((r) => setTimeout(r, 120));
        }
        return total;
      };

      const [last24hCommission, last30dCommission] = await Promise.all([
        fetchCommissionRange(start24ForCommission, endTimeForCommission),
        fetchCommissionRange(start30ForCommission, endTimeForCommission),
      ]);

      const cached = OrangeXAPI.NINETY_DAY_CACHE.get(uid);
      const cacheValid =
        cached && Date.now() - cached.ts < OrangeXAPI.CACHE_TTL_MS;
      const last90dCommission = cacheValid
        ? cached.value
        : await fetchCommissionRange(
            start90ForCommission,
            endTimeForCommission
          );

      const summary24h = {
        commission: 0,
        commissionUsdt: last24hCommission,
      };
      const summary30d = {
        commission: 0,
        commissionUsdt: last30dCommission,
      };
      const summary90d = {
        commission: 0,
        commissionUsdt: last90dCommission,
      };

      const summaries = {
        last24h: summary24h,
        last30d: summary30d,
        last90d: summary90d,
      };

      const durationMs = Date.now() - tStart;
      console.log("[OrangeX] getTradingHistory: Summary", {
        uid,
        totalRecords: mapped.length,
        summaries: {
          last24h: {
            commissionUsdt: Number(summary24h.commissionUsdt.toFixed(8)),
          },
          last30d: {
            commissionUsdt: Number(summary30d.commissionUsdt.toFixed(8)),
          },
          last90d: {
            commissionUsdt: Number(summary90d.commissionUsdt.toFixed(8)),
          },
        },
        durationMs: `${durationMs}ms`,
      });

      const resultWithSummaries = mapped.map((trade) => ({
        ...trade,
        _summaries: summaries,
      }));

      return resultWithSummaries;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("[OrangeX] getTradingHistory: Error", {
        uid,
        error: errorMessage,
        durationMs: Date.now() - tStart,
      });
      return [];
    }
  }

  async getCommissionData(
    uid: string,
    sourceType: "PERPETUAL" | "Copy Trading" | "SPOT" = "PERPETUAL"
  ): Promise<CommissionData[]> {
    // Time windows
    const tStart = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const thirtyDaysMs = 30 * oneDayMs;
    const ninetyDaysMs = 90 * oneDayMs;
    const endTime = Date.now() - oneDayMs; // up to yesterday (T+1)
    const start30 = endTime - thirtyDaysMs + 1;
    const start90 = endTime - ninetyDaysMs + 1;

    // Paged fetch for a given time range (uses offset/count)
    const fetchRange = async (
      startTime: number,
      endTimeMs: number
    ): Promise<OrangeXCommissionResult["data"]> => {
      const pageSize = 100;
      let offset = 1;
      const out: OrangeXCommissionResult["data"] = [];
      for (let page = 0; page < 200; page++) {
        const res = await this.makeRequest<
          {
            offset: number;
            count: number;
            uid: string;
            sourceType: string;
            startTime: number;
            endTime: number;
          },
          OrangeXCommissionResult
        >("/multilevelPartnerDataStatistics/userCommissionStatistics", {
          offset,
          count: pageSize,
          uid,
          sourceType,
          startTime,
          endTime: endTimeMs,
        });
        const list = Array.isArray(res.result?.data) ? res.result.data : [];
        out.push(...list);
        if (list.length < pageSize) break;
        offset += 1;
        await new Promise((r) => setTimeout(r, 120));
      }
      return out;
    };

    try {
      // Fast path: load last 30 days (also used to compute 24h)
      const recent = await fetchRange(start30, endTime);

      // Map to common shape (no per-row timestamp; range determines period)
      const mapRows = (rows: OrangeXCommissionResult["data"]) =>
        rows.map((row) => ({
          uid: row.uid,
          tradeAmount: row.tradeAmount,
          fee: row.fee,
          commission: row.myCommission,
          sourceType,
          partnerCommission: row.partnerCommission,
          incentiveMoneyDeduction: row.incentiveMoneyDeduction,
          deductionAfterFee: row.deductionAfterFee,
        }));

      const recentMapped: CommissionData[] = mapRows(recent);

      // Helpers
      const sumCommission = (rows: CommissionData[]) =>
        rows.reduce((s, r) => s + (parseFloat(String(r.commission)) || 0), 0);

      // 30d total
      const last30d = sumCommission(recentMapped);

      // 24h total requires a 24h-specific query because rows have no date field
      const start24 = endTime - oneDayMs + 1;
      const last24Rows = await fetchRange(start24, endTime);
      const last24h = sumCommission(mapRows(last24Rows));

      const durationMs = Date.now() - tStart;
      console.log("[OrangeX] Commission Summary", {
        uid,
        last24h: Number(last24h.toFixed(8)),
        last30d: Number(last30d.toFixed(8)),
        recordsFetched: recentMapped.length,
        durationMs,
      });

      // 90d cached/background computation
      const cached = OrangeXAPI.NINETY_DAY_CACHE.get(uid);
      const cacheValid =
        cached && Date.now() - cached.ts < OrangeXAPI.CACHE_TTL_MS;

      if (!cacheValid) {
        (async () => {
          try {
            const older = await fetchRange(start90, start30 - 1);
            const olderSum = sumCommission(mapRows(older));
            const full90 = last30d + olderSum;
            OrangeXAPI.NINETY_DAY_CACHE.set(uid, {
              value: full90,
              ts: Date.now(),
            });
            console.log("[OrangeX] Commission Summary (90d ready)", {
              uid,
              last90d: Number(full90.toFixed(8)),
            });
            console.log("[OrangeX] Commission Summary (final)", {
              uid,
              last24h: Number(last24h.toFixed(8)),
              last30d: Number(last30d.toFixed(8)),
              last90d: Number(full90.toFixed(8)),
            });
          } catch {
            // ignore background errors
          }
        })();
      } else {
        console.log("[OrangeX] Commission Summary (cached 90d)", {
          uid,
          last90d: Number((cached?.value || 0).toFixed(8)),
        });
        console.log("[OrangeX] Commission Summary (final)", {
          uid,
          last24h: Number(last24h.toFixed(8)),
          last30d: Number(last30d.toFixed(8)),
          last90d: Number((cached?.value || 0).toFixed(8)),
        });
      }

      // Return last 30d records (consistent with other brokers)
      return recentMapped;
    } catch (error) {
      throw error;
    }
  }

  async getSpotCommissionData(uid: string): Promise<OrangeXCommissionResult> {
    try {
      const response = await this.makeRequest<
        { offset: number; count: number; uid: string; sourceType: "SPOT" },
        OrangeXCommissionResult
      >("/multilevelPartnerDataStatistics/userSpotCommissionStatistics", {
        offset: 1,
        count: 100,
        uid: uid,
        sourceType: "SPOT",
      });

      return response.result;
    } catch (error) {
      throw error;
    }
  }

  async getAccountInfo(): Promise<OrangeXCommissionResult> {
    try {
      // Get basic account info from commission data
      const response = await this.makeRequest<
        { offset: number; count: number; sourceType: "PERPETUAL" },
        OrangeXCommissionResult
      >("/multilevelPartnerDataStatistics/userCommissionStatistics", {
        offset: 1,
        count: 1,
        sourceType: "PERPETUAL",
      });

      return response.result;
    } catch (error) {
      throw error;
    }
  }

  // Implementation of BrokerAPI interface methods
  // Alias for spot commission data
  async "spot-commission"(
    uid: string,
    sourceType: "SPOT" = "SPOT"
  ): Promise<CommissionData[]> {
    return this.getCommissionData(uid, sourceType);
  }

  async getReferrals(): Promise<ReferralData[]> {
    try {
      // OrangeX doesn't have a direct referrals endpoint
      // But we can determine referrals from commission data
      // For now, return empty array - the UI will handle this
      return [];
    } catch (_error) {
      return [];
    }
  }

  async getTradingVolume(uid: string): Promise<string> {
    try {
      const tradingHistory = await this.getTradingHistory(uid);

      if (!tradingHistory || tradingHistory.length === 0) {
        return "0.00";
      }

      const totalVolume = tradingHistory.reduce(
        (sum: number, trade: TradingHistory) => {
          const amount = parseFloat(trade.tradeAmount) || 0;
          return sum + amount;
        },
        0
      );

      return totalVolume.toFixed(2);
    } catch (_error) {
      return "0.00";
    }
  }

  isAPIActive(): boolean {
    return !!(this.clientId && this.clientSecret);
  }
}

export function createOrangeXAPI(): OrangeXAPI {
  return new OrangeXAPI();
}

// Default export for dynamic imports
export default OrangeXAPI;
