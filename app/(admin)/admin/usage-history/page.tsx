import { UsageHistoryPage } from "@/components/admin/usage-history/usage-history-page";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Usage History | Weetoo",
  description:
    "Weetoo Admin Dashboard - Manage your account, settings, and notifications",
};

export default function UsageHistory() {
  return (
    <div className="container mx-auto space-y-5">
      <div className="flex items-center justify-between pb-6 border-b border-border mt-5">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold">Usage History</h1>
          <p className="text-muted-foreground">
            Track how users spend their KOR_Coins across the platform
          </p>
        </div>
      </div>
      <UsageHistoryPage />
    </div>
  );
}
