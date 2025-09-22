import {
  BrokerAPI,
  CommissionData,
  ReferralData,
  UIDVerificationResult,
} from "@/lib/broker/broker-types";
import { signLbankHmacSha256 } from "@/lib/broker/lbank-signature";

// LBank API Response Types
interface LBankAPIResponse<T = unknown> {
  result: string;
  error_code: number;
  msg?: string;
  data?: T;
}

interface LBankUserInfo {
  inviteResult: boolean;
  openId?: string;
  userLevel?: number;
  createTime?: number;
  contractFeeAmt?: string;
  currencyFeeAmt?: string;
  [key: string]: unknown;
}

interface LBankCommissionItem {
  amount?: string;
  usdtAmount?: string;
  coinSymbol?: string;
  statsDate?: string;
  [key: string]: unknown;
}

const LBANK_BASE_URL =
  process.env.LBANK_AFFILIATE_BASE_URL || "https://affiliate.lbankverify.com";
const LBANK_API_KEY = process.env.LBANK_API_KEY || "";
const LBANK_API_SECRET = process.env.LBANK_API_SECRET || "";
const FIXIE_URL = process.env.FIXIE_URL || "";

function hasCreds(): boolean {
  return Boolean(LBANK_API_KEY && LBANK_API_SECRET);
}

async function doSignedGet<T = unknown>(
  path: string,
  params: Record<string, unknown>
): Promise<T> {
  const timestamp = Date.now();
  // LBank docs: alphanumeric echostr; use longer nonce for stricter checks (30-40 chars)
  const echostr = Array.from(crypto.getRandomValues(new Uint8Array(35)))
    .map((b) => (b % 36).toString(36))
    .join("");

  const baseParams: Record<
    string,
    string | number | boolean | null | undefined
  > = {
    api_key: LBANK_API_KEY,
    signature_method: "HmacSHA256",
    timestamp,
    echostr,
    ...params,
  };

  const { sign, md5String, canonical } = signLbankHmacSha256(
    baseParams,
    LBANK_API_SECRET,
    "hex"
  );

  // Debug logging for signature troubleshooting
  console.log("LBank Signature Debug:", {
    canonical,
    md5String,
    sign,
    baseParams,
    secretKeyLength: LBANK_API_SECRET.length,
  });

  const finalParams = new URLSearchParams();
  for (const [k, v] of Object.entries(baseParams)) {
    if (v === undefined || v === null) continue;
    finalParams.append(k, String(v));
  }
  finalParams.append("sign", sign);

  const url = `${LBANK_BASE_URL}${path}?${finalParams.toString()}`;

  const fetchOptions: RequestInit = {
    method: "GET",
    headers: {
      Accept: "application/json, text/plain, */*",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
  };
  const isServerSide = typeof window === "undefined";
  if (isServerSide && FIXIE_URL) {
    try {
      const undici = await import("undici");
      // @ts-expect-error Node fetch proxy dispatcher
      fetchOptions.dispatcher = new undici.ProxyAgent(FIXIE_URL);
      console.log("LBank Fixie Proxy: Using undici proxy dispatcher");
    } catch (error) {
      console.warn(
        "LBank Fixie Proxy: Failed to load undici proxy agent",
        error
      );
    }
  }

  const res = await fetch(url, fetchOptions);
  if (!res.ok) {
    let body: string | null = null;
    try {
      body = await res.text();
    } catch {
      // Ignore text parsing errors
    }
    throw new Error(`LBank API HTTP ${res.status}${body ? ` - ${body}` : ""}`);
  }
  const data = (await res.json()) as LBankAPIResponse<T>;
  if (data?.result !== "true" && data?.error_code !== 0) {
    throw new Error(
      `LBank API error: ${data?.msg || data?.error_code || "unknown"}`
    );
  }
  return (data?.data ?? data) as T;
}

export default class LbankAPI implements BrokerAPI {
  isAPIActive(): boolean {
    // Basic creds check; deeper check is attempted below
    if (!hasCreds()) return false;
    return true;
  }

  async verifyUID(uid: string): Promise<UIDVerificationResult> {
    if (!hasCreds()) {
      return { verified: false, reason: "LBank affiliate API not configured" };
    }
    // LBank identifies users by openId; if you only have UID, treat uid as openId input
    try {
      const data = await doSignedGet<LBankUserInfo>(
        "/affiliate-api/v2/invite/user/info",
        {
          openId: uid,
        }
      );
      const inviteResult = Boolean(data?.inviteResult);
      return {
        verified: inviteResult,
        isReferral: inviteResult,
        data,
      };
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Verify failed";
      return { verified: false, reason: errorMessage };
    }
  }

  async getReferrals(): Promise<ReferralData[]> {
    if (!hasCreds()) return [];
    try {
      const now = Date.now();
      const startTime = now - 365 * 24 * 60 * 60 * 1000;
      const endTime = now;
      const pageSize = 100;
      let start = 0;
      const results: ReferralData[] = [];

      for (let page = 0; page < 200; page++) {
        const data = await doSignedGet(
          "/affiliate-api/v2/invite/user/team/list",
          {
            startTime,
            endTime,
            start,
            pageSize,
          }
        );

        const list = Array.isArray(data) ? data : [];
        for (const item of list) {
          results.push({
            uid: item?.openId,
            level: item?.userLevel,
            rebateRate: item?.contractFeeAmt ?? item?.currencyFeeAmt,
            createTime: item?.createTime,
            ...item,
          });
        }

        if (list.length < pageSize) break;
        start = start + pageSize;
      }

      return results;
    } catch (_e) {
      // Graceful fallback to avoid crashing UI when CF blocks
      return [];
    }
  }

  async getCommissionData(
    uid: string,
    sourceType?: string
  ): Promise<CommissionData[]> {
    if (!hasCreds()) return [];
    const now = Date.now();
    const startTime = now - 30 * 24 * 60 * 60 * 1000;
    const endTime = now;
    // tradeType: 0 spot, 1 futures, 10 both. Map sourceType "PERPETUAL" => 1 else 0
    const tradeType = sourceType === "PERPETUAL" ? 1 : 0;

    try {
      const data = await doSignedGet<LBankCommissionItem[]>(
        "/affiliate-api/v2/commission/stats/symbol/list",
        {
          openId: uid,
          tradeType,
          startTime,
          endTime,
          coin: "",
          start: 0,
          pageSize: 100,
        }
      );
      const list = Array.isArray(data) ? data : [];
      return list.map((row: LBankCommissionItem) => ({
        uid,
        tradeAmount: row?.amount ?? "0",
        fee: row?.usdtAmount ?? row?.amount ?? "0",
        commission: row?.usdtAmount ?? "0",
        sourceType,
        coinSymbol: row?.coinSymbol,
        statsDate: row?.statsDate,
      }));
    } catch {
      return [];
    }
  }

  async getTradingHistory(uid: string) {
    // Optional for affiliate views; not strictly required by current UI
    return [];
  }

  async getTradingVolume(uid: string): Promise<string> {
    // Optional; can be implemented via /affiliate-api/v2/trade/user/team or /trade/user
    return "0";
  }
}
