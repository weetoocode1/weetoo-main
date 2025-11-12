// DeepCoin API utilities based on https://www.deepcoin.com/docs/authentication
import {
  BrokerAPI,
  UIDVerificationResult,
  CommissionData,
  ReferralData,
  TradingHistory,
} from "./broker-types";

// Import crypto properly for Node.js environments
import crypto from "crypto";

export interface DeepCoinAPIResponse<T = unknown> {
  code: string;
  msg: string;
  data: T;
}

// ===== DeepCoin typed response shapes used in our code =====
interface DeepCoinUserItem {
  uid: number;
  level?: number;
  rebateRate?: number | string;
  createTime?: number;
  [key: string]: unknown;
}

interface DeepCoinUserListResponse {
  list: DeepCoinUserItem[] | null;
}

interface DeepCoinRebateItem {
  uid?: number;
  level?: number;
  uidUpLevel?: number;
  rebateRate?: string;
  commission?: string;
  orderId?: string;
  isAbnormalFreeze?: boolean;
  createTime?: number;
  tradeAmount?: number | string;
  amount?: number | string;
  fee?: number | string;
  rebateAmount?: number | string;
  [key: string]: unknown;
}

interface DeepCoinRebateListResponse {
  list: DeepCoinRebateItem[] | null;
}

// interface DeepCoinTradeItem {
//   uid: number | string;
//   tradeAmount?: number | string;
//   amount?: number | string;
//   timestamp?: number;
//   [key: string]: unknown;
// }

// interface DeepCoinTradeListResponse {
//   list: DeepCoinTradeItem[] | null;
// }

// Lightweight cache for 60d totals so repeated calls don't refetch older data
export const DEEPCOIN_60D_CACHE = new Map<
  string,
  { value: number; ts: number }
>();
const DEEPCOIN_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export class DeepCoinAPI implements BrokerAPI {
  private baseURL = "https://api.deepcoin.com";
  private fixieURL: string;
  private apiKey: string;
  private apiSecret: string;
  private apiPassphrase: string;
  private usedNodeCrypto: boolean = false;

  constructor() {
    this.apiKey = process.env.DEEPCOIN_API_KEY || "";
    this.apiSecret = process.env.DEEPCOIN_API_SECRET || "";
    this.apiPassphrase = process.env.DEEPCOIN_API_PASSPHRASE || "";
    this.fixieURL = process.env.FIXIE_URL || "";
  }

  // ===== Time skew synchronization (industry standard) =====
  // Cache UTC skew (remoteUTC - localNow) for a few minutes to keep DC-ACCESS-TIMESTAMP within +/-5s
  private static cachedSkewMs = 0;
  private static lastSkewSyncAt = 0; // ms epoch
  private static readonly SKEW_TTL_MS = 5 * 60 * 1000; // 5 minutes (increased from 2)

  private static async getDeepCoinServerUtcMs(
    baseURL: string
  ): Promise<number | null> {
    try {
      const head = await fetch(baseURL, { method: "HEAD", cache: "no-store" });
      const dateHeader = head.headers.get("date");
      if (dateHeader) {
        const ms = Date.parse(dateHeader);
        if (!Number.isNaN(ms)) {
          return ms;
        }
      }
    } catch {
      // Continue to fallback
    }
    try {
      const getResp = await fetch(baseURL, {
        method: "GET",
        cache: "no-store",
      });
      const dateHeader = getResp.headers.get("date");
      if (dateHeader) {
        const ms = Date.parse(dateHeader);
        if (!Number.isNaN(ms)) {
          return ms;
        }
      }
    } catch {
      // Continue to fallback
    }
    return null;
  }

  private static async syncUtcSkew(baseURL: string): Promise<void> {
    const localNowMs = Date.now();
    const providerMs = await DeepCoinAPI.getDeepCoinServerUtcMs(baseURL);

    if (providerMs !== null) {
      DeepCoinAPI.cachedSkewMs = providerMs - localNowMs;
      DeepCoinAPI.lastSkewSyncAt = localNowMs;
      return;
    }
    try {
      const resp = await fetch(
        "https://worldtimeapi.org/api/timezone/Etc/UTC",
        { cache: "no-store" }
      );
      const data = await resp.json();
      const remoteUtcMs = Date.parse(data.utc_datetime);
      DeepCoinAPI.cachedSkewMs = remoteUtcMs - localNowMs;
      DeepCoinAPI.lastSkewSyncAt = localNowMs;
    } catch {
      // Keep previous skew on fallback failure
    }
  }

  // Generate HMAC SHA256 signature as per DeepCoin docs
  private async generateSignature(
    timestamp: string,
    method: string,
    requestPath: string,
    body: string = ""
  ): Promise<string> {
    // CRITICAL: Build signature string exactly as per DeepCoin docs
    // Format: timestamp + method + requestPath + body
    // Example: 2020-12-08T09:08:57.715ZGET/api/v1/account
    const message = timestamp + method + requestPath + body;

    try {
      if (typeof crypto !== "undefined" && crypto.createHmac) {
        const hmac = crypto.createHmac("sha256", this.apiSecret);
        hmac.update(message, "utf8");
        this.usedNodeCrypto = true;
        return hmac.digest("base64");
      }
      throw new Error("Node.js crypto not available");
    } catch (_error) {
      this.usedNodeCrypto = false;

      const encoder = new TextEncoder();
      const keyData = encoder.encode(this.apiSecret);
      const messageData = encoder.encode(message);

      const key = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );

      const signature = await crypto.subtle.sign("HMAC", key, messageData);

      // Convert to Base64
      const bytes = new Uint8Array(signature);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    }
  }

  // Get current timestamp in ISO8601 (UTC), with provider-aligned skew
  private async getTimestamp(): Promise<string> {
    const nowMs = Date.now();

    // Detect if we're already in UTC timezone (like Vercel)
    const localOffset = new Date().getTimezoneOffset();
    const isUtcTimezone = localOffset === 0; // UTC has 0 offset

    if (
      !DeepCoinAPI.lastSkewSyncAt ||
      nowMs - DeepCoinAPI.lastSkewSyncAt > DeepCoinAPI.SKEW_TTL_MS
    ) {
      await DeepCoinAPI.syncUtcSkew(this.baseURL);
    }

    let adjustedMs = nowMs;

    if (isUtcTimezone) {
      // Already UTC, just apply skew correction
      adjustedMs = nowMs + DeepCoinAPI.cachedSkewMs;
    } else {
      // Local timezone, convert to UTC and apply skew
      adjustedMs = nowMs - localOffset * 60 * 1000 + DeepCoinAPI.cachedSkewMs;
    }

    return new Date(adjustedMs).toISOString();
  }

  // Normalize request path by sorting query parameters deterministically
  private normalizeRequestPath(requestPath: string): string {
    if (!requestPath.includes("?")) return requestPath;
    const [base, query] = requestPath.split("?");
    const params = new URLSearchParams(query);
    // Collect and sort keys for stable order
    const entries: Array<[string, string]> = [];
    params.forEach((v, k) => entries.push([k, v]));
    entries.sort((a, b) =>
      a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1].localeCompare(b[1])
    );
    const sorted = new URLSearchParams();
    for (const [k, v] of entries) sorted.append(k, v);
    return `${base}?${sorted.toString()}`;
  }

  // Make authenticated request through Fixie proxy
  private async makeRequest<T>(
    method: "GET" | "POST",
    endpoint: string,
    body?: Record<string, unknown>
  ): Promise<DeepCoinAPIResponse<T>> {
    const normalizedPath = this.normalizeRequestPath(endpoint);
    const bodyString = body ? JSON.stringify(body) : "";
    const timestamp = await this.getTimestamp();
    const signature = await this.generateSignature(
      timestamp,
      method,
      normalizedPath,
      bodyString
    );

    // Check if Fixie is configured
    if (!this.fixieURL) {
      throw new Error(
        "Fixie proxy not configured. Please set FIXIE_URL environment variable."
      );
    }

    // Make request through Fixie proxy to DeepCoin API
    // Only use proxy on server-side (Node.js environment)
    const isServerSide = typeof window === "undefined";

    const fetchOptions: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        "DC-ACCESS-KEY": this.apiKey,
        "DC-ACCESS-SIGN": signature,
        "DC-ACCESS-TIMESTAMP": timestamp,
        "DC-ACCESS-PASSPHRASE": this.apiPassphrase,
      },
      body: bodyString || undefined,
    };

    // Add proxy only on server-side
    if (isServerSide && this.fixieURL) {
      try {
        const undici = await import("undici");
        // @ts-expect-error - Proxy configuration for Node.js fetch
        fetchOptions.dispatcher = new undici.ProxyAgent(this.fixieURL);
      } catch {
        // Continue without proxy if undici fails
      }
    }

    const response = await fetch(
      `${this.baseURL}${normalizedPath}`,
      fetchOptions
    );

    if (!response.ok) {
      // Handle specific error cases with better error messages
      if (response.status === 401) {
        throw new Error(
          `DeepCoin API error: 401 Unauthorized - Signature verification failed. Check API credentials, timestamp, and signature generation.`
        );
      } else if (response.status === 403) {
        throw new Error(
          `DeepCoin API error: 403 Forbidden - IP not whitelisted or insufficient permissions`
        );
      } else {
        throw new Error(
          `DeepCoin API error: ${response.status} ${response.statusText}`
        );
      }
    }

    return response.json();
  }

  // SECURITY WARNING: UID verification removed due to security vulnerabilities
  // The previous method could expose other users' account information
  // This method should only be used with proper ownership validation

  // Get account balance for UID (ONLY for authenticated user's own UID)
  async getAccountBalance(uid: string): Promise<unknown> {
    try {
      // SECURITY: This should only be called for the authenticated user's own UID
      // DeepCoin API should validate that the UID belongs to the authenticated user
      const response = await this.makeRequest(
        "GET",
        `/deepcoin/account/balance?uid=${uid}`
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // SECURE: Get current authenticated user's account information
  async getCurrentUserInfo(): Promise<unknown> {
    try {
      const response = await this.makeRequest("GET", `/users/self/verify`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // SECURE: Check if current user has a specific UID (ownership validation)
  async validateUIDOwnership(uid: string): Promise<boolean> {
    try {
      // First get current user info to validate authentication
      // const userInfo = await this.getCurrentUserInfo();

      // Check if the UID belongs to the current authenticated user
      // This is a placeholder - we need to find the proper DeepCoin endpoint
      // for UID ownership validation

      return false;
    } catch {
      return false;
    }
  }

  // PROPER UID Validation - Check if UID exists and is valid
  async verifyUID(uid: string): Promise<UIDVerificationResult> {
    try {
      // SECURITY FIX: Use specific UID endpoint instead of general users list
      // This prevents users from claiming ownership of any UID in the system
      const response = await this.makeRequest<DeepCoinUserListResponse>(
        "GET",
        `/deepcoin/agents/users?uid=${uid}`
      );

      // Check if the UID exists and is accessible to this API key
      // let isVerified = false;
      let uidFound = false;

      if (
        response.code === "0" &&
        response.data &&
        response.data.list &&
        Array.isArray(response.data.list)
      ) {
        uidFound = response.data.list.some(
          (item) => String(item.uid) === String(uid)
        );
      }

      // Check if UID was found in the response
      if (response.code === "0" && response.data && response.data.list) {
        // UID exists and we have data
        if (uidFound) {
          return {
            verified: true,
            data: response,
            message: "UID verified successfully",
          };
        } else {
          // API returned data but UID not in the list
          return {
            verified: false,
            reason: "UID not found in affiliate data",
            data: response,
          };
        }
      } else if (
        response.code === "0" &&
        response.data &&
        response.data.list === null
      ) {
        // API returned success but with null list - UID doesn't exist
        return {
          verified: false,
          reason: "UID not found",
          data: response,
        };
      } else {
        // API error or no access
        return {
          verified: false,
          reason: "UID not found or no access",
          data: response,
        };
      }

      // This return is no longer needed - handled above
    } catch (error) {
      return {
        verified: false,
        reason: `API Error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  }

  // TODO: Find proper DeepCoin affiliate endpoints
  // The documentation mentions "Rebate" section - we need to explore this
  async getAffiliateInfo(): Promise<never> {
    try {
      // This is a placeholder - we need to find the actual DeepCoin affiliate endpoint
      throw new Error("DeepCoin affiliate endpoints not yet implemented");
    } catch (error) {
      throw error;
    }
  }

  // AFFILIATE API ENDPOINTS - Based on DeepCoin documentation

  // Get all users who registered through your affiliate link
  async getReferralList(params?: {
    uid?: number;
    startTime?: number;
    endTime?: number;
  }): Promise<DeepCoinUserListResponse> {
    try {
      let endpoint = "/deepcoin/agents/users";
      const queryParams = new URLSearchParams();

      if (params?.uid) queryParams.append("uid", params.uid.toString());
      if (params?.startTime)
        queryParams.append("startTime", params.startTime.toString());
      if (params?.endTime)
        queryParams.append("endTime", params.endTime.toString());

      if (queryParams.toString()) {
        endpoint += `?${queryParams.toString()}`;
      }

      const response = await this.makeRequest<DeepCoinUserListResponse>(
        "GET",
        endpoint
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Get rebate/commission summary for referred users
  async getRebateSummary(params?: {
    uid?: number;
    startTime?: number;
    endTime?: number;
  }): Promise<DeepCoinRebateListResponse> {
    try {
      let endpoint = "/deepcoin/agents/users/rebates";
      const queryParams = new URLSearchParams();

      if (params?.uid) queryParams.append("uid", params.uid.toString());
      if (params?.startTime)
        queryParams.append("startTime", params.startTime.toString());
      if (params?.endTime)
        queryParams.append("endTime", params.endTime.toString());

      if (queryParams.toString()) {
        endpoint += `?${queryParams.toString()}`;
      }

      const response = await this.makeRequest<DeepCoinRebateListResponse>(
        "GET",
        endpoint
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getRebateHistory(params?: {
    uid?: number;
    type?: number;
    startTime?: number;
    endTime?: number;
    pageNum?: number;
    pageSize?: number;
  }): Promise<DeepCoinRebateListResponse> {
    try {
      let endpoint = "/deepcoin/agents/users/rebate-list";
      const queryParams = new URLSearchParams();

      if (params?.uid) queryParams.append("uid", params.uid.toString());
      if (params?.type !== undefined)
        queryParams.append("type", params.type.toString());
      if (params?.startTime)
        queryParams.append("startTime", params.startTime.toString());
      if (params?.endTime)
        queryParams.append("endTime", params.endTime.toString());
      if (params?.pageNum)
        queryParams.append("pageNum", params.pageNum.toString());
      if (params?.pageSize)
        queryParams.append("pageSize", params.pageSize.toString());

      if (queryParams.toString()) {
        endpoint += `?${queryParams.toString()}`;
      }

      const response = await this.makeRequest<DeepCoinRebateListResponse>(
        "GET",
        endpoint
      );

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Check if a specific UID is in your referral list
  async isReferralUID(uid: string): Promise<boolean> {
    try {
      const referrals = await this.getReferralList({ uid: parseInt(uid) });

      // Check if the UID exists in the referral list
      if (referrals?.list && Array.isArray(referrals.list)) {
        return referrals.list.some((ref) => ref.uid.toString() === uid);
      }

      return false;
    } catch {
      return false;
    }
  }

  // Get commission data for a specific referred UID with pagination
  private async fetchRebateHistoryPaged(
    uid: string,
    startTimeMs: number,
    endTimeMs: number,
    retryCount = 0
  ): Promise<DeepCoinRebateItem[]> {
    const pageSize = 100;
    let pageNum = 1;
    const allItems: DeepCoinRebateItem[] = [];

    const startTimeSeconds = Math.floor(startTimeMs / 1000);
    const endTimeSeconds = Math.ceil(endTimeMs / 1000);

    for (let page = 0; page < 200; page++) {
      try {
        if (pageNum > 1) {
          await new Promise((resolve) => setTimeout(resolve, 120));
        }

        const rebateData = await this.getRebateHistory({
          uid: parseInt(uid),
          type: 0,
          startTime: startTimeSeconds,
          endTime: endTimeSeconds,
          pageNum,
          pageSize,
        });

        const list = rebateData?.list || [];
        if (!Array.isArray(list)) {
          break;
        }

        if (list.length === 0) {
          // If first page returns empty and we haven't retried, retry once
          if (pageNum === 1 && retryCount === 0 && allItems.length === 0) {
            console.log(
              "[DeepCoin] fetchRebateHistoryPaged: First page empty, retrying...",
              {
                uid,
                startTime: new Date(startTimeMs).toISOString(),
                endTime: new Date(endTimeMs).toISOString(),
              }
            );
            // Wait a bit and retry
            await new Promise((resolve) => setTimeout(resolve, 500));
            return this.fetchRebateHistoryPaged(
              uid,
              startTimeMs,
              endTimeMs,
              retryCount + 1
            );
          }
          break;
        }

        allItems.push(...list);

        if (list.length < pageSize) break;
        pageNum++;
      } catch (error) {
        // Log error but continue to next page if it's not a critical error
        if (pageNum === 1 && retryCount === 0) {
          // If first page fails and we haven't retried, retry once
          console.log(
            "[DeepCoin] fetchRebateHistoryPaged: First page error, retrying...",
            {
              uid,
              error: error instanceof Error ? error.message : String(error),
            }
          );
          await new Promise((resolve) => setTimeout(resolve, 500));
          return this.fetchRebateHistoryPaged(
            uid,
            startTimeMs,
            endTimeMs,
            retryCount + 1
          );
        }
        // For subsequent pages or after retry, break
        break;
      }
    }

    return allItems;
  }

  // Get trading history for UID with commission summaries (similar to LBank/OrangeX)
  async getTradingHistory(
    uid: string,
    startTime?: number,
    endTime?: number
  ): Promise<TradingHistory[]> {
    const tStart = Date.now();
    console.log("=".repeat(80));
    console.log("[DeepCoin] getTradingHistory: METHOD CALLED!");
    console.log("[DeepCoin] getTradingHistory: Parameters", {
      uid,
      startTime: startTime ? new Date(startTime).toISOString() : "none",
      endTime: endTime ? new Date(endTime).toISOString() : "none",
      hasCreds: this.isAPIActive(),
    });
    console.log("=".repeat(80));

    if (!this.isAPIActive()) {
      console.log(
        "[DeepCoin] getTradingHistory: API credentials not configured"
      );
      return [];
    }

    try {
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;
      const thirtyDaysMs = 30 * oneDayMs;
      const sixtyDaysMs = 60 * oneDayMs;

      // Convert time parameters to timestamps if needed
      const convertToTimestamp = (time?: number): number | undefined => {
        if (time === undefined) return undefined;
        if (typeof time === "number") return time;
        return undefined;
      };

      const startTimeNum = convertToTimestamp(startTime);
      const endTimeNum = convertToTimestamp(endTime);

      // DeepCoin uses UTC+8 timezone (like LBank)
      // Align time windows to UTC+8 for accurate filtering
      const UTC8_OFFSET_MS = 8 * 60 * 60 * 1000;
      const utc8Now = now + UTC8_OFFSET_MS;
      const utc8StartOfToday = Math.floor(utc8Now / oneDayMs) * oneDayMs;
      // const utc8EndOfToday = utc8StartOfToday + oneDayMs - 1;
      // const utc8EndOfTodayInUtc = utc8EndOfToday - UTC8_OFFSET_MS;

      // Default time window for main fetch: use last 30 days to get all rebates
      const defaultEndTime = endTimeNum ?? now;
      const utc8StartOf30DaysAgo = utc8StartOfToday - thirtyDaysMs;
      const last30dStart = utc8StartOf30DaysAgo - UTC8_OFFSET_MS;
      const defaultStartTime = startTimeNum ?? last30dStart;

      // Fetch all rebate history first (this is the reliable source)
      const rebateItems = await this.fetchRebateHistoryPaged(
        uid,
        defaultStartTime,
        defaultEndTime
      );

      console.log("[DeepCoin] getTradingHistory: Fetched rebate history", {
        uid,
        totalItems: rebateItems.length,
        timeWindow: {
          start: new Date(defaultStartTime).toISOString(),
          end: new Date(defaultEndTime).toISOString(),
        },
      });

      // Helper function to truncate to 4 decimal places (no rounding)
      const truncateTo4Decimals = (value: number | string): string => {
        const numValue =
          typeof value === "string" ? parseFloat(value) || 0 : value;
        const multiplier = 10000;
        const truncated = Math.floor(numValue * multiplier) / multiplier;
        return truncated.toFixed(4);
      };

      // Log all items with details (4 decimal places, matching dashboard - truncated, not rounded)
      console.log("[DeepCoin] getTradingHistory: All rebate items", {
        uid,
        totalItems: rebateItems.length,
        items: rebateItems.map((item, index) => {
          const createTimeMs =
            item.createTime && item.createTime > 0
              ? item.createTime < 1e12
                ? item.createTime * 1000
                : item.createTime
              : undefined;
          const commissionValue =
            parseFloat(String(item.commission ?? "0")) || 0;
          const rebateValue =
            parseFloat(String(item.rebateAmount ?? item.commission ?? "0")) ||
            0;
          return {
            index: index + 1,
            createTime: item.createTime,
            createTimeMs: createTimeMs,
            createTimeFormatted: createTimeMs
              ? new Date(createTimeMs).toISOString()
              : "N/A",
            commission: truncateTo4Decimals(commissionValue),
            rebateAmount: truncateTo4Decimals(rebateValue),
            amount: item.amount,
            tradeAmount: item.tradeAmount,
            fee: item.fee,
            rebateRate: item.rebateRate,
            uid: item.uid,
            level: item.level,
          };
        }),
      });

      // Calculate summaries from the fetched data (more reliable than separate API calls)
      // DeepCoin API returns 'commission' field as the rebate amount
      const calculateSummary = (
        items: DeepCoinRebateItem[],
        startTimeMs: number,
        endTimeMs: number
      ): number => {
        return items.reduce((sum, item) => {
          // Convert createTime to milliseconds for comparison
          const createTimeMs =
            item.createTime && item.createTime > 0
              ? item.createTime < 1e12
                ? item.createTime * 1000
                : item.createTime
              : 0;

          // Filter by createTime within the period
          if (createTimeMs < startTimeMs || createTimeMs > endTimeMs) {
            return sum;
          }

          // Use commission as the rebate amount (this is what the API returns)
          const rebate =
            item.commission ?? item.rebateAmount ?? item.amount ?? "0";
          const rebateNum = parseFloat(String(rebate)) || 0;
          return sum + rebateNum;
        }, 0);
      };

      // Calculate time windows for summaries
      const commissionEndTime = now;
      const last24hStart = utc8StartOfToday - UTC8_OFFSET_MS;
      const last30dStartCalc = utc8StartOf30DaysAgo - UTC8_OFFSET_MS;
      const utc8StartOf60DaysAgo =
        utc8StartOfToday - (sixtyDaysMs - 12 * 60 * 60 * 1000);
      const last60dStart = utc8StartOf60DaysAgo - UTC8_OFFSET_MS;

      // Calculate summaries from fetched data
      const commission24h = calculateSummary(
        rebateItems,
        last24hStart,
        commissionEndTime
      );
      const commission30d = calculateSummary(
        rebateItems,
        last30dStartCalc,
        commissionEndTime
      );
      const commission60d = calculateSummary(
        rebateItems,
        last60dStart,
        commissionEndTime
      );

      console.log("[DeepCoin] getTradingHistory: Calculated summaries", {
        last24h: {
          start: new Date(last24hStart).toISOString(),
          end: new Date(commissionEndTime).toISOString(),
          total: commission24h,
        },
        last30d: {
          start: new Date(last30dStartCalc).toISOString(),
          end: new Date(commissionEndTime).toISOString(),
          total: commission30d,
        },
        last60d: {
          start: new Date(last60dStart).toISOString(),
          end: new Date(commissionEndTime).toISOString(),
          total: commission60d,
        },
      });

      const summary24h = {
        commission: commission24h,
        commissionUsdt: commission24h,
      };
      const summary30d = {
        commission: commission30d,
        commissionUsdt: commission30d,
      };
      const summary60d = {
        commission: commission60d,
        commissionUsdt: commission60d,
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
        last60d: {
          commission: Number(summary60d.commission.toFixed(8)),
          commissionUsdt: Number(summary60d.commissionUsdt.toFixed(8)),
        },
      };

      const mapped: TradingHistory[] = rebateItems.map((item) => {
        const createTimeMs =
          item.createTime && item.createTime > 0
            ? item.createTime < 1e12
              ? item.createTime * 1000
              : item.createTime
            : undefined;

        // DeepCoin API: commission = rebate amount (they are the same)
        const rebateValue =
          item.commission ?? item.rebateAmount ?? item.amount ?? "0";
        const rebateNum = parseFloat(String(rebateValue)) || 0;

        return {
          uid: String(item.uid ?? uid),
          tradeAmount: String(item.tradeAmount ?? item.amount ?? 0),
          timestamp: createTimeMs,
          tradeTimeMs: createTimeMs,
          insertTimeMs: createTimeMs,
          commission: truncateTo4Decimals(rebateNum),
          commissionUsdt: truncateTo4Decimals(rebateNum),
          fee: String(item.fee ?? 0),
          rebateRate: String(item.rebateRate ?? 0),
          // Note: This orderId is from rebate-list endpoint and may not match dashboard trade order IDs
          // The dashboard shows actual trade order IDs (e.g., 100111...), but rebate-list returns rebate record IDs (e.g., 100029...)
          orderId: item.orderId,
          // rebateAmount = commission (they are the same in DeepCoin API) - truncated to 4 decimals
          rebateAmount: truncateTo4Decimals(rebateNum),
          createTime: item.createTime,
        };
      });

      const durationMs = Date.now() - tStart;

      if (mapped.length > 0) {
        console.log(
          "[DeepCoin] getTradingHistory: ✅ SUCCESS - Data Retrieved",
          {
            uid,
            totalRecords: mapped.length,
            durationMs: `${durationMs}ms`,
            summaries,
          }
        );
        // Log first mapped item to show rebateAmount is correctly set
        console.log(
          "[DeepCoin] getTradingHistory: First mapped item (showing rebateAmount)",
          {
            uid: mapped[0].uid,
            orderId: mapped[0].orderId,
            commission: mapped[0].commission,
            rebateAmount: mapped[0].rebateAmount,
            note: "rebateAmount = commission (they are the same in DeepCoin API)",
          }
        );
      } else {
        console.log("[DeepCoin] getTradingHistory: ⚠️ NO DATA - Empty Result", {
          uid,
          totalRecords: 0,
          durationMs: `${durationMs}ms`,
          summaries,
        });
      }

      // Attach summaries to each trade (like LBank/OrangeX)
      const resultWithSummaries = mapped.map((trade) => ({
        ...trade,
        _summaries: summaries,
      }));

      return resultWithSummaries;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.log("[DeepCoin] getTradingHistory: Error", {
        uid,
        error: errMsg,
      });
      // Return empty array on error (graceful degradation)
      return [];
    }
  }

  // Get trading volume for a specific UID
  async getTradingVolume(uid: string): Promise<string> {
    try {
      const trades = await this.getTradingHistory(uid);
      const totalVolume = trades.reduce(
        (sum: number, trade: TradingHistory) => {
          const amount = parseFloat(trade.tradeAmount) || 0;
          return sum + amount;
        },
        0
      );
      return totalVolume.toFixed(2);
    } catch {
      return "0.00";
    }
  }

  // Get account information for UID
  async getAccountInfo(uid: string): Promise<unknown> {
    try {
      const response = await this.makeRequest("GET", `/users/self/verify`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Get daily rebates for a specific UID and date
  async getDailyRebates(
    uid: string,
    date: string
  ): Promise<{ rebateAmount: number }> {
    try {
      const response = await this.makeRequest<DeepCoinRebateListResponse>(
        "GET",
        `/agents/users/rebates?uid=${uid}&date=${date}`
      );

      if (response.code === "0" && response.data?.list) {
        const totalRebate = response.data.list.reduce((sum, item) => {
          const rebateAmount = parseFloat(
            String(item.rebateAmount || item.amount || 0)
          );
          return sum + rebateAmount;
        }, 0);

        return { rebateAmount: totalRebate };
      }

      return { rebateAmount: 0 };
    } catch {
      return { rebateAmount: 0 };
    }
  }

  // Implementation of BrokerAPI interface methods
  async getCommissionData(
    uid: string,
    sourceType?: string
  ): Promise<CommissionData[]> {
    if (!this.isAPIActive()) return [];

    try {
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;
      const thirtyDaysMs = 30 * oneDayMs;
      const sixtyDaysMs = 60 * oneDayMs;

      // We aggregate up to yesterday to avoid partial/settlement-day effects
      const queryEndTime = now - oneDayMs;
      // Recent 30 days: from 30 days ago to yesterday
      const fastStartTime = queryEndTime - thirtyDaysMs + 1;
      // Full 60 days: from 60 days ago to yesterday
      // API limit: "start time can not exceed 60 days" - checked against CURRENT time (now), not endTime
      // So we need to ensure startTime is within 60 days of NOW, not endTime
      // Use 59 days + 12 hours to be safely under the 60-day limit
      const fullStartTime = now - (sixtyDaysMs - 12 * 60 * 60 * 1000);

      const mapRows = (items: DeepCoinRebateItem[]): CommissionData[] =>
        items.map((item) => {
          const createTimeMs =
            item.createTime && item.createTime > 0
              ? item.createTime < 1e12
                ? item.createTime * 1000
                : item.createTime
              : 0;

          return {
            uid: String(item.uid ?? ""),
            tradeAmount: String(item.tradeAmount ?? item.amount ?? 0),
            fee: String(item.fee ?? 0),
            commission: String(
              item.commission ?? item.rebateAmount ?? item.amount ?? 0
            ),
            rebateRate: String(item.rebateRate ?? 0),
            sourceType: sourceType || "PERPETUAL",
            statsDate: String(createTimeMs),
          };
        });

      const sumCommission = (rows: CommissionData[]) =>
        rows.reduce((s, r) => s + (parseFloat(String(r.commission)) || 0), 0);

      // Fast path: fetch last 30 days synchronously
      const recentItems = await this.fetchRebateHistoryPaged(
        uid,
        fastStartTime,
        queryEndTime
      );
      const recentMapped = mapRows(recentItems);

      // Compute 24h and 30d totals
      // const last24hStart = queryEndTime - oneDayMs + 1;
      // const rows24h = recentMapped.filter((r) => {
      //   const createTime = parseInt(String(r.statsDate || 0));
      //   return createTime >= last24hStart && createTime <= queryEndTime;
      // });
      // const last24h = sumCommission(rows24h);
      const last30d = sumCommission(recentMapped);

      // Background: fetch prior 30d to compute 60d; use cache if available
      const cache = DEEPCOIN_60D_CACHE.get(uid);
      const cacheValid = cache && Date.now() - cache.ts < DEEPCOIN_CACHE_TTL_MS;

      if (!cacheValid) {
        (async () => {
          try {
            // DeepCoin API seems to have a limit on date range queries
            // Split 60-day query into two 30-day windows to avoid API returning null
            const midPointTime = fastStartTime;

            // First window: days 31-60 (older 30 days)
            const olderItems = await this.fetchRebateHistoryPaged(
              uid,
              fullStartTime,
              midPointTime - 1
            );

            // Second window: days 1-30 (recent 30 days - we already have this, but let's verify)
            // Actually, we already fetched this in recentItems, so we can use that

            // Combine both windows
            const olderMapped = mapRows(olderItems);
            const olderSum = sumCommission(olderMapped);
            const full60Sum = last30d + olderSum;
            DEEPCOIN_60D_CACHE.set(uid, { value: full60Sum, ts: Date.now() });
          } catch {
            // ignore background errors
          }
        })();
      }

      return recentMapped;
    } catch {
      return [];
    }
  }

  async getReferrals(): Promise<ReferralData[]> {
    try {
      // Try to get all referrals first
      const referralData = await this.getReferralList();
      if (referralData?.list && Array.isArray(referralData.list)) {
        return referralData.list.map((item: DeepCoinUserItem) => ({
          uid: item.uid,
          level: item.level,
          rebateRate: String(item.rebateRate || 0),
          createTime: item.createTime,
        }));
      }

      // If getting all referrals fails, return empty array
      // The UI will handle this gracefully
      return [];
    } catch {
      return [];
    }
  }

  isAPIActive(): boolean {
    return !!(this.apiKey && this.apiSecret && this.apiPassphrase);
  }

  // Validate signature by regenerating it
  private validateSignature(signature: string, message: string): boolean {
    try {
      if (typeof crypto !== "undefined" && crypto.createHmac) {
        const hmac = crypto.createHmac("sha256", this.apiSecret);
        hmac.update(message, "utf8");
        const expectedSignature = hmac.digest("base64");
        const isValidBase64 = /^[A-Za-z0-9+/]+={0,2}$/.test(signature);
        const isValidLength = signature.length === 44;
        return (
          signature === expectedSignature && isValidBase64 && isValidLength
        );
      }
      return false;
    } catch {
      return false;
    }
  }
}

// Helper function to create DeepCoin API instance
export function createDeepCoinAPI(): DeepCoinAPI {
  return new DeepCoinAPI();
}

// Default export for dynamic imports
export default DeepCoinAPI;
