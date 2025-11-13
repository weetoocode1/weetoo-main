import {
  BrokerAPI,
  CommissionData,
  ReferralData,
  TradingHistory,
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
  inviterCode?: string;
  invitationCode?: string;
  directInvitation?: boolean;
  commissionAmount?: number;
  commissionVolume?: string;
  commissionRate?: number;
  tradingAmount?: number;
  tradingVolume?: string;
  createTime?: number;
  commissionTime?: number;
  updateTime?: number;
  swapTradingVolume?: string;
  swapCommissionVolume?: string;
  stdTradingVolume?: string;
  stdCommissionVolume?: string;
  spotTradingVolume?: string;
  spotCommissionVolume?: string;
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
  inviteCode?: string;
  commissionRatio?: number;
  deposit?: boolean;
  trade?: boolean;
  userLevel?: number;
  kycResult?: boolean;
  balanceVolume?: string;
}

const BINGX_BASE_URL = "https://open-api.bingx.com";
const BINGX_API_KEY = process.env.BINGX_API_KEY || "";
const BINGX_API_SECRET = process.env.BINGX_API_SECRET || "";
const FIXIE_URL = process.env.FIXIE_URL || "";
const BINGX_DEBUG = process.env.BINGX_DEBUG === "true";

// Lightweight cache for 90d totals so repeated calls don't refetch the older windows
export const BINGX_90D_CACHE = new Map<string, { value: number; ts: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

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
  params: Record<string, string | number | boolean | null | undefined>,
  retries = 3
): Promise<T> {
  const { signature, queryString } = signBingxHmacSha256(
    params as Record<string, string | number | boolean | null | undefined>,
    BINGX_API_SECRET
  );

  const url = `${BINGX_BASE_URL}${path}?${queryString}&signature=${signature}`;
  // Suppress noisy request logs

  // Use Fixie proxy for IP whitelisting (same as DeepCoin and LBank)
  const isServerSide = typeof window === "undefined";
  let proxyAgent: unknown = undefined;
  if (isServerSide && FIXIE_URL) {
    try {
      const undici = await import("undici");
      proxyAgent = new undici.ProxyAgent(FIXIE_URL);
      // Using Fixie proxy via undici dispatcher
      // Quiet proxy info
    } catch (error) {
      // Proxy agent load failed; continue without dispatcher
      if (BINGX_DEBUG)
        console.warn("[BingX] Failed to load Fixie proxy agent", error);
    }
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const fetchOptions: RequestInit = {
      method: "GET",
      headers: {
        "X-BX-APIKEY": BINGX_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      },
      signal: controller.signal,
    };

    if (proxyAgent) {
      // @ts-expect-error Node fetch proxy dispatcher
      fetchOptions.dispatcher = proxyAgent;
    }

    try {
      const res = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      if (!res.ok) {
        let body: string | null = null;
        try {
          body = await res.text();
        } catch {
          // Ignore text parsing errors
        }
        // Quiet HTTP error payload details; throw below
        throw new Error(
          `BingX API HTTP ${res.status}${body ? ` - ${body}` : ""}`
        );
      }

      const data = (await res.json()) as BingxAPIResponse<T>;

      if (data?.code !== 0) {
        // Quiet API payload details; throw below
        throw new Error(
          `BingX API error: ${data?.msg || data?.code || "unknown"}`
        );
      }

      return (data?.data ?? data) as T;
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      const isConnectionError =
        error instanceof TypeError &&
        (error.message.includes("fetch failed") ||
          error.message.includes("ECONNRESET") ||
          error.message.includes("ETIMEDOUT") ||
          error.message.includes("network") ||
          error.message.includes("aborted"));

      if (isConnectionError && attempt < retries) {
        const delay = Math.min(1500 * Math.pow(2, attempt - 1), 8000);
        // Quiet retry logs
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // Quiet failure logs; surface error to caller
      throw error;
    }
  }

  throw new Error("BingX API request failed after retries");
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
      const queryEndTime = now - 1 * 24 * 60 * 60 * 1000; // yesterday (current date - 1)
      const queryStartTime = queryEndTime - 30 * 24 * 60 * 60 * 1000 + 1; // 30 days before yesterday
      const pageSize = 100;
      const results: ReferralData[] = [];

      const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
      let windowEnd = queryEndTime;

      while (windowEnd > queryStartTime) {
        const windowStart = Math.max(
          queryStartTime,
          windowEnd - THIRTY_DAYS + 1
        );

        let pageIndex = 1;
        let hasMore = true;

        while (hasMore && pageIndex <= 10) {
          try {
            if (pageIndex > 1) {
              await new Promise((resolve) => setTimeout(resolve, 300));
            }

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

            if (list.length < pageSize) {
              hasMore = false;
            } else {
              pageIndex++;
            }
          } catch (_pageError) {
            hasMore = false;
          }
        }

        windowEnd = windowStart - 1;

        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      return results;
    } catch (_e: unknown) {
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
      const oneDayMs = 24 * 60 * 60 * 1000;
      const thirtyDaysMs = 30 * oneDayMs;
      const ninetyDaysMs = 90 * oneDayMs;

      // We aggregate up to yesterday to avoid partial/settlement-day effects
      const queryEndTime = now - oneDayMs; // yesterday (current date - 1)
      // We'll return 24h/30d immediately from the latest 30d, then compute 90d in background
      const queryStartTime = queryEndTime - ninetyDaysMs + 1;
      const fastStartTime = queryEndTime - thirtyDaysMs + 1;

      let invitationCode = "";

      try {
        const verifyData = await doSignedGet<BingxInviteRelationCheck>(
          "/openApi/agent/v1/account/inviteRelationCheck",
          { uid: parseInt(uid) }
        );
        invitationCode =
          verifyData?.invitationCode || verifyData?.inviteCode || "";
        // Quiet verify logs
      } catch (_verifyError) {
        // Quiet verify warning
      }

      const allResults: CommissionData[] = [];
      const allResultsFull: CommissionData[] = [];
      const pageSize = 100;

      const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
      let windowEnd = queryEndTime;

      // Fast path: only the most recent 30d window synchronously
      while (windowEnd > fastStartTime) {
        const windowStart = Math.max(
          fastStartTime,
          windowEnd - THIRTY_DAYS + 1
        );

        // Quiet per-window debug

        let pageIndex = 1;
        let hasMore = true;

        while (hasMore && pageIndex <= 10) {
          let data: { list: BingxCommissionData[]; total: number } | null =
            null;

          try {
            if (pageIndex > 1) {
              await new Promise((resolve) => setTimeout(resolve, 120));
            }

            data = await doSignedGet<{
              list: BingxCommissionData[];
              total: number;
            }>("/openApi/agent/v1/reward/commissionDataList", {
              invitationCode: invitationCode || "",
              pageIndex,
              pageSize,
              startTime: windowStart,
              endTime: windowEnd,
            });

            // Quiet first-page payload log
          } catch (apiError) {
            const errorMessage =
              apiError instanceof Error ? apiError.message : String(apiError);

            if (errorMessage.includes("daysRange-over-30")) {
              // Date range too large error
            }

            // Quiet API error details; continue loop control below
            break;
          }

          if (!data) break;

          const list = data?.list || [];
          const filtered = list.filter(
            (row: BingxCommissionData) => row.uid.toString() === uid
          );

          // Quiet per-window found log

          const mapped = filtered.map((row: BingxCommissionData) => {
            const tradingVolume =
              row.tradingVolume ?? row.tradingAmount?.toString() ?? "0";
            const commissionVolume =
              row.commissionVolume ?? row.commissionAmount?.toString() ?? "0";
            const commissionTime = row.commissionTime ?? row.createTime ?? 0;

            return {
              uid: row.uid.toString(),
              tradeAmount: tradingVolume,
              fee: "0",
              commission: commissionVolume,
              sourceType: sourceType || "PERPETUAL",
              coinSymbol: "USDT",
              statsDate: commissionTime.toString(),
              commissionRate: (row.commissionRate ?? 0).toString(),
            };
          });

          allResults.push(...mapped);
          allResultsFull.push(...mapped);

          if (list.length < pageSize) {
            hasMore = false;
          } else {
            pageIndex++;
          }
        }

        windowEnd = windowStart - 1;

        await new Promise((resolve) => setTimeout(resolve, 120));
      }

      if (allResults.length === 0 && invitationCode) {
        // Quiet missing invitationCode path; we'll try fallback

        windowEnd = queryEndTime;
        while (windowEnd > queryStartTime) {
          const windowStart = Math.max(
            queryStartTime,
            windowEnd - THIRTY_DAYS + 1
          );

          try {
            const fallbackData = await doSignedGet<{
              list: BingxCommissionData[];
              total: number;
            }>("/openApi/agent/v1/reward/commissionDataList", {
              invitationCode: "",
              pageIndex: 1,
              pageSize: 100,
              startTime: windowStart,
              endTime: windowEnd,
            });

            const fallbackList = fallbackData?.list || [];
            const fallbackFiltered = fallbackList.filter(
              (row: BingxCommissionData) => row.uid.toString() === uid
            );

            if (fallbackFiltered.length > 0) {
              const fallbackMapped = fallbackFiltered.map(
                (row: BingxCommissionData) => {
                  const tradingVolume =
                    row.tradingVolume ?? row.tradingAmount?.toString() ?? "0";
                  const commissionVolume =
                    row.commissionVolume ??
                    row.commissionAmount?.toString() ??
                    "0";
                  const commissionTime =
                    row.commissionTime ?? row.createTime ?? 0;

                  return {
                    uid: row.uid.toString(),
                    tradeAmount: tradingVolume,
                    fee: "0",
                    commission: commissionVolume,
                    sourceType: sourceType || "PERPETUAL",
                    coinSymbol: "USDT",
                    statsDate: commissionTime.toString(),
                    commissionRate: (row.commissionRate ?? 0).toString(),
                  };
                }
              );

              // no additional debug logs here
              return fallbackMapped;
            }
          } catch (_fallbackError) {
            // const errorMessage =
            //   fallbackError instanceof Error
            //     ? fallbackError.message
            //     : String(fallbackError);
            // Quiet fallback error details
          }

          windowEnd = windowStart - 1;
          await new Promise((resolve) => setTimeout(resolve, 150));
        }
      }

      // Compute summaries: last 24h, last 30d, last 90d (lifetime window)
      // const last24hStart = queryEndTime - oneDayMs + 1;
      const last30dStart = queryEndTime - thirtyDaysMs + 1;
      // const last90dStart = queryStartTime; // already 90d back

      const sumCommission = (rows: CommissionData[]) =>
        rows.reduce(
          (sum, r) => sum + (parseFloat(r.commission as string) || 0),
          0
        );

      const toNum = (v: unknown): number => {
        if (typeof v === "number") return v;
        if (typeof v === "string") {
          const n = parseInt(v, 10);
          return Number.isFinite(n) ? n : 0;
        }
        return 0;
      };

      // const rows24h = allResultsFull.filter(
      //   (r) =>
      //     toNum(r.statsDate) >= last24hStart &&
      //     toNum(r.statsDate) <= queryEndTime
      // );
      const rows30d = allResultsFull.filter(
        (r) =>
          toNum(r.statsDate) >= last30dStart &&
          toNum(r.statsDate) <= queryEndTime
      );
      // const rows90d = allResultsFull.filter(
      //   (r) =>
      //     toNum(r.statsDate) >= last90dStart &&
      //     toNum(r.statsDate) <= queryEndTime
      // );

      // const last24hTotal = sumCommission(rows24h);
      const last30dTotal = sumCommission(rows30d);
      // const last90dTotal = sumCommission(rows90d);

      // Background fetch prior 60d for full 90d, cached to reduce repeat latency
      const cache = BINGX_90D_CACHE.get(uid);
      const cacheValid = cache && Date.now() - cache.ts < CACHE_TTL_MS;
      if (!cacheValid) {
        (async () => {
          try {
            const olderWindows: Array<{ start: number; end: number }> = [];
            const olderEnd1 = fastStartTime - 1; // previous 30d #1
            const olderStart1 = Math.max(
              queryStartTime,
              olderEnd1 - THIRTY_DAYS + 1
            );
            olderWindows.push({ start: olderStart1, end: olderEnd1 });
            const olderEnd2 = olderStart1 - 1; // previous 30d #2
            if (olderEnd2 > queryStartTime) {
              const olderStart2 = Math.max(
                queryStartTime,
                olderEnd2 - THIRTY_DAYS + 1
              );
              olderWindows.push({ start: olderStart2, end: olderEnd2 });
            }

            const fetchWin = async (w: { start: number; end: number }) => {
              let pageIndex = 1;
              let total = 0;
              for (let page = 0; page < 10; page++) {
                const data = await doSignedGet<{
                  list: BingxCommissionData[];
                  total: number;
                }>("/openApi/agent/v1/reward/commissionDataList", {
                  invitationCode: invitationCode || "",
                  pageIndex,
                  pageSize,
                  startTime: w.start,
                  endTime: w.end,
                });
                const list = data?.list || [];
                for (const row of list) {
                  if (row.uid?.toString() !== uid) continue;
                  const c =
                    row.commissionVolume ??
                    row.commissionAmount?.toString() ??
                    "0";
                  total += parseFloat(c) || 0;
                }
                if (list.length < pageSize) break;
                pageIndex++;
                await new Promise((r) => setTimeout(r, 120));
              }
              return total;
            };

            const bgTotals = await Promise.all(
              olderWindows.map((w, i) =>
                (async () => {
                  if (i > 0) await new Promise((r) => setTimeout(r, 120 * i));
                  return fetchWin(w);
                })()
              )
            );

            const extra = bgTotals.reduce((a, b) => a + b, 0);
            const full90 = last30dTotal + extra;
            BINGX_90D_CACHE.set(uid, { value: full90, ts: Date.now() });
          } catch {
            // ignore background errors
          }
        })();
      }

      // Return only last 30 days for UI consumption
      return rows30d;
    } catch (_e: unknown) {
      // Quiet catch; surface empty list to caller
      return [];
    }
  }

  async getTradingHistory(
    uid: string,
    startTime?: number,
    endTime?: number
  ): Promise<TradingHistory[]> {
    const tStart = Date.now();
    console.log("=".repeat(80));
    console.log("[BingX] getTradingHistory: METHOD CALLED!");
    console.log("[BingX] getTradingHistory: Parameters", {
      uid,
      startTime: startTime ? new Date(startTime).toISOString() : "none",
      endTime: endTime ? new Date(endTime).toISOString() : "none",
      hasCreds: hasCreds(),
    });
    console.log("=".repeat(80));

    if (!hasCreds()) {
      console.log("[BingX] getTradingHistory: API credentials not configured");
      return [];
    }

    try {
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;
      const thirtyDaysMs = 30 * oneDayMs;
      const ninetyDaysMs = 90 * oneDayMs;

      // Convert time parameters to timestamps if needed
      const convertToTimestamp = (time?: number): number | undefined => {
        if (time === undefined) return undefined;
        if (typeof time === "number") return time;
        return undefined;
      };

      const startTimeNum = convertToTimestamp(startTime);
      const endTimeNum = convertToTimestamp(endTime);

      // BingX API requires 30-day windows, so we aggregate up to yesterday (T+1 settlement)
      const queryEndTime = endTimeNum ?? now - oneDayMs;
      const queryStartTime = startTimeNum ?? queryEndTime - ninetyDaysMs + 1;

      // Get invitation code for this UID
      let invitationCode = "";
      try {
        const verifyData = await doSignedGet<BingxInviteRelationCheck>(
          "/openApi/agent/v1/account/inviteRelationCheck",
          { uid: parseInt(uid) }
        );
        invitationCode =
          verifyData?.invitationCode || verifyData?.inviteCode || "";
        console.log("[BingX] getTradingHistory: Invitation code lookup", {
          uid,
          invitationCode: invitationCode || "NOT FOUND",
          verifyData: verifyData ? "SUCCESS" : "EMPTY",
        });
      } catch (verifyError) {
        const errMsg =
          verifyError instanceof Error
            ? verifyError.message
            : String(verifyError);
        console.log(
          "[BingX] getTradingHistory: Invitation code lookup failed",
          {
            uid,
            error: errMsg,
          }
        );
      }

      // Fetch all commission data (similar to getCommissionData but for trading history)
      const allCommissionItems: BingxCommissionData[] = [];
      const pageSize = 100;
      const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
      let windowEnd = queryEndTime;

      // Fetch in 30-day windows (BingX API requirement)
      while (windowEnd > queryStartTime) {
        const windowStart = Math.max(
          queryStartTime,
          windowEnd - THIRTY_DAYS + 1
        );

        let pageIndex = 1;
        let hasMore = true;

        while (hasMore && pageIndex <= 10) {
          try {
            if (pageIndex > 1) {
              await new Promise((resolve) => setTimeout(resolve, 120));
            }

            const data = await doSignedGet<{
              list: BingxCommissionData[];
              total: number;
            }>("/openApi/agent/v1/reward/commissionDataList", {
              invitationCode: invitationCode || "",
              pageIndex,
              pageSize,
              startTime: windowStart,
              endTime: windowEnd,
            });

            const list = data?.list || [];
            console.log(
              `[BingX] getTradingHistory: API Response (window ${new Date(
                windowStart
              ).toISOString()} to ${new Date(
                windowEnd
              ).toISOString()}, page ${pageIndex})`,
              {
                totalInResponse: list.length,
                totalFromAPI: data?.total || 0,
                sampleUids: list.slice(0, 5).map((r) => r.uid),
              }
            );

            const filtered = list.filter(
              (row: BingxCommissionData) => row.uid.toString() === uid
            );

            console.log(
              `[BingX] getTradingHistory: Filtered results for UID ${uid}`,
              {
                beforeFilter: list.length,
                afterFilter: filtered.length,
                matchedUids: filtered.map((r) => r.uid),
              }
            );

            allCommissionItems.push(...filtered);

            if (list.length < pageSize) {
              hasMore = false;
            } else {
              pageIndex++;
            }
          } catch (apiError) {
            const errorMessage =
              apiError instanceof Error ? apiError.message : String(apiError);

            console.log(
              `[BingX] getTradingHistory: API Error (window ${new Date(
                windowStart
              ).toISOString()} to ${new Date(
                windowEnd
              ).toISOString()}, page ${pageIndex})`,
              {
                error: errorMessage,
              }
            );

            if (errorMessage.includes("daysRange-over-30")) {
              console.error(
                `[BingX] getTradingHistory: Date range too large:`,
                {
                  windowStart: new Date(windowStart).toISOString(),
                  windowEnd: new Date(windowEnd).toISOString(),
                  days: (windowEnd - windowStart) / (24 * 60 * 60 * 1000),
                }
              );
            }
            break;
          }
        }

        windowEnd = windowStart - 1;
        await new Promise((resolve) => setTimeout(resolve, 120));
      }

      // Fallback: try with empty invitation code if no results found (like getCommissionData)
      if (allCommissionItems.length === 0 && invitationCode) {
        console.log(
          "[BingX] getTradingHistory: No results with invitation code, trying fallback (empty invitation code)"
        );

        windowEnd = queryEndTime;
        while (windowEnd > queryStartTime) {
          const windowStart = Math.max(
            queryStartTime,
            windowEnd - THIRTY_DAYS + 1
          );

          try {
            const fallbackData = await doSignedGet<{
              list: BingxCommissionData[];
              total: number;
            }>("/openApi/agent/v1/reward/commissionDataList", {
              invitationCode: "",
              pageIndex: 1,
              pageSize: 100,
              startTime: windowStart,
              endTime: windowEnd,
            });

            const fallbackList = fallbackData?.list || [];
            console.log(
              `[BingX] getTradingHistory: Fallback API Response (window ${new Date(
                windowStart
              ).toISOString()} to ${new Date(windowEnd).toISOString()})`,
              {
                totalInResponse: fallbackList.length,
                totalFromAPI: fallbackData?.total || 0,
                sampleUids: fallbackList.slice(0, 5).map((r) => r.uid),
              }
            );

            const fallbackFiltered = fallbackList.filter(
              (row: BingxCommissionData) => row.uid.toString() === uid
            );

            console.log(
              `[BingX] getTradingHistory: Fallback filtered results for UID ${uid}`,
              {
                beforeFilter: fallbackList.length,
                afterFilter: fallbackFiltered.length,
                matchedUids: fallbackFiltered.map((r) => r.uid),
              }
            );

            if (fallbackFiltered.length > 0) {
              allCommissionItems.push(...fallbackFiltered);
              console.log(
                "[BingX] getTradingHistory: Fallback found data, breaking loop"
              );
              break;
            }
          } catch (fallbackError) {
            const errMsg =
              fallbackError instanceof Error
                ? fallbackError.message
                : String(fallbackError);
            console.log(
              `[BingX] getTradingHistory: Fallback API Error (window ${new Date(
                windowStart
              ).toISOString()} to ${new Date(windowEnd).toISOString()})`,
              {
                error: errMsg,
              }
            );
          }

          windowEnd = windowStart - 1;
          await new Promise((resolve) => setTimeout(resolve, 150));
        }
      }

      console.log("[BingX] getTradingHistory: Fetched commission data", {
        uid,
        totalItems: allCommissionItems.length,
        timeWindow: {
          start: new Date(queryStartTime).toISOString(),
          end: new Date(queryEndTime).toISOString(),
        },
      });

      // Calculate summaries from fetched data
      const calculateSummary = (
        items: BingxCommissionData[],
        startTimeMs: number,
        endTimeMs: number
      ): number => {
        return items.reduce((sum, item) => {
          // Use commissionTime or createTime as timestamp
          const itemTime =
            item.commissionTime ?? item.createTime ?? item.updateTime ?? 0;

          // Filter by time within the period
          if (itemTime < startTimeMs || itemTime > endTimeMs) {
            return sum;
          }

          // Use commissionAmount or commissionVolume as the commission value
          const commission =
            item.commissionAmount ??
            (item.commissionVolume
              ? parseFloat(String(item.commissionVolume))
              : 0) ??
            0;
          const commissionNum =
            typeof commission === "number"
              ? commission
              : parseFloat(String(commission)) || 0;
          return sum + commissionNum;
        }, 0);
      };

      // Calculate time windows for summaries
      // BingX aggregates up to yesterday to avoid partial/settlement-day effects
      const commissionEndTime = now - oneDayMs;
      const last24hStart = commissionEndTime - oneDayMs + 1;
      const last30dStart = commissionEndTime - thirtyDaysMs + 1;
      const last90dStart = commissionEndTime - ninetyDaysMs + 1;

      // Calculate summaries from fetched data
      const commission24h = calculateSummary(
        allCommissionItems,
        last24hStart,
        commissionEndTime
      );
      const commission30d = calculateSummary(
        allCommissionItems,
        last30dStart,
        commissionEndTime
      );
      const commission90d = calculateSummary(
        allCommissionItems,
        last90dStart,
        commissionEndTime
      );

      console.log("[BingX] getTradingHistory: Calculated summaries", {
        last24h: {
          start: new Date(last24hStart).toISOString(),
          end: new Date(commissionEndTime).toISOString(),
          total: commission24h,
        },
        last30d: {
          start: new Date(last30dStart).toISOString(),
          end: new Date(commissionEndTime).toISOString(),
          total: commission30d,
        },
        last90d: {
          start: new Date(last90dStart).toISOString(),
          end: new Date(commissionEndTime).toISOString(),
          total: commission90d,
        },
      });

      const summaries = {
        last24h: {
          commission: Number(commission24h.toFixed(8)),
          commissionUsdt: Number(commission24h.toFixed(8)),
        },
        last30d: {
          commission: Number(commission30d.toFixed(8)),
          commissionUsdt: Number(commission30d.toFixed(8)),
        },
        last90d: {
          commission: Number(commission90d.toFixed(8)),
          commissionUsdt: Number(commission90d.toFixed(8)),
        },
      };

      // Map commission items to TradingHistory format
      const mapped: TradingHistory[] = allCommissionItems.map((item) => {
        // Use commissionTime or createTime as timestamp
        const itemTime =
          item.commissionTime ?? item.createTime ?? item.updateTime ?? 0;
        const itemTimeMs = itemTime > 1e12 ? itemTime : itemTime * 1000;

        // Get commission amount
        const commissionValue =
          item.commissionAmount ??
          (item.commissionVolume
            ? parseFloat(String(item.commissionVolume))
            : 0) ??
          0;
        const commissionNum =
          typeof commissionValue === "number"
            ? commissionValue
            : parseFloat(String(commissionValue)) || 0;

        // Get trading amount
        const tradingValue =
          item.tradingAmount ??
          (item.tradingVolume ? parseFloat(String(item.tradingVolume)) : 0) ??
          0;
        const tradingNum =
          typeof tradingValue === "number"
            ? tradingValue
            : parseFloat(String(tradingValue)) || 0;

        return {
          uid: String(item.uid ?? uid),
          tradeAmount: String(tradingNum),
          timestamp: itemTimeMs,
          tradeTimeMs: itemTimeMs,
          insertTimeMs: itemTimeMs,
          commission: String(commissionNum),
          commissionUsdt: String(commissionNum),
          fee: "0",
          rebateRate: item.commissionRate
            ? String(item.commissionRate)
            : undefined,
          orderId: item.invitationCode,
          commissionTime: item.commissionTime,
          createTime: item.createTime,
          updateTime: item.updateTime,
        };
      });

      const durationMs = Date.now() - tStart;

      if (mapped.length > 0) {
        console.log("[BingX] getTradingHistory: ✅ SUCCESS - Data Retrieved", {
          uid,
          totalRecords: mapped.length,
          durationMs: `${durationMs}ms`,
          summaries,
        });
      } else {
        console.log("[BingX] getTradingHistory: ⚠️ NO DATA - Empty Result", {
          uid,
          totalRecords: 0,
          durationMs: `${durationMs}ms`,
          summaries,
        });
      }

      // Attach summaries to each trade (like LBank/OrangeX/DeepCoin)
      const resultWithSummaries = mapped.map((trade) => ({
        ...trade,
        _summaries: summaries,
      }));

      return resultWithSummaries;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.log("[BingX] getTradingHistory: Error", {
        uid,
        error: errMsg,
      });
      // Return empty array on error (graceful degradation)
      return [];
    }
  }

  async getTradingVolume(uid: string): Promise<string> {
    // Optional; can be implemented via commission data
    return "0";
  }
}
