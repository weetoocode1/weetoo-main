"use client";

import {
  useBrokerAPIActive,
  useBrokerCommissionData,
  useBrokerReferrals,
  useBrokerUIDVerification,
} from "@/hooks/broker/use-broker-api";
import { useBrokerRebateWithdrawals } from "@/hooks/use-broker-rebate-withdrawals";
import { useAddUserUid, useUserUids } from "@/hooks/use-user-uids";
import {
  BadgeCheck,
  ChevronRight,
  Copy,
  KeyRoundIcon,
  PlusIcon,
} from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useRef } from "react";
import { toast } from "sonner";
import { Button } from "../ui/button";
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
    status: "coming-soon",
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
];

// Referral signup links per broker (extendable)
const REFERRAL_LINKS: Record<string, string> = {
  deepcoin: "https://s.deepcoin.com/jedgica",
  orangex: "https://affiliates.orangex.com/affiliates/b/4dratgs2",
};

interface UidRecord {
  id: string;
  brokerId: string;
  brokerName: string;
  uid: string;
  status: "pending" | "verified" | "failed";
  paybackRate: number;
  rebateBalanceUsd?: number;
  rebateLifetimeUsd?: number;
  rebateLastDayUsd?: number;
}

type ServerUidRow = {
  id: string;
  exchange_id: string;
  uid: string;
  is_active: boolean;
  rebate_balance_usd?: number;
  rebate_lifetime_usd?: number;
  rebate_last_day_usd?: number;
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
        rebateBalanceUsd: row.rebate_balance_usd || 0,
        rebateLifetimeUsd: row.rebate_lifetime_usd || 0,
        rebateLastDayUsd: row.rebate_last_day_usd || 0,
      } as UidRecord;
    }
  );

  return (
    <div className="p-4 select-none">
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
  const commission = useBrokerCommissionData(
    record.brokerId,
    record.uid,
    "PERPETUAL",
    isBrokerActive.data === true
  );

  // User withdrawals to compute Withdrawn and Withdrawable
  const { data: userWithdrawals } = useBrokerRebateWithdrawals();
  const withdrawnSum = (userWithdrawals || [])
    .filter(
      (w) => w.user_broker_uid_id === record.id && w.status === "completed"
    )
    .reduce((sum: number, w) => sum + (w.amount_usd || 0), 0);

  const pendingSum = (userWithdrawals || [])
    .filter(
      (w) =>
        w.user_broker_uid_id === record.id &&
        (w.status === "pending" || w.status === "processing")
    )
    .reduce((sum: number, w) => sum + (w.amount_usd || 0), 0);

  // Use the new rebate_balance_usd from user_broker_uids table
  // This is now calculated by our internal ledger system
  const withdrawableComputed = Math.max(
    (record.rebateBalanceUsd || 0) - pendingSum,
    0
  );

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
      commission.data.length > 0);

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

  // Cache last known successful verification to avoid flicker on transient errors
  const lastVerifiedRef = useRef<Record<string, boolean>>({});

  // Determine verified status using multiple sources and cache
  const verifiedFromAPI =
    (uidVerification.data?.verified ||
      uidVerification.data?.data?.list?.[0]?.uidUpLevel) === true;

  if (uidVerification.isSuccess && verifiedFromAPI) {
    lastVerifiedRef.current[record.id] = true;
  }

  const verifiedFallback = lastVerifiedRef.current[record.id] === true;

  // Consider DeepCoin referral success as verification as well
  const verifiedOverall =
    (uidVerification.isSuccess && verifiedFromAPI) ||
    (!uidVerification.isSuccess && verifiedFallback) ||
    isDeepCoinVerified;

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
      <div className="p-5 pb-2 border-b border-border">
        {/* Header Layout: Image on left, Name/UID on right */}
        <div className="flex items-center gap-4 mb-3">
          {/* Image on the left */}
          <div className="w-12 h-12 bg-muted flex items-center justify-center">
            <Image
              src={BROKERS.find((b) => b.id === record.brokerId)?.logo || ""}
              alt={`${record.brokerName} logo`}
              width={32}
              height={32}
              className="object-contain"
            />
          </div>

          {/* Name and UID on the right */}
          <div className="flex-1 flex flex-col justify-center">
            {/* Broker name */}
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-medium text-foreground">
                {record.brokerName}
              </h3>
              {(uidVerification.isSuccess && uidVerification.data?.verified) ||
              isDeepCoinVerified ? (
                <BadgeCheck className="h-4 w-4 text-emerald-500" />
              ) : null}
            </div>

            {/* UID below the name */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1">
                {record.uid}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(record.uid);
                  toast.success(t("toast.uidCopied"));
                }}
                className="h-5 w-5 p-0 hover:bg-muted"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Status Indicators and Active/Inactive on the far right */}
          <div className="flex flex-col items-end gap-2 min-w-[200px]">
            {/* Active/Inactive Status - Top line */}
            <div
              className={`text-xs font-medium px-2 py-1 ${
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
            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground w-full">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  {uidVerification.isLoading && !uidVerification.isError ? (
                    <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin"></div>
                  ) : (uidVerification.isSuccess &&
                      uidVerification.data?.verified) ||
                    isDeepCoinVerified ? (
                    <div className="w-1.5 h-1.5 bg-emerald-500"></div>
                  ) : (
                    <div className="w-1.5 h-1.5 bg-red-500"></div>
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
                  !isReferral && (
                    <a
                      href={REFERRAL_LINKS[record.brokerId]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-pointer"
                    >
                      <div className="w-1.5 h-1.5 bg-amber-500"></div>
                      <span className="text-muted-foreground">
                        {t("status.notReferral")}
                      </span>
                      <ChevronRight className="w-3 h-3 text-muted-foreground" />
                    </a>
                  )}
              </div>

              {/* Referral link removed by request */}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="p-5 pb-2">
        <div className="grid grid-cols-1 gap-3">
          {/* Total accumulated payback */}
          <div className="p-4 border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 text-center">
            <div className="text-2xl font-semibold text-emerald-700 dark:text-emerald-300 font-mono mb-2">
              ${record.rebateLifetimeUsd?.toFixed(2) || "0.00"}
            </div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              {t("stats.totalAccumulatedPayback")}
            </div>
          </div>

          {/* Withdrawn and Withdrawable */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 text-center">
              <div className="text-lg font-semibold text-blue-700 dark:text-blue-300 font-mono mb-1">
                ${withdrawnSum.toFixed(2)}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                {t("stats.withdrawnAmount")}
              </div>
            </div>

            <div className="p-3 border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 text-center">
              <div className="text-lg font-semibold text-amber-700 dark:text-amber-300 font-mono mb-1">
                ${withdrawableComputed.toFixed(2)}
              </div>
              <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                {t("stats.withdrawableBalance")}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Additional Info Footer */}
      <div className="p-5 border-t border-border">
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>{t("stats.totalLifetimeRebate")}</span>
            <span className="text-foreground font-medium font-mono">
              ${record.rebateLifetimeUsd?.toFixed(2) || "0.00"}
            </span>
          </div>
          <div className="flex justify-between">
            <span>{t("stats.last24Hours")}</span>
            <span className="text-foreground font-medium font-mono">
              ${record.rebateLastDayUsd?.toFixed(2) || "0.00"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
