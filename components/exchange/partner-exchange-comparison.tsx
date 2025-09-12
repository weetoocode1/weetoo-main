"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { updateExchanges, useExchangeStore } from "@/hooks/use-exchange-store";
import {
  ArrowUpDown,
  Award,
  BadgeCheck,
  ChevronDown,
  Crown,
  Edit3,
  Star,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Fragment, useMemo, useState } from "react";
import { toast } from "sonner";
import { ExchangeEditDialog } from "./exchange-edit-dialog";
import { type Exchange } from "./exchanges-data";
import { UidRegistrationDialog } from "../uid/uid-registration-dialog";

// Calculate score based on objective metrics
const calculateScore = (exchange: Exchange): number => {
  let score = 0;

  // Payback rate contribution (max 40 points)
  score += Math.min(exchange.paybackRate * 0.4, 40);

  // Trading discount contribution (max 20 points)
  if (exchange.tradingDiscount !== "-") {
    score += 20;
  }

  // Fee structure contribution (max 20 points)
  const limitFee = parseFloat(exchange.limitOrderFee.replace("%", ""));
  const marketFee = parseFloat(exchange.marketOrderFee.replace("%", ""));
  score += Math.max(0, 20 - (limitFee + marketFee) * 2);

  // Event bonus (max 20 points)
  if (exchange.event && exchange.event !== "-") {
    score += 20;
  }

  return Math.round(score);
};

export const PartnerExchangeComparison = () => {
  const t = useTranslations("exchange");
  const [activeFilter, setActiveFilter] = useState("all");
  const { isSuperAdmin } = useAuth();
  const [selectedExchange, setSelectedExchange] = useState<Exchange | null>(
    null
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const { exchanges, loading } = useExchangeStore();
  const SIGNUP_LINKS: Record<string, string> = {
    deepcoin: "https://s.deepcoin.com/jdcibde",
    orangex: "https://affiliates.orangex.com/affiliates/b/t4atgsg2",
  };
  const descriptionOverrides: Record<string, string> = {
    bybit:
      "Bybit is a leading crypto derivatives exchange known for deep liquidity and fast execution. It offers advanced tools, competitive fees, and robust risk controls for active traders.",
    okx: "OKX is a world-class exchange supporting spot, futures, and options. It focuses on reliability, rich tooling, and an ecosystem of yield and DeFi products.",
    bitget:
      "Bitget is a global exchange offering futures and copy trading. It emphasizes social features, campaign rewards, and a straightforward experience for newcomers.",
    bingx:
      "BingX is an innovative exchange with social and copy-trading capabilities. It blends community insights with approachable tools and steady campaigns.",
    deepcoin:
      "DeepCoin is a global digital asset exchange focused on professional trading. It provides steady liquidity, core derivatives, and essential risk management tools.",
    orangex:
      "OrangeX is a cryptocurrency exchange highlighting modern UX and innovative features. It targets ease of use with steady promotions and accessible markets.",
    blofin:
      "Blofin is a derivatives-focused exchange offering a professional toolkit. It caters to active traders with analytics, margin products, and solid execution.",
    lbank:
      "LBank is a global exchange with comprehensive spot and derivatives markets. It supports a wide range of assets and aims for consistent availability.",
    gateio:
      "Gate.io is known for a broad range of altcoins and steady market depth. It provides diversified products and a stable core trading experience.",
    xt: "XT is a global digital asset platform with broad asset coverage. It offers familiar trading flows and regular campaigns for engaged users.",
    tapbit:
      "Tapbit is a user-friendly exchange providing core spot and derivatives markets. It focuses on accessibility, clear UI, and frequent promotional events.",
    mexc: "MEXC is a global exchange offering spot and futures with broad token listings. It emphasizes liquidity, responsive execution, and competitive campaigns.",
  };
  const [expandedExchangeId, setExpandedExchangeId] = useState<
    string | number | null
  >(null);
  const [uidDialogOpen, setUidDialogOpen] = useState(false);
  const [uidDialogBrokerId, setUidDialogBrokerId] = useState<
    string | undefined
  >(undefined);

  const toggleRowExpand = (id: string | number) => {
    setExpandedExchangeId((prev) => (prev === id ? null : id));
  };

  const handleEdit = (exchange: Exchange) => {
    setSelectedExchange(exchange);
    setDialogOpen(true);
  };

  const handleSave = async (updatedExchange: Exchange) => {
    try {
      console.log("Saving exchange:", updatedExchange);

      // Call the API to save the exchange data
      const response = await fetch("/api/exchanges", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ exchange: updatedExchange }),
      });

      console.log("API response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API error:", errorData);
        throw new Error(
          `Failed to save exchange: ${errorData.error || response.statusText}`
        );
      }

      const result = await response.json();
      console.log("API success:", result);

      // Update the exchanges array with the new data
      const updatedExchanges = exchanges.map((exchange) =>
        exchange.id === updatedExchange.id ? updatedExchange : exchange
      );
      updateExchanges(updatedExchanges);

      toast.success(`Updated ${updatedExchange.name} successfully`);
    } catch (error) {
      console.error("Error saving exchange:", error);
      toast.error("Failed to save exchange. Please try again.");
    }
  };

  const filteredAndSortedExchanges = useMemo(() => {
    let filtered = [...exchanges];

    switch (activeFilter) {
      case "recommended":
        filtered = filtered.filter(
          (exchange) =>
            exchange.tags.includes("TOP") ||
            exchange.tags.includes("LEADER") ||
            exchange.tags.includes("PREMIUM")
        );
        break;
      case "highest-cashback":
        filtered.sort((a, b) => b.paybackRate - a.paybackRate);
        break;
      case "highest-rebate":
        filtered.sort((a, b) => {
          const rebateA = parseFloat(
            a.averageRebatePerUser.replace(/[$,]/g, "")
          );
          const rebateB = parseFloat(
            b.averageRebatePerUser.replace(/[$,]/g, "")
          );
          return rebateB - rebateA;
        });
        break;
      case "highest-discount":
        filtered.sort((a, b) => {
          const discountA = parseFloat(a.tradingDiscount.replace("%", ""));
          const discountB = parseFloat(b.tradingDiscount.replace("%", ""));
          return discountB - discountA;
        });
        break;
      case "lowest-cashback":
        filtered.sort((a, b) => a.paybackRate - b.paybackRate);
        break;
      case "no-discount":
        filtered = filtered.filter(
          (exchange) => exchange.tradingDiscount === "0%"
        );
        break;
      case "best-score":
        filtered.sort((a, b) => calculateScore(b) - calculateScore(a));
        break;
      case "trending":
        filtered = filtered.filter(
          (exchange) =>
            exchange.tags.includes("TRENDING") || exchange.tags.includes("FAST")
        );
        break;
      default:
        // "all" - no filtering, keep original order
        break;
    }

    // Always sort by score for filters that don't have their own sorting
    if (
      ![
        "highest-cashback",
        "highest-rebate",
        "highest-discount",
        "lowest-cashback",
        "best-score",
      ].includes(activeFilter)
    ) {
      filtered.sort((a, b) => calculateScore(b) - calculateScore(a));
    }

    return filtered;
  }, [activeFilter, exchanges]);

  const filterOptions = [
    { id: "all", label: t("allExchanges"), icon: ArrowUpDown },
    { id: "recommended", label: t("recommended"), icon: Star },
    { id: "highest-cashback", label: t("highestCashback"), icon: TrendingUp },
    { id: "highest-rebate", label: t("highestRebate"), icon: Award },
    { id: "highest-discount", label: t("highestDiscount"), icon: Target },
    { id: "lowest-cashback", label: t("lowestCashback"), icon: TrendingUp },
    { id: "no-discount", label: t("noDiscount"), icon: Target },
    { id: "best-score", label: t("bestScore"), icon: Zap },
    { id: "trending", label: t("trending"), icon: TrendingUp },
  ];

  if (loading) {
    return (
      <div className="w-full max-w-[1600px] mx-auto mb-20">
        {/* Filter Toolbox Skeleton */}
        <div className="p-4 border-b border-border/30">
          <div className="flex flex-wrap gap-2">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-9 w-24 bg-muted animate-pulse rounded-md"
              />
            ))}
          </div>
        </div>

        {/* Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="bg-background border border-border/35 rounded-lg p-6 animate-pulse"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-muted rounded-lg" />
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded mb-2" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-6 bg-muted rounded" />
                <div className="h-4 bg-muted rounded" />
                <div className="h-4 bg-muted rounded" />
                <div className="h-4 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto mb-20">
      {/* Filter Toolbox */}
      <div className="p-4 border-b border-border/30">
        <div className="flex flex-wrap gap-2">
          {filterOptions.map((option) => {
            const Icon = option.icon;
            const isActive = activeFilter === option.id;

            return (
              <button
                key={option.id}
                onClick={() => setActiveFilter(option.id)}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-all duration-200 border ${
                  isActive
                    ? "bg-primary/10 text-primary border-primary/40"
                    : "bg-transparent text-muted-foreground border-border/30 hover:bg-muted/20 hover:text-foreground hover:border-border/50"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table Layout - Hidden on smaller screens, visible on xl and above */}
      <div className="hidden xl:block">
        <div className="overflow-x-auto rounded-none border border-border/50 bg-card shadow-lg">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 bg-gradient-to-r from-muted/40 to-muted/20">
                <th className="text-left p-5 font-semibold text-foreground text-sm uppercase tracking-wide">
                  #
                </th>
                <th className="text-left p-5 font-semibold text-foreground text-sm uppercase tracking-wide">
                  {t("exchange")}
                </th>
                <th className="text-left p-5 font-semibold text-foreground text-sm uppercase tracking-wide">
                  {t("score")}
                </th>
                <th className="text-left p-5 font-semibold text-foreground text-sm uppercase tracking-wide min-w-[140px]">
                  {t("cashbackRate")}
                </th>
                <th className="text-left p-5 font-semibold text-foreground text-sm uppercase tracking-wide">
                  {t("tradingDiscount")}
                </th>
                <th className="text-left p-5 font-semibold text-foreground text-sm uppercase tracking-wide">
                  {t("limitPrice")}
                </th>
                <th className="text-left p-5 font-semibold text-foreground text-sm uppercase tracking-wide">
                  {t("marketPrice")}
                </th>
                <th className="text-left p-5 font-semibold text-foreground text-sm uppercase tracking-wide">
                  {t("avgRebatePerUser")}
                </th>
                <th className="text-left p-5 font-semibold text-foreground text-sm uppercase tracking-wide">
                  {t("tags")}
                </th>
                {isSuperAdmin && (
                  <th className="text-left p-5 font-semibold text-foreground text-sm uppercase tracking-wide">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filteredAndSortedExchanges.map((exchange, index) => {
                const score = calculateScore(exchange);
                const isTopThree = index < 3;

                return (
                  <Fragment key={exchange.id}>
                    <tr
                      onClick={() => toggleRowExpand(exchange.id)}
                      className="group cursor-pointer hover:bg-muted/10 transition-all duration-300 hover:shadow-sm"
                      aria-expanded={expandedExchangeId === exchange.id}
                    >
                      <td className="p-5">
                        <div className="relative flex items-center justify-center">
                          <span className="text-3xl font-bold text-foreground">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <ChevronDown
                            className={`absolute -bottom-3 left-1/2 -translate-x-1/2 w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                              expandedExchangeId === exchange.id
                                ? "rotate-180 opacity-90"
                                : "opacity-60 group-hover:opacity-90"
                            }`}
                          />
                          {isTopThree && (
                            <Crown
                              className={`absolute -top-1 -right-1 w-4 h-4 drop-shadow-sm z-10 ${
                                index === 0
                                  ? "text-yellow-500"
                                  : index === 1
                                  ? "text-gray-400"
                                  : "text-amber-600"
                              }`}
                            />
                          )}
                        </div>
                      </td>
                      <td className="p-5">
                        <div className="flex items-center gap-4">
                          {exchange.logoImage ? (
                            <div className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden bg-muted/20 shadow-sm ring-1 ring-border/20">
                              <Image
                                src={exchange.logoImage}
                                alt={`${exchange.name} logo`}
                                width={56}
                                height={56}
                                className="object-contain rounded-full"
                                draggable={false}
                              />
                            </div>
                          ) : (
                            <div
                              className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center text-white font-medium text-sm shadow-sm ring-1 ring-border/20"
                              style={{ backgroundColor: exchange.logoColor }}
                            >
                              {exchange.logo}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-foreground text-lg">
                              {exchange.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {exchange.website}
                            </div>
                          </div>
                          <div className="flex-1" />
                        </div>
                      </td>
                      <td className="p-5">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-foreground bg-muted/30 px-4 py-2 rounded-none">
                            {score}
                          </div>
                          <div className="text-xs text-muted-foreground mt-2">
                            {t("points")}
                          </div>
                        </div>
                      </td>
                      <td className="p-5 min-w-[140px]">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-2.5 h-2.5 bg-green-500 rounded-full shadow-sm"></div>
                          <span className="font-medium text-sm text-foreground">
                            {exchange.paybackRate}%
                          </span>
                        </div>
                        <div className="w-full bg-muted/50 rounded-full h-2 shadow-inner">
                          <div
                            className="bg-gradient-to-r from-green-400 to-green-500 h-2 rounded-full transition-all duration-500 ease-out shadow-sm"
                            style={{ width: `${exchange.paybackRate}%` }}
                          ></div>
                        </div>
                      </td>
                      <td className="p-5">
                        <span className="font-medium text-foreground bg-muted/20 px-3 py-1.5 rounded-none">
                          {exchange.tradingDiscount}
                        </span>
                      </td>
                      <td className="p-5">
                        <span className="font-medium text-foreground bg-muted/20 px-3 py-1.5 rounded-none">
                          {exchange.limitOrderFee}
                        </span>
                      </td>
                      <td className="p-5">
                        <span className="font-medium text-foreground bg-muted/20 px-3 py-1.5 rounded-none">
                          {exchange.marketOrderFee}
                        </span>
                      </td>
                      <td className="p-5">
                        <div className="flex items-center">
                          <span className="font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20 px-3 py-1.5 rounded-none flex items-center gap-1.5">
                            <div className="w-4 h-4 text-green-500">
                              <svg fill="currentColor" viewBox="0 0 20 20">
                                <path
                                  fillRule="evenodd"
                                  d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                            {exchange.averageRebatePerUser}
                          </span>
                        </div>
                      </td>
                      <td className="p-5">
                        <div className="flex flex-wrap gap-2">
                          {exchange.tags.map((tag, tagIndex) => {
                            const tagConfig = {
                              TOP: "px-3 py-1.5 text-xs font-medium text-amber-700 bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200 dark:text-amber-300 dark:bg-gradient-to-r dark:from-amber-950/30 dark:to-amber-900/20 dark:border-amber-800/30 rounded-none shadow-sm",
                              HIGH: "px-3 py-1.5 text-xs font-medium text-red-700 bg-gradient-to-r from-red-50 to-red-100 border border-red-200 dark:text-red-300 dark:bg-gradient-to-r dark:from-red-950/30 dark:to-red-900/20 dark:border-red-800/30 rounded-none shadow-sm",
                              PREMIUM:
                                "px-3 py-1.5 text-xs font-medium text-blue-700 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 dark:text-blue-300 dark:bg-gradient-to-r dark:from-blue-950/30 dark:to-blue-900/20 dark:border-blue-800/30 rounded-none shadow-sm",
                              LEADER:
                                "px-3 py-1.5 text-xs font-medium text-purple-700 bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 dark:text-purple-300 dark:bg-gradient-to-r dark:from-purple-950/30 dark:to-purple-900/20 dark:border-purple-800/30 rounded-none shadow-sm",
                              TRENDING:
                                "px-3 py-1.5 text-xs font-medium text-green-700 bg-gradient-to-r from-green-50 to-green-100 border border-green-200 dark:text-green-300 dark:bg-gradient-to-r dark:from-green-950/30 dark:to-green-900/20 dark:border-green-800/30 rounded-none shadow-sm",
                              FAST: "px-3 py-1.5 text-xs font-medium text-cyan-700 bg-gradient-to-r from-cyan-50 to-cyan-100 border border-cyan-200 dark:text-cyan-300 dark:bg-gradient-to-r dark:from-cyan-950/30 dark:to-cyan-900/20 dark:border-cyan-800/30 rounded-none shadow-sm",
                              BASIC:
                                "px-3 py-1.5 text-xs font-medium text-muted-foreground bg-gradient-to-r dark:from-muted/60 dark:to-muted/40 border border-border/50 rounded-none shadow-sm",
                            };

                            const tagStyle =
                              tagConfig[tag as keyof typeof tagConfig] ||
                              tagConfig.BASIC;

                            return (
                              <span
                                key={tagIndex}
                                className={`${tagStyle} hover:scale-105 transition-transform duration-200`}
                              >
                                {tag}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      {isSuperAdmin && (
                        <td className="p-5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(exchange);
                            }}
                            className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground hover:bg-gradient-to-r hover:from-primary/20 hover:to-primary/10 transition-all duration-200 rounded-none"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        </td>
                      )}
                    </tr>
                    {expandedExchangeId === exchange.id && (
                      <tr className="bg-muted/10">
                        <td colSpan={isSuperAdmin ? 10 : 9} className="p-5">
                          <div className="flex flex-col gap-4 rounded-lg border border-border/40 bg-gradient-to-r from-muted/40 to-muted/20 p-4">
                            {(descriptionOverrides[exchange.id] ||
                              exchange.description) && (
                              <div className="text-sm text-foreground/90">
                                {descriptionOverrides[exchange.id] ||
                                  exchange.description}
                              </div>
                            )}
                            {/* Highlights removed as requested */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="rounded border border-border/40 p-4 bg-background">
                                <div className="text-xs text-muted-foreground mb-1">
                                  {t("cashbackRate")}
                                </div>
                                <div className="text-sm font-semibold">
                                  {exchange.paybackRate}%
                                </div>
                              </div>
                              <div className="rounded border border-border/40 p-4 bg-background">
                                <div className="text-xs text-muted-foreground mb-1">
                                  {t("tradingDiscount")}
                                </div>
                                <div className="text-sm font-semibold">
                                  {exchange.tradingDiscount}
                                </div>
                              </div>
                              <div className="rounded border border-border/40 p-4 bg-background">
                                <div className="text-xs text-muted-foreground mb-1">
                                  {t("avgRebatePerUser")}
                                </div>
                                <div className="text-sm font-semibold">
                                  {exchange.averageRebatePerUser}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {exchange.tags.map((tag, tagIndex) => (
                                <span
                                  key={tagIndex}
                                  className="px-2 py-1 text-xs rounded bg-muted/40 text-muted-foreground border border-border/40"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                            <div className="flex items-center gap-2">
                              {["deepcoin", "orangex"].includes(exchange.id) ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="rounded-none hover:shadow-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setUidDialogBrokerId(exchange.id);
                                      setUidDialogOpen(true);
                                    }}
                                  >
                                    Register UID
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="rounded-none hover:shadow-sm"
                                    {...(SIGNUP_LINKS[exchange.id]
                                      ? { asChild: true }
                                      : {})}
                                  >
                                    {SIGNUP_LINKS[exchange.id] ? (
                                      <a
                                        href={SIGNUP_LINKS[exchange.id]}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        Sign Up
                                      </a>
                                    ) : (
                                      <>Sign Up</>
                                    )}
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    className="rounded-none hover:shadow-sm"
                                  >
                                    UID Registration Coming Soon
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="rounded-none hover:shadow-sm"
                                  >
                                    Sign Up Coming Soon
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grid Layout - Visible on smaller screens, hidden on xl and above */}
      <div className="xl:hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
          {filteredAndSortedExchanges.map((exchange, index) => {
            const score = calculateScore(exchange);

            return (
              <div
                key={exchange.id}
                className="group relative bg-card border border-border rounded-lg p-7 hover:border-border/60 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center gap-3 mb-4">
                  {exchange.logoImage ? (
                    <div className="w-16 h-16 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
                      <Image
                        src={exchange.logoImage}
                        alt={`${exchange.name} logo`}
                        width={60}
                        height={60}
                        className="object-contain rounded-full"
                        draggable={false}
                      />
                    </div>
                  ) : (
                    <div
                      className="w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center text-white font-medium text-sm border border-border"
                      style={{ backgroundColor: exchange.logoColor }}
                    >
                      {exchange.logo}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-card-foreground text-base truncate">
                      {exchange.name}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">
                      {exchange.website}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <BadgeCheck className="w-3 h-3 text-blue-500" />
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                        Verified Partner
                      </span>
                    </div>
                  </div>
                  <div className="text-5xl font-semibold text-muted-foreground">
                    #{index + 1}
                  </div>
                </div>

                {/* Business Card Content */}
                <div className="space-y-3">
                  {/* Score */}
                  <div className="text-center p-3 bg-muted/30 rounded-lg border border-border/50">
                    <div className="text-xl font-bold text-card-foreground">
                      {score}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t("points")}
                    </div>
                  </div>

                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-2 bg-muted/20 rounded border border-border/30">
                      <div className="text-xs text-muted-foreground mb-1">
                        {t("cashbackRate")}
                      </div>
                      <div className="text-sm font-semibold text-card-foreground">
                        {exchange.paybackRate}%
                      </div>
                    </div>
                    <div className="text-center p-2 bg-muted/20 rounded border border-border/30">
                      <div className="text-xs text-muted-foreground mb-1">
                        {t("tradingDiscount")}
                      </div>
                      <div className="text-sm font-semibold text-card-foreground">
                        {exchange.tradingDiscount}
                      </div>
                    </div>
                  </div>

                  {/* Contact Info Style */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {t("limitPrice")}
                      </span>
                      <span className="font-medium text-card-foreground">
                        {exchange.limitOrderFee}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {t("marketPrice")}
                      </span>
                      <span className="font-medium text-card-foreground">
                        {exchange.marketOrderFee}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {t("avgRebatePerUser")}
                      </span>
                      <span className="font-medium text-card-foreground">
                        {exchange.averageRebatePerUser}
                      </span>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 pt-3 border-t border-border">
                    {exchange.tags.map((tag, tagIndex) => {
                      const tagConfig = {
                        TOP: "px-2 py-0.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 dark:text-amber-300 dark:bg-amber-950/20 dark:border-amber-800/30 rounded",
                        HIGH: "px-2 py-0.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 dark:text-red-300 dark:bg-red-950/20 dark:border-red-800/30 rounded",
                        PREMIUM:
                          "px-2 py-0.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 dark:text-blue-300 dark:bg-blue-950/20 dark:border-blue-800/30 rounded",
                        LEADER:
                          "px-2 py-0.5 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 dark:text-purple-300 dark:bg-purple-950/20 dark:border-purple-800/30 rounded",
                        TRENDING:
                          "px-2 py-0.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 dark:text-green-300 dark:bg-green-950/20 dark:border-green-800/30 rounded",
                        FAST: "px-2 py-0.5 text-xs font-medium text-cyan-700 bg-cyan-50 border border-cyan-200 dark:text-cyan-300 dark:bg-cyan-950/20 dark:border-cyan-800/30 rounded",
                        BASIC:
                          "px-2 py-0.5 text-xs font-medium text-muted-foreground bg-muted border border-border rounded",
                      };

                      const tagStyle =
                        tagConfig[tag as keyof typeof tagConfig] ||
                        tagConfig.BASIC;

                      return (
                        <span key={tagIndex} className={tagStyle}>
                          {tag}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Edit Button for Admin */}
                {isSuperAdmin && (
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(exchange)}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {["deepcoin", "orangex"].includes(exchange.id) ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full rounded-none hover:shadow-sm"
                        onClick={() => {
                          setUidDialogBrokerId(exchange.id);
                          setUidDialogOpen(true);
                        }}
                      >
                        Register UID
                      </Button>
                      <Button
                        size="sm"
                        className="w-full rounded-none hover:shadow-sm"
                        {...(SIGNUP_LINKS[exchange.id]
                          ? { asChild: true }
                          : {})}
                      >
                        {SIGNUP_LINKS[exchange.id] ? (
                          <a
                            href={SIGNUP_LINKS[exchange.id]}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Sign Up
                          </a>
                        ) : (
                          <>Sign Up</>
                        )}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        className="w-full rounded-none hover:shadow-sm"
                      >
                        UID Registration Coming Soon
                      </Button>
                      <Button
                        size="sm"
                        className="w-full rounded-none hover:shadow-sm"
                      >
                        Sign Up Coming Soon
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Exchange Edit Dialog */}
      <ExchangeEditDialog
        exchange={selectedExchange}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
      />
      <UidRegistrationDialog
        title="Register UID"
        trigger={<span />}
        onUIDAdded={() => setUidDialogOpen(false)}
        isOpen={uidDialogOpen}
        onOpenChange={setUidDialogOpen}
        defaultBrokerId={uidDialogBrokerId}
      />
    </div>
  );
};
