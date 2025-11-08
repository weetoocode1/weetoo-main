"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateBrokerRebateWithdrawal } from "@/hooks/use-broker-rebate-withdrawals";
import { useUserUids } from "@/hooks/use-user-uids";
import {
  DollarSign,
  Loader2,
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

interface UserBrokerUid {
  id: string;
  exchange_id: string;
  uid: string;
  is_active: boolean;
  accumulated_24h_payback?: number;
  withdrawn_amount?: number;
  withdrawable_balance?: number;
}

const BROKERS = [
  {
    id: "deepcoin",
    name: "DeepCoin",
    logo: "/broker/deepcoin.png",
  },
  {
    id: "bingx",
    name: "BingX",
    logo: "/broker/bingx.png",
  },
  {
    id: "orangex",
    name: "OrangeX",
    logo: "/broker/orangex.webp",
  },
  {
    id: "lbank",
    name: "LBank",
    logo: "/broker/Lbank.png",
  },
];

const MINIMUM_WITHDRAWAL = 50;

export function PaybackWithdrawal() {
  const t = useTranslations("profile.paybackWithdrawal");
  const [expandedUidId, setExpandedUidId] = useState<string>("");
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<Record<string, boolean>>({});

  const userUidsQuery = useUserUids();
  const uids = (userUidsQuery.data ?? []) as UserBrokerUid[];
  const uidsLoading = userUidsQuery.isLoading;
  const createWithdrawal = useCreateBrokerRebateWithdrawal();

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
      toast.error(t("toast.minimumAmountError"));
      return;
    }

    if (amountNum > withdrawableBalance) {
      toast.error(t("toast.insufficientBalanceError"));
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
      toast.success(t("toast.success"));
    } catch (_error) {
      // Error is handled by the mutation
    } finally {
      setIsSubmitting((prev) => ({ ...prev, [uidId]: false }));
    }
  };

  if (uidsLoading) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Wallet className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">
            {t("title")}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      {!uids || !Array.isArray(uids) || uids.length === 0 ? (
        <div className="text-center py-12 border border-border bg-muted/30">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-2">{t("emptyState.title")}</p>
          <p className="text-sm text-muted-foreground">
            {t("emptyState.description")}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">{t("allBrokerAccounts")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
            {uids.map((uid) => {
              const broker = BROKERS.find((b) => b.id === uid.exchange_id);
              const uidWithdrawable = Number(uid.withdrawable_balance) || 0;
              const uidAccumulated = Number(uid.accumulated_24h_payback) || 0;
              const uidWithdrawn = Number(uid.withdrawn_amount) || 0;
              const uidCanWithdraw = uidWithdrawable >= MINIMUM_WITHDRAWAL;
              const isExpanded = expandedUidId === uid.id;
              const amount = amounts[uid.id] || "";
              const amountNum = amount ? parseFloat(amount) : 0;
              const isAmountValid =
                amountNum >= MINIMUM_WITHDRAWAL && amountNum <= uidWithdrawable;
              const isAmountBelowMinimum =
                amountNum > 0 && amountNum < MINIMUM_WITHDRAWAL;

              return (
                <div
                  key={uid.id}
                  className={`relative border-2 transition-all duration-200 ${
                    isExpanded
                      ? "border-primary bg-primary/5 shadow-lg"
                      : uidCanWithdraw
                      ? "border-border hover:border-primary/50 bg-background cursor-pointer"
                      : "border-border/50 bg-muted/30 opacity-75"
                  }`}
                  onClick={(e) => {
                    if (uidCanWithdraw) {
                      e.stopPropagation();
                      handleCardClick(uid.id, uidCanWithdraw);
                    }
                  }}
                >
                  {/* Broker Header */}
                  <div className="p-4 border-b border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-muted flex items-center justify-center shrink-0 rounded-full overflow-hidden">
                        {broker ? (
                          <Image
                            src={broker.logo}
                            alt={`${broker.name} logo`}
                            width={40}
                            height={40}
                            className="object-contain rounded-full"
                          />
                        ) : (
                          <span className="text-xs font-medium">
                            {uid.exchange_id.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground truncate">
                            {broker?.name || uid.exchange_id.toUpperCase()}
                          </h3>
                          {!uid.is_active && (
                            <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5">
                              {t("labels.inactive")}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground font-mono truncate">
                          {uid.uid}
                        </p>
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
                  <div className="p-4 space-y-3">
                    {/* Withdrawable Balance */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {t("labels.withdrawable")}
                        </span>
                        <TrendingUp className="h-3 w-3 text-emerald-500" />
                      </div>
                      <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        ${uidWithdrawable.toFixed(4)}
                      </p>
                    </div>

                    {/* Accumulated & Withdrawn */}
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">
                          {t("labels.accumulated")}
                        </span>
                        <p className="text-sm font-semibold text-foreground font-mono">
                          ${uidAccumulated.toFixed(4)}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">
                          {t("labels.withdrawn")}
                        </span>
                        <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 font-mono">
                          ${uidWithdrawn.toFixed(4)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  {!uidCanWithdraw && (
                    <div className="absolute top-2 right-2">
                      <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium px-2 py-1">
                        {t("labels.minAmount")}
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
                        onSubmit={(e) =>
                          handleSubmit(e, uid.id, uidWithdrawable)
                        }
                        className="space-y-4"
                      >
                        {/* Amount Input */}
                        <div className="space-y-2">
                          <Label htmlFor={`amount-${uid.id}`}>
                            {t("labels.withdrawalAmount")}
                          </Label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id={`amount-${uid.id}`}
                              type="number"
                              step="0.01"
                              min={MINIMUM_WITHDRAWAL}
                              max={uidWithdrawable}
                              value={amount}
                              onChange={(e) =>
                                setAmounts((prev) => ({
                                  ...prev,
                                  [uid.id]: e.target.value,
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
                              {t("labels.minimum")}{" "}
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
                                  [uid.id]: uidWithdrawable.toFixed(2),
                                }));
                              }}
                              className="text-primary hover:underline"
                            >
                              {t("labels.max")}
                            </button>
                          </div>
                        </div>

                        {/* Summary - Only show if amount is valid (>= $50) */}
                        {amount && amountNum > 0 && isAmountValid && (
                          <div className="p-3 bg-background border border-border space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">
                                {t("labels.withdrawalAmountLabel")}
                              </span>
                              <span className="font-semibold font-mono">
                                ${amountNum.toFixed(4)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">
                                {t("labels.remainingBalance")}
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
                          disabled={
                            isSubmitting[uid.id] || !amount || !isAmountValid
                          }
                          className="w-full h-11 rounded-none"
                        >
                          {isSubmitting[uid.id] ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              {t("labels.processing")}
                            </>
                          ) : (
                            <>
                              <TrendingDown className="h-4 w-4 mr-2" />
                              {t("labels.requestWithdrawal")}
                            </>
                          )}
                        </Button>

                        {/* Info */}
                        <p className="text-xs text-muted-foreground text-center">
                          {t("labels.processedWithin")}
                        </p>
                      </form>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
