import { KorCoinsChart } from "@/components/admin/overview/kor-coins-chart";
import { KorCoinsTable } from "@/components/admin/overview/kor-coins-table";
import { NewUserTable } from "@/components/admin/overview/new-user-table";
import { StatCard } from "@/components/section-cards";
import { UserSignupBar } from "@/components/admin/overview/user-signup-bar";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Overview | Weetoo",
  description:
    "Weetoo Admin Dashboard - Manage your account, settings, and notifications",
};

export default function Admin() {
  return (
    <div className="font-sans h-full flex flex-col gap-5 container mx-auto">
      <div className="flex items-center justify-between pb-6 border-b border-border mt-5">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold">Overview</h1>
          <p className="text-muted-foreground">
            Overview of your account, settings, and notifications
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total KOR_Coin"
          value="2,424,431,575"
          trend={{ value: 12.5, isPositive: true }}
          description="Trending up this month"
          subDescription="More users purchasing KOR_Coins"
          color="blue"
        />
        <StatCard
          title="New Customers"
          value="1,234"
          trend={{ value: 20, isPositive: false }}
          description="Down 20% this period"
          subDescription="Acquisition needs attention"
          color="green"
        />
        <StatCard
          title="Active Points"
          value="45,678"
          trend={{ value: 12.5, isPositive: true }}
          description="Engagement exceed targets"
          subDescription="Active points increasing"
          color="purple"
        />
        <StatCard
          title="New Signups Daily"
          value="0"
          trend={{ value: 4.5, isPositive: true }}
          description="Up 4.5% from yesterday"
          subDescription="Acquisition needs attention"
          color="orange"
        />
        {/*  */}
        <StatCard
          title="Using KOR_Coins"
          value="512,670"
          trend={{ value: 4.5, isPositive: true }}
          description="Meets growth projections"
          subDescription="Acquisition needs attention"
          color="violet"
        />
        <StatCard
          title="Total Registered Users"
          value="17"
          trend={{ value: 0, isPositive: true }}
          description="New registrations increasing"
          subDescription="Acquisition needs attention"
          color="rose"
        />
        <StatCard
          title="Daily UID Registration"
          value="845,230"
          trend={{ value: 4.5, isPositive: true }}
          description="Acquisition needs attention"
          subDescription="Acquisition needs attention"
          color="fuchsia"
        />
        <StatCard
          title="Trading Volume"
          value="₩ 325,450"
          trend={{ value: 4.5, isPositive: true }}
          description="Engagement exceed targets"
          subDescription="Acquisition needs attention"
          color="cyan"
        />
      </div>

      <div className="flex flex-col w-full gap-4 md:flex-row md:gap-4">
        <KorCoinsChart />
        <UserSignupBar />
      </div>

      <div className="flex flex-col w-full gap-4 md:flex-row md:gap-4">
        <KorCoinsTable />
        <NewUserTable />
      </div>
    </div>
  );
}
