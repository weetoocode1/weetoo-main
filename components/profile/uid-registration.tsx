"use client";

import {
  useBrokerAPIActive,
  useBrokerCommissionData,
  useBrokerReferrals,
  useBrokerTradingVolume,
  useBrokerUIDVerification,
} from "@/hooks/broker/use-broker-api";
import {
  useAddUserUid,
  useDeleteUserUid,
  useUpdateUserUid,
  useUserUids,
} from "@/hooks/use-user-uids";
import { KeyRoundIcon, PlusIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
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

interface UidRecord {
  id: string;
  brokerId: string;
  brokerName: string;
  uid: string;
  status: "pending" | "verified" | "failed";
  paybackRate: number;
}

type ServerUidRow = {
  id: string;
  exchange_id: string;
  uid: string;
  is_active: boolean;
};

export function UidRegistration() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const { data: serverUids, isLoading } = useUserUids();
  const addMutation = useAddUserUid();
  const updateMutation = useUpdateUserUid();
  const deleteMutation = useDeleteUserUid();

  // Get active UID ID from server data
  const activeUidId =
    (serverUids as ServerUidRow[] | undefined)?.find((r) => r.is_active)?.id ||
    null;

  const handleUIDAdded = async (uid: string, brokerId: string) => {
    const broker = BROKERS.find((b) => b.id === brokerId);
    if (!broker) return;
    await addMutation.mutateAsync({
      uid,
      exchange_id: brokerId,
    });
  };

  const handleUIDUpdated = async (
    id: string,
    uid: string,
    brokerId: string
  ) => {
    await updateMutation.mutateAsync({ id, uid, exchange_id: brokerId });
    setEditingId(null);
  };

  const handleOpenChange = (open: boolean) => {
    // Prevent unnecessary state flips that can cause re-renders
    setIsOpen((prev) => {
      if (prev === open) return prev;
      return open;
    });
    if (!open) {
      // Only clear when actually closing
      setEditingId(null);
    }
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
      } as UidRecord;
    }
  );

  return (
    <div className="p-4 select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <KeyRoundIcon className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold text-foreground">
            UID Registration
          </h1>
        </div>

        <UidRegistrationDialog
          title="Add UID"
          trigger={
            <Button variant="outline" className="rounded-none h-10">
              <PlusIcon className="h-4 w-4" />
              Add UID
            </Button>
          }
          onUIDAdded={handleUIDAdded}
          editingRecord={
            editingId
              ? uidRecords.find((r) => r.id === editingId) || null
              : null
          }
          onUIDUpdated={handleUIDUpdated}
          isOpen={isOpen}
          onOpenChange={handleOpenChange}
        />
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="mt-8 text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-muted/30 rounded-full flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h3 className="text-lg font-medium mb-2">Loading UIDs...</h3>
        </div>
      )}

      {/* UID Cards Grid */}
      {!isLoading && uidRecords.length > 0 && (
        <div className="mt-8 space-y-4">
          <h2 className="text-lg font-medium">Your UIDs</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {uidRecords.map((record) => (
              <UIDCard
                key={record.id}
                record={record}
                isActiveUid={activeUidId === record.id}
                onSetActive={async () => {
                  await updateMutation.mutateAsync({
                    id: record.id,
                    is_active: true,
                  });
                }}
                onEdit={() => {
                  // Avoid extra renders by batching
                  if (editingId !== record.id) setEditingId(record.id);
                  if (!isOpen) setIsOpen(true);
                }}
                onDelete={async () => {
                  await deleteMutation.mutateAsync(record.id);
                }}
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
          <h3 className="text-lg font-medium mb-2">No UIDs registered yet</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Start by adding your first broker UID
          </p>
        </div>
      )}
    </div>
  );
}

// Separate UID Card component to handle API integration
function UIDCard({
  record,
  isActiveUid,
  onSetActive,
  onEdit,
  onDelete,
}: {
  record: UidRecord;
  isActiveUid: boolean;
  onSetActive: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  // Check if broker API should be active for this UID
  const isBrokerActive = useBrokerAPIActive(record.brokerId);

  // Debug environment variables for DeepCoin
  if (record.brokerId === "deepcoin") {
    // Call the debug API to check environment variables on server side
    fetch("/api/debug-env")
      .then((response) => response.json())
      .then((data) => {
        console.log("DeepCoin Environment check (server-side):", data.deepcoin);
      })
      .catch((error) => {
        console.error("Failed to check environment variables:", error);
      });

    // Client-side logging for DeepCoin API calls
    console.log("DeepCoin API calls will be made for UID:", record.uid);
    console.log("Check browser console for signature debug info");

    // Monitor DeepCoin API responses for debug info
    const originalFetch = window.fetch;
    window.fetch = function (...args) {
      const url = args[0];
      if (typeof url === "string" && url.includes("/api/broker")) {
        return originalFetch.apply(this, args).then((response) => {
          // Log debug headers if available
          const debugBroker = response.headers.get("X-DeepCoin-Debug-Broker");
          const debugAction = response.headers.get("X-DeepCoin-Debug-Action");
          const debugTimestamp = response.headers.get(
            "X-DeepCoin-Debug-Timestamp"
          );
          const debugSignatureLength = response.headers.get(
            "X-DeepCoin-Debug-Signature-Length"
          );
          const debugServerTime = response.headers.get(
            "X-DeepCoin-Debug-Server-Time"
          );

          if (debugBroker === "deepcoin") {
            console.log("DeepCoin API Debug Headers:", {
              broker: debugBroker,
              action: debugAction,
              timestamp: debugTimestamp,
              signatureLength: debugSignatureLength,
              serverTime: debugServerTime,
            });
          }

          return response;
        });
      }
      return originalFetch.apply(this, args);
    };
  }

  // UID verification - only active when broker API is active
  // For DeepCoin, skip UID verification since referrals API works
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

  // Get trading volume data - only active when broker API is active
  const tradingVolume = useBrokerTradingVolume(
    record.brokerId,
    record.uid,
    isBrokerActive.data === true
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

  // Check if broker is active
  const isActive = isBrokerActive.data === true;

  return (
    <div
      className={`group relative rounded-none overflow-hidden border bg-card ${
        isActiveUid ? "border-emerald-500/50" : "border-border"
      }`}
    >
      {/* Header Section */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
              <Image
                src={BROKERS.find((b) => b.id === record.brokerId)?.logo || ""}
                alt={`${record.brokerName} logo`}
                width={28}
                height={28}
                className="object-contain"
              />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                {record.brokerName}
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground font-mono">
                  UID: {record.uid}
                </span>
                <div
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${
                    isActiveUid
                      ? "bg-emerald-500/10 border border-emerald-500/30 visible"
                      : "invisible border border-transparent"
                  }`}
                  style={{ minHeight: "24px" }}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isActiveUid ? "bg-emerald-500" : "bg-transparent"
                    }`}
                  ></div>
                  <span
                    className={`text-xs font-medium ${
                      isActiveUid ? "text-emerald-600" : "text-transparent"
                    }`}
                  >
                    Active
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payback Rate temporarily hidden */}
          <div className="text-right"></div>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="px-6 pb-4">
        <div className="flex items-center gap-4">
          {/* UID Verification Status */}
          <div className="flex items-center gap-2">
            {uidVerification.isLoading && !uidVerification.isError ? (
              <div className="w-3 h-3 border-2 border-foreground/40 border-t-transparent rounded-full animate-spin"></div>
            ) : (uidVerification.isSuccess && uidVerification.data?.verified) ||
              isDeepCoinVerified ? (
              <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
            ) : (
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            )}
            <span className="text-sm text-muted-foreground">
              {uidVerification.isLoading && !uidVerification.isError
                ? "Verifying..."
                : (uidVerification.isSuccess &&
                    uidVerification.data?.verified) ||
                  isDeepCoinVerified
                ? "UID Verified"
                : uidVerification.isSuccess && uidVerification.data?.reason
                ? uidVerification.data.reason
                : "Verification Failed"}
            </span>
          </div>

          {/* Referral Status */}
          {(referrals.isSuccess || isReferral !== undefined) && (
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  isReferral ? "bg-emerald-500" : "bg-amber-500"
                }`}
              ></div>
              <span className="text-sm text-muted-foreground">
                {isReferral ? "Referral UID" : "Not a referral"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      {isActive && (
        <div className="px-6 pb-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Trading Volume */}
            <div className="bg-muted/30 rounded-none p-4 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-sky-500 rounded-full"></div>
                <span className="text-xs text-muted-foreground font-medium">
                  Trading Volume
                </span>
              </div>
              <div className="text-lg font-semibold text-sky-500">
                {tradingVolume.isLoading ? (
                  <div className="w-16 h-5 bg-muted/50 rounded animate-pulse"></div>
                ) : tradingVolume.isSuccess && tradingVolume.data ? (
                  // Show trading volume from trading volume API
                  `${tradingVolume.data} USDT`
                ) : (
                  "0.00 USDT"
                )}
              </div>
            </div>

            {/* Commission */}
            <div className="bg-muted/30 rounded-none p-4 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                <span className="text-xs text-muted-foreground font-medium">
                  Commission
                </span>
              </div>
              <div className="text-lg font-semibold text-emerald-500">
                {commission.isLoading ? (
                  <div className="w-16 h-5 bg-muted/50 rounded animate-pulse"></div>
                ) : commission.isSuccess &&
                  commission.data &&
                  commission.data.length > 0 ? (
                  // Show commission from commission data
                  `${
                    commission.data[0]?.commission ||
                    commission.data[0]?.myCommission ||
                    "0.00"
                  } USDT`
                ) : (
                  "0.00 USDT"
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="px-6 py-4 border-t border-border rounded-b-lg bg-transparent">
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onSetActive}
            disabled={isActiveUid}
            className={`flex-1 h-10 rounded-none ${
              isActiveUid
                ? "border-emerald-500/30 text-emerald-600/70 cursor-default"
                : "border-emerald-500/40 text-emerald-600 hover:text-emerald-700 hover:border-emerald-500/60 hover:bg-emerald-500/10"
            }`}
          >
            {isActiveUid ? "Active" : "Set Active"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="flex-1 h-10 rounded-none border-border/40 hover:border-border/60 hover:bg-muted/40 transition-all duration-200"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Edit
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-10 rounded-none border-red-500/30 hover:border-red-500/50 hover:bg-red-500/10 text-red-600 hover:text-red-700 transition-all duration-200"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-none">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete UID</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete the UID for{" "}
                  {record.brokerName}? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-none">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  className="rounded-none bg-red-600 hover:bg-red-700"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
