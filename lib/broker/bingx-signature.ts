import crypto from "crypto";

type SignableParams = Record<
  string,
  string | number | boolean | null | undefined
>;

export interface BingxSignedResult {
  signature: string;
  timestamp: string;
  queryString: string;
}

export const signBingxHmacSha256 = (
  params: SignableParams,
  secretKey: string
): BingxSignedResult => {
  const timestamp = Date.now().toString();

  // Filter out null/undefined values and sort parameters
  const working: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    working[k] = String(v);
  }

  // Add timestamp to parameters
  working.timestamp = timestamp;

  // Sort parameters alphabetically
  const sortedKeys = Object.keys(working).sort();
  const queryString = sortedKeys.map((k) => `${k}=${working[k]}`).join("&");

  // Create HMAC-SHA256 signature
  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(queryString)
    .digest("hex");

  // Debug logging
  console.log("BingX Signature Debug:", {
    queryString,
    signature,
    timestamp,
    secretKeyLength: secretKey.length,
  });

  return { signature, timestamp, queryString };
};
