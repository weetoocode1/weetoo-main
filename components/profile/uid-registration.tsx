"use client";

import {
  useBrokerAPIActive,
  useBrokerCommissionData,
  useBrokerReferrals,
  useBrokerTradingHistory,
  useBrokerUIDVerification,
} from "@/hooks/broker/use-broker-api";
import { useCreateBrokerRebateWithdrawal } from "@/hooks/use-broker-rebate-withdrawals";
import { useAddUserUid, useUserUids } from "@/hooks/use-user-uids";
import { prefetchUIDData } from "@/lib/utils/prefetch-uid-data";
import { useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  Copy,
  DollarSign,
  ExternalLink,
  KeyRoundIcon,
  Loader2,
  PlusIcon,
  TrendingDown,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
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
// function ReferralLinkWithFallback({ brokerId }: { brokerId: string }) {
//   const t = useTranslations("profile.uidRegistration");
//   const primaryLink = REFERRAL_LINKS[brokerId];
//   const backupLink = REFERRAL_BACKUP_LINKS[brokerId];

//   if (!primaryLink) return null;

//   // If no backup link, just show primary
//   if (!backupLink) {
//     return (
//       <a
//         href={primaryLink}
//         target="_blank"
//         rel="noopener noreferrer"
//         className="flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-pointer mt-1 sm:mt-0"
//       >
//         <div className="w-1.5 h-1.5 bg-amber-500"></div>
//         <span className="text-muted-foreground">{t("status.notReferral")}</span>
//         <ChevronRight className="w-3 h-3 text-muted-foreground" />
//       </a>
//     );
//   }

//   // If both links exist, show primary with backup option
//   return (
//     <div className="flex items-center gap-1.5 mt-1 sm:mt-0">
//       <a
//         href={primaryLink}
//         target="_blank"
//         rel="noopener noreferrer"
//         className="flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-pointer"
//       >
//         <div className="w-1.5 h-1.5 bg-amber-500"></div>
//         <span className="text-muted-foreground">{t("status.notReferral")}</span>
//         <ChevronRight className="w-3 h-3 text-muted-foreground" />
//       </a>
//       <span className="text-muted-foreground text-xs">|</span>
//       <a
//         href={backupLink}
//         target="_blank"
//         rel="noopener noreferrer"
//         className="text-xs text-muted-foreground hover:opacity-80 transition-opacity cursor-pointer"
//         title="Backup referral link"
//       >
//         Backup
//       </a>
//     </div>
//   );
// }

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

const MINIMUM_WITHDRAWAL = 50;

export function UidRegistration() {
  const t = useTranslations("profile.uidRegistration");
  const { data: serverUids, isLoading } = useUserUids();
  const addMutation = useAddUserUid();
  const queryClient = useQueryClient();
  const [expandedUidId, setExpandedUidId] = useState<string>("");
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<Record<string, boolean>>({});

  // Get all active UID IDs from server data
  const activeUidIds = new Set(
    (serverUids as ServerUidRow[] | undefined)
      ?.filter((r) => r.is_active)
      ?.map((r) => r.id) || []
  );

  const handleUIDAdded = async (uid: string, brokerId: string) => {
    const broker = BROKERS.find((b) => b.id === brokerId);
    if (!broker) {
      throw new Error(`Broker ${brokerId} not found`);
    }

    const createdUid = await addMutation.mutateAsync({
      uid,
      exchange_id: brokerId,
    });

    if (!createdUid?.id) {
      throw new Error("Failed to create UID");
    }

    prefetchUIDData(brokerId, uid)
      .then((prefetchResult) => {
        if (prefetchResult.success) {
          const brokerLower = brokerId.toLowerCase();

          if (prefetchResult.verification) {
            queryClient.setQueryData(
              ["broker", brokerLower, "verifyUID", uid],
              prefetchResult.verification
            );
          }

          if (prefetchResult.referrals) {
            queryClient.setQueryData(
              ["broker", brokerLower, "getReferrals"],
              prefetchResult.referrals
            );
          }

          if (prefetchResult.tradingHistory) {
            queryClient.setQueryData(
              ["broker", brokerLower, "getTradingHistory", uid],
              prefetchResult.tradingHistory
            );
          }
        }
      })
      .catch((error) => {
        console.error("Error prefetching UID data:", error);
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
            {uidRecords.map((record) => (
              <UIDCard
                key={record.id}
                record={record}
                isActiveUid={activeUidIds.has(record.id)}
                expandedUidId={expandedUidId}
                setExpandedUidId={setExpandedUidId}
                amounts={amounts}
                setAmounts={setAmounts}
                isSubmitting={isSubmitting}
                setIsSubmitting={setIsSubmitting}
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
  expandedUidId,
  setExpandedUidId,
  amounts,
  setAmounts,
  isSubmitting,
  setIsSubmitting,
}: {
  record: UidRecord;
  isActiveUid: boolean;
  expandedUidId: string;
  setExpandedUidId: (id: string) => void;
  amounts: Record<string, string>;
  setAmounts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  isSubmitting: Record<string, boolean>;
  setIsSubmitting: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
}) {
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
    // For LBank, OrangeX, DeepCoin, and BingX, use trading history summaries if available
    if (
      (record.brokerId === "lbank" ||
        record.brokerId === "orangex" ||
        record.brokerId === "deepcoin" ||
        record.brokerId === "bingx") &&
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
  // const isTradingHistoryLoading =
  //   tradingHistory.isLoading || tradingHistory.isFetching;

  // For LBank, OrangeX, DeepCoin, and BingX, use trading history loading state; for others, use commission loading
  // const isLoadingTotals =
  //   record.brokerId === "lbank" ||
  //   record.brokerId === "orangex" ||
  //   record.brokerId === "deepcoin" ||
  //   record.brokerId === "bingx"
  //     ? isTradingHistoryLoading
  //     : isCommissionLoading;

  // Displayed total: Always show accumulated_24h_payback (sum of all 24h periods)
  // This value is updated by the scheduler every 24h, adding the new 24h value to the accumulated total
  // accumulated_24h_payback = sum of all previous 24h periods
  // const displayedTotal = accumulatedPayback;
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

  const t = useTranslations("profile.uidRegistration");
  const tWithdrawal = useTranslations("profile.paybackWithdrawal");
  const createWithdrawal = useCreateBrokerRebateWithdrawal();

  // Determine if UID is actually active based on DB + overall verification
  // const isUidActuallyActive =
  //   isActiveUid && (verifiedOverall || uidVerification.isLoading);

  const uidWithdrawable = withdrawableBalance;
  const uidAccumulated = accumulatedPayback;
  const uidWithdrawn = withdrawnAmount;
  const uidCanWithdraw = uidWithdrawable >= MINIMUM_WITHDRAWAL;
  const isExpanded = expandedUidId === record.id;
  const amount = amounts[record.id] || "";
  const amountNum = amount ? parseFloat(amount) : 0;
  const isAmountValid =
    amountNum >= MINIMUM_WITHDRAWAL && amountNum <= uidWithdrawable;
  const isAmountBelowMinimum = amountNum > 0 && amountNum < MINIMUM_WITHDRAWAL;

  const handleCardClick = (uidId: string, canWithdraw: boolean) => {
    if (!canWithdraw) return;
    if (expandedUidId === uidId) {
      setExpandedUidId("");
    } else {
      setExpandedUidId(uidId);
      if (!amounts[uidId]) {
        setAmounts((prev) => ({ ...prev, [uidId]: "" }));
      }
    }
  };

  const handleSubmit = async (
    e: React.FormEvent,
    uidId: string,
    withdrawableBalance: number
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const amount = amounts[uidId];
    if (!amount) return;

    const amountNum = parseFloat(amount);
    if (amountNum < MINIMUM_WITHDRAWAL) {
      toast.error(tWithdrawal("toast.minimumAmountError"));
      return;
    }

    if (amountNum > withdrawableBalance) {
      toast.error(tWithdrawal("toast.insufficientBalanceError"));
      return;
    }

    setIsSubmitting((prev) => ({ ...prev, [uidId]: true }));
    try {
      await createWithdrawal.mutateAsync({
        user_broker_uid_id: uidId,
        amount_usd: amountNum,
      });

      setAmounts((prev) => ({ ...prev, [uidId]: "" }));
      setExpandedUidId("");
      toast.success(tWithdrawal("toast.success"));
    } catch (_error) {
      // Error is handled by the mutation
    } finally {
      setIsSubmitting((prev) => ({ ...prev, [uidId]: false }));
    }
  };

  return (
    <div
      className={`relative border-2 transition-all duration-200 ${
        isExpanded
          ? "border-primary bg-primary/5 shadow-lg"
          : uidCanWithdraw
          ? "border-border hover:border-primary/50 bg-background cursor-pointer"
          : "border-border/50 bg-muted/30"
      }`}
      onClick={(e) => {
        if (uidCanWithdraw) {
          e.stopPropagation();
          handleCardClick(record.id, uidCanWithdraw);
        }
      }}
    >
      {/* Broker Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-muted flex items-center justify-center shrink-0 rounded-full overflow-hidden">
            {BROKERS.find((b) => b.id === record.brokerId) ? (
              <Image
                src={BROKERS.find((b) => b.id === record.brokerId)?.logo || ""}
                alt={`${record.brokerName} logo`}
                width={40}
                height={40}
                className="object-contain rounded-full"
              />
            ) : (
              <span className="text-xs font-medium">
                {record.brokerId.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground truncate">
                {record.brokerName}
              </h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      {uidVerification.isLoading && !uidVerification.isError ? (
                        <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                      ) : verifiedOverall ||
                        isDeepCoinVerified ||
                        isLBankVerified ||
                        isBingxVerified ? (
                        <BadgeCheck className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">
                      {uidVerification.isLoading && !uidVerification.isError
                        ? t("status.verifying")
                        : verifiedOverall ||
                          isDeepCoinVerified ||
                          isLBankVerified ||
                          isBingxVerified
                        ? t("status.verified")
                        : uidVerification.isSuccess &&
                          uidVerification.data?.reason
                        ? uidVerification.data.reason
                        : t("status.notVerified")}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {(referrals.isSuccess || isReferral !== undefined) &&
                !isReferral &&
                !(
                  record.brokerId === "bingx" &&
                  (bingxReferralFast || uidVerification.isLoading)
                ) && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">{t("status.notReferral")}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-muted-foreground font-mono truncate">
                {record.uid}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(record.uid);
                  toast.success(t("toast.uidCopied"));
                }}
                className="h-5 w-5 p-0 hover:bg-muted shrink-0"
              >
                <Copy className="h-3 w-3" />
              </Button>
              {(referrals.isSuccess || isReferral !== undefined) &&
                !isReferral &&
                !(
                  record.brokerId === "bingx" &&
                  (bingxReferralFast || uidVerification.isLoading)
                ) &&
                REFERRAL_LINKS[record.brokerId] && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <a
                          href={REFERRAL_LINKS[record.brokerId]}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="h-5 w-5 p-0 flex items-center justify-center text-primary hover:text-primary/80 hover:bg-primary/10 rounded transition-colors duration-200 shrink-0"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="space-y-1">
                          <p className="text-xs font-medium">
                            {t("referralLink.signUpWithReferral")}
                          </p>
                          {REFERRAL_BACKUP_LINKS[record.brokerId] && (
                            <a
                              href={REFERRAL_BACKUP_LINKS[record.brokerId]}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-muted-foreground hover:text-foreground underline"
                            >
                              {t("referralLink.alternateLink")}
                            </a>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
            </div>
          </div>
          {uidCanWithdraw && (
            <div className="shrink-0">
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 space-y-3 min-h-[180px] flex flex-col">
        {/* Total Accumulated Payback */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {t("stats.totalAccumulatedPayback")}
            </span>
            <TrendingUp className="h-3 w-3 text-emerald-500" />
          </div>
          {tradingHistory.isLoading && !tradingHistory.data ? (
            <div className="h-7 w-32 bg-muted animate-pulse rounded" />
          ) : (
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              ${uidAccumulated.toFixed(4)}
            </p>
          )}
        </div>

        {/* Withdrawable & Withdrawn */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">
              {tWithdrawal("labels.withdrawable")}
            </span>
            {tradingHistory.isLoading && !tradingHistory.data ? (
              <div className="h-5 w-24 bg-muted animate-pulse rounded" />
            ) : (
              <p className="text-sm font-semibold text-foreground font-mono">
                ${uidWithdrawable.toFixed(4)}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">
              {tWithdrawal("labels.withdrawn")}
            </span>
            {tradingHistory.isLoading && !tradingHistory.data ? (
              <div className="h-5 w-24 bg-muted animate-pulse rounded" />
            ) : (
              <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 font-mono">
                ${uidWithdrawn.toFixed(4)}
              </p>
            )}
          </div>
        </div>
        <div className="h-5 flex items-center justify-center">
          {!uidCanWithdraw && (
            <p className="text-xs text-muted-foreground text-center">
              {tWithdrawal("labels.minimumWithdrawalNote")}
            </p>
          )}
        </div>
      </div>

      {/* Status Badge */}
      {!uidCanWithdraw && (
        <div className="absolute top-2 right-2">
          <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium px-2 py-1">
            {tWithdrawal("labels.minAmount")}
          </div>
        </div>
      )}

      {/* Expanded Withdrawal Form */}
      {isExpanded && uidCanWithdraw && (
        <div
          className="border-t border-border p-4 bg-muted/30 space-y-4"
          onClick={(e) => {
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
        >
          <form
            onSubmit={(e) => handleSubmit(e, record.id, uidWithdrawable)}
            className="space-y-4"
          >
            {/* Amount Input */}
            <div className="space-y-2">
              <Label htmlFor={`amount-${record.id}`}>
                {tWithdrawal("labels.withdrawalAmount")}
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id={`amount-${record.id}`}
                  type="number"
                  step="0.01"
                  min={MINIMUM_WITHDRAWAL}
                  max={uidWithdrawable}
                  value={amount}
                  onChange={(e) =>
                    setAmounts((prev) => ({
                      ...prev,
                      [record.id]: e.target.value,
                    }))
                  }
                  onWheel={(e) => {
                    e.currentTarget.blur();
                  }}
                  placeholder="0.00"
                  required
                  className={`pl-9 h-11 rounded-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield] ${
                    isAmountBelowMinimum
                      ? "border-red-500 focus-visible:ring-red-500 focus-visible:ring-offset-0"
                      : ""
                  }`}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span
                  className={
                    isAmountBelowMinimum
                      ? "text-red-600 dark:text-red-400 font-semibold"
                      : "text-muted-foreground"
                  }
                >
                  {tWithdrawal("labels.minimum")}{" "}
                  <span className="font-bold">
                    ${MINIMUM_WITHDRAWAL.toFixed(2)}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAmounts((prev) => ({
                      ...prev,
                      [record.id]: uidWithdrawable.toFixed(2),
                    }));
                  }}
                  className="text-primary hover:underline"
                >
                  {tWithdrawal("labels.max")}
                </button>
              </div>
            </div>

            {/* Summary - Only show if amount is valid (>= $50) */}
            {amount && amountNum > 0 && isAmountValid && (
              <div className="p-3 bg-background border border-border space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {tWithdrawal("labels.withdrawalAmountLabel")}
                  </span>
                  <span className="font-semibold font-mono">
                    ${amountNum.toFixed(4)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {tWithdrawal("labels.remainingBalance")}
                  </span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                    ${(uidWithdrawable - amountNum).toFixed(4)}
                  </span>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting[record.id] || !amount || !isAmountValid}
              className="w-full h-11 rounded-none"
            >
              {isSubmitting[record.id] ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {tWithdrawal("labels.processing")}
                </>
              ) : (
                <>
                  <TrendingDown className="h-4 w-4 mr-2" />
                  {tWithdrawal("labels.requestWithdrawal")}
                </>
              )}
            </Button>

            {/* Info */}
            <p className="text-xs text-muted-foreground text-center">
              {tWithdrawal("labels.processedWithin")}
            </p>
          </form>
        </div>
      )}
    </div>
  );
}
