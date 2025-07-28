import { WithdrawManagementPage } from "@/components/admin/withdraw-management/withdraw-management-page";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Withdraw Management | Weetoo",
  description:
    "Weetoo Admin Dashboard - Manage your account, settings, and notifications",
};

export default function WithdrawManagement() {
  return <WithdrawManagementPage />;
}
