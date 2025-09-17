"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import {
  useCreateWithdrawalRequest,
  useUserBankAccounts,
  useWithdrawalRealtimeSubscriptions,
} from "@/hooks/use-withdrawal";
import { CheckCircle2, CreditCard, Eye, EyeOff, Shield } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export function AllAccounts() {
  const t = useTranslations("profile.allAccounts");
  const { computed } = useAuth();
  const { data: bankAccounts, isLoading } = useUserBankAccounts();
  const createWithdrawal = useCreateWithdrawalRequest();
  useWithdrawalRealtimeSubscriptions();

  const verifiedAccounts = useMemo(
    () => (bankAccounts || []).filter((b) => b.is_verified),
    [bankAccounts]
  );

  const [amountByAccountId, setAmountByAccountId] = useState<
    Record<string, string>
  >({});
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({});

  const handleAmountChange = (accountId: string, value: string) => {
    setAmountByAccountId((prev) => ({ ...prev, [accountId]: value }));
  };

  const handleWithdraw = async (accountId: string) => {
    const raw = amountByAccountId[accountId] ?? "";
    const amount = Math.floor(parseFloat(raw) || 0);
    if (amount < 100 || amount > 15000) {
      toast.error(t("validation.amountRange"));
      return;
    }
    if ((computed?.kor_coins || 0) < amount) {
      toast.error(t("validation.insufficientBalance"));
      return;
    }
    try {
      await createWithdrawal.mutateAsync({
        bank_account_id: accountId,
        kor_coins_amount: amount,
      });
      toast.success(t("validation.withdrawalCreated"));
      setAmountByAccountId((prev) => ({ ...prev, [accountId]: "" }));
    } catch (e: Error | unknown) {
      toast.error(
        e instanceof Error ? e.message : t("validation.withdrawalFailed")
      );
    }
  };

  const maskAccountNumber = (accNum: string) => {
    const clean = accNum?.toString() || "";
    if (clean.length <= 4) return "••••";
    const last = clean.slice(-4);
    return `•••• •••• •••• ${last}`;
  };

  const maskName = (name?: string) => {
    const n = (name || "-").trim();
    if (n.length <= 2) return "•".repeat(Math.max(1, n.length));
    return `${n[0]}${"•".repeat(Math.max(1, n.length - 2))}${n[n.length - 1]}`;
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-none border-none shadow-none">
        <CardHeader>
          <CardTitle className="text-lg">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <div className="h-8 bg-muted rounded" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="h-40 bg-muted rounded" />
                <div className="h-40 bg-muted rounded" />
              </div>
            </div>
          ) : verifiedAccounts.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              {t("noAccounts")}
            </div>
          ) : (
            <div className="space-y-4">
              {verifiedAccounts.map((acc) => (
                <div
                  key={acc.id}
                  className="relative border border-border rounded-none bg-muted/10 hover:bg-muted/20 transition-colors p-0"
                >
                  {/* Corner borders */}
                  <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-primary pointer-events-none" />
                  <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-primary pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-primary pointer-events-none" />
                  <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-primary pointer-events-none" />

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
                    {/* Left info */}
                    <div className="md:col-span-7 p-4 pr-0 border-b md:border-b-0 md:border-r border-border/60">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 border border-border rounded-none">
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">
                              {t("bank")}
                            </div>
                            <div className="font-medium">
                              {acc.bank_name || "-"}
                              <Badge className="inline-flex items-center gap-1 bg-emerald-600/10 text-emerald-600 border-emerald-600/30 rounded-none ml-2">
                                <CheckCircle2 className="h-3 w-3" />{" "}
                                {t("verified")}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-muted-foreground">
                            {t("accountHolder")}
                          </div>
                          <div className="font-medium">
                            {showDetails[acc.id]
                              ? acc.account_holder_name || "-"
                              : maskName(acc.account_holder_name)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">
                            {t("accountNumber")}
                          </div>
                          <div className="font-mono">
                            {showDetails[acc.id]
                              ? acc.account_number
                              : maskAccountNumber(acc.account_number)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-none h-8"
                          onClick={() =>
                            setShowDetails((prev) => ({
                              ...prev,
                              [acc.id]: !prev[acc.id],
                            }))
                          }
                        >
                          {showDetails[acc.id] ? (
                            <>
                              <EyeOff className="h-4 w-4 mr-2" />{" "}
                              {t("hideDetails")}
                            </>
                          ) : (
                            <>
                              <Eye className="h-4 w-4 mr-2" />{" "}
                              {t("showDetails")}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Right action */}
                    <div className="md:col-span-5 p-4">
                      <Label htmlFor={`amount-${acc.id}`}>
                        {t("withdrawAmount")}
                      </Label>
                      <div className="mt-1.5 flex gap-2">
                        <Input
                          id={`amount-${acc.id}`}
                          className="h-10"
                          type="number"
                          min={100}
                          max={15000}
                          step={100}
                          value={amountByAccountId[acc.id] ?? ""}
                          onChange={(e) =>
                            handleAmountChange(acc.id, e.target.value)
                          }
                          placeholder={t("withdrawAmountPlaceholder")}
                        />
                        <Button
                          className="h-10"
                          onClick={() => handleWithdraw(acc.id)}
                          disabled={createWithdrawal.isPending}
                        >
                          {t("withdraw")}
                        </Button>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        {t("amountLimits")}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 p-3 bg-primary/5 border border-primary/20">
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-primary mt-0.5" />
              <p className="text-xs text-muted-foreground">
                {t("securityNotice")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
