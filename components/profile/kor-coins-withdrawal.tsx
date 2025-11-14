"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Coins, Info, Shield, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface WithdrawalFormData {
  amount: number;
  accountHolderName: string;
  bankName: string;
  bankAccountNumber: string;
  bankCode: string;
  birthdateOrSSN: string;
}

// Types for withdrawal requests and bank accounts
// interface WithdrawalRequest {
//   id: string;
//   status: string;
//   created_at: string;
//   kor_coins_amount?: number;
//   bank_account?: BankAccount;
// }

interface BankAccount {
  id: string;
  account_holder_name?: string;
  is_verified?: boolean;
  verification_amount?: number;
  bank_name?: string;
  account_number?: string;
  bank_code?: string;
}

// Secure API functions
const secureWithdrawalApi = {
  // Create withdrawal request using secure API
  async createWithdrawal(amount: number, bankAccountId: string) {
    const response = await fetch("/api/secure-financial/withdrawal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        bankAccountId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create withdrawal request");
    }

    return response.json();
  },

  // Get user's withdrawal requests
  async getUserWithdrawals() {
    const response = await fetch("/api/secure-financial/withdrawal");

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch withdrawal requests");
    }

    return response.json();
  },

  // Create bank account
  async createBankAccount(data: {
    account_holder_name: string;
    account_number: string;
    bank_name: string;
    bank_code?: string;
  }) {
    const response = await fetch("/api/secure-financial/bank-account", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create bank account");
    }

    const result = await response.json();
    return result.bankAccount;
  },

  // Verify bank account via MyData Hub
  async verifyBankAccountMyDataHub(bankAccountId: string) {
    const response = await fetch(
      "/api/secure-financial/verify-bank-mydatahub",
      {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bankAccountId,
      }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to verify bank account");
    }

    const result = await response.json();
    return result.bankAccount;
  },

  // Get user's bank accounts
  async getUserBankAccounts() {
    const response = await fetch("/api/secure-financial/bank-account");

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch bank accounts");
    }

    const result = await response.json();
    return result.bankAccounts || [];
  },

  // Initiate MyData Hub verification
  async initiateMyDataHubVerification(data: {
    bankCode: string;
    accountNo: string;
    birthdateOrSSN: string;
  }) {
    const response = await fetch("/api/mydatahub/verify-account", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to initiate verification");
    }

    return response.json();
  },

  // Complete MyData Hub verification
  async completeMyDataHubVerification(data: {
    callbackId: string;
    callbackResponse: string;
  }) {
    const response = await fetch("/api/mydatahub/verify-account", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bankCode: "",
        accountNo: "",
        birthdateOrSSN: "",
        callbackId: data.callbackId,
        callbackResponse: data.callbackResponse,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to complete verification");
    }

    return response.json();
  },
};

export function KORCoinsWithdrawal() {
  const t = useTranslations("profile.korCoinsWithdrawal");
  const { user, loading: authLoading, computed } = useAuth();
  const queryClient = useQueryClient();

  // State to force re-renders when KOR coins update
  const [, setKorCoinsUpdateTrigger] = useState(0);

  // Listen for KOR coins updates to refresh the display
  useEffect(() => {
    const handleKorCoinsUpdated = (event: Event) => {
      // Update the local state with the new amount
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.newAmount !== undefined) {
        // Invalidate user query to get fresh KOR coins value from useAuth()
        queryClient.invalidateQueries({ queryKey: ["user"] });
        // Force a re-render to update KOR coins display
        setKorCoinsUpdateTrigger((prev) => prev + 1);
      }
    };

    window.addEventListener("kor-coins-updated", handleKorCoinsUpdated);

    return () => {
      window.removeEventListener("kor-coins-updated", handleKorCoinsUpdated);
    };
  }, [queryClient]);

  // Real-time subscription to user's KOR coins updates
  useEffect(() => {
    if (!user?.id) return;

    const supabase = createClient();

    // Subscribe to real-time updates for this user's KOR coins
    const channel = supabase.channel(`user-kor-coins-withdraw-${user.id}`).on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "users",
        filter: `id=eq.${user.id}`,
      },
      (payload) => {
        const newData = payload.new as { kor_coins?: number };
        if (newData?.kor_coins !== undefined) {
          console.log(
            "Withdraw: KOR coins updated via real-time:",
            newData.kor_coins
          );
          // Invalidate user query to get fresh KOR coins value from useAuth()
          queryClient.invalidateQueries({ queryKey: ["user"] });
          // Force a re-render to update KOR coins display
          setKorCoinsUpdateTrigger((prev) => prev + 1);
        }
      }
    );

    channel.subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (error) {
        console.error("Error removing channel:", error);
      }
    };
  }, [user?.id]);

  // TanStack Query hooks for secure operations
  const { data: bankAccounts } = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: secureWithdrawalApi.getUserBankAccounts,
    enabled: !!user,
  });

  const createBankAccountMutation = useMutation({
    mutationFn: secureWithdrawalApi.createBankAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
    },
  });

  const createWithdrawalMutation = useMutation({
    mutationFn: ({
      amount,
      bankAccountId,
    }: {
      amount: number;
      bankAccountId: string;
    }) => secureWithdrawalApi.createWithdrawal(amount, bankAccountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["withdrawal-requests"] });
      queryClient.invalidateQueries({ queryKey: ["user"] }); // Refresh user data for KOR coins

      // Dispatch custom event for immediate KOR coins update
      // Only dispatch if withdrawal was successfully created (KOR coins deducted)
      if (user?.id) {
        window.dispatchEvent(
          new CustomEvent("kor-coins-updated", {
            detail: {
              userId: user.id,
              oldAmount: user.kor_coins || 0,
              newAmount: Math.max(0, (user.kor_coins || 0) - formData.amount),
            },
          })
        );
      }
    },
    onError: (error) => {
      // If withdrawal creation fails, KOR coins are NOT deducted
      // Don't dispatch kor-coins-updated event
      console.error("Withdrawal creation failed:", error);
    },
  });

  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);

  const [submitting, setSubmitting] = useState(false);
  const [authText, setAuthText] = useState("");
  const [callbackId, setCallbackId] = useState<string | null>(null);
  const [callbackResponse, setCallbackResponse] = useState("");
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [formData, setFormData] = useState<WithdrawalFormData>({
    amount: 0,
    accountHolderName: "",
    bankName: "",
    bankAccountNumber: "",
    bankCode: "",
    birthdateOrSSN: "",
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

  // Check if the withdrawal request is valid (basic UX validation only)
  const isWithdrawalValid = () => {
    return (
      formData.amount > 0 &&
      formData.accountHolderName.trim() &&
      formData.bankAccountNumber.trim() &&
      formData.bankName.trim() &&
      formData.bankCode.trim() &&
      formData.birthdateOrSSN.trim() &&
      (formData.birthdateOrSSN.length === 8 ||
        formData.birthdateOrSSN.length === 13)
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
      toast.error(t("errors.userNotFound"));
      return;
    }

    // Basic client-side validation for UX (server will do the real validation)
    if (!formData.accountHolderName.trim()) {
      toast.error(t("withdrawalRequest.validation.enterAccountHolder"));
      return;
    }

    if (!formData.bankAccountNumber.trim()) {
      toast.error(t("withdrawalRequest.validation.enterAccountNumber"));
      return;
    }

    if (!formData.bankName.trim()) {
      toast.error(t("withdrawalRequest.validation.enterBankName"));
      return;
    }

    if (!formData.bankCode.trim()) {
      toast.error(t("withdrawalRequest.validation.enterBankCode"));
      return;
    }

    if (!formData.birthdateOrSSN.trim()) {
      toast.error(t("withdrawalRequest.validation.enterBirthdateOrSSN"));
      return;
    }

    if (
      formData.birthdateOrSSN.length !== 8 &&
      formData.birthdateOrSSN.length !== 13
    ) {
      toast.error(t("withdrawalRequest.validation.invalidBirthdateOrSSN"));
      return;
    }

    if (formData.amount <= 0) {
      toast.error(t("withdrawalRequest.validation.enterAmount"));
      return;
    }

    // Validate account number length (Korean bank accounts are typically 10-14 digits)
    if (
      formData.bankAccountNumber.trim().length < 10 ||
      formData.bankAccountNumber.trim().length > 20
    ) {
      toast.error(t("withdrawalRequest.validation.invalidAccountNumberLength"));
      return;
    }

    // Validate bank code (must be exactly 3 digits)
    if (formData.bankCode.trim().length !== 3) {
      toast.error(t("withdrawalRequest.validation.invalidBankCodeLength"));
      return;
    }

    setSubmitting(true);
    try {
      // 1) Check if bank account exists and is verified
      const existing = (bankAccounts || []).find(
        (b: BankAccount) =>
          b.account_holder_name?.trim() === formData.accountHolderName.trim() &&
          b.account_number?.trim() === formData.bankAccountNumber.trim() &&
          (b.bank_name?.trim() || "") === formData.bankName.trim() &&
          (b.bank_code?.trim() || "") === formData.bankCode.trim()
      );

      // 2) If bank account exists and is verified, proceed with withdrawal
      if (existing && existing.is_verified) {
      await createWithdrawalMutation.mutateAsync({
        amount: formData.amount,
          bankAccountId: existing.id,
      });

      toast.success(t("errors.withdrawalSubmitted"));
      setFormData({
        amount: 0,
        accountHolderName: "",
        bankName: "",
        bankAccountNumber: "",
          bankCode: "",
          birthdateOrSSN: "",
        });
        setSubmitting(false);
        return;
      }

      // 3) If bank account needs verification (not verified or doesn't exist), initiate MyData Hub verification
      // DO NOT create bank account yet - wait for successful verification
      if (formData.bankCode.trim()) {
        try {
          // Step 1: Initiate MyData Hub verification (this validates the bank account info)
          const step1Result =
            await secureWithdrawalApi.initiateMyDataHubVerification({
              bankCode: formData.bankCode.trim(),
              accountNo: formData.bankAccountNumber.trim(),
              birthdateOrSSN: formData.birthdateOrSSN.trim(),
            });

          if (step1Result.callbackId) {
            setCallbackId(step1Result.callbackId);
            if (step1Result.authText) {
              setAuthText(step1Result.authText);
            }
            // Show verification dialog after successful initiation
            setShowVerificationDialog(true);
            // DO NOT create bank account or withdrawal yet - wait for verification to complete
            setSubmitting(false);
            return;
          } else {
            throw new Error(
              "Failed to initiate verification: No callbackId received"
            );
          }
        } catch (verificationError) {
          console.error(
            "MyData Hub verification initiation error:",
            verificationError
          );

          // If verification fails, show simple error and DO NOT create bank account
          toast.error(t("errors.bankAccountVerificationFailed"));
          setSubmitting(false);
          return;
        }
      }

      // 4) If no bank_code provided, we can't verify - show error
      toast.error(t("errors.bankCodeRequired"));
      setSubmitting(false);
    } catch (err: Error | unknown) {
      console.error("Withdrawal submission error:", err);
      toast.error(
        err instanceof Error ? err.message : t("errors.withdrawalFailed")
      );
      setSubmitting(false);
    }
  };

  const handleCompleteVerification = async () => {
    if (!callbackId || !callbackResponse) {
      toast.error(t("withdrawalRequest.validation.enterAuthResponse"));
      return;
    }

    if (!authText) {
      toast.error(t("errors.authTextNotFound"));
      return;
    }

    // Validate that callbackResponse matches authText
    const trimmedResponse = callbackResponse.trim();
    const trimmedAuthText = authText.trim();

    if (trimmedResponse !== trimmedAuthText) {
      toast.error(t("errors.authTextMismatch"));
      return;
    }

    if (!user) {
      toast.error(t("withdrawalRequest.validation.userNotAuthenticated"));
      return;
    }

    // Validate all required form fields are present
    if (
      !formData.accountHolderName?.trim() ||
      !formData.bankAccountNumber?.trim() ||
      !formData.bankName?.trim()
    ) {
      toast.error(t("withdrawalRequest.validation.missingRequiredFields"));
      return;
    }

    setSubmitting(true);
    try {
      // Step 1: Complete MyData Hub verification
      // This validates the bank account information - if it fails, we don't save to DB
      const step2Result =
        await secureWithdrawalApi.completeMyDataHubVerification({
          callbackId,
          callbackResponse: callbackResponse.trim(),
        });

      if (!step2Result.verified) {
        // Verification failed - don't create bank account or withdrawal, show error
        // KOR coins are NOT deducted when verification fails
        toast.error(t("withdrawalRequest.validation.verificationFailed"));
        setSubmitting(false);
        return;
      }

      // Step 2: Verification succeeded - now we can safely create bank account
      // First, refresh the bank accounts query to get the latest data
      await queryClient.invalidateQueries({
        queryKey: ["bank-accounts"],
      });
      // Fetch fresh bank accounts using the API
      const refreshedBankAccounts =
        await secureWithdrawalApi.getUserBankAccounts();

      let bankAccountId: string | null = null;
      const existing = (refreshedBankAccounts || []).find(
        (b: BankAccount) =>
          b.account_holder_name?.trim() === formData.accountHolderName.trim() &&
          b.account_number?.trim() === formData.bankAccountNumber.trim() &&
          (b.bank_name?.trim() || "") === formData.bankName.trim() &&
          (b.bank_code?.trim() || "") === formData.bankCode.trim()
      );

      if (existing) {
        bankAccountId = existing.id;
      } else {
        // Create bank account with all required fields (only after successful verification)
        const created = await createBankAccountMutation.mutateAsync({
          account_holder_name: formData.accountHolderName.trim(),
          account_number: formData.bankAccountNumber.trim(),
          bank_name: formData.bankName.trim(),
          bank_code: formData.bankCode.trim() || undefined,
        });
        bankAccountId = created.id;
        // Refresh again after creation
        await queryClient.invalidateQueries({
          queryKey: ["bank-accounts"],
        });
      }

      if (!bankAccountId) {
        throw new Error("Bank account could not be created or found");
    }

      // Step 3: Update bank account to verified
      // If this fails, we don't create withdrawal (KOR coins not deducted)
      try {
        await secureWithdrawalApi.verifyBankAccountMyDataHub(bankAccountId);
      } catch (verifyError) {
        console.error("Bank account verification update error:", verifyError);
        toast.error(t("withdrawalRequest.validation.verificationFailed"));
        setSubmitting(false);
      return;
    }

      // Step 4: Only create withdrawal request AFTER successful verification
      // This is when KOR coins are deducted
      await createWithdrawalMutation.mutateAsync({
        amount: formData.amount,
        bankAccountId: bankAccountId,
      });

      toast.success(t("errors.withdrawalSubmitted"));

      // Clear form and verification state
      setFormData({
        amount: 0,
        accountHolderName: "",
        bankName: "",
        bankAccountNumber: "",
        bankCode: "",
        birthdateOrSSN: "",
      });
      setCallbackId(null);
      setCallbackResponse("");
      setAuthText("");
      setShowVerificationDialog(false);
    } catch (err: Error | unknown) {
      console.error("Complete verification error:", err);
      toast.error(
        err instanceof Error ? err.message : t("errors.withdrawalFailed")
      );
    } finally {
      setSubmitting(false);
    }
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
            {t("errors.userNotFoundTitle")}
          </h2>
          <p className="text-muted-foreground">
            {t("errors.userNotFoundMessage")}
          </p>
        </div>
      </div>
    );
  }

  const userLevel = computed?.level || 0;
  const userKorCoins = computed?.kor_coins || 0;
  const { feePercentage } = calculateFee(formData.amount, userLevel);
  const fullName = computed?.fullName || user.email || "User";

  return (
    <div className="flex flex-col h-full p-4 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-primary" />
              {t("accountInfo.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">
                  {t("accountInfo.accountHolder")}
                </span>
                <span className="font-medium text-foreground">{fullName}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">
                  {t("accountInfo.currentLevel")}
                </span>
                <Badge variant="outline">Level {userLevel}</Badge>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">
                  {t("accountInfo.availableBalance")}
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
                  {t("accountInfo.withdrawalFee")}
                </p>
                <p className="text-3xl font-bold text-primary mb-2">
                  {feePercentage}%
                </p>
                <Badge variant="outline" className="text-xs">
                  {userLevel <= 25
                    ? t("accountInfo.tiers.bronze")
                    : userLevel <= 50
                    ? t("accountInfo.tiers.silver")
                    : userLevel <= 75
                    ? t("accountInfo.tiers.gold")
                    : t("accountInfo.tiers.platinum")}
                </Badge>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-semibold text-foreground mb-3 text-center">
                {t("accountInfo.feeStructure")}
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <span className="text-sm">
                      {t("accountInfo.tiers.bronze")}
                    </span>
                  </div>
                  <Badge variant="destructive" className="font-semibold">
                    40%
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                    <span className="text-sm">
                      {t("accountInfo.tiers.silver")}
                    </span>
                  </div>
                  <Badge variant="secondary" className="font-semibold">
                    30%
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm">
                      {t("accountInfo.tiers.gold")}
                    </span>
                  </div>
                  <Badge variant="default" className="font-semibold">
                    20%
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm">
                      {t("accountInfo.tiers.platinum")}
                    </span>
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
              {t("withdrawalRequest.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-3">
                <Label htmlFor="amount">{t("withdrawalRequest.amount")}</Label>
                  <Input
                    id="amount"
                    type="number"
                  min="10000"
                    max="15000"
                    step="100"
                    value={formData.amount || ""}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder={t("withdrawalRequest.amountPlaceholder")}
                    className={`h-10 ${
                      formData.amount > 0 && formData.amount > userKorCoins
                        ? "border-red-500 focus:border-red-500"
                        : ""
                    }`}
                  />
                {formData.amount > 0 && formData.amount < 10000 && (
                    <div className="text-xs text-red-600">
                      {t("withdrawalRequest.validation.minWithdrawal")}
                    </div>
                  )}
                  {formData.amount > 15000 && (
                    <div className="text-xs text-red-600">
                      {t("withdrawalRequest.validation.maxWithdrawal")}
                    </div>
                  )}
                  {formData.amount > 0 && formData.amount > userKorCoins && (
                    <div className="text-xs text-red-600">
                      {t("withdrawalRequest.validation.insufficientBalance", {
                        balance: userKorCoins.toLocaleString(),
                      })}
                    </div>
                  )}
                </div>

              {formData.amount > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-between px-3 py-2.5 bg-muted/20 rounded-md cursor-help hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {t(
                              "withdrawalRequest.feeBreakdown.estimatedReceive"
                            )}
                          </span>
                          <Info className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <span className="text-base font-bold text-success">
                          ₩
                          {Math.floor(
                            formData.amount -
                              (formData.amount *
                                (userLevel <= 25
                                  ? 40
                                  : userLevel <= 50
                                  ? 30
                                  : userLevel <= 75
                                  ? 20
                                  : 10)) /
                                100
                          ).toLocaleString()}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      align="start"
                      className="w-64 p-3 bg-popover border border-border shadow-lg"
                    >
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">
                            {t("withdrawalRequest.feeBreakdown.amount")}
                          </span>
                          <span className="font-medium text-primary">
                      {formData.amount.toLocaleString()} KOR
                    </span>
                  </div>
                        <div className="flex items-center justify-between text-red-500 dark:text-red-400">
                    <span>
                      {t("withdrawalRequest.feeBreakdown.estimatedFee", {
                        percentage:
                          userLevel <= 25
                            ? 40
                            : userLevel <= 50
                            ? 30
                            : userLevel <= 75
                            ? 20
                            : 10,
                      })}
                    </span>
                    <span className="font-medium">
                            -{" "}
                      {Math.floor(
                        (formData.amount *
                          (userLevel <= 25
                            ? 40
                            : userLevel <= 50
                            ? 30
                            : userLevel <= 75
                            ? 20
                            : 10)) /
                          100
                            ).toLocaleString()}{" "}
                      KOR
                    </span>
                  </div>
                        <div className="flex items-center justify-between pt-2 border-t border-border">
                          <span className="font-medium text-foreground">
                            {t(
                              "withdrawalRequest.feeBreakdown.estimatedReceive"
                            )}
                    </span>
                          <span className="font-semibold text-success">
                      ₩
                      {Math.floor(
                        formData.amount -
                          (formData.amount *
                            (userLevel <= 25
                              ? 40
                              : userLevel <= 50
                              ? 30
                              : userLevel <= 75
                              ? 20
                              : 10)) /
                            100
                            ).toLocaleString()}
                    </span>
                  </div>
                  </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                )}

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/20 rounded-lg text-center border border-border">
                  <p className="text-xs text-muted-foreground mb-1">
                    {t("withdrawalRequest.limits.minWithdrawal")}
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {t("withdrawalRequest.limits.minAmount")}
                  </p>
                </div>
                {/* <div className="p-3 bg-muted/20 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground mb-1">
                    {t("withdrawalRequest.limits.maxWithdrawal")}
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {t("withdrawalRequest.limits.maxAmount")}
                  </p>
                </div> */}
                <div className="p-3 bg-muted/20 rounded-lg text-center border border-border">
                  <p className="text-xs text-muted-foreground mb-1">
                    {t("withdrawalRequest.limits.processing")}
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {t("withdrawalRequest.limits.processingTime")}
                  </p>
                </div>
              </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="accountHolderName">
                        {t("withdrawalRequest.form.accountHolderName")}
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
                        placeholder={t(
                          "withdrawalRequest.form.accountHolderPlaceholder"
                        )}
                        className="h-10"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bankName">
                        {t("withdrawalRequest.form.bankName")}
                      </Label>
                      <Input
                        id="bankName"
                        value={formData.bankName}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            bankName: e.target.value,
                          }))
                        }
                        placeholder={t(
                          "withdrawalRequest.form.bankNamePlaceholder"
                        )}
                        className="h-10"
                        required
                      />
                    </div>
                  </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="bankCode">
                      {t("withdrawalRequest.form.bankCode")}
                    </Label>
                    <Input
                      id="bankCode"
                      value={formData.bankCode}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "");
                        if (value.length <= 3) {
                          setFormData((prev) => ({
                            ...prev,
                            bankCode: value,
                          }));
                        }
                      }}
                      placeholder={t(
                        "withdrawalRequest.form.bankCodePlaceholder"
                      )}
                      maxLength={3}
                      className="h-10"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("withdrawalRequest.form.bankCodeHelper")}
                    </p>
                  </div>
                  <div className="space-y-2">
                  <Label htmlFor="bankAccountNumber">
                    {t("withdrawalRequest.form.bankAccountNumber")}
                  </Label>
                  <Input
                    id="bankAccountNumber"
                    value={formData.bankAccountNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      if (value.length <= 20) {
                        setFormData((prev) => ({
                          ...prev,
                          bankAccountNumber: value,
                        }));
                      }
                    }}
                    placeholder={t(
                      "withdrawalRequest.form.bankAccountPlaceholder"
                    )}
                    maxLength={20}
                    className="h-10"
                    required
                  />
                </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birthdateOrSSN">
                    {t("withdrawalRequest.form.birthdateOrSSN")}
                  </Label>
                  <Input
                    id="birthdateOrSSN"
                    value={formData.birthdateOrSSN}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      if (value.length <= 13) {
                        setFormData((prev) => ({
                          ...prev,
                          birthdateOrSSN: value,
                        }));
                      }
                    }}
                    placeholder={t(
                      "withdrawalRequest.form.birthdateOrSSNPlaceholder"
                    )}
                    maxLength={13}
                    className="h-10"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("withdrawalRequest.form.birthdateOrSSNHelper")}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-muted/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full shrink-0"></div>
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {t("withdrawalRequest.tips.title")}
                    </span>{" "}
                    {t("withdrawalRequest.tips.message")}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {t("withdrawalRequest.security.title")}
                    </span>{" "}
                    {t("withdrawalRequest.security.message")}
                  </p>
                </div>
              </div>

                <Button
                  type="submit"
                  className="w-full h-12"
                  disabled={submitting || !isWithdrawalValid()}
                >
                  {submitting ||
                  createBankAccountMutation.isPending ||
                  createWithdrawalMutation.isPending ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Submit Withdrawal Request"
                  )}
                </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Verification Dialog */}
      <Dialog
        open={showVerificationDialog}
        onOpenChange={setShowVerificationDialog}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bank Account Verification</DialogTitle>
            <DialogDescription>
              A 1-won transaction has been sent to your bank account. Please
              check your bank transaction and enter the authentication code
              below.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dialog-callback-response">
                Authentication Response
              </Label>
              <Input
                id="dialog-callback-response"
                type="text"
                value={callbackResponse}
                onChange={(e) => setCallbackResponse(e.target.value)}
                placeholder="Enter the numbers from your bank transaction"
                className="h-10"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && callbackId && callbackResponse) {
                    e.preventDefault();
                    void handleCompleteVerification();
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Enter the authentication code that appears in your bank
                transaction.
              </p>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowVerificationDialog(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCompleteVerification}
              disabled={!callbackResponse || submitting}
            >
              {submitting ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Complete Verification"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
