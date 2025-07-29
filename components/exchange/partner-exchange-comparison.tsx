"use client";

import {
  Crown,
  User,
  TrendingUp,
  Star,
  Zap,
  Award,
  Target,
  ArrowUpDown,
} from "lucide-react";
import { EXCHANGES, type Exchange } from "./exchanges-data";
import { useState, useMemo } from "react";

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
  const [activeFilter, setActiveFilter] = useState("all");

  const filteredAndSortedExchanges = useMemo(() => {
    let filtered = [...EXCHANGES];

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

    return filtered;
  }, [activeFilter]);

  const filterOptions = [
    { id: "all", label: "All Exchanges", icon: ArrowUpDown },
    { id: "recommended", label: "Recommended", icon: Star },
    { id: "highest-cashback", label: "Highest Cashback", icon: TrendingUp },
    { id: "highest-rebate", label: "Highest Rebate", icon: Award },
    { id: "highest-discount", label: "Highest Discount", icon: Target },
    { id: "lowest-cashback", label: "Lowest Cashback", icon: TrendingUp },
    { id: "no-discount", label: "No Discount", icon: Target },
    { id: "best-score", label: "Best Score", icon: Zap },
    { id: "trending", label: "Trending", icon: TrendingUp },
  ];

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

      <div className="bg-background border border-border/35">
        {/* Table Header */}
        <div className="grid grid-cols-9 gap-4 p-4 border-b border-border/50">
          <div className="font-medium text-sm text-muted-foreground text-center">
            #
          </div>
          <div className="font-medium text-sm text-muted-foreground">
            Exchange
          </div>
          <div className="font-medium text-sm text-muted-foreground text-center">
            Score
          </div>
          <div className="font-medium text-sm text-muted-foreground text-center">
            Cashback Rate
          </div>
          <div className="font-medium text-sm text-muted-foreground text-center">
            Trading Discount
          </div>
          <div className="font-medium text-sm text-muted-foreground text-center">
            Limit Price
          </div>
          <div className="font-medium text-sm text-muted-foreground text-center">
            Market Price
          </div>
          <div className="font-medium text-sm text-muted-foreground text-center">
            Avg Rebate per User
          </div>
          <div className="font-medium text-sm text-muted-foreground text-center">
            Tags
          </div>
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-border/35">
          {filteredAndSortedExchanges.map((exchange, index) => {
            const score = calculateScore(exchange);
            return (
              <div
                key={exchange.id}
                className="grid grid-cols-9 gap-4 p-4 hover:bg-muted/10 transition-colors duration-200"
              >
                {/* Row Number */}
                <div className="flex items-center justify-center">
                  <div className="relative">
                    <span className="text-3xl font-mono font-bold text-muted-foreground">
                      {(index + 1).toString().padStart(2, "0")}
                    </span>
                    {index < 3 && (
                      <Crown
                        className={`absolute -top-2 -right-2 w-4 h-4 ${
                          index === 0
                            ? "text-yellow-500"
                            : index === 1
                            ? "text-gray-400"
                            : "text-amber-600"
                        }`}
                      />
                    )}
                  </div>
                </div>
                {/* Exchange Name */}
                <div className="flex items-center gap-3">
                  {exchange.logoImage ? (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm overflow-hidden">
                      <img
                        src={exchange.logoImage}
                        alt={`${exchange.name} logo`}
                        className="w-10 h-10 object-contain"
                        draggable={false}
                      />
                    </div>
                  ) : (
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm"
                      style={{ backgroundColor: exchange.logoColor }}
                    >
                      {exchange.logo}
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-foreground">
                      {exchange.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {exchange.website}
                    </div>
                  </div>
                </div>

                {/* Score */}
                <div className="flex items-center justify-center">
                  <div className="flex flex-col items-center">
                    <div className="text-2xl font-bold text-foreground">
                      {score}
                    </div>
                    <div className="text-xs text-muted-foreground">points</div>
                  </div>
                </div>

                {/* Cashback Rate */}
                <div className="flex items-center justify-center">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-sm font-semibold text-foreground">
                        {exchange.paybackRate}%
                      </span>
                    </div>
                    <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(exchange.paybackRate, 100)}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Trading Discount */}
                <div className="flex items-center justify-center">
                  <div className="flex items-center gap-1">
                    <span className="text-lg font-semibold text-foreground">
                      {exchange.tradingDiscount}
                    </span>
                    <span className="text-sm text-muted-foreground">off</span>
                  </div>
                </div>

                {/* Limit Price */}
                <div className="flex items-center justify-center">
                  <span className="text-sm font-medium text-foreground">
                    {exchange.limitOrderFee}
                  </span>
                </div>

                {/* Market Price */}
                <div className="flex items-center justify-center">
                  <span className="text-sm font-medium text-foreground">
                    {exchange.marketOrderFee}
                  </span>
                </div>

                {/* Average Rebate per User */}
                <div className="flex items-center justify-center">
                  <div className="flex items-center gap-3">
                    <User className="w-6 h-6 text-green-600 dark:text-green-400" />
                    <div className="flex flex-col items-start">
                      <div className="text-lg font-bold text-green-600 dark:text-green-400">
                        {exchange.averageRebatePerUser}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        per user
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex items-center justify-center gap-1.5">
                  {exchange.tags.map((tag, tagIndex) => {
                    const tagConfig = {
                      TOP: "px-3 py-1 text-xs font-semibold text-white bg-gradient-to-r from-yellow-500 to-amber-500 shadow-sm",
                      HIGH: "px-3 py-1 text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-red-500 shadow-sm",
                      PREMIUM:
                        "px-3 py-1 text-xs font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-500 shadow-sm",
                      LEADER:
                        "px-3 py-1 text-xs font-semibold text-white bg-gradient-to-r from-purple-500 to-pink-500 shadow-sm",
                      TRENDING:
                        "px-3 py-1 text-xs font-semibold text-white bg-gradient-to-r from-green-500 to-teal-500 shadow-sm",
                      FAST: "px-3 py-1 text-xs font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-500 shadow-sm",
                      BASIC:
                        "px-3 py-1 text-xs font-semibold text-gray-700 bg-gray-100 border border-gray-200 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-700",
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
            );
          })}
        </div>
      </div>
    </div>
  );
};
