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

  constructor() {
    this.baseURL =
      process.env.ORANGEX_API_URL || "https://api.orangex.com/affiliates";
    this.clientId = process.env.ORANGEX_CLIENT_ID || "";
    this.clientSecret = process.env.ORANGEX_CLIENT_SECRET || "";
  }

  private async authenticate(): Promise<string> {
    // Check if we have a valid token
    if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    try {
      const response = await fetch(`${this.baseURL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: this.clientId,
          password: this.clientSecret,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Authentication failed: ${response.status} ${response.statusText}`
        );
      }

      const authContentType = response.headers.get("content-type");
      if (!authContentType || !authContentType.includes("application/json")) {
        throw new Error(
          `OrangeX auth returned non-JSON response from ${this.baseURL}/auth/login: ${authContentType}`
        );
      }

      const data: OrangeXAuthResponse = await response.json();

      if (data.code !== 0) {
        throw new Error(`Authentication error: ${data.code}`);
      }

      this.token = data.result.token;
      // Token is valid for 2 days (2 * 24 * 60 * 60 * 1000 milliseconds)
      this.tokenExpiry = Date.now() + 2 * 24 * 60 * 60 * 1000;

      return this.token;
    } catch (error) {
      console.error("OrangeX authentication error:", error);
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
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        token: token,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(
        `OrangeX API error: ${response.status} ${response.statusText}`
      );
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error(
        `OrangeX API returned non-JSON response from ${url}: ${contentType}`
      );
    }

    const data: OrangeXApiResponse<ResultType> = await response.json();

    if (data.code !== 0) {
      throw new Error(`OrangeX API error: ${data.code}`);
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
    } catch (error) {
      console.error("OrangeX UID verification error:", error);
      return { verified: false, isReferral: false };
    }
  }

  async getTradingHistory(
    uid: string,
    startTime?: string,
    endTime?: string
  ): Promise<TradingHistory[]> {
    try {
      const response = await this.makeRequest<
        {
          offset: number;
          count: number;
          uid: string;
          startTime?: string;
          endTime?: string;
        },
        OrangeXTradingHistoryResult
      >("/multilevelPartnerDataStatistics/historicalTransaction", {
        offset: 1,
        count: 100,
        uid: uid,
        startTime,
        endTime,
      });

      const items = response.result?.data ?? [];
      const mapped: TradingHistory[] = items.map((trade) => ({
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
      }));

      return mapped;
    } catch (error) {
      console.error("OrangeX trading history error:", error);
      throw error;
    }
  }

  async getCommissionData(
    uid: string,
    sourceType: "PERPETUAL" | "CopyTrading" | "SPOT" = "PERPETUAL"
  ): Promise<CommissionData[]> {
    try {
      const response = await this.makeRequest<
        {
          offset: number;
          count: number;
          uid: string;
          sourceType: typeof sourceType;
        },
        OrangeXCommissionResult
      >("/multilevelPartnerDataStatistics/userCommissionStatistics", {
        offset: 1,
        count: 100,
        uid: uid,
        sourceType,
      });

      const items = response.result?.data ?? [];
      const mapped: CommissionData[] = items.map((row) => ({
        uid: row.uid,
        tradeAmount: row.tradeAmount,
        fee: row.fee,
        commission: row.myCommission,
        sourceType,
        partnerCommission: row.partnerCommission,
        incentiveMoneyDeduction: row.incentiveMoneyDeduction,
        deductionAfterFee: row.deductionAfterFee,
      }));

      return mapped;
    } catch (error) {
      console.error("OrangeX commission data error:", error);
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
      console.error("OrangeX spot commission error:", error);
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
      console.error("OrangeX account info error:", error);
      throw error;
    }
  }

  // Implementation of BrokerAPI interface methods
  async getReferrals(): Promise<ReferralData[]> {
    try {
      // OrangeX doesn't have a direct referrals endpoint
      // But we can determine referrals from commission data
      // For now, return empty array - the UI will handle this
      return [];
    } catch (error) {
      console.error("OrangeX referrals fetch failed:", error);
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
    } catch (error) {
      console.error("OrangeX trading volume error:", error);
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
