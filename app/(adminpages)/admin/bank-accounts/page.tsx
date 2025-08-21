import { Metadata } from "next";
import { BankAccountsPageClient } from "./page-client";

export const metadata: Metadata = {
  title: "Bank Accounts | Weetoo",
  description: "Bank Accounts | Weetoo",
};

export default function BankAccountsPage() {
  return <BankAccountsPageClient />;
}
