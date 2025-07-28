"use client";
import { KeyIcon, ShieldUserIcon, TicketIcon, UserIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Profile } from "./profile";
import { Referral } from "./referral";
import { UuidRegistration } from "./uuid-registration";
import { UuidAdmin } from "./uuid-admin";

const TABS = [
  { key: "profile", label: "Profile", icon: <UserIcon className="w-4 h-4" /> },
  {
    key: "referral",
    label: "Referral",
    icon: <TicketIcon className="w-4 h-4" />,
  },
  {
    key: "uuid",
    label: "UUID Registration",
    icon: <KeyIcon className="w-4 h-4" />,
  },
  {
    key: "uuid-admin",
    label: "UUID Admin",
    icon: <ShieldUserIcon className="w-4 h-4" />,
  },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const TAB_COMPONENTS = {
  profile: <Profile />,
  referral: <Referral />,
  uuid: <UuidRegistration />,
  "uuid-admin": <UuidAdmin />,
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
      <div className="flex-1 flex flex-col">
        {selectedTab in TAB_COMPONENTS
          ? TAB_COMPONENTS[selectedTab as keyof typeof TAB_COMPONENTS]
          : null}
      </div>
    </>
  );
}
