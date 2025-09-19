// Common helper functions for all broker APIs

import {
  BrokerType,
  ReferralData,
  UIDVerificationResult,
} from "./broker-types";

/**
 * Validate UID format and length
 */
export function validateUID(uid: string): { isValid: boolean; error?: string } {
  if (!uid) {
    return { isValid: false, error: "UID is required" };
  }

  if (uid.length > 20) {
    return { isValid: false, error: "UID too long - maximum 20 characters" };
  }

  if (!/^\d+$/.test(uid)) {
    return { isValid: false, error: "UID must contain only digits" };
  }

  if (/^(\d)\1+$/.test(uid)) {
    return { isValid: false, error: "UID cannot be all the same digits" };
  }

  return { isValid: true };
}

/**
 * Check if broker API credentials are configured
 */
export function hasBrokerCredentials(brokerType: BrokerType): boolean {
  switch (brokerType) {
    case "deepcoin":
      return !!(
        process.env.DEEPCOIN_API_KEY &&
        process.env.DEEPCOIN_API_SECRET &&
        process.env.DEEPCOIN_API_PASSPHRASE
      );

    case "orangex":
      return !!(
        process.env.ORANGEX_CLIENT_ID && process.env.ORANGEX_CLIENT_SECRET
      );

    default:
      return false;
  }
}

/**
 * Get broker display name
 */
export function getBrokerDisplayName(brokerType: BrokerType): string {
  const names: Record<BrokerType, string> = {
    deepcoin: "DeepCoin",
    orangex: "OrangeX",
    bingx: "BingX",
    okx: "OKX",
    lbank: "LBank",
    bybit: "Bybit",
    gate: "Gate.io",
    kucoin: "KuCoin",
    mexc: "MEXC",
    binance: "Binance",
  };

  return names[brokerType] || brokerType;
}

/**
 * Format commission amount for display
 */
export function formatCommission(amount: string | number): string {
  const num = parseFloat(String(amount));
  if (isNaN(num)) return "0.00";

  if (num === 0) return "0.00";
  if (num < 0.01) return "< 0.01";

  return num.toFixed(2);
}

/**
 * Format trading volume for display
 */
export function formatTradingVolume(amount: string | number): string {
  const num = parseFloat(String(amount));
  if (isNaN(num)) return "0.00";

  if (num === 0) return "0.00";
  if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;

  return num.toFixed(2);
}

/**
 * Check if UID is a referral based on referral list
 */
export function isUIDReferral(
  uid: string,
  referralList: ReferralData[]
): boolean {
  if (!referralList || !Array.isArray(referralList)) return false;

  return referralList.some((ref: ReferralData) => {
    const refUid = String(ref.uid);
    const requestUid = String(uid);
    return refUid === requestUid;
  });
}

/**
 * Handle common API errors
 */
export function handleAPIError(
  error: unknown,
  brokerType: BrokerType
): UIDVerificationResult {
  console.error(`${getBrokerDisplayName(brokerType)} API error:`, error);

  const status: number | undefined =
    typeof error === "object" && error !== null && "status" in error
      ? (error as { status?: number }).status
      : undefined;

  if (status === 401) {
    return {
      verified: false,
      reason: "Unauthorized - Check API credentials",
    };
  }

  if (status === 403) {
    return {
      verified: false,
      reason: "Forbidden - IP not whitelisted or insufficient permissions",
    };
  }

  const message: string =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
      ? String((error as { message?: unknown }).message ?? "Unknown error")
      : "Unknown error";

  return {
    verified: false,
    reason: `API Error: ${message}`,
  };
}
