import { WithdrawManagementPageClient } from "./page-client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Withdraw Management | Weetoo",
  description: "Withdraw Management | Weetoo",
};

export default function WithdrawManagementPage() {
  return <WithdrawManagementPageClient />;
}
