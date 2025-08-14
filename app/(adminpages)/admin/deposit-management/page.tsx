import { DepositManagementPageClient } from "./page-client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Deposit Management | Weetoo",
  description: "Deposit Management | Weetoo",
};

export default function DepositManagementPage() {
  return <DepositManagementPageClient />;
}
