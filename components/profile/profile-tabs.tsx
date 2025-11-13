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
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Profile } from "./profile";

// Lazy load Referral component as well since it has heavy features
const Referral = dynamic(
  () => import("./referral").then((mod) => ({ default: mod.Referral })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading referral...</p>
        </div>
      </div>
    ),
  }
);

// Lazy load heavy components to reduce initial bundle size
const AllAccounts = dynamic(
  () => import("./all-accounts").then((mod) => ({ default: mod.AllAccounts })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading accounts...</p>
        </div>
      </div>
    ),
  }
);

const Transactions = dynamic(
  () => import("./transactions").then((mod) => ({ default: mod.Transactions })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">
            Loading transactions...
          </p>
        </div>
      </div>
    ),
  }
);

const KORCoinsWithdrawal = dynamic(
  () =>
    import("./kor-coins-withdrawal").then((mod) => ({
      default: mod.KORCoinsWithdrawal,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading withdrawal...</p>
        </div>
      </div>
    ),
  }
);

const UidRegistration = dynamic(
  () =>
    import("./uid-registration").then((mod) => ({
      default: mod.UidRegistration,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">
            Loading UID registration...
          </p>
        </div>
      </div>
    ),
  }
);

// const PaybackWithdrawal = dynamic(
//   () =>
//     import("./payback-withdrawal").then((mod) => ({
//       default: mod.PaybackWithdrawal,
//     })),
//   {
//     ssr: false,
//     loading: () => (
//       <div className="flex items-center justify-center h-64">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
//           <p className="text-sm text-muted-foreground">
//             Loading payback withdrawal...
//           </p>
//         </div>
//       </div>
//     ),
//   }
// );

const WithdrawalStatus = dynamic(
  () =>
    import("./withdrawal-status").then((mod) => ({
      default: mod.WithdrawalStatus,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">
            Loading withdrawal status...
          </p>
        </div>
      </div>
    ),
  }
);

const TABS = [
  {
    key: "profile",
    translationKey: "profile",
    icon: <UserIcon className="w-4 h-4" />,
    requiresVerification: false,
  },
  {
    key: "referral",
    translationKey: "referral",
    icon: <TicketIcon className="w-4 h-4" />,
    requiresVerification: false,
  },
  {
    key: "all-accounts",
    translationKey: "allAccounts",
    icon: <BanknoteIcon className="w-4 h-4" />,
    requiresVerification: true,
  },
  {
    key: "all-transactions",
    translationKey: "allTransactions",
    icon: <HistoryIcon className="w-4 h-4" />,
    requiresVerification: true,
  },
  {
    key: "kor-coins-withdrawal",
    translationKey: "korCoinsWithdrawal",
    icon: <CreditCardIcon className="w-4 h-4" />,
    requiresVerification: true,
  },
  {
    key: "uid-registration",
    translationKey: "uidRegistration",
    icon: <KeyRoundIcon className="w-4 h-4" />,
    requiresVerification: true,
  },
  // {
  //   key: "payback-withdrawal",
  //   translationKey: "paybackWithdrawal",
  //   icon: <CreditCardIcon className="w-4 h-4" />,
  //   requiresVerification: true,
  // },
  {
    key: "withdrawal-status",
    translationKey: "withdrawalStatus",
    icon: <HistoryIcon className="w-4 h-4" />,
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
  // "payback-withdrawal": <PaybackWithdrawal />,
  "withdrawal-status": <WithdrawalStatus />,
};

export function ProfileTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as TabKey | null;
  const [selectedTab, setSelectedTab] = useState<TabKey>(tabParam || "profile");
  const { user } = useAuth();
  const t = useTranslations("profile");
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
        <div className="w-full lg:w-[250px] p-2 lg:p-4 border-b lg:border-r lg:border-b-0 flex flex-row lg:flex-col text-sm gap-1 lg:gap-2 bg-background shrink-0 overflow-x-auto lg:overflow-x-visible min-h-[60px] lg:min-h-0 sticky top-14 z-30 lg:static">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`text-left h-10 px-3 lg:px-4 transition font-medium flex gap-2 items-center cursor-pointer whitespace-nowrap shrink-0 bg-background
                ${
                  selectedTab === tab.key
                    ? "border font-semibold bg-accent"
                    : "hover:bg-accent text-muted-foreground"
                }
              `}
              onClick={() => handleTabClick(tab.key as TabKey)}
            >
              {tab.icon}
              <span className="hidden sm:inline">
                {t(`tabs.${tab.translationKey}`)}
              </span>
              <span className="sm:hidden text-xs">
                {tab.key === "all-accounts"
                  ? t("mobileLabels.accounts")
                  : tab.key === "all-transactions"
                  ? t("mobileLabels.transactions")
                  : tab.key === "kor-coins-withdrawal"
                  ? t("mobileLabels.korCoins")
                  : tab.key === "uid-registration"
                  ? t("mobileLabels.payback")
                  : tab.key === "withdrawal-status"
                  ? t("mobileLabels.withdrawalStatus") || "Status"
                  : t(`tabs.${tab.translationKey}`).split(" ")[0]}
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
      <div className="w-full lg:w-[250px] p-2 lg:p-4 border-b lg:border-r lg:border-b-0 flex flex-row lg:flex-col text-sm gap-1 lg:gap-2 bg-background shrink-0 overflow-x-auto lg:overflow-x-visible min-h-[60px] lg:min-h-0 sticky top-14 z-30 lg:static">
        {TABS.map((tab) => {
          const isDisabled =
            tab.requiresVerification && user && !user.identity_verified;
          return (
            <TooltipProvider key={tab.key}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className={`text-left h-10 px-3 lg:px-4 transition font-medium flex gap-2 items-center cursor-pointer whitespace-nowrap shrink-0 bg-background
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
                    <span className="hidden sm:inline">
                      {t(`tabs.${tab.translationKey}`)}
                    </span>
                    <span className="sm:hidden text-xs">
                      {tab.key === "all-accounts"
                        ? t("mobileLabels.accounts")
                        : tab.key === "all-transactions"
                        ? t("mobileLabels.transactions")
                        : tab.key === "kor-coins-withdrawal"
                        ? t("mobileLabels.korCoins")
                        : tab.key === "uid-registration"
                        ? t("mobileLabels.payback")
                        : tab.key === "withdrawal-status"
                        ? t("mobileLabels.withdrawalStatus") || "Status"
                        : t(`tabs.${tab.translationKey}`).split(" ")[0]}
                    </span>
                    {isDisabled && (
                      <AlertTriangle className="w-3 h-3 ml-auto text-amber-500" />
                    )}
                  </button>
                </TooltipTrigger>
                {isDisabled && (
                  <TooltipContent>
                    <p>{t("verification.tooltip")}</p>
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
                    <p>{t("verification.tooltip")}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div className="px-4 sm:px-0">
                <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
                  {t("verification.title")}
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
                  {t("verification.description")}
                </p>
                <IdentityVerificationButton
                  isFormValid={true}
                  mobileNumber={user?.mobile_number || ""}
                  text={t("verification.verifyButton")}
                  onVerificationSuccess={(verificationData, userData) => {
                    toast.success(t("verification.successMessage"));
                    // Refresh the page to update verification status
                    window.location.reload();
                  }}
                  onVerificationFailure={() => {
                    toast.error(t("verification.errorMessage"));
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
