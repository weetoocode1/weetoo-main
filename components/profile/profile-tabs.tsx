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
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AllAccounts } from "./all-accounts";
import { Profile } from "./profile";
import { Referral } from "./referral";
import { Transactions } from "./transactions";
import { UidRegistration } from "./uid-registration";
import { KORCoinsWithdrawal } from "./kor-coins-withdrawal";
import { PaybackWithdrawal } from "./payback-withdrawal";

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
    key: "kor-coins-withdrawal",
    label: "KOR Coins Withdrawal",
    icon: <CreditCardIcon className="w-4 h-4" />,
    requiresVerification: true,
  },
  {
    key: "uid-registration",
    label: "UID Registration",
    icon: <KeyRoundIcon className="w-4 h-4" />,
    requiresVerification: true,
  },
  {
    key: "payback-withdrawal",
    label: "Payback Withdrawal",
    icon: <CreditCardIcon className="w-4 h-4" />,
    requiresVerification: true,
  },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const TAB_COMPONENTS = {
  profile: <Profile />,
  referral: <Referral />,
  "all-accounts": <AllAccounts />,
  "all-transactions": <Transactions />,
  "kor-coins-withdrawal": <KORCoinsWithdrawal />,
  "uid-registration": <UidRegistration />,
  "payback-withdrawal": <PaybackWithdrawal />,
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

  // Listen for popstate events (back/forward navigation) - simplified
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const tab = urlParams.get("tab") as TabKey | null;
      if (tab) {
        setSelectedTab(tab);
      }
    };

    // Only add listener once, not on every selectedTab change
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []); // Remove selectedTab dependency to prevent constant re-registration

  const handleTabClick = useCallback(
    (tab: TabKey) => {
      const tabConfig = TABS.find((t) => t.key === tab);

      // Only check verification if user is loaded and tab requires verification
      if (tabConfig?.requiresVerification && user && !user.identity_verified) {
        // Still allow the tab to be selected to show verification screen
        setSelectedTab(tab);
        const params = new URLSearchParams(Array.from(searchParams.entries()));
        params.set("tab", tab);
        router.replace(`?${params.toString()}`, { scroll: false });
        return;
      }

      setSelectedTab(tab);
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      params.set("tab", tab);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [user, searchParams, router]
  );

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
        {/* Mobile: Horizontal scrollable tabs, Desktop: Vertical tabs */}
        <div className="w-full lg:w-[250px] p-2 lg:p-4 border-b lg:border-r lg:border-b-0 flex flex-row lg:flex-col text-sm gap-1 lg:gap-2 bg-background flex-shrink-0 overflow-x-auto lg:overflow-x-visible min-h-[60px] lg:min-h-0 sticky top-14 z-30 lg:static">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`text-left h-10 px-3 lg:px-4 transition font-medium flex gap-2 items-center cursor-pointer whitespace-nowrap flex-shrink-0 bg-background
                ${
                  selectedTab === tab.key
                    ? "border font-semibold bg-accent"
                    : "hover:bg-accent text-muted-foreground"
                }
              `}
              onClick={() => handleTabClick(tab.key as TabKey)}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden text-xs">
                {tab.key === "all-accounts"
                  ? "Accounts"
                  : tab.key === "all-transactions"
                  ? "Transactions"
                  : tab.key === "kor-coins-withdrawal"
                  ? "KOR Coins"
                  : tab.key === "uid-registration"
                  ? "UID"
                  : tab.key === "payback-withdrawal"
                  ? "Payback"
                  : tab.label.split(" ")[0]}
              </span>
            </button>
          ))}
        </div>
        {/* Right Content (static placeholder during SSR to avoid mismatch) */}
        <div className="flex-1 flex flex-col min-h-0 h-[calc(100vh-160px)] lg:h-[calc(100vh-100px)] overflow-y-auto scrollbar-none">
          <div className="p-4 text-sm text-muted-foreground">Loading...</div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Mobile: Horizontal scrollable tabs, Desktop: Vertical tabs */}
      <div className="w-full lg:w-[250px] p-2 lg:p-4 border-b lg:border-r lg:border-b-0 flex flex-row lg:flex-col text-sm gap-1 lg:gap-2 bg-background flex-shrink-0 overflow-x-auto lg:overflow-x-visible min-h-[60px] lg:min-h-0 sticky top-14 z-30 lg:static">
        {TABS.map((tab) => {
          const isDisabled =
            tab.requiresVerification && user && !user.identity_verified;
          return (
            <TooltipProvider key={tab.key}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className={`text-left h-10 px-3 lg:px-4 transition font-medium flex gap-2 items-center cursor-pointer whitespace-nowrap flex-shrink-0 bg-background
                      ${
                        selectedTab === tab.key
                          ? "border font-semibold bg-accent"
                          : isDisabled
                          ? "opacity-70 hover:bg-accent/50 text-muted-foreground"
                          : "hover:bg-accent text-muted-foreground"
                      }
                    `}
                    onClick={() => handleTabClick(tab.key as TabKey)}
                  >
                    {tab.icon}
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden text-xs">
                      {tab.key === "all-accounts"
                        ? "Accounts"
                        : tab.key === "all-transactions"
                        ? "Transactions"
                        : tab.key === "kor-coins-withdrawal"
                        ? "KOR Coins"
                        : tab.key === "uid-registration"
                        ? "UID"
                        : tab.key === "payback-withdrawal"
                        ? "Payback"
                        : tab.label.split(" ")[0]}
                    </span>
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
      <div className="flex-1 flex flex-col min-h-0 h-[calc(100vh-160px)] lg:h-[calc(100vh-100px)] overflow-y-auto scrollbar-none">
        {isCurrentTabRestricted ? (
          <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
            <div className="text-center space-y-4 sm:space-y-6 max-w-md w-full">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto bg-amber-100 dark:bg-amber-950/20 rounded-full flex items-center justify-center cursor-help">
                      <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-amber-600 dark:text-amber-400" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Verification required to access this tab</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div className="px-4 sm:px-0">
                <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
                  Identity Verification Required
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
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
