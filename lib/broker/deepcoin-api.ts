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
  uid: number | string;
  tradeAmount?: number | string;
  amount?: number | string;
  fee?: number | string;
  rebateAmount?: number | string;
  rebateRate?: number | string;
  level?: number;
  createTime?: number;
  [key: string]: unknown;
}

interface DeepCoinRebateListResponse {
  list: DeepCoinRebateItem[] | null;
}

interface DeepCoinTradeItem {
  uid: number | string;
  tradeAmount?: number | string;
  amount?: number | string;
  timestamp?: number;
  [key: string]: unknown;
}

interface DeepCoinTradeListResponse {
  list: DeepCoinTradeItem[] | null;
}

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
      console.log("DeepCoin Server Time: Trying HEAD request to", baseURL);
      const head = await fetch(baseURL, { method: "HEAD", cache: "no-store" });
      const dateHeader = head.headers.get("date");
      console.log(
        "DeepCoin Server Time: HEAD response date header:",
        dateHeader
      );
      if (dateHeader) {
        const ms = Date.parse(dateHeader);
        if (!Number.isNaN(ms)) {
          console.log(
            "DeepCoin Server Time: Parsed HEAD date successfully:",
            ms
          );
          return ms;
        }
      }
    } catch (error) {
      console.error("DeepCoin Server Time: HEAD request failed:", error);
    }
    try {
      console.log("DeepCoin Server Time: Trying GET request to", baseURL);
      const getResp = await fetch(baseURL, {
        method: "GET",
        cache: "no-store",
      });
      const dateHeader = getResp.headers.get("date");
      console.log(
        "DeepCoin Server Time: GET response date header:",
        dateHeader
      );
      if (dateHeader) {
        const ms = Date.parse(dateHeader);
        if (!Number.isNaN(ms)) {
          console.log(
            "DeepCoin Server Time: Parsed GET date successfully:",
            ms
          );
          return ms;
        }
      }
    } catch (error) {
      console.error("DeepCoin Server Time: GET request failed:", error);
    }
    console.log("DeepCoin Server Time: All methods failed, returning null");
    return null;
  }

  private static async syncUtcSkew(baseURL: string): Promise<void> {
    console.log("DeepCoin Skew Sync: Starting sync...");
    const localNowMs = Date.now();
    const providerMs = await DeepCoinAPI.getDeepCoinServerUtcMs(baseURL);

    console.log("DeepCoin Skew Sync Debug:", {
      localNowMs,
      providerMs,
      baseURL,
      providerFound: providerMs !== null,
    });

    if (providerMs !== null) {
      DeepCoinAPI.cachedSkewMs = providerMs - localNowMs;
      DeepCoinAPI.lastSkewSyncAt = localNowMs;
      console.log("DeepCoin Skew Sync: Updated with provider time", {
        cachedSkewMs: DeepCoinAPI.cachedSkewMs,
        lastSkewSyncAt: DeepCoinAPI.lastSkewSyncAt,
      });
      return;
    }
    // Fallback to trusted UTC source
    console.log("DeepCoin Skew Sync: Provider time failed, trying fallback...");
    try {
      const resp = await fetch(
        "https://worldtimeapi.org/api/timezone/Etc/UTC",
        { cache: "no-store" }
      );
      const data = await resp.json();
      const remoteUtcMs = Date.parse(data.utc_datetime);
      DeepCoinAPI.cachedSkewMs = remoteUtcMs - localNowMs;
      DeepCoinAPI.lastSkewSyncAt = localNowMs;
      console.log("DeepCoin Skew Sync: Updated with fallback time", {
        cachedSkewMs: DeepCoinAPI.cachedSkewMs,
        lastSkewSyncAt: DeepCoinAPI.lastSkewSyncAt,
        remoteUtcMs,
        dataUtc: data.utc_datetime,
      });
    } catch (fallbackError) {
      console.error("DeepCoin Skew Sync: Fallback failed", fallbackError);
      /* keep previous skew */
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

    // Debug the exact message being signed (without quotes for clarity)
    console.log("DeepCoin HMAC Input Debug:", {
      timestamp: timestamp,
      method: method,
      requestPath: requestPath,
      body: body,
      concatenated: message,
      messageLength: message.length,
      messageBytes: Buffer.from(message, "utf8").toString("hex"),
      secretLength: this.apiSecret.length,
      secretPreview: this.apiSecret.substring(0, 8) + "...",
      // Add verification that matches DeepCoin docs
      expectedFormat: "timestamp + method + requestPath + body",
      example: "2020-12-08T09:08:57.715ZGET/api/v1/account",
    });

    try {
      // Use Node.js built-in crypto for more reliable HMAC-SHA256
      if (typeof crypto !== "undefined" && crypto.createHmac) {
        const hmac = crypto.createHmac("sha256", this.apiSecret);
        hmac.update(message, "utf8"); // Explicitly specify UTF-8 encoding
        this.usedNodeCrypto = true;
        const signature = hmac.digest("base64");

        // Verify signature format
        console.log("DeepCoin Signature Generation:", {
          messageLength: message.length,
          signatureLength: signature.length,
          signatureFormat: "base64",
          hmacAlgorithm: "sha256",
          encoding: "utf8",
        });

        return signature;
      } else {
        throw new Error("Node.js crypto not available");
      }
    } catch (_error) {
      this.usedNodeCrypto = false;
      // Fallback to Web Crypto API if Node.js crypto not available
      console.warn(
        "Node.js crypto not available, falling back to Web Crypto API"
      );

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

    const adjustedIso = new Date(adjustedMs).toISOString();

    // Always log skew debug info to troubleshoot Vercel issues
    console.log("DeepCoin Timestamp Debug:", {
      localTime: new Date(nowMs).toString(),
      localOffset: localOffset,
      isUtcTimezone: isUtcTimezone,
      adjustedUtc: adjustedIso,
      adjustedMs,
      cachedSkewMs: DeepCoinAPI.cachedSkewMs,
      lastSkewSyncAt: DeepCoinAPI.lastSkewSyncAt,
      environment: process.env.NODE_ENV || "unknown",
    });

    // CRITICAL: Return ISO timestamp per DeepCoin docs format: 2020-12-08T09:08:57.715Z
    // Ensure we're sending the exact format they expect
    return adjustedIso;
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
    const normalized = `${base}?${sorted.toString()}`;

    console.log("DeepCoin Path Normalization:", {
      original: requestPath,
      normalized: normalized,
      base: base,
      queryParams: entries,
      sortedParams: sorted.toString(),
    });

    return normalized;
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

    // Debug logging for Fixie proxy requests
    console.log("DeepCoin API Request:", {
      method: method,
      endpoint: normalizedPath,
      timestamp: timestamp,
      signatureLength: signature.length,
      fixieConfigured: !!this.fixieURL,
      isServerSide: typeof window === "undefined",
    });

    // Store debug info for the broker route to access
    (
      this as DeepCoinAPI & { lastSignatureDebug?: unknown }
    ).lastSignatureDebug = {
      method,
      endpoint: normalizedPath,
      body: bodyString,
      timestamp,
      signatureLength: signature.length,
      signaturePreview: signature.substring(0, 20) + "...",
      signatureFull: signature,
      hmacInput: `${timestamp}${method}${normalizedPath}${bodyString}`,
      targetURL: `${this.baseURL}${normalizedPath}`,
      serverTime: new Date().toISOString(),
      proxyUsed: true,
      fixieConfigured: !!this.fixieURL,
    };

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
        // Use undici for proper Node.js fetch with proxy support
        const undici = await import("undici");
        // @ts-expect-error - Proxy configuration for Node.js fetch
        fetchOptions.dispatcher = new undici.ProxyAgent(this.fixieURL);
        console.log("DeepCoin Fixie Proxy: Using undici proxy dispatcher");
      } catch (error) {
        console.warn("Failed to load undici proxy agent:", error);
        // Continue without proxy if undici fails
      }
    } else {
      console.log(
        "DeepCoin Fixie Proxy: Not using proxy (client-side or no FIXIE_URL)"
      );
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
      console.error("DeepCoin balance fetch failed:", error);
      throw error;
    }
  }

  // SECURE: Get current authenticated user's account information
  async getCurrentUserInfo(): Promise<unknown> {
    try {
      const response = await this.makeRequest("GET", `/users/self/verify`);
      return response.data;
    } catch (error) {
      console.error("DeepCoin current user info fetch failed:", error);
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

      // For now, return false to prevent security issues
      console.warn(
        "UID ownership validation not implemented - security measure"
      );
      return false;
    } catch (error) {
      console.error("DeepCoin UID ownership validation failed:", error);
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
      console.error("DeepCoin UID verification failed:", error);
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
      console.error("DeepCoin affiliate info fetch failed:", error);
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
      console.error("DeepCoin referral list fetch failed:", error);
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
      console.error("DeepCoin rebate summary fetch failed:", error);
      throw error;
    }
  }

  // Get detailed rebate history and commission data
  async getRebateHistory(params?: {
    uid?: number;
    type?: number; // 0: Normal, 1: Abnormal frozen, 2: Total
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
      console.error("DeepCoin rebate history fetch failed:", error);
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
    } catch (error) {
      console.error("DeepCoin referral check failed:", error);
      return false;
    }
  }

  // Get commission data for a specific referred UID
  async getUIDCommission(
    uid: string,
    startTime?: number,
    endTime?: number
  ): Promise<DeepCoinRebateListResponse> {
    try {
      const rebateData = await this.getRebateHistory({
        uid: parseInt(uid),
        startTime,
        endTime,
        pageSize: 1000, // Get all records for this UID
      });

      return rebateData;
    } catch (error) {
      console.error("DeepCoin UID commission fetch failed:", error);
      throw error;
    }
  }

  // Get trading history for UID
  async getTradingHistory(uid: string): Promise<TradingHistory[]> {
    try {
      const response = await this.makeRequest<DeepCoinTradeListResponse>(
        "GET",
        `/deepcoin/trade/fills?uid=${uid}&limit=100`
      );
      const items = response.data?.list ?? [];
      return items.map((trade) => ({
        uid: String(trade.uid),
        tradeAmount: String(trade.tradeAmount ?? trade.amount ?? 0),
        timestamp: trade.timestamp,
      }));
    } catch (error) {
      console.error("DeepCoin trading history fetch failed:", error);
      throw error;
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
    } catch (error) {
      console.error("DeepCoin trading volume fetch failed:", error);
      return "0.00";
    }
  }

  // Get account information for UID
  async getAccountInfo(uid: string): Promise<unknown> {
    try {
      const response = await this.makeRequest("GET", `/users/self/verify`);
      return response.data;
    } catch (error) {
      console.error("DeepCoin account info fetch failed:", error);
      throw error;
    }
  }

  // Implementation of BrokerAPI interface methods
  async getCommissionData(
    uid: string,
    sourceType?: string
  ): Promise<CommissionData[]> {
    try {
      const rebateData = await this.getUIDCommission(uid);
      if (rebateData?.list && Array.isArray(rebateData.list)) {
        return rebateData.list.map((item) => ({
          uid: String(item.uid),
          tradeAmount: String(item.tradeAmount ?? item.amount ?? 0),
          fee: String(item.fee ?? 0),
          commission: String(item.rebateAmount ?? 0),
          rebateRate: String(item.rebateRate ?? 0),
          sourceType: sourceType || "PERPETUAL",
        }));
      }
      return [];
    } catch (error) {
      console.error("DeepCoin commission data fetch failed:", error);
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
    } catch (error) {
      console.error("DeepCoin referrals fetch failed:", error);
      // Return empty array instead of throwing error
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

        // Additional validation for DeepCoin requirements
        const isValidBase64 = /^[A-Za-z0-9+/]+={0,2}$/.test(signature);
        const isValidLength = signature.length === 44; // Base64 SHA256 = 32 bytes = 44 chars
        const exactMatch = signature === expectedSignature;

        console.log("DeepCoin Signature Validation:", {
          exactMatch,
          isValidBase64,
          isValidLength,
          signatureLength: signature.length,
          expectedLength: 44,
          messageLength: message.length,
          signaturePreview: signature.substring(0, 20) + "...",
          expectedPreview: expectedSignature.substring(0, 20) + "...",
        });

        return exactMatch && isValidBase64 && isValidLength;
      }
      return false;
    } catch (error) {
      console.error("DeepCoin Signature Validation Error:", error);
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
