"use client";

import {
  useBrokerAPIActive,
  useBrokerCommissionData,
  useBrokerReferrals,
  useBrokerTradingHistory,
  useBrokerUIDVerification,
} from "@/hooks/broker/use-broker-api";
import { useAddUserUid, useUserUids } from "@/hooks/use-user-uids";
import {
  BadgeCheck,
  ChevronRight,
  Copy,
  Info,
  KeyRoundIcon,
  PlusIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useRef, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { UidRegistrationDialog } from "../uid/uid-registration-dialog";

// Broker data with logos
const BROKERS = [
  {
    id: "deepcoin",
    name: "DeepCoin",
    paybackRate: 55,
    status: "active",
    logo: "/broker/deepcoin.png",
  },
  {
    id: "bingx",
    name: "BingX",
    paybackRate: 60,
    status: "active",
    logo: "/broker/bingx.png",
  },
  {
    id: "okx",
    name: "OKX",
    paybackRate: 70,
    status: "coming-soon",
    logo: "/broker/okx.png",
  },
  {
    id: "orangex",
    name: "OrangeX",
    paybackRate: 50,
    status: "active",
    logo: "/broker/orangex.webp",
  },
  {
    id: "lbank",
    name: "LBank",
    paybackRate: 50,
    status: "active",
    logo: "/broker/Lbank.png",
  },
];

// Referral signup links per broker (extendable)
const REFERRAL_LINKS: Record<string, string> = {
  deepcoin: "https://s.deepcoin.com/jedgica",
  orangex: "https://affiliates.orangex.com/affiliates/b/4dratgs2",
  lbank: "https://lbank.com/ref/5DJS5",
  bingx: "https://bingx.com/invite/6PA4QR",
};

// Backup referral links for fallback
const REFERRAL_BACKUP_LINKS: Record<string, string> = {
  lbank: "https://lbank.one/ref/5DJS5",
};

// Function to get referral link with fallback
// const getReferralLink = (brokerId: string): string => {
//   const primaryLink = REFERRAL_LINKS[brokerId];
//   const backupLink = REFERRAL_BACKUP_LINKS[brokerId];

//   // If no primary link exists, return empty string
//   if (!primaryLink) return "";

//   // If no backup link exists, return primary
//   if (!backupLink) return primaryLink;

//   // Return primary link (backup will be used if primary fails)
//   return primaryLink;
// };

// Component for referral link with fallback mechanism
function ReferralLinkWithFallback({ brokerId }: { brokerId: string }) {
  const t = useTranslations("profile.uidRegistration");
  const primaryLink = REFERRAL_LINKS[brokerId];
  const backupLink = REFERRAL_BACKUP_LINKS[brokerId];

  if (!primaryLink) return null;

  // If no backup link, just show primary
  if (!backupLink) {
    return (
      <a
        href={primaryLink}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-pointer mt-1 sm:mt-0"
      >
        <div className="w-1.5 h-1.5 bg-amber-500"></div>
        <span className="text-muted-foreground">{t("status.notReferral")}</span>
        <ChevronRight className="w-3 h-3 text-muted-foreground" />
      </a>
    );
  }

  // If both links exist, show primary with backup option
  return (
    <div className="flex items-center gap-1.5 mt-1 sm:mt-0">
      <a
        href={primaryLink}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-pointer"
      >
        <div className="w-1.5 h-1.5 bg-amber-500"></div>
        <span className="text-muted-foreground">{t("status.notReferral")}</span>
        <ChevronRight className="w-3 h-3 text-muted-foreground" />
      </a>
      <span className="text-muted-foreground text-xs">|</span>
      <a
        href={backupLink}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-muted-foreground hover:opacity-80 transition-opacity cursor-pointer"
        title="Backup referral link"
      >
        Backup
      </a>
    </div>
  );
}

interface UidRecord {
  id: string;
  brokerId: string;
  brokerName: string;
  uid: string;
  status: "pending" | "verified" | "failed";
  paybackRate: number;
  accumulated24hPayback?: number;
  last24hValue?: number;
  withdrawnAmount?: number;
  withdrawableBalance?: number;
}

type ServerUidRow = {
  id: string;
  exchange_id: string;
  uid: string;
  is_active: boolean;
  accumulated_24h_payback?: number;
  last_24h_value?: number;
  last_24h_fetch_date?: string;
  withdrawn_amount?: number;
  withdrawable_balance?: number;
};

export function UidRegistration() {
  const t = useTranslations("profile.uidRegistration");
  const { data: serverUids, isLoading } = useUserUids();
  const addMutation = useAddUserUid();

  // Get all active UID IDs from server data
  const activeUidIds = new Set(
    (serverUids as ServerUidRow[] | undefined)
      ?.filter((r) => r.is_active)
      ?.map((r) => r.id) || []
  );

  const handleUIDAdded = async (uid: string, brokerId: string) => {
    const broker = BROKERS.find((b) => b.id === brokerId);
    if (!broker) return;
    await addMutation.mutateAsync({
      uid,
      exchange_id: brokerId,
    });
  };

  // Map server data to UI format
  const uidRecords = ((serverUids as ServerUidRow[] | undefined) || []).map(
    (row) => {
      const broker = BROKERS.find((b) => b.id === row.exchange_id);
      return {
        id: row.id,
        brokerId: row.exchange_id,
        brokerName: broker?.name || row.exchange_id,
        uid: row.uid,
        status: (row.is_active ? "verified" : "pending") as
          | "pending"
          | "verified"
          | "failed",
        paybackRate: broker?.paybackRate ?? 0,
        accumulated24hPayback: Number(row.accumulated_24h_payback) || 0,
        last24hValue: Number(row.last_24h_value) || 0,
        withdrawnAmount: Number(row.withdrawn_amount) || 0,
        withdrawableBalance: Number(row.withdrawable_balance) || 0,
      } as UidRecord;
    }
  );

  return (
    <div className="p-4 ">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <KeyRoundIcon className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold text-foreground">
            {t("title")}
          </h1>
        </div>

        <UidRegistrationDialog
          title={t("addUid")}
          trigger={
            <Button variant="outline" className="rounded-none h-10">
              <PlusIcon className="h-4 w-4" />
              {t("addUid")}
            </Button>
          }
          onUIDAdded={handleUIDAdded}
        />
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="bg-background border border-border p-5 animate-pulse"
              >
                {/* Header skeleton */}
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 bg-muted/30" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-muted/30" />
                    <div className="h-3 w-24 bg-muted/20" />
                  </div>
                  <div className="h-5 w-12 bg-muted/30" />
                </div>

                {/* Big balance skeleton */}
                <div className="p-6 bg-muted/10 border border-border" />

                {/* Two stats skeleton */}
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="h-14 bg-muted/10 border border-border" />
                  <div className="h-14 bg-muted/10 border border-border" />
                </div>

                {/* Footer skeleton */}
                <div className="border-t border-border mt-4 pt-3 space-y-2">
                  <div className="h-3 w-40 bg-muted/20" />
                  <div className="h-3 w-32 bg-muted/20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* UID Cards Grid */}
      {!isLoading && uidRecords.length > 0 && (
        <div className="mt-8 space-y-4">
          <h2 className="text-lg font-medium">{t("yourUids")}</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {uidRecords.map((record) => (
              <UIDCard
                key={record.id}
                record={record}
                isActiveUid={activeUidIds.has(record.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && uidRecords.length === 0 && (
        <div className="mt-8 text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-muted/30 rounded-full flex items-center justify-center">
            <PlusIcon className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">{t("emptyState.title")}</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            {t("emptyState.description")}
          </p>
        </div>
      )}
    </div>
  );
}

function UIDCard({
  record,
  isActiveUid,
}: {
  record: UidRecord;
  isActiveUid: boolean;
}) {
  const t = useTranslations("profile.uidRegistration");
  const isBrokerActive = useBrokerAPIActive(record.brokerId);

  const uidVerification = useBrokerUIDVerification(
    record.brokerId,
    record.uid,

    isBrokerActive.data === true && record.brokerId !== "deepcoin"
  );

  // Get referrals data - only active when broker API is active
  const referrals = useBrokerReferrals(
    record.brokerId,
    isBrokerActive.data === true
  );

  // Get commission data - only active when broker API is active
  // For BingX, wait for referrals to complete to avoid concurrent requests
  const commission = useBrokerCommissionData(
    record.brokerId,
    record.uid,
    "PERPETUAL",
    isBrokerActive.data === true,
    record.brokerId === "bingx" ? referrals : undefined
  );

  // Get trading history - only active when broker API is active
  const tradingHistory = useBrokerTradingHistory(
    record.brokerId,
    record.uid,
    isBrokerActive.data === true
  );

  // Use database values directly (calculated by DB trigger)
  const accumulatedPayback = record.accumulated24hPayback || 0;
  const withdrawnAmount = record.withdrawnAmount || 0;
  const withdrawableBalance = record.withdrawableBalance || 0;
  // Note: displayedTotal calculated after commissionTotals is available

  // Get commission totals from API response (backend provides cached totals)
  const getCommissionTotals = () => {
    // For LBank, OrangeX, and DeepCoin, use trading history summaries if available
    if (
      (record.brokerId === "lbank" ||
        record.brokerId === "orangex" ||
        record.brokerId === "deepcoin") &&
      tradingHistory.data &&
      Array.isArray(tradingHistory.data) &&
      tradingHistory.data.length > 0
    ) {
      const firstTrade = tradingHistory.data[0] as {
        _summaries?: {
          last24h?: { commissionUsdt?: number };
          last30d?: { commissionUsdt?: number };
          last60d?: { commissionUsdt?: number };
          last90d?: { commissionUsdt?: number };
        };
      };

      if (firstTrade?._summaries) {
        return {
          last24h: firstTrade._summaries.last24h?.commissionUsdt || 0,
          last30d: firstTrade._summaries.last30d?.commissionUsdt || 0,
          last60d: firstTrade._summaries.last60d?.commissionUsdt || 0,
          last90d: firstTrade._summaries.last90d?.commissionUsdt || 0,
        };
      }
    }

    if (!commission.data) {
      return {
        last24h: 0,
        last30d: 0,
        last60d: 0,
        last90d: 0,
      };
    }

    // Check if response has new format with totals (from API route)
    if (
      typeof commission.data === "object" &&
      commission.data !== null &&
      "totals" in commission.data &&
      "data" in commission.data
    ) {
      const response = commission.data as {
        data: unknown[];
        totals: {
          last30d?: number;
          last60d?: number;
          last90d?: number;
        };
      };
      return {
        last24h: 0,
        last30d: response.totals.last30d || 0,
        last60d: response.totals.last60d || 0,
        last90d: response.totals.last90d || 0,
      };
    }

    // Fallback: calculate from data array (backward compatibility)
    if (Array.isArray(commission.data)) {
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;
      const thirtyDaysMs = 30 * oneDayMs;
      const queryEndTime = now - oneDayMs;
      const last30dStart = queryEndTime - thirtyDaysMs + 1;

      const toNum = (v: unknown): number => {
        if (typeof v === "number") return v;
        if (typeof v === "string") {
          const n = parseInt(v, 10);
          return Number.isFinite(n) ? n : 0;
        }
        return 0;
      };

      const sumCommission = (rows: typeof commission.data) =>
        (rows || []).reduce(
          (s, r) => s + (parseFloat(String(r?.commission || 0)) || 0),
          0
        );

      const rows30d = commission.data.filter((r) => {
        const statsDate = toNum((r as { statsDate?: unknown })?.statsDate);
        return statsDate >= last30dStart && statsDate <= queryEndTime;
      });

      return {
        last24h: 0,
        last30d: sumCommission(rows30d),
        last60d: 0,
        last90d: 0,
      };
    }

    return {
      last24h: 0,
      last30d: 0,
      last60d: 0,
      last90d: 0,
    };
  };

  const commissionTotals = getCommissionTotals();
  const isCommissionLoading = commission.isLoading || commission.isFetching;
  const isTradingHistoryLoading =
    tradingHistory.isLoading || tradingHistory.isFetching;

  // For LBank, OrangeX, and DeepCoin, use trading history loading state; for others, use commission loading
  const isLoadingTotals =
    record.brokerId === "lbank" ||
    record.brokerId === "orangex" ||
    record.brokerId === "deepcoin"
      ? isTradingHistoryLoading
      : isCommissionLoading;

  // Displayed total: persisted accumulated + today's 24h (prefer DB; fallback to live for LBank/OrangeX/DeepCoin)
  const liveLast24h =
    (record.brokerId === "lbank" ||
      record.brokerId === "orangex" ||
      record.brokerId === "deepcoin") &&
    commissionTotals?.last24h
      ? Number(commissionTotals.last24h) || 0
      : 0;
  const dbLast24h = record.last24hValue ?? 0;
  // Do NOT double-count: prefer accumulated (already includes today's 24h on registration),
  // otherwise use DB last_24h_value, otherwise fallback to live for LBank/OrangeX.
  const displayedTotal =
    accumulatedPayback > 0
      ? accumulatedPayback
      : dbLast24h > 0
      ? dbLast24h
      : liveLast24h;
  const hasRefetchedRef = useRef(false);
  const refetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Detect when 60d/90d totals are missing but 30d is available, then refetch
  useEffect(() => {
    // Clear any pending timeout when component unmounts or data changes
    if (refetchTimeoutRef.current) {
      clearTimeout(refetchTimeoutRef.current);
      refetchTimeoutRef.current = null;
    }

    if (
      !isCommissionLoading &&
      commission.isSuccess &&
      commissionTotals.last30d > 0 &&
      !hasRefetchedRef.current
    ) {
      const expectedTotalKey =
        record.brokerId === "deepcoin" ? "last60d" : "last90d";

      // Check if response has totals object
      const hasTotalsObject =
        commission.data &&
        typeof commission.data === "object" &&
        commission.data !== null &&
        "totals" in commission.data;

      if (hasTotalsObject) {
        const response = commission.data as {
          totals: {
            last30d?: number;
            last60d?: number;
            last90d?: number;
          };
        };

        // Check if the expected key exists in totals object
        // If key is missing (undefined), cache is not ready yet
        const totalsHasKey = expectedTotalKey in response.totals;

        // If totals object exists but the expected key is missing, cache is being populated
        if (!totalsHasKey) {
          hasRefetchedRef.current = true;
          // Wait for background cache to populate (background fetch typically takes 1-3 seconds)
          refetchTimeoutRef.current = setTimeout(() => {
            commission.refetch();
            refetchTimeoutRef.current = null;
          }, 3000);
        }
      }
    }

    return () => {
      if (refetchTimeoutRef.current) {
        clearTimeout(refetchTimeoutRef.current);
        refetchTimeoutRef.current = null;
      }
    };
  }, [
    commission.isSuccess,
    commission.data,
    commissionTotals.last30d,
    isCommissionLoading,
    record.brokerId,
    commission.refetch,
  ]);

  // Safely handle the referral data structure
  const referralData = referrals.data;
  const referralList = Array.isArray(referralData)
    ? referralData
    : referralData?.referrals?.list // Handle DeepCoin structure
    ? referralData.referrals.list
    : referralData?.list
    ? referralData.list
    : referralData?.data
    ? referralData.data
    : [];

  const isReferralItem = (value: unknown): value is { uid: string | number } =>
    typeof value === "object" &&
    value !== null &&
    "uid" in value &&
    (typeof (value as { uid: unknown }).uid === "string" ||
      typeof (value as { uid: unknown }).uid === "number");

  // Check if this UID is a referral - try multiple approaches
  const isReferral =
    // Method 1: Check referrals list if available
    (referrals.isSuccess &&
      referralList.some((ref: unknown) => {
        if (!isReferralItem(ref)) return false;
        const refUid = ref.uid;
        const recordUid = record.uid;
        const isMatch = String(refUid) === String(recordUid);
        // Debug logging
        if (record.brokerId === "deepcoin") {
          console.log(
            `DeepCoin referral check: ${refUid} === ${recordUid} = ${isMatch}`
          );
        }
        return isMatch;
      })) ||
    // Method 2: For DeepCoin, check if UID verification data shows it's a referral
    (record.brokerId === "deepcoin" &&
      uidVerification.isSuccess &&
      uidVerification.data?.data?.list?.[0]?.uidUpLevel) ||
    // Method 3: For OrangeX, check isReferral field from UID verification
    (record.brokerId === "orangex" &&
      uidVerification.isSuccess &&
      uidVerification.data?.isReferral === true) ||
    // Method 4: For OrangeX fallback, check if commission data exists
    (record.brokerId === "orangex" &&
      commission.isSuccess &&
      commission.data &&
      (Array.isArray(commission.data)
        ? commission.data.length > 0
        : typeof commission.data === "object" &&
          commission.data !== null &&
          "data" in commission.data &&
          Array.isArray((commission.data as { data: unknown[] }).data) &&
          (commission.data as { data: unknown[] }).data.length > 0)) ||
    // Method 5: For LBank, check if UID verification data shows it's verified
    (record.brokerId === "lbank" &&
      uidVerification.isSuccess &&
      uidVerification.data?.verified === true) ||
    // Method 6: For BingX, referral only if relation is confirmed
    (record.brokerId === "bingx" &&
      uidVerification.isSuccess &&
      (uidVerification.data?.inviteResult === true ||
        uidVerification.data?.existInviter === true));

  // For BingX: instant referral determination from inviteRelationCheck
  const bingxReferralFast =
    record.brokerId === "bingx" &&
    uidVerification.isSuccess &&
    (uidVerification.data?.inviteResult === true ||
      uidVerification.data?.existInviter === true ||
      uidVerification.data?.verified === true);

  // For BingX: verified ONLY if inviteRelationCheck confirms (scoped to our account)
  // Don't use commission as fallback - inviteRelationCheck is the authoritative source
  const isBingxVerified =
    record.brokerId === "bingx" &&
    uidVerification.isSuccess &&
    (uidVerification.data?.inviteResult === true ||
      uidVerification.data?.existInviter === true ||
      uidVerification.data?.verified === true);

  // Debug logging for DeepCoin
  if (record.brokerId === "deepcoin") {
    console.log("DeepCoin referral debug:", {
      referralsSuccess: referrals.isSuccess,
      referralData: referrals.data,
      referralList: referralList,
      recordUid: record.uid,
      isReferral: isReferral,
    });
  }

  // For DeepCoin: If referrals work, use that to determine verification status
  const isDeepCoinVerified =
    record.brokerId === "deepcoin" &&
    referrals.isSuccess &&
    referralList.some(
      (ref: unknown) =>
        isReferralItem(ref) && String(ref.uid) === String(record.uid)
    );

  // For LBank: Check if UID verification shows it's verified
  const isLBankVerified =
    record.brokerId === "lbank" &&
    uidVerification.isSuccess &&
    uidVerification.data?.verified === true;

  // Cache last known successful verification to avoid flicker on transient errors
  const lastVerifiedRef = useRef<Record<string, boolean>>({});

  // Determine verified status using multiple sources and cache
  const verifiedFromAPI =
    (uidVerification.data?.verified ||
      uidVerification.data?.data?.list?.[0]?.uidUpLevel) === true;

  if (
    (uidVerification.isSuccess && verifiedFromAPI) ||
    isDeepCoinVerified ||
    isLBankVerified ||
    isBingxVerified
  ) {
    lastVerifiedRef.current[record.id] = true;
  }

  const verifiedFallback = lastVerifiedRef.current[record.id] === true;

  // Consider DeepCoin referral success and LBank verification as verification as well
  const verifiedOverall =
    (uidVerification.isSuccess && verifiedFromAPI) ||
    (!uidVerification.isSuccess && verifiedFallback) ||
    isDeepCoinVerified ||
    isLBankVerified ||
    isBingxVerified;

  // Determine if UID is actually active based on DB + overall verification
  const isUidActuallyActive =
    isActiveUid && (verifiedOverall || uidVerification.isLoading);

  return (
    <div
      className={`relative bg-background border border-border transition-all duration-200 ${
        isUidActuallyActive
          ? "border-emerald-500/30 shadow-sm"
          : "hover:border-border/60"
      }`}
    >
      {/* Header */}
      <div className="p-4 sm:p-5 pb-2 border-b border-border">
        {/* Header Layout: stack on mobile, row on larger screens */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:flex-wrap gap-3 sm:gap-4 mb-3 w-full">
          {/* Image on the left */}
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-muted flex items-center justify-center shrink-0 rounded-full overflow-hidden">
            <Image
              src={BROKERS.find((b) => b.id === record.brokerId)?.logo || ""}
              alt={`${record.brokerName} logo`}
              width={32}
              height={32}
              className="h-full w-full object-contain rounded-full"
            />
          </div>

          {/* Name and UID on the right */}
          <div className="flex-1 flex flex-col justify-center min-w-0">
            {/* Broker name */}
            <div className="flex items-center gap-2 mb-1 min-w-0">
              <h3 className="text-base font-medium text-foreground">
                {record.brokerName}
              </h3>
            </div>

            {/* UID below the name */}
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] sm:text-xs text-muted-foreground font-mono bg-muted px-2 py-1 truncate max-w-[80%] sm:max-w-none">
                {record.uid}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(record.uid);
                  toast.success(t("toast.uidCopied"));
                }}
                className="h-5 w-5 p-0 hover:bg-muted shrink-0"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Status Indicators and Active/Inactive on the far right */}
          <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto min-w-0 sm:min-w-[220px] sm:ml-auto">
            {/* Active/Inactive Status - Top line */}
            <div
              className={`text-xs font-medium px-2 py-1 self-start sm:self-auto ${
                isUidActuallyActive
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {uidVerification.isLoading ? (
                <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              ) : isUidActuallyActive ? (
                t("status.active")
              ) : (
                t("status.inactive")
              )}
            </div>

            {/* Status Indicators - Bottom line */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-3 text-[11px] sm:text-xs text-muted-foreground w-full">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 whitespace-normal">
                <div className="flex items-center gap-1.5">
                  {uidVerification.isLoading && !uidVerification.isError ? (
                    <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin"></div>
                  ) : (uidVerification.isSuccess &&
                      uidVerification.data?.verified) ||
                    isDeepCoinVerified ? (
                    <BadgeCheck className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                  )}
                  <span>
                    {uidVerification.isLoading && !uidVerification.isError
                      ? t("status.verifying")
                      : (uidVerification.isSuccess &&
                          uidVerification.data?.verified) ||
                        isDeepCoinVerified
                      ? t("status.verified")
                      : uidVerification.isSuccess &&
                        uidVerification.data?.reason
                      ? uidVerification.data.reason
                      : t("status.notVerified")}
                  </span>
                </div>

                {(referrals.isSuccess || isReferral !== undefined) &&
                  !isReferral &&
                  // For BingX, don't show Not referral if fast check is positive or loading
                  !(
                    record.brokerId === "bingx" &&
                    (bingxReferralFast || uidVerification.isLoading)
                  ) && <ReferralLinkWithFallback brokerId={record.brokerId} />}
              </div>

              {/* Referral link removed by request */}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="p-4 sm:p-5 pb-2">
        <div className="grid grid-cols-1 gap-3">
          {/* Total accumulated payback (includes today's 24h if available) */}
          <div className="p-3 sm:p-4 border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 text-center">
            <div className="text-xl sm:text-2xl font-semibold text-emerald-700 dark:text-emerald-300 font-mono mb-1 sm:mb-2">
              ${displayedTotal.toFixed(4)}
            </div>
            <div className="flex items-center justify-center gap-1 text-[11px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-1">
              <span>{t("stats.totalAccumulatedPayback")}</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <div className="text-xs space-y-1">
                      <p>{t("stats.totalAccumulatedPaybackTooltip")}</p>
                      {(record.brokerId === "lbank" ||
                        record.brokerId === "orangex" ||
                        record.brokerId === "deepcoin") &&
                        accumulatedPayback <= 0 &&
                        dbLast24h <= 0 &&
                        liveLast24h > 0 && (
                          <p className="text-emerald-600 dark:text-emerald-400">
                            Includes today&apos;s 24h (live): $
                            {liveLast24h.toFixed(4)}
                          </p>
                        )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            {/* Live 24h value from trading history (LBank, OrangeX, and DeepCoin) */}
            {(record.brokerId === "lbank" ||
              record.brokerId === "orangex" ||
              record.brokerId === "deepcoin") &&
              commissionTotals.last24h > 0 && (
                <div className="text-[0.75rem] text-emerald-500 dark:text-emerald-400 font-medium mt-1">
                  Last 24h: ${commissionTotals.last24h.toFixed(4)}
                </div>
              )}
          </div>

          {/* Withdrawn and Withdrawable */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="p-2.5 sm:p-3 border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 text-center">
              <div className="text-base sm:text-lg font-semibold text-blue-700 dark:text-blue-300 font-mono mb-0.5 sm:mb-1">
                ${withdrawnAmount.toFixed(4)}
              </div>
              <div className="text-[11px] sm:text-xs text-blue-600 dark:text-blue-400 font-medium">
                {t("stats.withdrawnAmount")}
              </div>
            </div>

            <div className="p-2.5 sm:p-3 border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 text-center">
              <div className="text-base sm:text-lg font-semibold text-amber-700 dark:text-amber-300 font-mono mb-0.5 sm:mb-1">
                ${withdrawableBalance.toFixed(4)}
              </div>
              <div className="text-[11px] sm:text-xs text-amber-600 dark:text-amber-400 font-medium">
                {t("stats.withdrawableBalance")}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Additional Info Footer */}
      <div className="p-4 sm:p-5 border-t border-border">
        <div className="space-y-2 text-[11px] sm:text-xs text-muted-foreground">
          <div className="flex items-center justify-between gap-2">
            <span>
              {record.brokerId === "deepcoin"
                ? t("stats.last60Days")
                : t("stats.last90Days")}
            </span>
            {isLoadingTotals ? (
              <div className="h-4 w-16 bg-muted animate-pulse rounded" />
            ) : (
              <span className="text-foreground font-medium font-mono">
                $
                {record.brokerId === "deepcoin"
                  ? commissionTotals.last60d.toFixed(4)
                  : commissionTotals.last90d.toFixed(4)}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-2">
            <span>{t("stats.last30Days")}</span>
            {isLoadingTotals ? (
              <div className="h-4 w-16 bg-muted animate-pulse rounded" />
            ) : (
              <span className="text-foreground font-medium font-mono">
                ${commissionTotals.last30d.toFixed(4)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
