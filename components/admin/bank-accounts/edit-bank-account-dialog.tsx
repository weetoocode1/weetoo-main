"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Loader2, Star } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface EditBankAccountDialogProps {
  bankAccount: BankAccount;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBankAccountUpdated: () => void;
}

export function EditBankAccountDialog({
  bankAccount,
  open,
  onOpenChange,
  onBankAccountUpdated,
}: EditBankAccountDialogProps) {
  const t = useTranslations("admin.bankAccounts.editDialog");
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    bank_name: "",
    account_number: "",
    account_holder: "",
  });

  // Initialize form data when bank account changes
  useEffect(() => {
    if (bankAccount) {
      setFormData({
        bank_name: bankAccount.bank_name || "",
        account_number: bankAccount.account_number || "",
        account_holder: bankAccount.account_holder || "",
      });
    }
  }, [bankAccount]);

  const updateBankAccountMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const supabase = createClient();

      const { data: updatedAccount, error } = await supabase
        .from("admin_bank_accounts")
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", bankAccount.id)
        .select()
        .single();

      if (error) throw error;
      return updatedAccount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "bank-accounts"] });
      toast.success(t("messages.success"));
      onBankAccountUpdated();
    },
    onError: (error: Error) => {
      toast.error(error.message || t("messages.failed"));
    },
  });

  const makePrimaryMutation = useMutation({
    mutationFn: async () => {
      const supabase = createClient();

      // First, remove primary from all accounts
      await supabase
        .from("admin_bank_accounts")
        .update({ is_primary: false })
        .eq("is_primary", true);

      // Then set the selected account as primary
      const { error } = await supabase
        .from("admin_bank_accounts")
        .update({ is_primary: true })
        .eq("id", bankAccount.id);

      if (error) throw error;
      return bankAccount.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "bank-accounts"] });
      toast.success(t("messages.primarySuccess"));
      onBankAccountUpdated();
    },
    onError: (error: Error) => {
      toast.error(error.message || t("messages.primaryFailed"));
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.bank_name.trim() ||
      !formData.account_number.trim() ||
      !formData.account_holder.trim()
    ) {
      toast.error(t("messages.fillRequired"));
      return;
    }

    await updateBankAccountMutation.mutateAsync(formData);
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleMakePrimary = async () => {
    await makePrimaryMutation.mutateAsync();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md rounded-none">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit_bank_name" className="text-sm font-medium">
              {t("form.bankName.label")}{" "}
              <span className="text-red-500">
                {t("form.bankName.required")}
              </span>
            </Label>
            <Input
              id="edit_bank_name"
              type="text"
              placeholder={t("form.bankName.placeholder")}
              value={formData.bank_name}
              onChange={(e) => handleInputChange("bank_name", e.target.value)}
              required
              className="h-10 rounded-none"
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="edit_account_number"
              className="text-sm font-medium"
            >
              {t("form.accountNumber.label")}{" "}
              <span className="text-red-500">
                {t("form.accountNumber.required")}
              </span>
            </Label>
            <Input
              id="edit_account_number"
              type="text"
              placeholder={t("form.accountNumber.placeholder")}
              value={formData.account_number}
              onChange={(e) =>
                handleInputChange("account_number", e.target.value)
              }
              required
              className="h-10 rounded-none"
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="edit_account_holder"
              className="text-sm font-medium"
            >
              {t("form.accountHolder.label")}{" "}
              <span className="text-red-500">
                {t("form.accountHolder.required")}
              </span>
            </Label>
            <Input
              id="edit_account_holder"
              type="text"
              placeholder={t("form.accountHolder.placeholder")}
              value={formData.account_holder}
              onChange={(e) =>
                handleInputChange("account_holder", e.target.value)
              }
              required
              className="h-10 rounded-none"
            />
          </div>

          {/* Show current status */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">
              {t("accountInfo.title")}
            </Label>
            <div className="p-3 bg-muted/20 border border-border rounded-none">
              <div className="text-sm text-muted-foreground">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-foreground">
                    {t("accountInfo.currentStatus")}
                  </span>
                  {bankAccount.is_primary ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium border border-yellow-200">
                      <Star className="h-3 w-3" />
                      {t("accountInfo.primaryAccount")}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium border border-gray-200">
                      {t("accountInfo.secondaryAccount")}
                    </span>
                  )}
                </div>
                <div className="text-xs">
                  {t("accountInfo.created")}{" "}
                  {new Date(bankAccount.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>

          {/* Make Primary Button - only show if not already primary */}
          {!bankAccount.is_primary && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                {t("quickActions.title")}
              </Label>
              <Button
                type="button"
                variant="outline"
                onClick={handleMakePrimary}
                disabled={makePrimaryMutation.isPending}
                className="w-full rounded-none border-yellow-200 text-yellow-700 hover:bg-yellow-50 hover:text-yellow-800"
              >
                {makePrimaryMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("quickActions.settingAsPrimary")}
                  </>
                ) : (
                  <>
                    <Star className="h-4 w-4 mr-2" />
                    {t("quickActions.makePrimary")}
                  </>
                )}
              </Button>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateBankAccountMutation.isPending}
              className="rounded-none"
            >
              {t("actions.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={updateBankAccountMutation.isPending}
              className="bg-primary hover:bg-primary/90 rounded-none"
            >
              {updateBankAccountMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("actions.updating")}
                </>
              ) : (
                t("actions.updateAccount")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
