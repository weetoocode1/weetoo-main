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
    startTime?: number | string,
    endTime?: number | string
  ): Promise<TradingHistory[]> {
    const tStart = Date.now();
    console.log("=".repeat(80));
    console.log("[OrangeX] getTradingHistory: METHOD CALLED!");
    console.log("[OrangeX] getTradingHistory: Parameters", {
      uid,
      startTime: startTime
        ? typeof startTime === "number"
          ? new Date(startTime).toISOString()
          : startTime
        : "none",
      endTime: endTime
        ? typeof endTime === "number"
          ? new Date(endTime).toISOString()
          : endTime
        : "none",
      hasCreds: this.isAPIActive(),
    });
    console.log("=".repeat(80));

    if (!this.isAPIActive()) {
      console.log(
        "[OrangeX] getTradingHistory: API credentials not configured"
      );
      return [];
    }

    try {
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;
      const thirtyDaysMs = 30 * oneDayMs;
      const ninetyDaysMs = 90 * oneDayMs;

      // Convert time parameters to timestamps if needed
      const convertToTimestamp = (
        time?: number | string
      ): number | undefined => {
        if (time === undefined) return undefined;
        if (typeof time === "number") return time;
        if (typeof time === "string") {
          const parsed = parseInt(time, 10);
          return isNaN(parsed) ? undefined : parsed;
        }
        return undefined;
      };

      const startTimeNum = convertToTimestamp(startTime);
      const endTimeNum = convertToTimestamp(endTime);

      // Default time window: last 90 days
      // const defaultEndTime = endTimeNum ?? now;
      // const defaultStartTime = startTimeNum ?? defaultEndTime - ninetyDaysMs;

      // Fetch trading history with pagination
      const pageSize = 100;
      const maxPages = 200;
      let offset = 1;
      const allTrades: OrangeXTrade[] = [];

      for (let page = 0; page < maxPages; page++) {
        const requestParams: {
          offset: number;
          count: number;
          uid: string;
          startTime?: number;
          endTime?: number;
        } = {
          offset,
          count: pageSize,
          uid: uid,
        };

        // Add time range if provided
        if (startTimeNum !== undefined) {
          requestParams.startTime = startTimeNum;
        }
        if (endTimeNum !== undefined) {
          requestParams.endTime = endTimeNum;
        }

        console.log("[OrangeX] getTradingHistory: Fetching page", {
          page: page + 1,
          offset,
          pageSize,
          startTime: requestParams.startTime
            ? new Date(requestParams.startTime).toISOString()
            : "none",
          endTime: requestParams.endTime
            ? new Date(requestParams.endTime).toISOString()
            : "none",
        });

        const response = await this.makeRequest<
          typeof requestParams,
          OrangeXTradingHistoryResult
        >(
          "/multilevelPartnerDataStatistics/historicalTransaction",
          requestParams
        );

        const items = response.result?.data ?? [];
        allTrades.push(...items);

        console.log("[OrangeX] getTradingHistory: Raw API Response", {
          page: page + 1,
          resultListLength: items.length,
          totalCount: response.result?.total,
          hasMore: items.length === pageSize,
        });

        // Check if we've reached the last page
        if (
          items.length < pageSize ||
          !response.result?.total ||
          allTrades.length >= response.result.total
        ) {
          console.log("[OrangeX] getTradingHistory: Reached last page", {
            totalPages: page + 1,
            totalRecords: allTrades.length,
          });
          break;
        }

        offset += 1;
        await new Promise((r) => setTimeout(r, 120));
      }

      // Map trades to TradingHistory format
      const mapped: TradingHistory[] = allTrades.map((trade) => {
        const createTimeMs =
          typeof trade.createTime === "string"
            ? parseInt(trade.createTime, 10)
            : trade.createTime;

        return {
          uid: trade.uid,
          tradeAmount: trade.amount,
          timestamp: createTimeMs,
          tradeTimeMs: createTimeMs,
          insertTimeMs: createTimeMs,
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
        };
      });

      // Fetch actual commission data for accurate summaries
      // OrangeX dashboard shows data up to current time, not T+1
      // So we use 'now' as end time to match the dashboard
      const commissionEndTime = now;
      // Last 24h: from 24 hours ago to now
      const last24hStart = now - oneDayMs + 1;
      // Last 30d: from 30 days ago to now
      const last30dStart = now - thirtyDaysMs + 1;
      // Last 90d: from 90 days ago to now
      const last90dStart = now - ninetyDaysMs + 1;

      const fetchCommissionForPeriod = async (
        startTime: number,
        endTime: number,
        periodLabel: string
      ): Promise<number> => {
        const pageSize = 100;
        let offset = 1;
        let total = 0;
        let totalRows = 0;
        for (let page = 0; page < 200; page++) {
          try {
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
              endTime,
            });
            const list = Array.isArray(res.result?.data) ? res.result.data : [];
            totalRows += list.length;
            const periodSum = list.reduce(
              (sum, row) =>
                sum + (parseFloat(String(row.myCommission ?? "0")) || 0),
              0
            );
            total += periodSum;
            console.log(
              `[OrangeX] getTradingHistory: Commission ${periodLabel} - Page ${
                page + 1
              }`,
              {
                startTime: new Date(startTime).toISOString(),
                endTime: new Date(endTime).toISOString(),
                rowsInPage: list.length,
                pageSum: periodSum,
                cumulativeTotal: total,
              }
            );
            if (list.length < pageSize) break;
            offset += 1;
            await new Promise((r) => setTimeout(r, 120));
          } catch (err) {
            console.log(
              `[OrangeX] getTradingHistory: Commission ${periodLabel} fetch error`,
              {
                startTime: new Date(startTime).toISOString(),
                endTime: new Date(endTime).toISOString(),
                error: err instanceof Error ? err.message : String(err),
              }
            );
            break;
          }
        }
        console.log(
          `[OrangeX] getTradingHistory: Commission ${periodLabel} - Final`,
          {
            startTime: new Date(startTime).toISOString(),
            endTime: new Date(endTime).toISOString(),
            totalRows,
            totalCommission: total,
          }
        );
        return total;
      };

      // Fetch commission data for each period separately
      // Note: OrangeX API aggregates by time range, so each query returns data for that specific range
      const [commission24h, commission30d, commission90d] = await Promise.all([
        fetchCommissionForPeriod(last24hStart, commissionEndTime, "24h"),
        fetchCommissionForPeriod(last30dStart, commissionEndTime, "30d"),
        fetchCommissionForPeriod(last90dStart, commissionEndTime, "90d"),
      ]);

      const summary24h = {
        commission: commission24h,
        commissionUsdt: commission24h,
      };
      const summary30d = {
        commission: commission30d,
        commissionUsdt: commission30d,
      };
      const summary90d = {
        commission: commission90d,
        commissionUsdt: commission90d,
      };

      const summaries = {
        last24h: {
          commission: Number(summary24h.commission.toFixed(8)),
          commissionUsdt: Number(summary24h.commissionUsdt.toFixed(8)),
        },
        last30d: {
          commission: Number(summary30d.commission.toFixed(8)),
          commissionUsdt: Number(summary30d.commissionUsdt.toFixed(8)),
        },
        last90d: {
          commission: Number(summary90d.commission.toFixed(8)),
          commissionUsdt: Number(summary90d.commissionUsdt.toFixed(8)),
        },
      };

      const durationMs = Date.now() - tStart;

      if (mapped.length > 0) {
        console.log(
          "[OrangeX] getTradingHistory: ✅ SUCCESS - Data Retrieved",
          {
            uid,
            totalRecords: mapped.length,
            durationMs: `${durationMs}ms`,
            summaries,
          }
        );
      } else {
        console.log("[OrangeX] getTradingHistory: ⚠️ NO DATA - Empty Result", {
          uid,
          totalRecords: 0,
          durationMs: `${durationMs}ms`,
          summaries,
        });
      }

      // Attach summaries to each trade (like LBank)
      const resultWithSummaries = mapped.map((trade) => ({
        ...trade,
        _summaries: summaries,
      }));

      return resultWithSummaries;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.log("[OrangeX] getTradingHistory: Error", {
        uid,
        error: errMsg,
      });
      // Return empty array on error (graceful degradation)
      return [];
    }
  }

  async getCommissionData(
    uid: string,
    sourceType: "PERPETUAL" | "Copy Trading" | "SPOT" = "PERPETUAL"
  ): Promise<CommissionData[]> {
    // Time windows
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
          } catch {
            // ignore background errors
          }
        })();
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
