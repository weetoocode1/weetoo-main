"use client";
import {
  BanknoteIcon,
  CreditCardIcon,
  HistoryIcon,
  TicketIcon,
  UserIcon,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Deposit } from "./deposite";
import { Profile } from "./profile";
import { Referral } from "./referral";
import { Withdraw } from "./withdraw";
import { AllAccounts } from "./all-accounts";
import { Transactions } from "./transactions";

const TABS = [
  { key: "profile", label: "Profile", icon: <UserIcon className="w-4 h-4" /> },
  {
    key: "referral",
    label: "Referral",
    icon: <TicketIcon className="w-4 h-4" />,
  },
  {
    key: "all-accounts",
    label: "All Accounts",
    icon: <BanknoteIcon className="w-4 h-4" />,
  },
  {
    key: "all-transactions",
    label: "All Transactions",
    icon: <HistoryIcon className="w-4 h-4" />,
  },
  {
    key: "withdraw",
    label: "Withdrawal",
    icon: <CreditCardIcon className="w-4 h-4" />,
  },
  {
    key: "deposit",
    label: "Deposit",
    icon: <CreditCardIcon className="w-4 h-4" />,
  },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const TAB_COMPONENTS = {
  profile: <Profile />,
  referral: <Referral />,
  "all-accounts": <AllAccounts />,
  "all-transactions": <Transactions />,
  withdraw: <Withdraw />,
  deposit: <Deposit />,
};

export function ProfileTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as TabKey | null;
  const [selectedTab, setSelectedTab] = useState<TabKey>(tabParam || "profile");

  useEffect(() => {
    if (tabParam && tabParam !== selectedTab) {
      setSelectedTab(tabParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabParam]);

  const handleTabClick = (tab: TabKey) => {
    setSelectedTab(tab);
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.set("tab", tab);
    router.replace(`?${params.toString()}`);
  };

  return (
    <>
      {/* Redesigned Left Tabs */}
      <div className="w-[250px] p-4 border-r flex flex-col text-sm gap-2 bg-background flex-shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`text-left h-10 px-4 transition font-medium flex gap-2 items-center cursor-pointer
              ${
                selectedTab === tab.key
                  ? "border font-semibold"
                  : "hover:bg-accent text-muted-foreground"
              }
            `}
            onClick={() => handleTabClick(tab.key as TabKey)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
      {/* Right Content */}
      <div className="flex-1 flex flex-col min-h-0 h-[calc(100vh-100px)] overflow-y-auto scrollbar-none">
        {selectedTab in TAB_COMPONENTS
          ? TAB_COMPONENTS[selectedTab as keyof typeof TAB_COMPONENTS]
          : null}
      </div>
    </>
  );
}
