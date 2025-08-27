// Common interfaces for all broker APIs

export interface BrokerCredentials {
  apiKey?: string;
  apiSecret?: string;
  apiPassphrase?: string;
  clientId?: string;
  clientSecret?: string;
  baseUrl: string;
}

export interface UIDVerificationResult {
  verified: boolean;
  isReferral?: boolean;
  reason?: string;
  data?: unknown;
  message?: string;
}

export interface CommissionData {
  uid: string;
  tradeAmount: string;
  fee: string;
  commission: string;
  rebateRate?: string;
  sourceType?: string;
  [key: string]: unknown; // Allow additional fields
}

export interface TradingHistory {
  uid: string;
  tradeAmount: string;
  timestamp?: number;
  [key: string]: unknown;
}

export interface ReferralData {
  uid: number | string;
  level?: number;
  rebateRate?: string;
  createTime?: number;
  [key: string]: unknown;
}

export interface BrokerAPI {
  verifyUID(uid: string): Promise<UIDVerificationResult>;
  getCommissionData(
    uid: string,
    sourceType?: string
  ): Promise<CommissionData[]>;
  getTradingHistory(uid: string): Promise<TradingHistory[]>;
  getReferrals(): Promise<ReferralData[]>;
  getTradingVolume(uid: string): Promise<string>;
  isAPIActive(): boolean;
}

export type BrokerType =
  | "deepcoin"
  | "orangex"
  | "bingx"
  | "okx"
  | "bybit"
  | "gate"
  | "kucoin"
  | "mexc"
  | "binance";

export interface BrokerConfig {
  name: string;
  type: BrokerType;
  credentials: BrokerCredentials;
  isActive: boolean;
}
