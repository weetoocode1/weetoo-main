"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Wallet, User, Shield, Clock, Coins } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  useCreateBankAccount,
  useCreateWithdrawalRequest,
  useUserBankAccounts,
  useUserWithdrawalRequests,
  useVerifyBankAccount,
  useUpdateWithdrawalStatus,
  useWithdrawalRealtimeSubscriptions,
} from "@/hooks/use-withdrawal";

interface WithdrawalFormData {
  amount: number;
  accountHolderName: string;
  bankName: string;
  bankAccountNumber: string;
}

// Types for withdrawal requests and bank accounts
interface WithdrawalRequest {
  id: string;
  status: string;
  created_at: string;
  kor_coins_amount?: number;
  bank_account?: BankAccount;
}

interface BankAccount {
  id: string;
  is_verified?: boolean;
  verification_amount?: number;
  bank_name?: string;
  account_number?: string;
}

export function Withdraw() {
  const { user, loading: authLoading, computed } = useAuth();
  const { data: bankAccounts } = useUserBankAccounts();
  const createBankAccount = useCreateBankAccount();
  const createWithdrawal = useCreateWithdrawalRequest();
  const { data: userRequests } = useUserWithdrawalRequests();
  const verifyBankAccount = useVerifyBankAccount();
  const updateWithdrawalStatus = useUpdateWithdrawalStatus();
  useWithdrawalRealtimeSubscriptions();

  // Latest pending/verification_sent request
  const latestPending = useMemo(() => {
    if (!userRequests || userRequests.length === 0)
      return null as WithdrawalRequest | null;
    const pendingLike = (userRequests as WithdrawalRequest[])
      .filter(
        (r) =>
          (r.status === "pending" || r.status === "verification_sent") &&
          // If the linked bank account is already verified, do not treat it as pending
          !(r.bank_account?.is_verified === true)
      )
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];
    return pendingLike || null;
  }, [userRequests]);

  const [isClient, setIsClient] = useState(false);
  const [showFormOverride] = useState(false);
  useEffect(() => setIsClient(true), []);

  const [submitting, setSubmitting] = useState(false);
  const [verifyAmount, setVerifyAmount] = useState("");
  const [formData, setFormData] = useState<WithdrawalFormData>({
    amount: 0,
    accountHolderName: "",
    bankName: "",
    bankAccountNumber: "",
  });

  // Calculate withdrawal fee based on level
  const getWithdrawalFee = (level: number): number => {
    if (level >= 1 && level <= 25) return 40; // Bronze
    if (level >= 26 && level <= 50) return 30; // Silver
    if (level >= 51 && level <= 75) return 20; // Gold
    if (level >= 76 && level <= 99) return 10; // Platinum
    return 40; // Default to highest fee
  };

  const calculateFee = (amount: number, level: number) => {
    const feePercentage = getWithdrawalFee(level);
    const feeAmount = (amount * feePercentage) / 100;
    const finalAmount = amount - feeAmount;
    return { feeAmount, finalAmount, feePercentage };
  };

  // Check if the withdrawal request is valid
  const isWithdrawalValid = () => {
    const userKorCoins = computed?.kor_coins || 0;
    const requestedAmount = formData.amount;

    return (
      requestedAmount >= 100 &&
      requestedAmount <= 15000 &&
      requestedAmount <= userKorCoins &&
      formData.accountHolderName.trim() &&
      formData.bankAccountNumber.trim() &&
      formData.bankName.trim()
    );
  };

  const handleAmountChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    // Prevent negative amounts
    const safeValue = Math.max(0, numValue);
    setFormData((prev) => ({ ...prev, amount: safeValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("User not found");
      return;
    }

    // Enhanced KOR coins validation
    const userKorCoins = computed?.kor_coins || 0;
    const requestedAmount = formData.amount;

    if (requestedAmount < 100 || requestedAmount > 15000) {
      toast.error("Withdrawal amount must be between 100 and 15,000 KOR coins");
      return;
    }

    if (requestedAmount > userKorCoins) {
      toast.error(
        `Insufficient KOR coins balance. You have ${userKorCoins.toLocaleString()} KOR, but requested ${requestedAmount.toLocaleString()} KOR.`
      );
      return;
    }

    // Additional safety check - ensure amount is not zero or negative
    if (requestedAmount <= 0) {
      toast.error("Withdrawal amount must be greater than 0");
      return;
    }

    if (!formData.accountHolderName.trim()) {
      toast.error("Please enter account holder name");
      return;
    }

    if (!formData.bankAccountNumber.trim()) {
      toast.error("Please enter bank account number");
      return;
    }

    if (!formData.bankName.trim()) {
      toast.error("Please enter bank name");
      return;
    }

    setSubmitting(true);
    try {
      // 1) Ensure a bank account exists (find by exact match, else create)
      let bankAccountId: string | null = null;
      const existing = (bankAccounts || []).find(
        (b) =>
          b.account_holder_name?.trim() === formData.accountHolderName.trim() &&
          b.account_number?.trim() === formData.bankAccountNumber.trim() &&
          (b.bank_name?.trim() || "") === formData.bankName.trim()
      );
      if (existing) {
        bankAccountId = existing.id;
      } else {
        const created = await createBankAccount.mutateAsync({
          account_holder_name: formData.accountHolderName.trim(),
          account_number: formData.bankAccountNumber.trim(),
          bank_name: formData.bankName.trim(),
        });
        bankAccountId = created.id;
      }

      if (!bankAccountId)
        throw new Error("Bank account could not be determined");

      // 2) Final balance check before creating withdrawal request
      if (requestedAmount > userKorCoins) {
        throw new Error(
          `Insufficient balance. You have ${userKorCoins.toLocaleString()} KOR, but requested ${requestedAmount.toLocaleString()} KOR.`
        );
      }

      // 3) Create the withdrawal request
      await createWithdrawal.mutateAsync({
        bank_account_id: bankAccountId,
        kor_coins_amount: Math.floor(requestedAmount),
      });

      toast.success(
        "Withdrawal request submitted. We'll notify you after manual review."
      );

      setFormData({
        amount: 0,
        accountHolderName: "",
        bankName: "",
        bankAccountNumber: "",
      });
    } catch (err: Error | unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to submit withdrawal request"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyAmountChange = (value: string) => {
    setVerifyAmount(value);
  };

  const handleVerifyNow = async () => {
    const ba = latestPending?.bank_account;
    const expected =
      typeof ba?.verification_amount === "number"
        ? Number(ba.verification_amount.toFixed(4))
        : null;

    if (!verifyAmount) {
      toast.error("Please enter the amount you received.");
      return;
    }

    const entered = Number(parseFloat(verifyAmount).toFixed(4));
    if (expected === null || entered !== expected) {
      toast.error("Verification amount does not match.");
      return;
    }

    try {
      if (!ba?.id) {
        toast.error("Bank account not found.");
        return;
      }
      await verifyBankAccount.mutateAsync({
        id: ba.id,
        data: { verification_amount: entered },
      });
      toast.success("Bank account verified.");
      // If the latest request is waiting for verification, move it to verified
      if (latestPending?.id) {
        try {
          await updateWithdrawalStatus.mutateAsync({
            id: latestPending.id,
            data: { status: "verified" },
          });
        } catch {}
      }
      setVerifyAmount("");
    } catch (e: Error | unknown) {
      const errorMessage =
        e instanceof Error ? e.message : "Verification failed.";
      toast.error(errorMessage);
    }
  };

  const handleUnifiedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (latestPending && !showFormOverride) {
      await handleVerifyNow();
      return;
    }
    await handleSubmit(e);
  };

  if (!isClient || authLoading) {
    return (
      <div className="flex flex-col h-full p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-muted rounded-lg"></div>
            <div className="h-64 bg-muted rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col h-full p-6 items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
            <User className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            User Not Found
          </h2>
          <p className="text-muted-foreground">
            Please log in to access withdrawal features.
          </p>
        </div>
      </div>
    );
  }

  const userLevel = computed?.level || 0;
  const userKorCoins = computed?.kor_coins || 0;
  const { feeAmount, finalAmount, feePercentage } = calculateFee(
    formData.amount,
    userLevel
  );
  const fullName = computed?.fullName || user.email || "User";

  // Data for verification panel (avoid inline declarations in JSX)
  const pendingLike = latestPending;
  const pendingBankAccount = pendingLike?.bank_account;
  const expectedVerificationAmount =
    typeof pendingBankAccount?.verification_amount === "number"
      ? Number(pendingBankAccount.verification_amount.toFixed(4))
      : null;

  return (
    <div className="flex flex-col h-full p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Wallet className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-semibold text-foreground">
          Withdraw KOR Coins
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-primary" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">
                  Account Holder
                </span>
                <span className="font-medium text-foreground">{fullName}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">
                  Current Level
                </span>
                <Badge variant="outline">Level {userLevel}</Badge>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">
                  Available Balance
                </span>
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-amber-500" />
                  <span className="font-bold text-lg text-foreground">
                    {userKorCoins.toLocaleString()} KOR
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 p-5 bg-primary/5 border border-primary/20 rounded-xl">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Your Current Withdrawal Fee
                </p>
                <p className="text-3xl font-bold text-primary mb-2">
                  {feePercentage}%
                </p>
                <Badge variant="outline" className="text-xs">
                  {userLevel <= 25
                    ? "Bronze Tier"
                    : userLevel <= 50
                    ? "Silver Tier"
                    : userLevel <= 75
                    ? "Gold Tier"
                    : "Platinum Tier"}
                </Badge>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-semibold text-foreground mb-3 text-center">
                Fee Structure by Level
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <span className="text-sm">Bronze (1-25)</span>
                  </div>
                  <Badge variant="destructive" className="font-semibold">
                    40%
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                    <span className="text-sm">Silver (26-50)</span>
                  </div>
                  <Badge variant="secondary" className="font-semibold">
                    30%
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm">Gold (51-75)</span>
                  </div>
                  <Badge variant="default" className="font-semibold">
                    20%
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm">Platinum (76-99)</span>
                  </div>
                  <Badge variant="outline" className="font-semibold">
                    10%
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-foreground">
              Withdrawal Request
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUnifiedSubmit} className="space-y-6">
              {!latestPending && (
                <div className="space-y-3">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="100"
                    max="15000"
                    step="100"
                    value={formData.amount || ""}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder="Enter amount"
                    className={`h-10 ${
                      formData.amount > 0 && formData.amount > userKorCoins
                        ? "border-red-500 focus:border-red-500"
                        : ""
                    }`}
                  />
                  {formData.amount > 0 && formData.amount < 100 && (
                    <div className="text-xs text-red-600">
                      Minimum withdrawal is 100 KOR.
                    </div>
                  )}
                  {formData.amount > 15000 && (
                    <div className="text-xs text-red-600">
                      Maximum withdrawal is 15,000 KOR.
                    </div>
                  )}
                  {formData.amount > 0 && formData.amount > userKorCoins && (
                    <div className="text-xs text-red-600">
                      Insufficient balance. You have{" "}
                      {userKorCoins.toLocaleString()} KOR.
                    </div>
                  )}
                </div>
              )}

              {!latestPending && formData.amount > 0 && (
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Amount:</span>
                    <span className="font-medium">
                      {formData.amount.toLocaleString()} KOR
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-red-500 dark:text-red-400 mb-2">
                    <span>Fee ({feePercentage}%):</span>
                    <span className="font-medium">
                      -{feeAmount.toFixed(2)} KOR
                    </span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between font-semibold">
                    <span>You&apos;ll Receive:</span>
                    <span className="text-success text-lg">
                      ₩ {finalAmount.toFixed(2)}
                    </span>
                  </div>

                  {/* Verification amount preview is shown after request in the panel below */}
                </div>
              )}

              {/* If there is a recent pending/sent request, show verify panel like PayPal */}
              {latestPending &&
                !showFormOverride &&
                pendingBankAccount?.is_verified !== true && (
                  <div className="mt-4 p-4 border border-border rounded-lg bg-muted/20 space-y-3">
                    <div className="text-sm font-medium">
                      Verify your bank account
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="space-y-1">
                        <div className="text-muted-foreground">Request ID</div>
                        <div className="font-mono break-all">
                          {latestPending.id}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground">KOR Coins</div>
                        <div className="font-medium">
                          {latestPending.kor_coins_amount?.toLocaleString?.() ||
                            latestPending.kor_coins_amount}{" "}
                          KOR
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground">Bank</div>
                        <div className="font-medium">
                          {pendingBankAccount?.bank_name || "-"}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground">
                          Account Number
                        </div>
                        <div className="font-mono">
                          {pendingBankAccount?.account_number || "-"}
                        </div>
                      </div>
                    </div>
                    {expectedVerificationAmount !== null && (
                      <div className="text-xs text-muted-foreground">
                        We sent a small amount. Please enter the exact amount
                        you received.
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                      <div className="md:col-span-2">
                        <Label htmlFor="verifyNow" className="mb-2">
                          Enter Verification Amount (₩)
                        </Label>
                        <Input
                          id="verifyNow"
                          type="number"
                          step="0.0001"
                          placeholder="e.g., 0.0042"
                          className="h-10"
                          value={verifyAmount}
                          onChange={(e) =>
                            handleVerifyAmountChange(e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              void handleVerifyNow();
                            }
                          }}
                        />
                      </div>
                      <Button
                        type="button"
                        className="h-10"
                        onClick={handleVerifyNow}
                      >
                        Verify now
                      </Button>
                    </div>
                  </div>
                )}

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-muted/20 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground mb-1">
                    Min Withdrawal
                  </p>
                  <p className="text-sm font-medium text-foreground">100 KOR</p>
                </div>
                <div className="p-3 bg-muted/20 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground mb-1">
                    Max Withdrawal
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    15,000 KOR
                  </p>
                </div>
                <div className="p-3 bg-muted/20 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground mb-1">
                    Processing
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    1-3 Days
                  </p>
                </div>
              </div>

              {!latestPending && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="accountHolderName">
                        Account Holder Name
                      </Label>
                      <Input
                        id="accountHolderName"
                        value={formData.accountHolderName}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            accountHolderName: e.target.value,
                          }))
                        }
                        placeholder="Enter account holder name"
                        className="h-10"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bankName">Bank Name</Label>
                      <Input
                        id="bankName"
                        value={formData.bankName}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            bankName: e.target.value,
                          }))
                        }
                        placeholder="Enter bank name"
                        className="h-10"
                        required
                      />
                    </div>
                  </div>

                  <Label htmlFor="bankAccountNumber">Bank Account Number</Label>
                  <Input
                    id="bankAccountNumber"
                    value={formData.bankAccountNumber}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        bankAccountNumber: e.target.value,
                      }))
                    }
                    placeholder="Enter bank account number"
                    className="h-10"
                    required
                  />

                  {/* No verification input before submit. It only appears in the post-submit panel. */}
                </div>
              )}

              <div className="p-3 bg-muted/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full mt-2 flex-shrink-0"></div>
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Tip:</span>{" "}
                    Ensure your bank account details are accurate. Incorrect
                    information may delay your withdrawal.
                  </div>
                </div>
              </div>

              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      Security Notice:
                    </span>{" "}
                    All requests are manually reviewed. Processing time: 1-3
                    business days.
                  </p>
                </div>
              </div>

              {!latestPending && (
                <Button
                  type="submit"
                  className="w-full h-12"
                  disabled={submitting || !isWithdrawalValid()}
                >
                  {submitting ||
                  createBankAccount.isPending ||
                  createWithdrawal.isPending ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Submit Withdrawal Request"
                  )}
                </Button>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
