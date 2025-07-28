import { DepositManagementPage } from "@/components/admin/deposite-management/deposite-magement-page";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Deposit Management | Weetoo",
  description:
    "Weetoo Admin Dashboard - Manage your account, settings, and notifications",
};

export default function DepositManagement() {
  return <DepositManagementPage />;
}
