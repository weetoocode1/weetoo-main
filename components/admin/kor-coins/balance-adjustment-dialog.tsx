"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Coins, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface UserKorCoins {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  kor_coins: number;
  created_at: string;
  avatar_url?: string;
}

interface BalanceAdjustment {
  userId: string;
  userName: string;
  action: "add" | "subtract";
  amount: number;
  reason: string;
  timestamp: Date;
}

interface BalanceAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserKorCoins | null;
  action: "add" | "subtract";
  onSuccess: () => void;
}

export function BalanceAdjustmentDialog({
  open,
  onOpenChange,
  user,
  action,
  onSuccess,
}: BalanceAdjustmentDialogProps) {
  const t = useTranslations("admin.korCoins.balanceAdjustmentDialog");
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Format number with commas (Indian numbering system)
  const formatNumberWithCommas = (value: string) => {
    // Remove all non-digit characters
    const numbers = value.replace(/\D/g, "");
    // Indian numbering system: first 3 digits, then groups of 2
    if (numbers.length <= 3) {
      return numbers;
    }
    const lastThree = numbers.slice(-3);
    const remaining = numbers.slice(0, -3);
    const formattedRemaining = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    return formattedRemaining + "," + lastThree;
  };

  // Parse formatted number back to integer
  const parseFormattedNumber = (value: string) => {
    return parseInt(value.replace(/,/g, "")) || 0;
  };

  // Format number for display (Indian numbering system)
  const formatNumberForDisplay = (num: number) => {
    const str = num.toString();
    if (str.length <= 3) {
      return str;
    }
    const lastThree = str.slice(-3);
    const remaining = str.slice(0, -3);
    const formattedRemaining = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    return formattedRemaining + "," + lastThree;
  };

  const handleBalanceAdjustment = async () => {
    if (!user || !amount) {
      toast.error(t("validation.amountRequired"));
      return;
    }

    const amountValue = parseFormattedNumber(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      toast.error(t("validation.amountInvalid"));
      return;
    }

    // Check if subtraction would result in negative balance
    if (action === "subtract" && user.kor_coins < amountValue) {
      toast.error(
        t("validation.insufficientBalance", {
          balance: user.kor_coins.toLocaleString(),
        })
      );
      return;
    }

    setIsAdjusting(true);

    try {
      const supabase = createClient();

      // Calculate new balance
      const newBalance =
        action === "add"
          ? user.kor_coins + amountValue
          : Math.max(0, user.kor_coins - amountValue); // Ensure minimum is 0

      // Update user's KOR coins
      const { error } = await supabase
        .from("users")
        .update({ kor_coins: newBalance })
        .eq("id", user.id);

      if (error) {
        throw error;
      }

      // Store adjustment in localStorage for audit trail
      const adjustment: BalanceAdjustment = {
        userId: user.id,
        userName: `${user.first_name} ${user.last_name}`,
        action,
        amount: amountValue,
        reason: reason || "No reason provided",
        timestamp: new Date(),
      };

      const existingAdjustments = JSON.parse(
        localStorage.getItem("korCoinsAdjustments") || "[]"
      );
      existingAdjustments.push(adjustment);
      localStorage.setItem(
        "korCoinsAdjustments",
        JSON.stringify(existingAdjustments)
      );

      // Invalidate and refetch data
      await queryClient.invalidateQueries({
        queryKey: ["admin", "kor-coins-users"],
      });

      // Invalidate chart data to refresh the graph
      await queryClient.invalidateQueries({
        queryKey: ["admin", "chart-data"],
      });

      // Invalidate stats to refresh the overview
      await queryClient.invalidateQueries({
        queryKey: ["admin", "kor-coins-stats"],
      });

      toast.success(
        t(action === "add" ? "success.added" : "success.subtracted", {
          amount: amountValue.toLocaleString(),
          name: `${user.first_name} ${user.last_name}`,
        })
      );

      // Reset form and close dialog
      setAmount("");
      setReason("");
      onSuccess();
    } catch (error) {
      console.error("Failed to adjust balance:", error);
      toast.error(t("error.failed"));
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleClose = () => {
    setAmount("");
    setReason("");
    onOpenChange(false);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-lg border-2 border-border shadow-none rounded-none">
        <DialogHeader className="border-b border-border pb-4">
          <DialogTitle className="flex items-center gap-3 text-xl font-bold">
            <div
              className={`p-2 ${
                action === "add"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {action === "add" ? (
                <TrendingUp className="h-5 w-5" />
              ) : (
                <TrendingDown className="h-5 w-5" />
              )}
            </div>
            <div>
              <div className="text-lg">{t(`title.${action}`)}</div>
              <div className="text-sm font-normal text-muted-foreground">
                {user.first_name} {user.last_name}
              </div>
            </div>
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {t(`description.${action}`, {
              name: `${user.first_name} ${user.last_name}`,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Balance Display */}
          <div className="p-4 bg-gradient-to-r from-muted/50 to-muted/30 border border-border">
            <div className="text-sm text-muted-foreground mb-2">
              {t("currentBalance")}
            </div>
            <div className="text-2xl font-bold flex items-center gap-3">
              <div className="p-2 bg-yellow-100 text-yellow-700">
                <Coins className="h-6 w-6" />
              </div>
              <span className="font-mono">
                {formatNumberForDisplay(user.kor_coins)} KOR Coins
              </span>
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-3">
            <Label htmlFor="amount" className="text-sm font-medium">
              {t("amountLabel", {
                action: action === "add" ? "Add" : "Subtract",
              })}
            </Label>
            <div className="relative">
              <Coins className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="amount"
                type="text"
                placeholder={t("amountPlaceholder", {
                  action: action === "add" ? "add" : "subtract",
                })}
                value={amount}
                onChange={(e) =>
                  setAmount(formatNumberWithCommas(e.target.value))
                }
                className="pl-10 h-12 text-lg font-mono rounded-none"
              />
            </div>
          </div>

          {/* Reason Input */}
          <div className="space-y-3">
            <Label htmlFor="reason" className="text-sm font-medium">
              {t("reasonLabel")}{" "}
              <span className="text-muted-foreground">
                {t("reasonOptional")}
              </span>
            </Label>
            <Textarea
              id="reason"
              placeholder={t("reasonPlaceholder")}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[80px] resize-none rounded-none"
              rows={3}
            />
          </div>

          {/* Warning */}
          <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <div className="font-medium text-yellow-800 mb-1">
                {t("warning.title")}
              </div>
              <div className="text-yellow-700">{t("warning.message")}</div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border pt-4">
          <Button
            variant="outline"
            onClick={handleClose}
            className="h-10 px-6 shadow-none rounded-none"
          >
            {t("actions.cancel")}
          </Button>
          <Button
            onClick={handleBalanceAdjustment}
            disabled={isAdjusting || !amount}
            className={`h-10 px-6 shadow-none rounded-none ${
              action === "add"
                ? "bg-green-600 hover:bg-green-700 focus:bg-green-700 text-white"
                : "bg-red-600 hover:bg-red-700 focus:bg-red-700 text-white"
            }`}
          >
            {isAdjusting ? (
              <div className="flex items-center gap-2">
                {t("actions.processing")}
              </div>
            ) : (
              t(`actions.${action === "add" ? "addCoins" : "subtractCoins"}`)
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
