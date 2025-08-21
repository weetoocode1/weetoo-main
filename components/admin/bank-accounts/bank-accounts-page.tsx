"use client";

import { BankAccountsTable } from "./bank-accounts-table";
import { AddBankAccountDialog } from "./add-bank-account-dialog";
import { useState } from "react";

export function BankAccountsPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Bank Accounts Table */}
      <BankAccountsTable onAddAccount={() => setIsAddDialogOpen(true)} />

      {/* Add Bank Account Dialog */}
      <AddBankAccountDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
      />
    </div>
  );
}
