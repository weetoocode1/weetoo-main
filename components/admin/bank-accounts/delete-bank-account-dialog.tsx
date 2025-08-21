"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { createClient } from "@/lib/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

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

interface DeleteBankAccountDialogProps {
  bankAccount: BankAccount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

export function DeleteBankAccountDialog({
  bankAccount,
  open,
  onOpenChange,
  onDeleted,
}: DeleteBankAccountDialogProps) {
  const queryClient = useQueryClient();

  const deleteBankAccountMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("admin_bank_accounts")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "bank-accounts"] });
      toast.success("Bank account deleted successfully");
      onDeleted();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete bank account");
    },
  });

  const handleDelete = async () => {
    if (!bankAccount) return;
    await deleteBankAccountMutation.mutateAsync(bankAccount.id);
  };

  if (!bankAccount) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="w-full max-w-md rounded-none">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-500" />
            Delete Bank Account
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this bank account? This action
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="p-4 bg-muted/20 border border-border rounded-none">
          <div className="space-y-2">
            <div className="font-medium text-sm">
              <span className="text-muted-foreground">Bank Name:</span>{" "}
              {bankAccount.bank_name}
            </div>
            <div className="font-mono text-sm">
              <span className="text-muted-foreground">Account Number:</span>{" "}
              {bankAccount.account_number}
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Account Holder:</span>{" "}
              {bankAccount.account_holder}
            </div>
            <div className="text-xs text-muted-foreground">
              Created: {new Date(bankAccount.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-none">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteBankAccountMutation.isPending}
            className="bg-red-600 hover:bg-red-700 text-white rounded-none"
          >
            {deleteBankAccountMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Account
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
