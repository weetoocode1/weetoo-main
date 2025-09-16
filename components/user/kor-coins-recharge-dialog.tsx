"use client";

import { IdentityVerificationButton } from "@/components/identity-verification-button";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Check,
  CheckCircle,
  ChevronsUpDown,
  Copy,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Icons } from "../icons";

// Define proper types for the API responses and data structures
interface DepositRequest {
  id: string;
  kor_coins_amount: number;
  payment_reference: string;
  created_at: string;
  status: string;
}

interface BankAccount {
  id: string;
  user_id: string;
  account_holder_name: string;
  account_number: string;
  bank_name: string;
  is_verified: boolean;
  created_at: string;
}

interface AdminBankAccount {
  bank_name: string;
  account_number: string;
  account_holder: string;
}

interface DepositApiResponse {
  depositRequest: DepositRequest;
}

interface DepositError {
  error: string;
  dailyLimit?: number;
  resetTime?: string;
}

interface VerificationData {
  data?: {
    verifiedCustomer?: {
      name?: string;
      birthDate?: string;
      gender?: string;
      phoneNumber?: string;
      mobile?: string;
      phone?: string;
      tel?: string;
      hp?: string;
    };
    pgRawResponse?: string;
    channel?: {
      mobile?: string;
      phone?: string;
      contact?: string;
    };
    id?: string;
  };
}

interface UserData {
  name: string | null;
  birthDate: string | null;
  gender: string | null;
  mobileNumber: string | null;
  isForeigner: boolean;
}

// Secure API functions
const secureDepositApi = {
  // Create deposit request using secure API
  async createDeposit(data: {
    korCoinsAmount: number;
    bankAccountId: string;
  }): Promise<DepositApiResponse> {
    const response = await fetch("/api/secure-financial/deposit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        korCoinsAmount: data.korCoinsAmount,
        bankAccountId: data.bankAccountId,
      }),
    });

    if (!response.ok) {
      let payload: DepositError | null = null;
      try {
        payload = await response.json();
      } catch {}
      const err = new Error(
        payload?.error || "Failed to create deposit request"
      ) as Error & {
        status?: number;
        data?: DepositError;
        dailyLimit?: number;
        resetTime?: string;
      };
      err.status = response.status;
      err.data = payload || undefined;
      if (payload?.dailyLimit !== undefined)
        err.dailyLimit = payload.dailyLimit;
      if (payload?.resetTime !== undefined) err.resetTime = payload.resetTime;
      throw err;
    }

    return response.json();
  },

  // Get user's deposit requests
  async getUserDeposits(): Promise<{ depositRequests: DepositRequest[] }> {
    const response = await fetch("/api/secure-financial/deposit");

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch deposit requests");
    }

    return response.json();
  },

  // Get user's bank accounts
  async getUserBankAccounts(): Promise<BankAccount[]> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from("bank_accounts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get primary admin bank account for payment instructions
  async getPrimaryAdminBankAccount(): Promise<AdminBankAccount> {
    const response = await fetch("/api/secure-financial/admin-bank-account");

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch payment instructions");
    }

    return response.json();
  },
};

export function KorCoinsRechargeDialog() {
  const t = useTranslations("korCoinsRecharge");
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const formatNumber = (n: number) =>
    mounted ? n.toLocaleString() : String(n);

  const [open, setOpen] = useState(false);
  const [korCoinsAmount, setKorCoinsAmount] = useState("");
  const [userKorCoins, setUserKorCoins] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [depositorName, setDepositorName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [selectedBankAccount, setSelectedBankAccount] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [bankAccountComboboxOpen, setBankAccountComboboxOpen] = useState(false);
  const [bankSearchValue, setBankSearchValue] = useState("");
  const [showPaymentInstructions, setShowPaymentInstructions] = useState(false);
  const [currentDepositRequest, setCurrentDepositRequest] =
    useState<DepositRequest | null>(null);
  const [copiedReference, setCopiedReference] = useState(false);
  const [, setKorCoinsUpdateTrigger] = useState(0);
  const lastSessionId = useRef<string | null>(null);

  // Listen for identity verification completion and KOR coins updates
  useEffect(() => {
    setMounted(true);
    const handleIdentityVerified = (event: Event) => {
      // Force a re-render to update verification status
      // This is handled by the event dispatch in handleVerificationSuccess
    };

    const handleKorCoinsUpdated = (event: Event) => {
      // Update the local KOR coins state with the new amount
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.newAmount !== undefined) {
        setUserKorCoins(customEvent.detail.newAmount);
      }
      // Also force a re-render to update KOR coins display
      setKorCoinsUpdateTrigger((prev) => prev + 1);
    };

    window.addEventListener("identity-verified", handleIdentityVerified);
    window.addEventListener("kor-coins-updated", handleKorCoinsUpdated);

    return () => {
      window.removeEventListener("identity-verified", handleIdentityVerified);
      window.removeEventListener("kor-coins-updated", handleKorCoinsUpdated);
    };
  }, []);

  // Real-time subscription to user's KOR coins updates
  useEffect(() => {
    if (!user?.id) return;

    const supabase = createClient();

    // Subscribe to real-time updates for this user's KOR coins
    const channel = supabase.channel(`user-kor-coins-dialog-${user.id}`).on(
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
            "KorCoinsRechargeDialog: KOR coins updated via real-time:",
            newData.kor_coins
          );
          setUserKorCoins(newData.kor_coins);
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
    queryFn: secureDepositApi.getUserBankAccounts,
    enabled: !!user,
  });

  const { data: primaryAdminBank } = useQuery({
    queryKey: ["primary-admin-bank"],
    queryFn: secureDepositApi.getPrimaryAdminBankAccount,
    enabled: !!user,
  });

  const createDepositMutation = useMutation({
    mutationFn: secureDepositApi.createDeposit,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["deposit-requests"] });
      queryClient.invalidateQueries({ queryKey: ["user"] }); // Refresh user data for KOR coins

      // Dispatch custom event for immediate KOR coins update
      window.dispatchEvent(
        new CustomEvent("kor-coins-updated", {
          detail: {
            userId: user?.id,
            oldAmount: user?.kor_coins || 0,
            newAmount:
              (user?.kor_coins || 0) + response.depositRequest.kor_coins_amount,
          },
        })
      );

      // Show payment instructions
      setCurrentDepositRequest(response.depositRequest);
      setShowPaymentInstructions(true);
      setSubmitting(false);
    },
    onError: async (
      err: Error & {
        dailyLimit?: number;
        resetTime?: string;
        data?: DepositError;
      }
    ) => {
      setSubmitting(false);
      try {
        // Try to parse server error shape if present
        const serverMsg = err?.message || "Failed to submit deposit request.";
        const dailyLimit = err?.dailyLimit ?? err?.data?.dailyLimit;
        const resetTime = err?.resetTime ?? err?.data?.resetTime;
        if (
          String(serverMsg).includes("Rate limit exceeded") &&
          dailyLimit !== undefined
        ) {
          toast.error(
            `Daily limit reached (${dailyLimit}). Please try again later.`,
            {
              description: resetTime
                ? `Resets at ${new Date(resetTime).toLocaleString()}`
                : undefined,
            }
          );
        } else {
          toast.error(serverMsg);
        }
      } catch {
        toast.error(
          "Failed to submit deposit request. Please try again later."
        );
      }
    },
  });

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();
    setLoading(true);
    supabase.auth.getSession().then(({ data }) => {
      const sessionId = data.session?.user?.id || null;
      if (lastSessionId.current === sessionId && userKorCoins !== null) {
        setLoading(false);
        return;
      }
      lastSessionId.current = sessionId;
      if (!sessionId) {
        if (mounted) setLoading(false);
        setUserKorCoins(null);
        return;
      }
      supabase
        .from("users")
        .select("id, kor_coins")
        .eq("id", sessionId)
        .single()
        .then(({ data, error }) => {
          if (mounted) {
            setUserKorCoins(error ? 0 : data?.kor_coins ?? 0);
            setLoading(false);
          }
        });
    });
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const sessionId = session?.user?.id || null;
        if (lastSessionId.current === sessionId && userKorCoins !== null) {
          setLoading(false);
          return;
        }
        lastSessionId.current = sessionId;
        if (!sessionId) {
          setUserKorCoins(null);
          setLoading(false);
          return;
        }
        setLoading(true);
        supabase
          .from("users")
          .select("id, kor_coins")
          .eq("id", sessionId)
          .single()
          .then(({ data, error }) => {
            setUserKorCoins(error ? 0 : data?.kor_coins ?? 0);
            setLoading(false);
          });
      }
    );
    return () => {
      mounted = false;
      listener?.subscription.unsubscribe();
    };
  }, []); // Removed userKorCoins dependency to prevent infinite loop

  // Handle bank account selection
  const handleBankAccountSelect = (accountId: string) => {
    setSelectedBankAccount(accountId);
    if (accountId === "new") {
      setBankName("");
      setBankAccountNumber("");
      setDepositorName("");
      setMobileNumber("");
    } else {
      const selectedAccount = bankAccounts?.find((acc) => acc.id === accountId);
      if (selectedAccount) {
        setBankName(selectedAccount.bank_name || "");
        setBankAccountNumber(selectedAccount.account_number || "");
      }
    }
  };

  // Handle bank account submission (new bank account)
  const handleBankAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !bankName.trim() ||
      !bankAccountNumber.trim() ||
      !depositorName.trim()
    ) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      // Create bank account
      const { data: bankAccount, error: bankError } = await supabase
        .from("bank_accounts")
        .insert({
          user_id: user.id,
          account_holder_name: depositorName.trim(),
          account_number: bankAccountNumber.trim(),
          bank_name: bankName.trim(),
          is_verified: true, // Mark as verified since we're not doing verification anymore
        })
        .select()
        .single();

      if (bankError) throw bankError;

      // Create deposit request using the secure API
      createDepositMutation.mutate(
        {
          korCoinsAmount: Number(korCoinsAmount),
          bankAccountId: bankAccount.id,
        },
        {
          onError: (error: Error) => {
            toast.error("Failed to submit deposit request. Please try again.");
            console.error("Deposit creation error:", error);
            setSubmitting(false);
          },
        }
      );
    } catch (_error) {
      toast.error("Failed to submit deposit request. Please try again.");
      setSubmitting(false);
    }
  };

  // Handle deposit submission (existing bank account)
  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBankAccount || selectedBankAccount === "new") {
      toast.error("Please select a bank account.");
      return;
    }

    if (!korCoinsAmount || Number(korCoinsAmount) < 100) {
      toast.error("Please enter a valid amount (minimum 100 KOR).");
      return;
    }

    setSubmitting(true);
    try {
      const selectedAccount = bankAccounts?.find(
        (acc) => acc.id === selectedBankAccount
      );
      if (!selectedAccount) throw new Error("Bank account not found");

      // Create deposit request using the secure API
      createDepositMutation.mutate(
        {
          korCoinsAmount: Number(korCoinsAmount),
          bankAccountId: selectedAccount.id,
        },
        {
          onError: (error: Error) => {
            toast.error("Failed to submit deposit request. Please try again.");
            console.error("Deposit creation error:", error);
            setSubmitting(false);
          },
        }
      );
    } catch (_error) {
      toast.error("Failed to submit deposit request. Please try again.");
      setSubmitting(false);
    }
  };

  // Unified submit handler
  const handleUnifiedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedBankAccount === "new") {
      await handleBankAccountSubmit(e);
      return;
    }

    await handleDepositSubmit(e);
  };

  // Copy payment reference to clipboard
  const copyPaymentReference = async () => {
    if (currentDepositRequest?.payment_reference) {
      try {
        await navigator.clipboard.writeText(
          currentDepositRequest.payment_reference
        );
        setCopiedReference(true);
        toast.success("Payment reference copied to clipboard!");
        setTimeout(() => setCopiedReference(false), 2000);
      } catch (_err) {
        toast.error("Failed to copy payment reference");
      }
    }
  };

  // Reset form and go back to deposit form
  const handleNewDeposit = () => {
    setShowPaymentInstructions(false);
    setCurrentDepositRequest(null);
    setKorCoinsAmount("");
    setSelectedBankAccount("");
    setBankName("");
    setBankAccountNumber("");
    setDepositorName("");
    setMobileNumber("");
    setSubmitting(false);
    setBankAccountComboboxOpen(false);
    setBankSearchValue("");
    setCopiedReference(false);
  };

  // Reset all form/dialog state
  const resetAll = () => {
    setKorCoinsAmount("");
    setSelectedBankAccount("");
    setBankName("");
    setBankAccountNumber("");
    setDepositorName("");
    setMobileNumber("");
    setSubmitting(false);
    setShowPaymentInstructions(false);
    setCurrentDepositRequest(null);
    setBankAccountComboboxOpen(false);
    setBankSearchValue("");
    setCopiedReference(false);
  };

  // Handle verification success
  const handleVerificationSuccess = async (
    verificationData: VerificationData,
    userData: UserData
  ) => {
    toast.success("Identity verification completed successfully!");

    try {
      // Optimistically update the user's verification status
      if (user) {
        // Update the user object in the useAuth hook
        user.identity_verified = true;
        user.identity_verified_at = new Date().toISOString();
        user.identity_verification_id = verificationData.data?.id;
      }

      // Invalidate and refetch user data to update verification status
      await queryClient.invalidateQueries({
        queryKey: ["user"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["user-verification"],
      });

      // Force a re-render by updating the auth context
      window.dispatchEvent(
        new CustomEvent("identity-verified", {
          detail: verificationData,
        })
      );

      // Small delay to ensure state updates are processed
      setTimeout(() => {
        // The dialog will now show the recharge content
      }, 100);
    } catch (error) {
      console.error("Error updating verification status:", error);
      // Fallback: reload the page if optimistic update fails
      window.location.reload();
    }
  };

  // Handle verification failure
  const handleVerificationFailure = () => {
    toast.error("Identity verification failed. Please try again.");
  };

  // Define threshold for low balance (easy to change in the future)
  const LOW_BALANCE_THRESHOLD = 0;

  // Pricing: 1 KOR = 1.1 won (already VAT-included)
  const baseKor = Number(korCoinsAmount) || 0;
  const baseWon = baseKor * 1.0; // pre‑VAT base in won
  const vatAmount = baseKor * 0.1; // included VAT portion
  const totalAmount = baseWon + vatAmount; // amount to pay (won)

  // If showing payment instructions, render that instead of the deposit form
  if (showPaymentInstructions && currentDepositRequest) {
    return (
      <Dialog
        open={showPaymentInstructions}
        onOpenChange={(open) => {
          if (!open) {
            resetAll();
          } else {
            setShowPaymentInstructions(true);
          }
        }}
        modal={false}
      >
        <DialogContent className="max-w-md p-0 h-[75vh] overflow-y-auto scrollbar-hide">
          <div className="flex flex-col">
            {/* Fixed Header */}
            <DialogHeader className="flex gap-0 sticky top-0 bg-background z-10 p-4 border-b">
              <DialogTitle className="text-lg font-bold flex items-center gap-1.5">
                <CheckCircle className="w-5 h-5 text-green-500" />
                {t("paymentInstructionsTitle")}
              </DialogTitle>
              <DialogDescription>
                {t("paymentInstructionsSubtitle")}
              </DialogDescription>
            </DialogHeader>

            {/* Scrollable Content */}
            <div className="overflow-y-auto px-6 py-4 flex-1">
              <div className="space-y-6">
                {/* Success Message */}
                <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                  <h3 className="text-lg font-semibold text-green-800 mb-1">
                    {t("depositRequestSubmitted")}
                  </h3>
                  <p className="text-sm text-green-700">
                    {t("depositRequestSubmittedDesc", {
                      amount:
                        currentDepositRequest.kor_coins_amount?.toLocaleString(),
                    })}
                  </p>
                </div>

                {/* Payment Reference */}
                <div className="space-y-3">
                  <Label className="font-semibold text-sm text-muted-foreground">
                    {t("paymentReference")}
                  </Label>
                  <div className="flex items-center gap-2 p-3 bg-muted/60 border border-border rounded-lg">
                    <span className="font-mono text-sm flex-1">
                      {currentDepositRequest.payment_reference}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={copyPaymentReference}
                      className="h-8 px-3"
                    >
                      {copiedReference ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("includeReferenceNote")}
                  </p>
                </div>

                {/* Bank Account Details */}
                {primaryAdminBank && (
                  <div className="space-y-3">
                    <Label className="font-semibold text-sm text-muted-foreground">
                      {t("transferToBankAccount")}
                    </Label>
                    <div className="p-4 bg-muted/20 border border-border rounded-lg space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {t("bankLabel")}
                        </span>
                        <span className="font-medium">
                          {primaryAdminBank.bank_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {t("accountNumberLabel")}
                        </span>
                        <span className="font-mono">
                          {primaryAdminBank.account_number}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {t("accountHolderLabel")}
                        </span>
                        <span className="font-medium">
                          {primaryAdminBank.account_holder}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Amount to Transfer */}
                <div className="space-y-3">
                  <Label className="font-semibold text-sm text-muted-foreground">
                    {t("amountToTransfer")}
                  </Label>
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-800">
                        {formatNumber(totalAmount)} {t("won")}
                      </div>
                      <div className="text-sm text-yellow-700 mt-1">
                        {t("forKorCoinsVatIncluded", {
                          amount: formatNumber(baseKor),
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Important Notes */}
                <div className="space-y-3">
                  <Label className="font-semibold text-sm text-muted-foreground">
                    {t("importantNotes")}
                  </Label>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-start gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                      <span>{t("importantNoteExactAmount")}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                      <span>{t("importantNoteIncludeReference")}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                      <span>{t("importantNoteCreditedAfterConfirmation")}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="sticky bottom-0 bg-background z-10 p-4 border-t">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleNewDeposit}
                  className="flex-1 h-10"
                >
                  {t("newDeposit")}
                </Button>
                <Button onClick={resetAll} className="flex-1 h-10 bg-primary">
                  {t("close")}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen} modal={false}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-lg">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-2">
                  {loading ? (
                    <Skeleton className="w-6 h-6 rounded-full" />
                  ) : (
                    <div className="relative">
                      {(userKorCoins ?? 0) <= LOW_BALANCE_THRESHOLD ? (
                        <Icons.lowCoins className="w-6 h-6" />
                      ) : (
                        <Icons.coins className="w-6 h-6 text-yellow-400 drop-shadow-[0_0_2px_rgba(255,215,0,0.5)]" />
                      )}
                      {(userKorCoins ?? 0) <= LOW_BALANCE_THRESHOLD && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      )}
                    </div>
                  )}
                  <span className="whitespace-nowrap sr-only">
                    {t("korCoinsRecharge")}
                  </span>
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {!user?.identity_verified ? (
                  <div className="text-sm">
                    <p className="font-medium mb-1 text-amber-600">
                      🔒 {t("identityVerificationRequired")}
                    </p>
                    <p className="text-muted-foreground">
                      {t("identityVerificationRequiredTooltip")}
                    </p>
                  </div>
                ) : loading ? (
                  t("loading")
                ) : (
                  `${t("korCoins")}: ${formatNumber(userKorCoins ?? 0)}`
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-w-md p-0 h-[75vh] overflow-y-auto scrollbar-hide"
        onCloseAutoFocus={() => {
          // Reset stale processing state when the base dialog is closed
          setSubmitting(false);
        }}
      >
        {/* Show verification screen if user is not verified */}
        {!user?.identity_verified ? (
          <div className="flex flex-col h-full">
            <DialogHeader className="flex gap-0 p-4 border-b">
              <DialogTitle className="text-lg font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                {t("identityVerificationRequired")}
              </DialogTitle>
              <DialogDescription>
                {t("identityVerificationRequiredDesc")}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center space-y-6 max-w-md">
                <div className="w-16 h-16 mx-auto bg-amber-100 dark:bg-amber-950/20 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {t("identityVerificationRequired")}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {t("identityVerificationRequiredLong")}
                  </p>
                  <IdentityVerificationButton
                    isFormValid={true}
                    mobileNumber={user?.mobile_number || ""}
                    text={t("verifyIdentity")}
                    onVerificationSuccess={handleVerificationSuccess}
                    onVerificationFailure={handleVerificationFailure}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Fixed Header */}
            <DialogHeader className="flex gap-0 sticky top-0 bg-background z-10 p-4 border-b">
              <DialogTitle className="text-lg font-bold flex items-center gap-1.5">
                {/* Icon and balance inside dialog */}
                {loading ? (
                  <Skeleton className="w-5 h-5 rounded-full" />
                ) : (
                  <div className="relative">
                    {(userKorCoins ?? 0) <= LOW_BALANCE_THRESHOLD ? (
                      <Icons.lowCoins className="w-5 h-5 mr-1" />
                    ) : (
                      <Icons.coins className="w-5 h-5 mr-1 text-yellow-400 drop-shadow-[0_0_2px_rgba(255,215,0,0.5)]" />
                    )}
                    {(userKorCoins ?? 0) <= LOW_BALANCE_THRESHOLD && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    )}
                  </div>
                )}
                {t("korCoinsRecharge")}
              </DialogTitle>
              {/* <DialogDescription>{t("rechargeDescription")}</DialogDescription> */}
            </DialogHeader>

            {/* Scrollable Content */}
            <div className="overflow-y-auto px-6 py-4 flex-1">
              <div className="space-y-4">
                {/* KOR Coins Amount Input */}
                <div className="space-y-1">
                  <Label
                    htmlFor="kor-coins-amount"
                    className="font-semibold text-sm text-muted-foreground"
                  >
                    {t("amountOfKorCoins")}
                  </Label>
                  <Input
                    id="kor-coins-amount"
                    type="number"
                    placeholder={t("enterAmount")}
                    value={korCoinsAmount}
                    onChange={(e) => setKorCoinsAmount(e.target.value)}
                    className={cn(
                      "w-full no-spinner h-10 border border-border bg-muted/60 focus:bg-background shadow-sm focus:shadow-md transition-all text-base"
                    )}
                  />
                </div>

                {/* Quick Amount Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  {[...Array(9)].map((_, i) => {
                    const value = (i + 1) * 10000;
                    const isSelected = Number(korCoinsAmount) === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setKorCoinsAmount(String(value))}
                        className={cn(
                          "py-2 text-sm h-10 font-medium border transition-colors rounded-md cursor-pointer",
                          isSelected
                            ? "bg-yellow-400/90 border-yellow-500 text-black shadow-sm"
                            : "bg-background border-border text-foreground hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
                        )}
                        style={{ minWidth: 0 }}
                      >
                        {formatNumber(value)}
                      </button>
                    );
                  })}
                </div>

                {/* Summary Section */}
                <div>
                  <div className="rounded-xl bg-muted/60 border border-border p-3 flex flex-col gap-1.5 shadow-sm">
                    {/* Amount of KOR coins user requests */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-medium">
                        {t("amountOfKorCoins")}
                      </span>
                      <span className="flex items-center text-right min-w-[100px]">
                        <span
                          className="text-lg font-bold text-primary tabular-nums"
                          suppressHydrationWarning
                        >
                          {baseKor > 0 ? formatNumber(baseKor) : "-"}
                        </span>
                        <span className="text-xs font-medium text-muted-foreground ml-1">
                          KOR
                        </span>
                      </span>
                    </div>

                    {/* Total to pay (VAT included) */}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30">
                      <span className="text-sm font-semibold text-foreground">
                        {t("totalToPay")}{" "}
                        <span className="text-xs text-muted-foreground">
                          ({t("vatIncluded")})
                        </span>
                      </span>
                      <span className="flex items-center text-right min-w-[100px]">
                        <span
                          className="text-lg font-bold text-primary tabular-nums"
                          suppressHydrationWarning
                        >
                          {baseKor > 0 ? formatNumber(totalAmount) : "-"}
                        </span>
                        <span className="text-xs font-medium text-muted-foreground ml-1">
                          won
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bank Account Selection */}
                <div className="space-y-3">
                  <Label className="font-semibold text-sm">
                    {t("bankAccountForDeposit")}
                  </Label>

                  {/* Dropdown for existing bank accounts */}
                  <Popover
                    open={bankAccountComboboxOpen}
                    onOpenChange={setBankAccountComboboxOpen}
                    modal={false}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={bankAccountComboboxOpen}
                        className="w-full h-10 justify-between"
                      >
                        {selectedBankAccount === "new"
                          ? t("addNewBankAccount")
                          : selectedBankAccount
                          ? bankAccounts?.find(
                              (acc) => acc.id === selectedBankAccount
                            )?.bank_name +
                            " - " +
                            bankAccounts?.find(
                              (acc) => acc.id === selectedBankAccount
                            )?.account_number
                          : t("selectOrAddBankAccount")}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      sideOffset={4}
                      collisionPadding={8}
                      className="w-[465px] p-0 max-h-[40vh] overflow-auto scrollbar-hide"
                    >
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder={t("searchBankAccountsPlaceholder")}
                          className="h-9"
                          value={bankSearchValue}
                          onValueChange={setBankSearchValue}
                        />
                        <CommandList className="max-h-[40vh] overflow-auto">
                          <CommandEmpty>{t("noBankAccountFound")}</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="new"
                              onSelect={() => {
                                handleBankAccountSelect("new");
                                setBankAccountComboboxOpen(false);
                                setBankSearchValue("");
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedBankAccount === "new"
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {t("addNewBankAccount")}
                            </CommandItem>
                            {bankAccounts
                              ?.filter((account) => {
                                if (!bankSearchValue) return true;

                                const searchLower =
                                  bankSearchValue.toLowerCase();
                                const bankName = (
                                  account.bank_name || ""
                                ).toLowerCase();
                                const accountNumber = (
                                  account.account_number || ""
                                ).toLowerCase();

                                return (
                                  bankName.includes(searchLower) ||
                                  accountNumber.includes(searchLower)
                                );
                              })
                              // Remove duplicates based on bank_name and account_number combination
                              .filter((account, index, self) => {
                                const accountKey = `${account.bank_name}-${account.account_number}`;
                                return (
                                  index ===
                                  self.findIndex(
                                    (acc) =>
                                      `${acc.bank_name}-${acc.account_number}` ===
                                      accountKey
                                  )
                                );
                              })
                              .map((account) => (
                                <CommandItem
                                  key={account.id}
                                  value={`${
                                    account.bank_name || "Unknown Bank"
                                  } ${
                                    account.account_number ||
                                    "No Account Number"
                                  }`}
                                  onSelect={() => {
                                    handleBankAccountSelect(account.id);
                                    setBankAccountComboboxOpen(false);
                                    setBankSearchValue("");
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedBankAccount === account.id
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  {account.bank_name || "Unknown Bank"} -{" "}
                                  {account.account_number ||
                                    "No Account Number"}
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  {/* Show additional inputs only when "Add New" is selected */}
                  {selectedBankAccount === "new" && (
                    <>
                      {/* Bank Name Input */}
                      <div className="space-y-1">
                        <Label htmlFor="bank-name" className="text-sm">
                          {t("bankName")}{" "}
                          <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="bank-name"
                          type="text"
                          placeholder={t("enterBankName")}
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          required
                          className={cn("w-full h-10")}
                        />
                      </div>

                      {/* Bank Account Number Input */}
                      <div className="space-y-1">
                        <Label
                          htmlFor="bank-account-number"
                          className="text-sm"
                        >
                          {t("bankAccountNumber")}{" "}
                          <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="bank-account-number"
                          type="text"
                          placeholder={t("enterBankAccountNumber")}
                          value={bankAccountNumber}
                          onChange={(e) => setBankAccountNumber(e.target.value)}
                          required
                          className={cn("w-full h-10")}
                        />
                      </div>

                      {/* Depositor's Name and Mobile Number */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                        <div className="space-y-1">
                          <Label
                            htmlFor="depositor-name"
                            className="font-semibold text-sm"
                          >
                            {t("depositorsName")}{" "}
                            <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="depositor-name"
                            type="text"
                            placeholder={t("enterDepositorsName")}
                            value={depositorName}
                            onChange={(e) => setDepositorName(e.target.value)}
                            required
                            className={cn("w-full h-10")}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label
                            htmlFor="mobile-number"
                            className="font-semibold text-sm"
                          >
                            {t("mobileNumber")}{" "}
                            <span className="text-muted-foreground">
                              ({t("optional")})
                            </span>
                          </Label>
                          <Input
                            id="mobile-number"
                            type="tel"
                            placeholder={t("enterMobileNumber")}
                            value={mobileNumber}
                            onChange={(e) => setMobileNumber(e.target.value)}
                            className={cn("w-full h-10")}
                          />
                        </div>
                      </div>

                      {/* Caution Section - show only when adding new account */}
                      <div className="mt-2">
                        <p className="text-xs text-red-500 font-medium text-center">
                          {t("noRefundsAfterDeposit")}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="sticky bottom-0 bg-background z-10 p-4 border-t">
              <Button
                type="submit"
                onClick={handleUnifiedSubmit}
                disabled={submitting || createDepositMutation.isPending}
                className={cn(
                  "w-full h-10 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold rounded-lg py-2.5 text-base transition-colors shadow-sm"
                )}
              >
                {submitting || createDepositMutation.isPending
                  ? t("processing")
                  : t("submitDepositRequest")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
