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

interface LBankTradePageResponse {
  totalPage?: number;
  hasNext?: boolean;
  totalCount?: number;
  page?: {
    symbol?: string | null;
    orderType?: number | null;
    sortColumn?: string | null;
    pageNo?: number;
    openId?: string;
    loginUid?: string | null;
    start?: number;
    pageSize?: number;
    startTime?: number;
    endTime?: number;
    userType?: string;
    sortDirect?: string | null;
    [key: string]: unknown;
  };
  resultList?: LBankTradeItem[];
}

interface LBankTradeItem {
  tradeId?: string;
  memberOpenId?: string;
  remark?: string | null;
  tradeTime?: number;
  insertTime?: number;
  instrumentId?: string;
  leverage?: string;
  direction?: string;
  volume?: string;
  turnover?: string | number;
  feeCurrency?: string;
  offsetFlag?: string;
  closeProfit?: string;
  fee?: string;
  payFee?: string | null;
  rebateRatio?: string | null;
  commission?: string | null;
  commissionUsdt?: string | null;
  rebateTime?: number | null;
  orderUuid?: string;
  price?: string;
  matchRole?: string;
  orderId?: string | null;
  userLevel?: number | null;
  documentary?: number;
  [key: string]: unknown;
}

const LBANK_BASE_URL =
  process.env.LBANK_AFFILIATE_BASE_URL || "https://affiliate.lbankverify.com";
const LBANK_API_KEY = process.env.LBANK_API_KEY || "";
const LBANK_API_SECRET = process.env.LBANK_API_SECRET || "";
const FIXIE_URL = process.env.FIXIE_URL || "";
// const LBANK_DEBUG = process.env.LBANK_DEBUG === "true";

// Lightweight cache for 90d totals to avoid recomputation on repeated calls
export const LBANK_90D_CACHE = new Map<string, { value: number; ts: number }>();
const LBANK_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

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

  const { sign } = signLbankHmacSha256(baseParams, LBANK_API_SECRET, "hex");

  // Silent in production – no signature debug logs

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
      // Quiet proxy info
    } catch (_error) {
      // Quiet proxy failures
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
  private commissionUidCache: string | null = null;

  isAPIActive(): boolean {
    if (!hasCreds()) return false;
    return true;
  }

  async getCommissionUid(traderUid?: string): Promise<string | null> {
    if (this.commissionUidCache) {
      return this.commissionUidCache;
    }

    if (!hasCreds()) {
      return null;
    }

    try {
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;
      const endTime = now - oneDayMs;
      const startTime = endTime - 180 * oneDayMs + 1;

      const testUids: string[] = [];
      if (traderUid) {
        testUids.push(traderUid);
      }

      const referrals = await this.getReferrals();
      for (const referral of referrals.slice(0, 3)) {
        const refUid = String(referral?.uid || "");
        if (refUid && !testUids.includes(refUid)) {
          testUids.push(refUid);
        }
      }

      for (const testUid of testUids) {
        try {
          console.log(
            "[LBank] getCommissionUid: Attempting to discover Commission UID using test UID:",
            testUid
          );

          const pageSize = 100;
          const maxPages = 5;
          let start = 0;

          for (let page = 0; page < maxPages; page++) {
            const testData = await doSignedGet<LBankTradePageResponse>(
              "/affiliate-api/v2/future/tradePage",
              {
                openId: testUid,
                userType: "ALL",
                loginUid: testUid,
                startTime,
                endTime,
                start,
                pageSize,
              }
            );

            console.log("[LBank] getCommissionUid: API Response received", {
              hasData: !!testData,
              hasPage: !!testData?.page,
              pageOpenId: testData?.page?.openId,
              resultListLength: testData?.resultList?.length ?? 0,
              totalCount: testData?.totalCount,
              hasNext: testData?.hasNext,
              page: page + 1,
              errorCode: (testData as unknown as LBankAPIResponse)?.error_code,
              errorMsg: (testData as unknown as LBankAPIResponse)?.msg,
            });

            if (testData?.page?.openId) {
              this.commissionUidCache = testData.page.openId;
              console.log(
                "[LBank] getCommissionUid: ✅ Successfully determined Commission UID from tradePage response:",
                this.commissionUidCache
              );
              return this.commissionUidCache;
            }

            if (
              !testData?.hasNext ||
              (testData?.resultList?.length ?? 0) < pageSize
            ) {
              break;
            }

            start += pageSize;
            await new Promise((r) => setTimeout(r, 120));
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          console.log(
            "[LBank] getCommissionUid: Attempt with UID",
            testUid,
            "failed:",
            errorMessage
          );
          continue;
        }
      }

      console.log(
        "[LBank] getCommissionUid: ⚠️ WARNING: Could not determine Commission UID from API responses after trying",
        testUids.length,
        "UIDs."
      );
      return null;
    } catch (error) {
      console.error(
        "[LBank] getCommissionUid: Error determining Commission UID:",
        error
      );
      return null;
    }
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

    // const tStart = Date.now();
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const thirtyDaysMs = 30 * oneDayMs;
    const ninetyDaysMs = 90 * oneDayMs;

    // Up to yesterday to respect T+1 settlement per docs
    const endTime = now - oneDayMs;
    const fastStartTime = endTime - thirtyDaysMs + 1;
    const fullStartTime = endTime - ninetyDaysMs + 1;

    // tradeType: 0 spot, 1 futures; "PERPETUAL" => 1 else 0
    const tradeType = sourceType === "PERPETUAL" ? 1 : 0;

    const fetchPaged = async (startTime: number, endTime: number) => {
      const pageSize = 100;
      let start = 0;
      const out: LBankCommissionItem[] = [];
      for (let page = 0; page < 50; page++) {
        const data = await doSignedGet<LBankCommissionItem[]>(
          "/affiliate-api/v2/commission/stats/symbol/list",
          {
            openId: uid,
            tradeType,
            startTime,
            endTime,
            coin: "",
            start,
            pageSize,
          }
        );
        const list = Array.isArray(data) ? data : [];
        out.push(...list);
        if (list.length < pageSize) break;
        start += pageSize;
        await new Promise((r) => setTimeout(r, 120));
      }
      return out;
    };

    try {
      // Fast path: only last 30 days synchronously
      const recent = await fetchPaged(fastStartTime, endTime);
      const recentMapped: CommissionData[] = recent.map((row) => ({
        uid,
        tradeAmount: row?.amount ?? "0",
        fee: row?.usdtAmount ?? row?.amount ?? "0",
        commission: row?.usdtAmount ?? "0",
        sourceType,
        coinSymbol: row?.coinSymbol,
        statsDate: row?.statsDate,
      }));

      // Compute immediate 24h/30d and log
      // const toNum = (v: unknown) =>
      //   typeof v === "number" ? v : typeof v === "string" ? parseInt(v, 10) : 0;
      const sum = (rows: CommissionData[]) =>
        rows.reduce((s, r) => s + (parseFloat(r.commission as string) || 0), 0);

      // const last24hStart = endTime - oneDayMs + 1;
      // const rows24h = recentMapped.filter(
      //   (r) =>
      //     toNum(r.statsDate) >= last24hStart && toNum(r.statsDate) <= endTime
      // );
      // const last24h = sum(rows24h);
      const last30d = sum(recentMapped);

      // const durationMs = Date.now() - tStart;

      const cache = LBANK_90D_CACHE.get(uid);
      const cacheValid = cache && Date.now() - cache.ts < LBANK_CACHE_TTL_MS;
      if (!cacheValid) {
        (async () => {
          try {
            const older = await fetchPaged(fullStartTime, fastStartTime - 1);
            const olderSum = older.reduce((s, row) => {
              const c = row?.usdtAmount ?? row?.amount ?? "0";
              return s + (parseFloat(String(c)) || 0);
            }, 0);
            const full90 = last30d + olderSum;
            LBANK_90D_CACHE.set(uid, { value: full90, ts: Date.now() });
          } catch {
            // ignore background errors
          }
        })();
      }

      // Return last 30d for UI
      return recentMapped;
    } catch {
      return [];
    }
  }

  async getTradingHistory(
    traderUid: string,
    startTime?: number,
    endTime?: number,
    userType: string = "ALL"
  ) {
    // Minimal log: start
    console.log("[LBank] getTradingHistory:start", { traderUid, userType });

    if (!hasCreds()) {
      console.log("[LBank] getTradingHistory: API credentials not configured");
      return [];
    }

    const tStart = Date.now();
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    // const oneHundredEightyDaysMs = 180 * oneDayMs;

    // Align endTime to 23:59:59.999 of yesterday in UTC+8 (LBank UI timezone)
    // const computeEndOfYesterdayUtc8 = (referenceNowUtcMs: number): number => {
    //   const UTC8_OFFSET = 8 * 60 * 60 * 1000; // 8 hours
    //   // shift to UTC+8 local time
    //   const localNow = referenceNowUtcMs + UTC8_OFFSET;
    //   // start of "today" in UTC+8 (00:00:00.000)
    //   const localStartOfToday = Math.floor(localNow / oneDayMs) * oneDayMs;
    //   // end of "yesterday" in UTC+8
    //   const localEndOfYesterday = localStartOfToday - 1;
    //   // shift back to UTC
    //   return localEndOfYesterday - UTC8_OFFSET;
    // };

    const computeUtc8EndOfToday = (): number => {
      const UTC8_OFFSET_MS = 8 * 60 * 60 * 1000;
      const localNow = now + UTC8_OFFSET_MS;
      const localStartOfToday = Math.floor(localNow / oneDayMs) * oneDayMs;
      const localEndOfToday = localStartOfToday + oneDayMs - 1;
      return localEndOfToday - UTC8_OFFSET_MS;
    };
    const utcEndOfToday = computeUtc8EndOfToday();

    // Hard-enforce end-of-today (UTC+8) to avoid upstream callers passing early endTime
    // (trimmed detailed time-window logs)

    const defaultEndTime = utcEndOfToday;
    // Start from the beginning of "yesterday" in UTC+8 (00:00:00.000)
    const UTC8_OFFSET_MS = 8 * 60 * 60 * 1000;
    const utc8Now = defaultEndTime + UTC8_OFFSET_MS;
    const utc8StartOfToday = Math.floor(utc8Now / oneDayMs) * oneDayMs;
    const utc8StartOfYesterday = utc8StartOfToday - oneDayMs;
    const computedStartUtc = utc8StartOfYesterday - UTC8_OFFSET_MS;
    const defaultStartTime = startTime ?? computedStartUtc;

    try {
      const pageSize = 100;
      const maxPages = 50;
      let discoveredCommissionUid: string | null = null;

      const fetchPass = async (
        extraParams: Record<string, unknown>,
        passLabel: string
      ): Promise<LBankTradeItem[]> => {
        let start = 0;
        const passTrades: LBankTradeItem[] = [];
        for (let page = 0; page < maxPages; page++) {
          const openIdToUse = this.commissionUidCache || traderUid;
          const requestParams: Record<string, unknown> = {
            openId: openIdToUse,
            userType: "ALL",
            startTime: defaultStartTime,
            endTime: defaultEndTime,
            start,
            pageSize,
            ...extraParams,
          };

          // Important: when querying with the affiliate (commission) account,
          // pass loginUid so the API returns the specific trader's rows.
          if (
            this.commissionUidCache &&
            this.commissionUidCache !== traderUid &&
            !("loginUid" in requestParams)
          ) {
            requestParams.loginUid = traderUid;
          }

          // (trimmed verbose per-page logs)

          const data = await doSignedGet<LBankTradePageResponse>(
            "/affiliate-api/v2/future/tradePage",
            requestParams
          );

          if (data?.page?.openId && !this.commissionUidCache) {
            this.commissionUidCache = data.page.openId;
            discoveredCommissionUid = data.page.openId;
          }

          const resultList = data?.resultList ?? [];
          passTrades.push(...resultList);

          // (trimmed raw response log)

          if (resultList.length < pageSize || !data?.hasNext) {
            // (trimmed last page log)
            break;
          }
          start += pageSize;
          await new Promise((r) => setTimeout(r, 120));
        }
        return passTrades;
      };

      // First pass: default (no orderType)
      const passDefault = await fetchPass({}, "default");
      // NOTE: Some environments are not authorized for orderType-scoped queries.
      // To avoid noisy permission errors, we rely on the default pass only.
      const passVoucher: LBankTradeItem[] = [];
      const passRegular0: LBankTradeItem[] = [];

      // Merge results by tradeId (or orderUuid if missing)
      const dedupKey = (t: LBankTradeItem) =>
        String(
          t?.tradeId ??
            (t as Record<string, unknown>)?.tradeid ??
            `${t?.orderUuid ?? ""}-${t?.memberOpenId ?? ""}-${
              t?.rebateTime ?? ""
            }`
        );
      const mergedMap = new Map<string, LBankTradeItem>();
      for (const t of [...passDefault, ...passVoucher, ...passRegular0]) {
        const key = dedupKey(t);
        if (!mergedMap.has(key)) mergedMap.set(key, t);
      }
      const allTrades = Array.from(mergedMap.values());
      const pageCount = Math.ceil(allTrades.length / pageSize) || 1;

      const durationMs = Date.now() - tStart;

      const finalCommissionUid =
        this.commissionUidCache || discoveredCommissionUid || "unknown";

      // (trimmed processing log)

      const mapped = allTrades.map((trade) => {
        const rawRebateRatio =
          trade?.rebateRatio ?? (trade as Record<string, unknown>)?.rebateRatio;
        const rebateRatioNum =
          typeof rawRebateRatio === "string"
            ? parseFloat(rawRebateRatio)
            : typeof rawRebateRatio === "number"
            ? rawRebateRatio
            : null;

        const commissionRate =
          rebateRatioNum !== null
            ? rebateRatioNum <= 1
              ? `${(rebateRatioNum * 100).toFixed(0)}%`
              : `${rebateRatioNum.toFixed(0)}%`
            : null;

        const rawTradeTime =
          trade?.tradeTime ??
          (trade as Record<string, unknown>)?.tradetime ??
          (trade as Record<string, unknown>)?.tradeTime;
        const tradeTimeMs =
          rawTradeTime && typeof rawTradeTime === "number"
            ? rawTradeTime > 1e12
              ? rawTradeTime
              : rawTradeTime * 1000
            : undefined;

        const rawInsertTime =
          trade?.insertTime ?? (trade as Record<string, unknown>)?.inserttime;
        const insertTimeMs =
          rawInsertTime && typeof rawInsertTime === "number"
            ? rawInsertTime > 1e12
              ? rawInsertTime
              : rawInsertTime * 1000
            : undefined;

        const rawRebateTime =
          trade?.rebateTime ?? (trade as Record<string, unknown>)?.rebateTime;
        const rebateTimeMs =
          rawRebateTime && typeof rawRebateTime === "number"
            ? rawRebateTime > 1e12
              ? rawRebateTime
              : rawRebateTime * 1000
            : undefined;

        const tradeId =
          trade?.tradeId ??
          (trade as Record<string, unknown>)?.tradeid ??
          (trade as Record<string, unknown>)?.tradeId;
        const instrumentId =
          trade?.instrumentId ??
          (trade as Record<string, unknown>)?.instrumentid;

        const commissionValue = trade?.commission ?? "0";
        // Determine settlement strictly by Commission (USDT) as per UI:
        // "Distributed" only when commissionUsdt > 0
        const rawCommissionUsdt = (trade as Record<string, unknown>)
          ?.commissionUsdt;
        const commissionUsdtNum =
          rawCommissionUsdt === null || rawCommissionUsdt === undefined
            ? 0
            : parseFloat(String(rawCommissionUsdt));
        // Enforce T+1 settlement like the UI: trades on "today (UTC+8)" are Not Distributed,
        // even if the API echoes a non-zero commissionUsdt.
        const UTC8_OFFSET_MS = 8 * 60 * 60 * 1000;
        const localNow = Date.now() + UTC8_OFFSET_MS;
        const startOfTodayUtc8 =
          Math.floor(localNow / (24 * 60 * 60 * 1000)) * (24 * 60 * 60 * 1000);
        const tradeLocalMs =
          (tradeTimeMs ?? insertTimeMs ?? 0) + UTC8_OFFSET_MS;
        const tradeIsTodayUtc8 =
          tradeLocalMs >= startOfTodayUtc8 &&
          tradeLocalMs < startOfTodayUtc8 + 24 * 60 * 60 * 1000;
        const isSettled =
          !isNaN(commissionUsdtNum) &&
          commissionUsdtNum > 0 &&
          !tradeIsTodayUtc8;
        const commissionUsdtValue = isSettled ? String(commissionUsdtNum) : "0";
        const statusValue = isSettled ? "Distributed" : "Not Distributed";

        return {
          uid: trade?.memberOpenId ?? traderUid,
          commissionUid: finalCommissionUid,
          traderUid: trade?.memberOpenId ?? null,
          tradeAmount: String(trade?.turnover ?? "0"),
          timestamp: tradeTimeMs ?? insertTimeMs,
          tradeTime: rawTradeTime,
          insertTime: rawInsertTime,
          tradeTimeMs,
          insertTimeMs,
          rebateTime: rawRebateTime,
          rebateTimeMs,
          settlementTime: rebateTimeMs,
          instrumentId: instrumentId ? String(instrumentId) : undefined,
          leverage: trade?.leverage,
          direction: trade?.direction,
          volume: trade?.volume,
          turnover: trade?.turnover,
          feeCurrency: trade?.feeCurrency,
          offsetFlag: trade?.offsetFlag,
          closeProfit: trade?.closeProfit,
          fee: trade?.fee,
          payFee: trade?.payFee,
          rebateRatio: rawRebateRatio ? String(rawRebateRatio) : null,
          commissionRate,
          commission: commissionValue,
          commissionUsdt: commissionUsdtValue,
          status: statusValue,
          orderUuid: trade?.orderUuid,
          price: trade?.price,
          matchRole: trade?.matchRole,
          orderId: trade?.orderId,
          userLevel: trade?.userLevel,
          documentary: trade?.documentary,
          tradeId: tradeId ? String(tradeId) : undefined,
          remark: trade?.remark,
        };
      });

      // Keep only the requested trader's rows (fetch may return all traders)
      const filtered = mapped.filter((r) => r.uid === traderUid);
      // const filteredOutCount = mapped.length - filtered.length;
      // By default, show only Distributed rows to match the UI's settled view
      const distributedOnly = filtered.filter(
        (r) => parseFloat(String(r.commissionUsdt ?? "0")) > 0
      );
      const used = distributedOnly.length > 0 ? distributedOnly : filtered;

      // (trimmed per-trade entry logs)

      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;
      const thirtyDaysMs = 30 * oneDayMs;
      const ninetyDaysMs = 90 * oneDayMs;

      const last24hStart = now - oneDayMs;
      const last30dStart = now - thirtyDaysMs;
      const last90dStart = now - ninetyDaysMs;

      const calculateSummary = (
        trades: typeof mapped,
        startTime: number,
        useSettlementTime: boolean = true
      ) => {
        return trades.reduce(
          (acc, trade) => {
            const timeToUse = useSettlementTime
              ? trade.rebateTimeMs ?? trade.settlementTime
              : trade.tradeTimeMs ?? trade.insertTimeMs ?? trade.timestamp;

            if (!timeToUse || timeToUse < startTime) return acc;

            // Summaries should reflect settled amounts only (commissionUsdt)
            const commission = 0;
            const commissionUsdt = parseFloat(
              String(trade.commissionUsdt ?? "0")
            );

            return {
              commission: acc.commission + (isNaN(commission) ? 0 : commission),
              commissionUsdt:
                acc.commissionUsdt +
                (isNaN(commissionUsdt) ? 0 : commissionUsdt),
            };
          },
          { commission: 0, commissionUsdt: 0 }
        );
      };

      const summary24h = calculateSummary(used, last24hStart, true);
      const summary30d = calculateSummary(used, last30dStart, true);
      const summary90d = calculateSummary(used, last90dStart, true);

      if (used.length > 0) {
        console.log("[LBank] getTradingHistory: ✅ SUCCESS - Data Retrieved", {
          commissionUid: finalCommissionUid,
          traderUid,
          totalRecords: used.length,
          pagesFetched: pageCount,
          durationMs: `${durationMs}ms`,
          summaries: {
            last24h: {
              commission: Number(summary24h.commission.toFixed(8)),
              commissionUsdt: Number(summary24h.commissionUsdt.toFixed(8)),
            },
            last30d: {
              commission: Number(summary30d.commission.toFixed(8)),
              commissionUsdt: Number(summary30d.commissionUsdt.toFixed(8)),
            },
            last90d: {
              commission: Number(summary90d.commission.toFixed(8)),
              commissionUsdt: Number(summary90d.commissionUsdt.toFixed(8)),
            },
          },
          firstRecord: {
            tradeTime: (() => {
              const tt = used[0].tradeTimeMs;
              return tt !== undefined ? new Date(tt).toISOString() : null;
            })(),
            memberOpenId: used[0].uid,
            fee: used[0].fee,
            commissionRate: used[0].commissionRate,
            commission: used[0].commission,
            commissionUsdt: used[0].commissionUsdt,
            instrumentId: used[0].instrumentId,
          },
          lastRecord:
            used.length > 1
              ? {
                  tradeTime: (() => {
                    const tt = used[used.length - 1].tradeTimeMs;
                    return tt !== undefined ? new Date(tt).toISOString() : null;
                  })(),
                  memberOpenId: used[used.length - 1].uid,
                  fee: used[used.length - 1].fee,
                  commission: used[used.length - 1].commission,
                }
              : null,
          sampleRecords: used.slice(0, 3).map((r) => ({
            tradeTime: (() => {
              const tt = r.tradeTimeMs;
              return tt !== undefined ? new Date(tt).toISOString() : null;
            })(),
            memberOpenId: r.uid,
            fee: r.fee,
            commissionRate: r.commissionRate,
            commission: r.commission,
            commissionUsdt: r.commissionUsdt,
            status: r.status,
          })),
        });
      } else {
        console.log("[LBank] getTradingHistory: ⚠️ NO DATA - Empty Result", {
          commissionUid: finalCommissionUid,
          traderUid,
          totalRecords: 0,
          pagesFetched: pageCount,
          durationMs: `${durationMs}ms`,
          summaries: {
            last24h: { commission: 0, commissionUsdt: 0 },
            last30d: { commission: 0, commissionUsdt: 0 },
            last90d: { commission: 0, commissionUsdt: 0 },
          },
          message: `No trading history found for Commission UID ${finalCommissionUid} and Trader UID ${traderUid} in this time range`,
        });
      }

      const summaries = {
        last24h: {
          commission: summary24h.commission,
          commissionUsdt: summary24h.commissionUsdt,
        },
        last30d: {
          commission: summary30d.commission,
          commissionUsdt: summary30d.commissionUsdt,
        },
        last90d: {
          commission: summary90d.commission,
          commissionUsdt: summary90d.commissionUsdt,
        },
      };

      const resultWithSummaries = used.map((trade) => ({
        ...trade,
        _summaries: summaries,
      }));

      // const uniqueTraderUids = [
      //   ...new Set(used.map((t) => t.uid).filter(Boolean)),
      // ];
      // const tradesByTrader = uniqueTraderUids.reduce((acc, traderUid) => {
      //   const traderTrades = used.filter((t) => t.uid === traderUid);
      //   const traderTotal = traderTrades.reduce(
      //     (sum, t) =>
      //       sum + parseFloat(String(t.commissionUsdt ?? t.commission ?? "0")),
      //     0
      //   );
      //   acc[traderUid] = {
      //     count: traderTrades.length,
      //     totalCommission: traderTotal,
      //   };
      //   return acc;
      // }, {} as Record<string, { count: number; totalCommission: number }>);

      // (trimmed per-trader totals logs)

      // For diagnostics, derive the earliest trade time we actually saw for this trader
      const earliestTradeMs =
        used.reduce<number | undefined>(
          (min, t) =>
            t.rebateTimeMs && (min === undefined || t.rebateTimeMs < min)
              ? t.rebateTimeMs
              : min,
          undefined
        ) ?? defaultStartTime;

      // Minimal log: summary
      console.log("[LBank] getTradingHistory:summary", {
        commissionUid: finalCommissionUid,
        traderUid,
        totalRecords: used.length,
        last24hUsdt: Number(summary24h.commissionUsdt.toFixed(8)),
        last30dUsdt: Number(summary30d.commissionUsdt.toFixed(8)),
        last90dUsdt: Number(summary90d.commissionUsdt.toFixed(8)),
        dateRange: {
          start: new Date(earliestTradeMs).toISOString(),
          end: new Date(defaultEndTime).toISOString(),
        },
      });

      return resultWithSummaries;
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Unknown error";
      console.error("[LBank] getTradingHistory: Error", {
        commissionUid: this.commissionUidCache || "unknown",
        traderUid,
        error: errorMessage,
        durationMs: Date.now() - tStart,
        stack: e instanceof Error ? e.stack : undefined,
      });
      return [];
    }
  }

  async getTradingVolume(uid: string): Promise<string> {
    // Optional; can be implemented via /affiliate-api/v2/trade/user/team or /trade/user
    return "0";
  }
}
