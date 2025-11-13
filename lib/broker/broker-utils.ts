// Common helper functions for all broker APIs

import {
  BrokerType,
  ReferralData,
  UIDVerificationResult,
} from "./broker-types";

// UID validation rules: array of validators that return error message or null
type UIDValidator = (uid: string) => string | null;

const UID_VALIDATION_RULES: UIDValidator[] = [
  (uid) => (!uid ? "UID is required" : null),
  (uid) => (uid.length > 20 ? "UID too long - maximum 20 characters" : null),
  (uid) => (!/^\d+$/.test(uid) ? "UID must contain only digits" : null),
  (uid) => (/^(\d)\1+$/.test(uid) ? "UID cannot be all the same digits" : null),
];

/**
 * Validate UID format and length
 */
export function validateUID(uid: string): { isValid: boolean; error?: string } {
  for (const validator of UID_VALIDATION_RULES) {
    const error = validator(uid);
    if (error) {
      return { isValid: false, error };
    }
  }
  return { isValid: true };
}

// Broker credentials registry: maps broker type to credential check function
type CredentialChecker = () => boolean;

const BROKER_CREDENTIALS_REGISTRY: Record<string, CredentialChecker> = {
  deepcoin: () =>
    !!(
      process.env.DEEPCOIN_API_KEY &&
      process.env.DEEPCOIN_API_SECRET &&
      process.env.DEEPCOIN_API_PASSPHRASE
    ),
  orangex: () =>
    !!(process.env.ORANGEX_CLIENT_ID && process.env.ORANGEX_CLIENT_SECRET),
  lbank: () =>
    !!(
      process.env.LBANK_API_KEY &&
      process.env.LBANK_SECRET_KEY &&
      process.env.LBANK_PASSPHRASE
    ),
  bingx: () => !!(process.env.BINGX_API_KEY && process.env.BINGX_API_SECRET),
};

/**
 * Check if broker API credentials are configured
 */
export function hasBrokerCredentials(brokerType: BrokerType): boolean {
  const checker = BROKER_CREDENTIALS_REGISTRY[brokerType];
  return checker ? checker() : false;
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

// Commission formatters: array of [condition, formatter] pairs
type CommissionFormatter = (num: number) => string | null;

const COMMISSION_FORMATTERS: CommissionFormatter[] = [
  (num) => (isNaN(num) ? "0.00" : null),
  (num) => (num === 0 ? "0.00" : null),
  (num) => (num < 0.01 ? "< 0.01" : null),
];

/**
 * Format commission amount for display
 */
export function formatCommission(amount: string | number): string {
  const num = parseFloat(String(amount));
  const formatted = COMMISSION_FORMATTERS.reduce<string | null>(
    (result, formatter) => result || formatter(num),
    null
  );
  return formatted || num.toFixed(2);
}

// Trading volume formatters: array of [threshold, formatter] pairs
type VolumeFormatter = (num: number) => string;

const VOLUME_FORMATTERS: Array<[number, VolumeFormatter]> = [
  [1000000, (num) => `${(num / 1000000).toFixed(2)}M`],
  [1000, (num) => `${(num / 1000).toFixed(2)}K`],
];

/**
 * Format trading volume for display
 */
export function formatTradingVolume(amount: string | number): string {
  const num = parseFloat(String(amount));
  if (isNaN(num) || num === 0) return "0.00";

  const formatter = VOLUME_FORMATTERS.find(([threshold]) => num >= threshold);
  return formatter ? formatter[1](num) : num.toFixed(2);
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

// HTTP status code to error message mapping
const HTTP_STATUS_ERRORS: Record<number, string> = {
  401: "Unauthorized - Check API credentials",
  403: "Forbidden - IP not whitelisted or insufficient permissions",
};

// Error message extractors: array of extractors that return message or null
type ErrorMessageExtractor = (error: unknown) => string | null;

const ERROR_MESSAGE_EXTRACTORS: ErrorMessageExtractor[] = [
  (error) => (error instanceof Error ? error.message : null),
  (error) =>
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message?: unknown }).message ?? null)
      : null,
];

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

  const statusError = status ? HTTP_STATUS_ERRORS[status] : null;
  if (statusError) {
    return { verified: false, reason: statusError };
  }

  const message =
    ERROR_MESSAGE_EXTRACTORS.reduce<string | null>(
      (msg, extractor) => msg || extractor(error),
      null
    ) || "Unknown error";

  return {
    verified: false,
    reason: `API Error: ${message}`,
  };
}
