import {
  BrokerAPI,
  CommissionData,
  ReferralData,
  UIDVerificationResult,
} from "@/lib/broker/broker-types";
import { signBingxHmacSha256 } from "@/lib/broker/bingx-signature";

// BingX Agent API Response Types
interface BingxAPIResponse<T = unknown> {
  code: number;
  msg: string;
  data?: T;
}

interface BingxInviteeInfo {
  uid: number;
  email?: string;
  phone?: string;
  invitationCode: string;
  directInvitation: boolean;
  createTime: number;
  depositAmount?: number;
  tradingAmount?: number;
  commissionAmount?: number;
}

interface BingxCommissionData {
  uid: number;
  invitationCode: string;
  directInvitation: boolean;
  commissionAmount: number;
  commissionRate: number;
  tradingAmount: number;
  createTime: number;
  updateTime: number;
}

interface BingxInviteRelationCheck {
  // Docs are inconsistent across sections; handle both shapes
  isInvited?: boolean;
  inviteResult?: boolean;
  existInviter?: boolean;
  uid?: number;
  inviterSid?: number;
  directInvitation?: boolean;
  registerDateTime?: number;
  invitationCode?: string;
}

const BINGX_BASE_URL = "https://open-api.bingx.com";
const BINGX_API_KEY = process.env.BINGX_API_KEY || "";
const BINGX_API_SECRET = process.env.BINGX_API_SECRET || "";
const FIXIE_URL = process.env.FIXIE_URL || "";
const BINGX_DEBUG = process.env.BINGX_DEBUG === "true";

function hasCreds(): boolean {
  return Boolean(BINGX_API_KEY && BINGX_API_SECRET);
}

// function toFriendlyBingxReason(message: string | undefined): string {
//   if (!message) return "Verification temporarily unavailable";
//   const m = message.toLowerCase();
//   if (m.includes("current account is incorrect")) {
//     return "BingX agent API not enabled for this account";
//   }
//   if (m.includes("daysrange-over-30")) {
//     return "BingX requires 30-day date windows – retrying in background";
//   }
//   if (m.includes("null apikey") || m.includes("unable to find api key")) {
//     return "BingX API key missing – contact support";
//   }
//   return "Verification failed – please try again later";
// }

async function doSignedGet<T = unknown>(
  path: string,
  params: Record<string, string | number | boolean | null | undefined>
): Promise<T> {
  const { signature, queryString } = signBingxHmacSha256(
    params as Record<string, string | number | boolean | null | undefined>,
    BINGX_API_SECRET
  );

  const url = `${BINGX_BASE_URL}${path}?${queryString}&signature=${signature}`;
  if (BINGX_DEBUG) {
    console.log("[BingX] Request", {
      path,
      hasApiKey: !!BINGX_API_KEY,
      apiKeyLen: BINGX_API_KEY.length,
      hasSecret: !!BINGX_API_SECRET,
      fixie: !!FIXIE_URL,
      queryString,
    });
  }

  const fetchOptions: RequestInit = {
    method: "GET",
    headers: {
      "X-BX-APIKEY": BINGX_API_KEY,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    },
  };

  // Use Fixie proxy for IP whitelisting (same as DeepCoin and LBank)
  const isServerSide = typeof window === "undefined";
  if (isServerSide && FIXIE_URL) {
    try {
      const undici = await import("undici");
      // @ts-expect-error Node fetch proxy dispatcher
      fetchOptions.dispatcher = new undici.ProxyAgent(FIXIE_URL);
      // Using Fixie proxy via undici dispatcher
      if (BINGX_DEBUG) console.log("[BingX] Using Fixie proxy");
    } catch (error) {
      // Proxy agent load failed; continue without dispatcher
      if (BINGX_DEBUG)
        console.warn("[BingX] Failed to load Fixie proxy agent", error);
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
    if (BINGX_DEBUG) {
      console.error("[BingX] HTTP error", { status: res.status, body, url });
    }
    throw new Error(`BingX API HTTP ${res.status}${body ? ` - ${body}` : ""}`);
  }

  const data = (await res.json()) as BingxAPIResponse<T>;

  if (data?.code !== 0) {
    if (BINGX_DEBUG) {
      console.error("[BingX] API error payload", {
        url,
        code: data?.code,
        msg: data?.msg,
        data: data?.data,
      });
    }
    throw new Error(`BingX API error: ${data?.msg || data?.code || "unknown"}`);
  }

  return (data?.data ?? data) as T;
}

export default class BingxAPI implements BrokerAPI {
  isAPIActive(): boolean {
    if (!hasCreds()) return false;
    return true;
  }

  async isReferral(uid: string): Promise<{ isReferral: boolean }> {
    if (!hasCreds()) return { isReferral: false };

    try {
      const data = await doSignedGet<BingxInviteRelationCheck>(
        "/openApi/agent/v1/account/inviteRelationCheck",
        { uid: parseInt(uid) }
      );

      const isInvited = Boolean(
        data && (data.isInvited ?? data.inviteResult ?? data.existInviter)
      );
      return { isReferral: isInvited };
    } catch {
      return { isReferral: false };
    }
  }

  async verifyUID(uid: string): Promise<UIDVerificationResult> {
    if (!hasCreds()) {
      return { verified: false, reason: "BingX Agent API not configured" };
    }

    try {
      const data = await doSignedGet<BingxInviteRelationCheck>(
        "/openApi/agent/v1/account/inviteRelationCheck",
        { uid: parseInt(uid) }
      );

      // Some environments return inviteResult/existInviter instead of isInvited
      const isInvited = Boolean(
        data && (data.isInvited ?? data.inviteResult ?? data.existInviter)
      );
      return {
        verified: isInvited,
        isReferral: isInvited,
        data,
      };
    } catch (_e: unknown) {
      // For UI consistency: suppress raw BingX errors so UI shows standard
      // labels (e.g., Not verified). We still log server-side.
      return { verified: false };
    }
  }

  async getReferrals(): Promise<ReferralData[]> {
    if (!hasCreds()) return [];

    try {
      const now = Date.now();
      const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;
      const pageSize = 100;
      const results: ReferralData[] = [];

      // BingX restricts date range to max 30 days per request
      const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
      let windowEnd = now;

      while (windowEnd > oneYearAgo) {
        const windowStart = Math.max(oneYearAgo, windowEnd - THIRTY_DAYS + 1);

        // Paginate within this 30-day window
        let pageIndex = 1;
        for (let page = 0; page < 200; page++) {
          const data = await doSignedGet<{
            list: BingxInviteeInfo[];
            total: number;
          }>("/openApi/agent/v1/account/inviteAccountList", {
            pageIndex,
            pageSize,
            startTime: windowStart,
            endTime: windowEnd,
          });

          const list = data?.list || [];
          for (const item of list) {
            results.push({
              uid: item.uid.toString(),
              level: item.directInvitation ? 1 : 2,
              rebateRate: "0",
              createTime: item.createTime,
              email: item.email,
              phone: item.phone,
              invitationCode: item.invitationCode,
              depositAmount: item.depositAmount,
              tradingAmount: item.tradingAmount,
              commissionAmount: item.commissionAmount,
            });
          }

          if (list.length < pageSize) break;
          pageIndex++;
        }

        // Move window back
        windowEnd = windowStart - 1;
      }

      return results;
    } catch (e: unknown) {
      console.error("BingX getReferrals error:", e);
      return [];
    }
  }

  async getCommissionData(
    uid: string,
    sourceType?: string
  ): Promise<CommissionData[]> {
    if (!hasCreds()) return [];

    try {
      const now = Date.now();
      const startTime = now - 30 * 24 * 60 * 60 * 1000; // 30 days ago
      const endTime = now;

      const data = await doSignedGet<{
        list: BingxCommissionData[];
        total: number;
      }>("/openApi/agent/v1/reward/commissionDataList", {
        invitationCode: "", // Get all invitation codes
        pageIndex: 1,
        pageSize: 100,
        startTime,
        endTime,
      });

      const list = data?.list || [];
      return list.map((row: BingxCommissionData) => ({
        uid: row.uid.toString(),
        tradeAmount: row.tradingAmount.toString(),
        fee: "0", // BingX doesn't provide fee in commission data
        commission: row.commissionAmount.toString(),
        sourceType: sourceType || "PERPETUAL",
        coinSymbol: "USDT", // Default to USDT
        statsDate: row.createTime.toString(),
        commissionRate: row.commissionRate.toString(),
      }));
    } catch (e: unknown) {
      console.error("BingX getCommissionData error:", e);
      return [];
    }
  }

  async getTradingHistory(uid: string) {
    // Optional for affiliate views; not strictly required by current UI
    return [];
  }

  async getTradingVolume(uid: string): Promise<string> {
    // Optional; can be implemented via commission data
    return "0";
  }
}
