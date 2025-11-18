import {
  BrokerAPI,
  CommissionData,
  ReferralData,
  TradingHistory,
  UIDVerificationResult,
} from "@/lib/broker/broker-types";
import crypto from "crypto";

// OKX API Response Types
interface OKXAPIResponse<T = unknown> {
  code: string;
  msg: string;
  data?: T;
}

interface OKXInviteeDetail {
  accFee?: string;
  affiliateCode?: string;
  depAmt?: string;
  firstTradeTime?: string;
  inviteeLevel?: string;
  inviteeRebateRate?: string;
  joinTime?: string;
  kycTime?: string;
  level?: string;
  region?: string;
  totalCommission?: string;
  volMonth?: string;
  [key: string]: unknown;
}

interface OKXSubAccountDetail {
  subAcct?: string;
  uid?: string;
  label?: string;
  acctLv?: string;
  enable?: boolean;
  frozenFunc?: string[];
  canTransOut?: boolean;
  firstLvSubAcct?: string;
  subAcctLv?: string;
  ts?: string;
  [key: string]: unknown;
}

interface OKXSubAccountResponse {
  details?: OKXSubAccountDetail[];
  page?: string;
  totalPage?: string;
}

const OKX_BASE_URL = "https://www.okx.com";
const OKX_API_KEY = process.env.OKX_API_KEY || "";
const OKX_API_SECRET = process.env.OKX_API_SECRET || "";
const OKX_API_PASSPHRASE = process.env.OKX_API_PASSPHRASE || "";
const FIXIE_URL = process.env.FIXIE_URL || "";

function hasCreds(): boolean {
  return Boolean(OKX_API_KEY && OKX_API_SECRET && OKX_API_PASSPHRASE);
}

function generateOKXSignature(
  timestamp: string,
  method: string,
  requestPath: string,
  body: string = ""
): string {
  const message = timestamp + method + requestPath + body;
  const signature = crypto
    .createHmac("sha256", OKX_API_SECRET)
    .update(message)
    .digest("base64");
  return signature;
}

async function doSignedRequest<T = unknown>(
  method: string,
  path: string,
  params?: Record<string, string | number | boolean | null | undefined>
): Promise<T> {
  if (!hasCreds()) {
    throw new Error("OKX API credentials not configured");
  }

  const timestamp = new Date().toISOString();
  let requestPath = path;
  let queryString = "";
  let body = "";

  if (params && Object.keys(params).length > 0) {
    if (method === "GET") {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      }
      queryString = searchParams.toString();
      if (queryString) {
        requestPath = `${path}?${queryString}`;
      }
    } else {
      body = JSON.stringify(params);
    }
  }

  const signature = generateOKXSignature(timestamp, method, requestPath, body);

  const headers: Record<string, string> = {
    "OK-ACCESS-KEY": OKX_API_KEY,
    "OK-ACCESS-SIGN": signature,
    "OK-ACCESS-TIMESTAMP": timestamp,
    "OK-ACCESS-PASSPHRASE": OKX_API_PASSPHRASE,
    "Content-Type": "application/json",
  };

  const isServerSide = typeof window === "undefined";
  let proxyAgent: unknown = undefined;
  if (isServerSide && FIXIE_URL) {
    try {
      const undici = await import("undici");
      proxyAgent = new undici.ProxyAgent(FIXIE_URL);
    } catch (_error) {
      // Ignore proxy failures
    }
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  if (body && method !== "GET") {
    fetchOptions.body = body;
  }

  if (proxyAgent) {
    // @ts-expect-error Node fetch proxy dispatcher
    fetchOptions.dispatcher = proxyAgent;
  }

  const url = `${OKX_BASE_URL}${requestPath}`;

  // Add timeout and retry logic similar to BingX
  const retries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    let timeoutId: NodeJS.Timeout | null = null;
    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const fetchOptionsWithSignal: RequestInit = {
        ...fetchOptions,
        signal: controller.signal,
      };

      const res = await fetch(url, fetchOptionsWithSignal);
      if (timeoutId) clearTimeout(timeoutId);

      if (!res.ok) {
        let body: string | null = null;
        try {
          body = await res.text();
        } catch {
          // Ignore text parsing errors
        }
        throw new Error(
          `OKX API HTTP ${res.status}${body ? ` - ${body}` : ""}`
        );
      }

      const data = (await res.json()) as OKXAPIResponse<T>;
      if (data?.code !== "0") {
        throw new Error(
          `OKX API error: ${data?.msg || data?.code || "unknown"}`
        );
      }

      return (data?.data ?? data) as T;
    } catch (error: unknown) {
      if (timeoutId) clearTimeout(timeoutId);
      lastError = error instanceof Error ? error : new Error(String(error));

      const isConnectionError =
        error instanceof TypeError &&
        (error.message.includes("fetch failed") ||
          error.message.includes("ECONNRESET") ||
          error.message.includes("ETIMEDOUT") ||
          error.message.includes("network") ||
          error.message.includes("aborted"));

      if (isConnectionError && attempt < retries) {
        const delay = Math.min(1500 * Math.pow(2, attempt - 1), 8000);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw lastError;
    }
  }

  throw lastError || new Error("OKX API request failed after retries");
}

export default class OkxAPI implements BrokerAPI {
  isAPIActive(): boolean {
    return hasCreds();
  }

  async verifyUID(uid: string): Promise<UIDVerificationResult> {
    if (!hasCreds()) {
      return {
        verified: false,
        reason: "OKX affiliate API not configured",
      };
    }

    try {
      const data = await doSignedRequest<OKXInviteeDetail[]>(
        "GET",
        "/api/v5/affiliate/invitee/detail",
        { uid }
      );

      const invitee = Array.isArray(data) ? data[0] : data;

      if (!invitee || !invitee.affiliateCode) {
        return {
          verified: false,
          reason: "UID is not a valid invitee",
        };
      }

      // inviteeLevel: "1" = direct referral, "2" = sub-referral (indirect)
      // Only set isReferral: true for direct referrals (level 1)
      const inviteeLevel = invitee.inviteeLevel
        ? parseInt(String(invitee.inviteeLevel), 10)
        : null;
      const isDirectReferral = inviteeLevel === 1;

      return {
        verified: true,
        isReferral: isDirectReferral,
        data: invitee,
      };
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Verify failed";
      console.error("[OKX] verifyUID: Error", {
        uid,
        error: errorMessage,
        errorType: e instanceof Error ? e.constructor.name : typeof e,
      });
      return { verified: false, reason: errorMessage };
    }
  }

  async getReferrals(): Promise<ReferralData[]> {
    if (!hasCreds()) return [];

    try {
      console.log("[OKX] getReferrals: Attempting to fetch referrals...");

      // Try broker/DMA endpoint first (requires broker API access)
      try {
        console.log("[OKX] getReferrals: Trying broker/DMA endpoint...");
        const allSubAccounts: OKXSubAccountDetail[] = [];
        let page = 1;
        const limit = 100;
        let totalPages = 1;

        do {
          const response = await doSignedRequest<OKXSubAccountResponse[]>(
            "GET",
            "/api/v5/broker/dma/subaccount-info",
            {
              page: String(page),
              limit: String(limit),
            }
          );

          const pageData = Array.isArray(response) ? response[0] : response;
          const details = pageData?.details || [];

          console.log(`[OKX] getReferrals: Page ${page}/${totalPages}`, {
            subAccountsFound: details.length,
            totalPages: pageData?.totalPage,
            uids: details.map((d) => d.uid).filter(Boolean),
          });

          allSubAccounts.push(...details);

          totalPages = parseInt(pageData?.totalPage || "1", 10);
          page++;

          if (details.length < limit || page > totalPages) {
            break;
          }
        } while (page <= totalPages);

        const allUids = allSubAccounts.map((d) => d.uid).filter(Boolean);
        const testUid = "776314049247391503";
        const foundTestUid = allUids.includes(testUid);

        console.log("[OKX] getReferrals: Total sub-accounts found", {
          total: allSubAccounts.length,
          allUids: allUids,
          testUid: testUid,
          foundTestUid: foundTestUid ? "✅ FOUND" : "❌ NOT FOUND",
        });

        const referrals: ReferralData[] = allSubAccounts.map((subAcct) => ({
          uid: subAcct.uid || subAcct.subAcct || "",
          createTime: subAcct.ts ? parseInt(subAcct.ts, 10) : undefined,
          ...subAcct,
        }));

        console.log("[OKX] getReferrals: Mapped to ReferralData", {
          count: referrals.length,
          sample: referrals.slice(0, 3),
        });

        return referrals;
      } catch (brokerError: unknown) {
        const brokerErrorMessage =
          brokerError instanceof Error
            ? brokerError.message
            : String(brokerError);

        console.log(
          "[OKX] getReferrals: Broker/DMA endpoint failed (this is expected if using affiliate API key)",
          {
            error: brokerErrorMessage,
            note: "OKX affiliate API does not have a 'list all invitees' endpoint. The /api/v5/affiliate/invitee/detail endpoint requires a specific UID.",
          }
        );

        // OKX affiliate API limitation: no bulk list endpoint
        // The /api/v5/affiliate/invitee/detail endpoint requires a specific UID
        // So we cannot get a list of all referrals with affiliate API only
        console.warn(
          "[OKX] getReferrals: ⚠️ OKX Affiliate API Limitation",
          "The OKX affiliate API does not provide a bulk 'list all invitees' endpoint. " +
            "To get referral information, you need to use /api/v5/affiliate/invitee/detail with a specific UID. " +
            "For bulk referral listing, broker/DMA API access is required."
        );

        return [];
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Unknown error";
      console.error(
        "[OKX] getReferrals: Error fetching referrals",
        errorMessage
      );
      return [];
    }
  }

  async getTradingHistory(uid: string): Promise<TradingHistory[]> {
    if (!hasCreds()) return [];

    // TODO: Need rebate history endpoint with date range support
    console.warn(
      "OKX getTradingHistory() not implemented - need rebate history endpoint"
    );
    return [];
  }

  async getCommissionData(
    uid: string,
    sourceType?: string
  ): Promise<CommissionData[]> {
    if (!hasCreds()) return [];

    // TODO: Need commission/rebate data endpoint
    console.warn(
      "OKX getCommissionData() not implemented - need commission data endpoint"
    );
    return [];
  }

  async getTradingVolume(uid: string): Promise<string> {
    if (!hasCreds()) return "0";

    // TODO: Can potentially get from invitee detail (volMonth field)
    // For now, return "0"
    return "0";
  }
}
