"use client";
import { IdentityVerificationButton } from "@/components/identity-verification-button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import {
  AlertTriangle,
  BanknoteIcon,
  CreditCardIcon,
  HistoryIcon,
  KeyRoundIcon,
  TicketIcon,
  UserIcon,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AllAccounts } from "./all-accounts";
import { Profile } from "./profile";
import { Referral } from "./referral";
import { Transactions } from "./transactions";
import { UidRegistration } from "./uid-registration";
import { Withdraw } from "./withdraw";

const TABS = [
  {
    key: "profile",
    label: "Profile",
    icon: <UserIcon className="w-4 h-4" />,
    requiresVerification: false,
  },
  {
    key: "referral",
    label: "Referral",
    icon: <TicketIcon className="w-4 h-4" />,
    requiresVerification: false,
  },
  {
    key: "all-accounts",
    label: "All Accounts",
    icon: <BanknoteIcon className="w-4 h-4" />,
    requiresVerification: true,
  },
  {
    key: "all-transactions",
    label: "All Transactions",
    icon: <HistoryIcon className="w-4 h-4" />,
    requiresVerification: true,
  },
  {
    key: "withdraw",
    label: "Withdrawal",
    icon: <CreditCardIcon className="w-4 h-4" />,
    requiresVerification: true,
  },
  {
    key: "uid-registration",
    label: "UID Registration",
    icon: <KeyRoundIcon className="w-4 h-4" />,
    requiresVerification: true,
  },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const TAB_COMPONENTS = {
  profile: <Profile />,
  referral: <Referral />,
  "all-accounts": <AllAccounts />,
  "all-transactions": <Transactions />,
  withdraw: <Withdraw />,
  "uid-registration": <UidRegistration />,
};

export function ProfileTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as TabKey | null;
  const [selectedTab, setSelectedTab] = useState<TabKey>(tabParam || "profile");
  const { user } = useAuth();
  const [isClient, setIsClient] = useState(false);

  // Ensure client-side rendering to prevent hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Listen for identity verification completion
  useEffect(() => {
    const handleIdentityVerified = (event: Event) => {
      // Force a re-render to update verification status
      // This will update the user.identity_verified status instantly
      setSelectedTab(selectedTab); // Triggers re-render with updated verification status
    };

    window.addEventListener("identity-verified", handleIdentityVerified);
    return () =>
      window.removeEventListener("identity-verified", handleIdentityVerified);
  }, [selectedTab]);

  useEffect(() => {
    if (tabParam && tabParam !== selectedTab) {
      setSelectedTab(tabParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabParam]);

  const handleTabClick = (tab: TabKey) => {
    const tabConfig = TABS.find((t) => t.key === tab);

    // Only check verification if user is loaded and tab requires verification
    if (tabConfig?.requiresVerification && user && !user.identity_verified) {
      // Still allow the tab to be selected to show verification screen
      setSelectedTab(tab);
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      params.set("tab", tab);
      router.replace(`?${params.toString()}`);
      return;
    }

    setSelectedTab(tab);
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.set("tab", tab);
    router.replace(`?${params.toString()}`);
  };

  // Check if current tab requires verification
  const currentTabRequiresVerification = TABS.find(
    (t) => t.key === selectedTab
  )?.requiresVerification;
  const isCurrentTabRestricted =
    currentTabRequiresVerification && user && !user.identity_verified;

  // Don't render verification-dependent content until client-side
  if (!isClient) {
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

  return (
    <>
      {/* Redesigned Left Tabs */}
      <div className="w-[250px] p-4 border-r flex flex-col text-sm gap-2 bg-background flex-shrink-0">
        {TABS.map((tab) => {
          const isDisabled =
            tab.requiresVerification && user && !user.identity_verified;
          return (
            <TooltipProvider key={tab.key}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className={`text-left h-10 px-4 transition font-medium flex gap-2 items-center cursor-pointer
                      ${
                        selectedTab === tab.key
                          ? "border font-semibold"
                          : isDisabled
                          ? "opacity-70 hover:bg-accent/50 text-muted-foreground"
                          : "hover:bg-accent text-muted-foreground"
                      }
                    `}
                    onClick={() => handleTabClick(tab.key as TabKey)}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                    {isDisabled && (
                      <AlertTriangle className="w-3 h-3 ml-auto text-amber-500" />
                    )}
                  </button>
                </TooltipTrigger>
                {isDisabled && (
                  <TooltipContent>
                    <p>Identity verification required</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
      {/* Right Content */}
      <div className="flex-1 flex flex-col min-h-0 h-[calc(100vh-100px)] overflow-y-auto scrollbar-none">
        {isCurrentTabRestricted ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center space-y-6 max-w-md">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-16 h-16 mx-auto bg-amber-100 dark:bg-amber-950/20 rounded-full flex items-center justify-center cursor-help">
                      <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Verification required to access this tab</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Identity Verification Required
                </h3>
                <p className="text-muted-foreground mb-6">
                  You need to verify your identity to access this feature. This
                  helps ensure security and compliance.
                </p>
                <IdentityVerificationButton
                  isFormValid={true}
                  mobileNumber={user?.mobile_number || ""}
                  text="Verify Identity"
                  onVerificationSuccess={(verificationData, userData) => {
                    toast.success(
                      "Identity verification completed successfully!"
                    );
                    // Refresh the page to update verification status
                    window.location.reload();
                  }}
                  onVerificationFailure={() => {
                    toast.error(
                      "Identity verification failed. Please try again."
                    );
                  }}
                />
              </div>
            </div>
          </div>
        ) : selectedTab in TAB_COMPONENTS ? (
          TAB_COMPONENTS[selectedTab as keyof typeof TAB_COMPONENTS]
        ) : null}
      </div>
    </>
  );
}
