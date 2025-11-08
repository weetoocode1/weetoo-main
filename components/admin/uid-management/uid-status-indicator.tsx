"use client";

import { BadgeCheck, ChevronRight } from "lucide-react";
import { useRef } from "react";
import {
  useBrokerAPIActive,
  useBrokerReferrals,
  useBrokerUIDVerification,
} from "@/hooks/broker/use-broker-api";
import { useBrokerCommissionData } from "@/hooks/broker/use-broker-api";
import { useTranslations } from "next-intl";

interface UidStatusIndicatorProps {
  brokerId: string;
  uid: string;
  uidId: string;
  className?: string;
}

// Referral signup links per broker (same as in uid-registration.tsx)
const REFERRAL_LINKS: Record<string, string> = {
  deepcoin: "https://s.deepcoin.com/jedgica",
  orangex: "https://affiliates.orangex.com/affiliates/b/4dratgs2",
  lbank: "",
};

export function UidStatusIndicator({
  brokerId,
  uid,
  uidId,
  className = "",
}: UidStatusIndicatorProps) {
  const t = useTranslations("admin.uidManagement.table.status");
  const isBrokerActive = useBrokerAPIActive(brokerId);

  const uidVerification = useBrokerUIDVerification(
    brokerId,
    uid,
    isBrokerActive.data === true && brokerId !== "deepcoin"
  );

  // Get referrals data - only active when broker API is active
  const referrals = useBrokerReferrals(brokerId, isBrokerActive.data === true);

  // Get commission data - only active when broker API is active
  // For BingX, wait for referrals to complete to avoid concurrent requests
  const commission = useBrokerCommissionData(
    brokerId,
    uid,
    "PERPETUAL",
    isBrokerActive.data === true,
    brokerId === "bingx" ? referrals : undefined
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
        const recordUid = uid;
        const isMatch = String(refUid) === String(recordUid);
        return isMatch;
      })) ||
    // Method 2: For DeepCoin, check if UID verification data shows it's a referral
    (brokerId === "deepcoin" &&
      uidVerification.isSuccess &&
      uidVerification.data?.data?.list?.[0]?.uidUpLevel) ||
    // Method 3: For OrangeX, check isReferral field from UID verification
    (brokerId === "orangex" &&
      uidVerification.isSuccess &&
      uidVerification.data?.isReferral === true) ||
    // Method 4: For OrangeX fallback, check if commission data exists
    (brokerId === "orangex" &&
      commission.isSuccess &&
      commission.data &&
      commission.data.length > 0) ||
    // BingX: ONLY treat as referral if inviteRelationCheck explicitly confirms
    // This endpoint is scoped to our account, so it only returns true if UID was invited by US
    (brokerId === "bingx" &&
      uidVerification.isSuccess &&
      (uidVerification.data?.inviteResult === true ||
        uidVerification.data?.existInviter === true ||
        uidVerification.data?.verified === true));

  // For DeepCoin: If referrals work, use that to determine verification status
  const isDeepCoinVerified =
    brokerId === "deepcoin" &&
    referrals.isSuccess &&
    referralList.some(
      (ref: unknown) => isReferralItem(ref) && String(ref.uid) === String(uid)
    );

  // Cache last known successful verification to avoid flicker on transient errors
  const lastVerifiedRef = useRef<Record<string, boolean>>({});

  // Determine verified status using multiple sources and cache
  const verifiedFromAPI =
    (uidVerification.data?.verified ||
      uidVerification.data?.data?.list?.[0]?.uidUpLevel) === true;

  // BingX: verified only if inviteRelationCheck confirms (scoped to our account)
  const isBingxVerified =
    brokerId === "bingx" &&
    uidVerification.isSuccess &&
    (uidVerification.data?.inviteResult === true ||
      uidVerification.data?.existInviter === true ||
      uidVerification.data?.verified === true);

  if (uidVerification.isSuccess && verifiedFromAPI) {
    lastVerifiedRef.current[uidId] = true;
  }
  if (isBingxVerified) {
    lastVerifiedRef.current[uidId] = true;
  }

  //   const verifiedFallback = lastVerifiedRef.current[uidId] === true;

  // Consider DeepCoin referral success as verification as well
  //   const verifiedOverall =
  //     (uidVerification.isSuccess && verifiedFromAPI) ||
  //     (!uidVerification.isSuccess && verifiedFallback) ||
  //     isDeepCoinVerified;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {/* Verification Status */}
      <div className="flex items-center gap-1.5">
        {uidVerification.isLoading && !uidVerification.isError ? (
          <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin"></div>
        ) : (uidVerification.isSuccess && uidVerification.data?.verified) ||
          isDeepCoinVerified ||
          isBingxVerified ? (
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
            <BadgeCheck className="h-3 w-3 text-emerald-500" />
          </div>
        ) : (
          <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
        )}
        <span className="text-xs text-muted-foreground">
          {uidVerification.isLoading && !uidVerification.isError
            ? "Verifying..."
            : (uidVerification.isSuccess && uidVerification.data?.verified) ||
              isDeepCoinVerified ||
              isBingxVerified
            ? t("verified")
            : uidVerification.isSuccess && uidVerification.data?.reason
            ? uidVerification.data.reason
            : t("notVerified")}
        </span>
      </div>

      {/* Referral Status */}
      {(referrals.isSuccess || isReferral !== undefined) && !isReferral && (
        <a
          href={REFERRAL_LINKS[brokerId]}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-pointer text-xs"
        >
          <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
          <span className="text-muted-foreground">{t("notReferral")}</span>
          <ChevronRight className="w-3 h-3 text-muted-foreground" />
        </a>
      )}

      {isReferral && (
        <div className="flex items-center gap-1.5 text-xs">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
          <span className="text-emerald-600 font-medium">{t("referral")}</span>
        </div>
      )}
    </div>
  );
}
