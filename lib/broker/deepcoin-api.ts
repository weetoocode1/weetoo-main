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
  private apiKey: string;
  private apiSecret: string;
  private apiPassphrase: string;
  private usedNodeCrypto: boolean = false;

  constructor() {
    this.apiKey = process.env.DEEPCOIN_API_KEY || "";
    this.apiSecret = process.env.DEEPCOIN_API_SECRET || "";
    this.apiPassphrase = process.env.DEEPCOIN_API_PASSPHRASE || "";
  }

  // Generate HMAC SHA256 signature as per DeepCoin docs
  private async generateSignature(
    timestamp: string,
    method: string,
    requestPath: string,
    body: string = ""
  ): Promise<string> {
    // Ensure exact string concatenation as per DeepCoin docs
    // No extra spaces, no encoding issues
    const message = timestamp + method + requestPath + body;

    // Debug the exact message being signed
    console.log("DeepCoin HMAC Input Debug:", {
      timestamp: `"${timestamp}"`,
      method: `"${method}"`,
      requestPath: `"${requestPath}"`,
      body: `"${body}"`,
      concatenated: `"${message}"`,
      messageLength: message.length,
      messageBytes: Buffer.from(message, "utf8").toString("hex"),
      secretLength: this.apiSecret.length,
      secretPreview: this.apiSecret.substring(0, 8) + "...",
    });

    try {
      // Use Node.js built-in crypto for more reliable HMAC-SHA256
      if (typeof crypto !== "undefined" && crypto.createHmac) {
        const hmac = crypto.createHmac("sha256", this.apiSecret);
        hmac.update(message, "utf8"); // Explicitly specify UTF-8 encoding
        this.usedNodeCrypto = true;
        return hmac.digest("base64");
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

  // Get current timestamp in ISO format - Force UTC to avoid timezone issues
  private getTimestamp(): string {
    // Use UTC time directly to ensure consistency between environments
    // This avoids timezone differences between localhost and Vercel
    const now = new Date();

    // Add time offset for Vercel to sync with DeepCoin's server time
    // Based on observed 69-second difference
    const timeOffset = process.env.NODE_ENV === "production" ? 69000 : 0; // 69 seconds for Vercel
    const adjustedTime = new Date(now.getTime() + timeOffset);
    const utcString = adjustedTime.toISOString();

    // Debug timestamp details
    if (process.env.NODE_ENV === "development") {
      console.log("DeepCoin Timestamp Debug:", {
        localTime: now.toString(),
        utcTime: utcString,
        timezoneOffset: now.getTimezoneOffset(),
        unixTimestamp: now.getTime(),
        utcUnixTimestamp: Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          now.getUTCHours(),
          now.getUTCMinutes(),
          now.getUTCSeconds(),
          now.getUTCMilliseconds()
        ),
        timeOffset: timeOffset,
        adjustedTime: utcString,
      });
    }

    return utcString;
  }

  // Make authenticated request
  private async makeRequest<T>(
    method: "GET" | "POST",
    endpoint: string,
    body?: Record<string, unknown>
  ): Promise<DeepCoinAPIResponse<T>> {
    const timestamp = this.getTimestamp();
    const bodyString = body ? JSON.stringify(body) : "";

    // Generate signature
    const signature = await this.generateSignature(
      timestamp,
      method,
      endpoint,
      bodyString
    );

    // Debug logging for signature verification (always enabled for debugging)
    console.log("DeepCoin Signature Debug:", {
      timestamp: timestamp,
      method: method,
      requestPath: endpoint,
      body: bodyString,
      signatureString: timestamp + method + endpoint + bodyString,
      apiKey: this.apiKey.substring(0, 8) + "...",
      secretLength: this.apiSecret.length,
      passphrase: this.apiPassphrase.substring(0, 4) + "...",
      generatedSignature: signature.substring(0, 20) + "...",
      fullSignature: signature, // Show full signature for comparison
      serverTime: new Date().toISOString(),
      timezoneOffset: new Date().getTimezoneOffset(),
      // Add more time details
      currentTime: new Date().toString(),
      utcTime: new Date().toISOString(),
      unixTime: new Date().getTime(),
      // Add signature generation details
      signatureLength: signature.length,
      signatureBase64: btoa(signature), // Show if it's valid Base64
      hmacInput: {
        timestamp: timestamp,
        method: method,
        endpoint: endpoint,
        body: bodyString,
        concatenated: timestamp + method + endpoint + bodyString,
      },
    });

    // Always include debug info in response headers for client-side debugging
    const debugHeaders: Record<string, string> = {
      "X-DeepCoin-Debug-Timestamp": timestamp,
      "X-DeepCoin-Debug-Method": method,
      "X-DeepCoin-Debug-Path": endpoint,
      "X-DeepCoin-Debug-Signature-Length": signature.length.toString(),
      "X-DeepCoin-Debug-Server-Time": new Date().toISOString(),
      // Add signature debug info to headers for client-side access
      "X-DeepCoin-Debug-Signature-Preview": signature.substring(0, 20) + "...",
      "X-DeepCoin-Debug-Signature-Full": signature,
      "X-DeepCoin-Debug-HMAC-Input": timestamp + method + endpoint + bodyString,
    };

    // Store debug info for the broker route to access
    (
      this as DeepCoinAPI & { lastSignatureDebug?: unknown }
    ).lastSignatureDebug = {
      timestamp,
      method,
      endpoint,
      body: bodyString,
      signature: signature,
      signaturePreview: signature.substring(0, 20) + "...",
      hmacInput: timestamp + method + endpoint + bodyString,
      signatureLength: signature.length,
      // Add signature validation info
      signatureValid: this.validateSignature(
        signature,
        timestamp + method + endpoint + bodyString
      ),
      nodeCryptoUsed: this.usedNodeCrypto,
    };

    const headers: Record<string, string> = {
      "DC-ACCESS-KEY": this.apiKey,
      "DC-ACCESS-SIGN": signature,
      "DC-ACCESS-TIMESTAMP": timestamp,
      "DC-ACCESS-PASSPHRASE": this.apiPassphrase,
      "Content-Type": "application/json",
      ...debugHeaders, // Include debug headers
    };

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method,
      headers,
      body: bodyString || undefined,
    });

    if (!response.ok) {
      // Handle specific error cases with better error messages
      if (response.status === 401) {
        // Check if this might be a timestamp issue
        const errorMessage = `DeepCoin API error: 401 Unauthorized - Signature verification failed. Check API credentials, timestamp, and signature generation.`;

        // Log additional info for debugging
        if (process.env.NODE_ENV === "development") {
          console.error("DeepCoin 401 Error Details:", {
            endpoint,
            method,
            timestamp,
            responseStatus: response.status,
            responseText: await response
              .text()
              .catch(() => "Could not read response"),
          });
        }

        // Include debug info in error for client-side debugging
        const debugError = new Error(errorMessage);
        (debugError as Error & { debugInfo?: unknown }).debugInfo = {
          timestamp,
          method,
          endpoint,
          signatureLength: signature.length,
          serverTime: new Date().toISOString(),
        };
        throw debugError;
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
        hmac.update(message);
        const expectedSignature = hmac.digest("base64");
        return signature === expectedSignature;
      }
      return false;
    } catch (_error) {
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
