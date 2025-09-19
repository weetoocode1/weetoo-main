import crypto from "crypto";

type SignableParams = Record<
  string,
  string | number | boolean | null | undefined
>;

export interface LbankSignedResult {
  sign: string;
  md5String: string;
  canonical: string;
}

export const signLbankHmacSha256 = (
  params: SignableParams,
  secretKey: string,
  output: "base64" | "hex" = "base64"
): LbankSignedResult => {
  const working: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    if (k === "sign") continue;
    working[k] = String(v);
  }

  const sortedKeys = Object.keys(working).sort();
  const canonical = sortedKeys.map((k) => `${k}=${working[k]}`).join("&");

  const md5String = crypto
    .createHash("md5")
    .update(canonical, "utf8")
    .digest("hex")
    .toUpperCase();

  const sign = crypto
    .createHmac("sha256", secretKey)
    .update(md5String, "utf8")
    .digest(output);

  return { sign, md5String, canonical };
};
