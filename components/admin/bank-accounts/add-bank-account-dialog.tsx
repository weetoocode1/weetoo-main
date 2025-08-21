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
import { Building2, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface AddBankAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddBankAccountDialog({
  open,
  onOpenChange,
}: AddBankAccountDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    bank_name: "",
    account_number: "",
    account_holder: "",
  });

  const addBankAccountMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const supabase = createClient();

      // Check if this is the first account (make it primary)
      const { data: existingAccounts } = await supabase
        .from("admin_bank_accounts")
        .select("id")
        .limit(1);

      const isFirstAccount = !existingAccounts || existingAccounts.length === 0;

      const { data: bankAccount, error } = await supabase
        .from("admin_bank_accounts")
        .insert({
          ...data,
          is_primary: isFirstAccount,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return bankAccount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "bank-accounts"] });
      toast.success("Bank account added successfully");
      resetForm();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add bank account");
    },
  });

  const resetForm = () => {
    setFormData({
      bank_name: "",
      account_number: "",
      account_holder: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.bank_name.trim() ||
      !formData.account_number.trim() ||
      !formData.account_holder.trim()
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    await addBankAccountMutation.mutateAsync(formData);
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md rounded-none">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Add Bank Account
          </DialogTitle>
          <DialogDescription>
            Add a new bank account for receiving deposits. The first account
            will automatically be set as primary.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bank_name" className="text-sm font-medium">
              Bank Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="bank_name"
              type="text"
              placeholder="e.g., Shinhan Bank, KB Bank"
              value={formData.bank_name}
              onChange={(e) => handleInputChange("bank_name", e.target.value)}
              required
              className="h-10 rounded-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account_number" className="text-sm font-medium">
              Account Number <span className="text-red-500">*</span>
            </Label>
            <Input
              id="account_number"
              type="text"
              placeholder="e.g., 123-456789-01-234"
              value={formData.account_number}
              onChange={(e) =>
                handleInputChange("account_number", e.target.value)
              }
              required
              className="h-10 rounded-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account_holder" className="text-sm font-medium">
              Account Holder Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="account_holder"
              type="text"
              placeholder="e.g., Weetoo Company Ltd"
              value={formData.account_holder}
              onChange={(e) =>
                handleInputChange("account_holder", e.target.value)
              }
              required
              className="h-10 rounded-none"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={addBankAccountMutation.isPending}
              className="rounded-none"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={addBankAccountMutation.isPending}
              className="bg-primary hover:bg-primary/90 rounded-none"
            >
              {addBankAccountMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Bank Account"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
