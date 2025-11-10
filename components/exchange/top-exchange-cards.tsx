"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Award, Star, UserPlus } from "lucide-react";
import { motion } from "motion/react";
import { memo, useMemo } from "react";
import { useTranslations } from "next-intl";
import { type CardData, createCardData } from "./card-data";
import { type Exchange } from "./exchanges-data";
import { useExchangeStore } from "@/hooks/use-exchange-store";

const cardVariants = {
  hidden: { opacity: 0, scale: 0.8, y: 100 },
  visible: (custom: number) => ({
    opacity: 1,
    scale: custom === 1 ? 1 : custom === 2 ? 0.9 : 0.85,
    y: custom === 1 ? -20 : custom === 2 ? 38 : 50,
    rotateY: custom === 2 ? 12 : custom === 3 ? -12 : 0,
    z: custom === 1 ? 0 : custom === 2 ? -80 : -120,
    transition: {
      duration: 0.5,
      delay: custom === 1 ? 0.1 : custom === 2 ? 0.4 : 0.7,
      ease: "easeOut" as const,
    },
  }),
};

const TraderCard = memo(
  ({ data, exchange }: { data: CardData; exchange?: Exchange }) => {
    const t = useTranslations("exchange");
    const cardStyles = useMemo(() => {
      const baseStyles = {
        boxShadow: "",
        backgroundImage: "",
        border: "none",
      };
      switch (data.color) {
        case "gold":
          return {
            ...baseStyles,
            boxShadow:
              "0 0 0 2px #f59e0b, 0 0 15px 4px rgba(245, 158, 11, 0.5), inset 0 1px 2px rgba(255, 255, 255, 0.15)",
            backgroundImage:
              "radial-gradient(circle at top left, rgba(252, 211, 77, 0.08), transparent 40%)",
          };
        case "silver":
          return {
            ...baseStyles,
            boxShadow:
              "0 0 0 1.5px #cbd5e1, 0 0 10px 2px rgba(148, 163, 184, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.1)",
            backgroundImage:
              "radial-gradient(circle at top left, rgba(203, 213, 225, 0.05), transparent 40%)",
          };
        case "bronze":
          return {
            ...baseStyles,
            boxShadow:
              "0 0 0 1.5px #f97316, 0 0 10px 2px rgba(217, 119, 6, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.1)",
            backgroundImage:
              "radial-gradient(circle at top left, rgba(253, 186, 116, 0.05), transparent 40%)",
          };
        default:
          return baseStyles;
      }
    }, [data.color]);

    const reflectionStyles = useMemo(() => {
      const baseReflection = {
        transform: "scaleY(-1)",
        borderRadius: "0 0 16px 16px",
        clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
        opacity: 0.45,
        blur: "blur(2px)",
        boxShadow: "none",
        backgroundImage: "none",
        top: "510px",
        width: "20rem",
        height: "150px",
      };

      // Base styles based on color
      let colorStyles = {};
      switch (data.color) {
        case "gold":
          colorStyles = {
            boxShadow:
              "2px 0 0 0 #f59e0b, -2px 0 0 0 #f59e0b, 0 0 15px 4px rgba(245, 158, 11, 0.3)",
            backgroundImage:
              "radial-gradient(circle at top left, rgba(252, 211, 77, 0.05), transparent 30%)",
          };
          break;
        case "silver":
          colorStyles = {
            transform: "scaleY(-1) rotateY(12deg)",
            boxShadow:
              "1.5px 0 0 0 #cbd5e1, -1.5px 0 0 0 #cbd5e1, 0 0 10px 2px rgba(148, 163, 184, 0.2)",
            backgroundImage:
              "radial-gradient(circle at top left, rgba(203, 213, 225, 0.03), transparent 30%)",
          };
          break;
        case "bronze":
          colorStyles = {
            transform: "scaleY(-1) rotateY(-12deg)",
            boxShadow:
              "1.5px 0 0 0 #f97316, -1.5px 0 0 0 #f97316, 0 0 10px 2px rgba(217, 119, 6, 0.2)",
            backgroundImage:
              "radial-gradient(circle at top left, rgba(253, 186, 116, 0.03), transparent 30%)",
          };
          break;
        default:
          colorStyles = {};
      }

      // Size styles based on rank
      let sizeStyles = {};
      switch (data.rank) {
        case 1: // Gold (middle) - largest reflection
          sizeStyles = {
            width: "24rem",
            top: "550px",
          };
          break;
        case 2: // Silver (left) - medium reflection
          sizeStyles = {
            width: "20rem",
          };
          break;
        case 3: // Bronze (right) - smallest reflection
          sizeStyles = {
            width: "20rem",
          };
          break;
        default:
          sizeStyles = {
            width: "20rem",
          };
      }

      return {
        ...baseReflection,
        ...colorStyles,
        ...sizeStyles,
      };
    }, [data.color, data.rank]);

    const cardSize = data.rank === 1 ? "w-96 h-[520px]" : "w-80 h-[490px]";
    const padding = data.rank === 1 ? "p-7" : "p-6";

    return (
      <motion.div
        className="relative group"
        custom={data.rank}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        whileHover="hover"
        style={{
          transform: `rotateY(${
            data.rank === 2 ? "12deg" : data.rank === 3 ? "-12deg" : "0deg"
          }) translateZ(${
            data.rank === 1 ? "0px" : data.rank === 2 ? "-80px" : "-120px"
          }) translateY(${
            data.rank === 1 ? "-20px" : data.rank === 2 ? "38px" : "50px"
          }) scale(${
            data.rank === 1 ? "1" : data.rank === 2 ? "0.9" : "0.85"
          })`,
        }}
      >
        <div
          className={`${cardSize} rounded-2xl shadow-lg overflow-hidden bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60`}
          style={cardStyles}
        >
          <div className="absolute inset-0 opacity-30 bg-gradient-to-br from-white/20 via-white/5 to-transparent" />
          <div className="absolute inset-0 opacity-15 bg-gradient-to-tl from-white/10 via-transparent to-white/5" />
          <div className={`relative z-10 h-full ${padding} flex flex-col`}>
            <div className="flex items-start justify-between mb-6">
              <Badge
                className={
                  data.rank === 1
                    ? "bg-yellow-400/20 text-primary dark:text-yellow-200 border border-yellow-400/60 px-4 py-2.5 text-base font-bold shadow-lg"
                    : data.rank === 2
                    ? "bg-slate-200/10 text-primary dark:text-slate-200 border border-slate-400/50 px-3.5 py-2 text-sm font-semibold shadow-md"
                    : "bg-amber-700/20 text-primary dark:text-amber-300 border border-amber-500/50 px-3.5 py-2 text-sm font-semibold shadow-md"
                }
              >
                {data.rank === 1 ? (
                  <Award className="w-5 h-5 mr-2" />
                ) : data.rank === 2 ? (
                  <Award className="w-3.5 h-3.5 mr-1.5" />
                ) : (
                  <Star className="w-3.5 h-3.5 mr-1.5" />
                )}
                #{data.rank}
              </Badge>
              <div className="text-right">
                <div
                  className={`${
                    data.rank === 1
                      ? "text-emerald-300 text-3xl"
                      : "text-emerald-400 text-2xl"
                  } font-bold`}
                >
                  +{data.totalReturn}%
                </div>
                <div className="text-xs text-muted-foreground font-medium">
                  {data.rank === 1 || data.rank === 2 || data.rank === 3
                    ? t("paybackRate")
                    : t("totalReturn")}
                </div>
              </div>
            </div>

            <div
              className={`flex items-center ${
                data.rank === 1 ? "gap-4 mb-6" : "gap-3 mb-5"
              }`}
            >
              <Avatar
                className={`${
                  data.rank === 1 ? "w-16 h-16" : "w-14 h-14"
                } ring-2 ${
                  data.color === "gold"
                    ? "ring-yellow-400/30"
                    : data.color === "silver"
                    ? "ring-slate-400/20"
                    : "ring-amber-500/20"
                }`}
              >
                <AvatarImage
                  src={exchange?.logoImage ?? ""}
                  alt={`${exchange?.name ?? data.name} logo`}
                />
                <AvatarFallback
                  className={
                    data.color === "gold"
                      ? "bg-yellow-500/20 text-yellow-300 text-xl font-bold"
                      : data.color === "silver"
                      ? "bg-slate-500/20 text-slate-300 font-semibold text-lg"
                      : "bg-amber-600/20 text-amber-300 font-semibold text-lg"
                  }
                  style={{
                    backgroundColor: exchange?.logoImage
                      ? undefined
                      : exchange?.logoColor,
                  }}
                >
                  {exchange?.logo ??
                    data.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3
                  className={`${
                    data.rank === 1 ? "text-2xl" : "text-xl"
                  } font-bold text-foreground`}
                >
                  {exchange?.name ?? data.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {exchange?.website ?? data.username}
                </p>
              </div>
            </div>

            {(data.rank === 1 || data.rank === 2 || data.rank === 3) &&
            exchange ? (
              <div className="space-y-3 flex-1 mt-4">
                <div className="flex items-center justify-between py-2 border-b border-border/30">
                  <span className="font-medium text-muted-foreground">
                    {t("paybackRate")}
                  </span>
                  <span className="font-bold text-foreground">
                    {exchange.paybackRate}%
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/30">
                  <span className="font-medium text-muted-foreground">
                    {t("tradingDiscount")}
                  </span>
                  <span className="font-bold text-foreground">
                    {exchange.tradingDiscount}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/30">
                  <span className="font-medium text-muted-foreground">
                    {t("limitOrderFee")}
                  </span>
                  <span className="font-bold text-foreground">
                    {exchange.limitOrderFee}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/30">
                  <span className="font-medium text-muted-foreground">
                    {t("marketOrderFee")}
                  </span>
                  <span className="font-bold text-foreground">
                    {exchange.marketOrderFee}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/30">
                  <span className="font-medium text-muted-foreground">
                    {t("averageRebatePerUser")}
                  </span>
                  <span className="font-bold text-foreground">
                    {exchange.averageRebatePerUser}
                  </span>
                </div>
              </div>
            ) : (
              <Button
                className={`w-full mb-5 ${
                  data.color === "silver"
                    ? "bg-slate-500/30 hover:bg-slate-500/40 text-slate-100 border border-slate-400/50 font-semibold h-10 shadow-sm hover:shadow-md"
                    : "bg-amber-600/30 hover:bg-amber-600/40 text-amber-200 border border-amber-500/50 font-semibold h-10 shadow-sm hover:shadow-md"
                } transition-all duration-300`}
                variant="outline"
              >
                <UserPlus className="w-4 h-4 mr-2" /> {t("followTrader")}
              </Button>
            )}
          </div>
        </div>
        {/* Reflection */}
        <div
          className="absolute left-0 overflow-hidden"
          style={{
            top: reflectionStyles.top || "510px",
            width: reflectionStyles.width,
            height: reflectionStyles.height || "150px",
            transform: reflectionStyles.transform,
            borderRadius: reflectionStyles.borderRadius,
            clipPath: reflectionStyles.clipPath,
            boxShadow: reflectionStyles.boxShadow,
            opacity: reflectionStyles.opacity,
            backgroundImage: reflectionStyles.backgroundImage,
            filter: "blur(2px)",
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, hsl(var(--background) / 0.35) 0%, hsl(var(--background) / 0.2) 25%, transparent 65%)",
            }}
          />
        </div>
      </motion.div>
    );
  }
);
TraderCard.displayName = "TraderCard";

const MobileCard = memo(
  ({ data, exchange }: { data: CardData; exchange?: Exchange }) => {
    const t = useTranslations("exchange");

    const getRankingBadge = (rank: number) => {
      switch (rank) {
        case 1:
          return (
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg border-2 border-white">
              <Award className="w-6 h-6 mr-1" />
              {rank}
            </div>
          );
        case 2:
          return (
            <div className="w-14 h-14 bg-gradient-to-br from-slate-400 to-slate-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md border-2 border-white">
              <Award className="w-5 h-5 mr-1" />
              {rank}
            </div>
          );
        case 3:
          return (
            <div className="w-14 h-14 bg-gradient-to-br from-amber-600 to-amber-700 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md border-2 border-white">
              <Star className="w-5 h-5 mr-1" />
              {rank}
            </div>
          );
        default:
          return (
            <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
              {rank}
            </div>
          );
      }
    };

    return (
      <div className="bg-card/80 backdrop-blur-sm border border-border/60 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
        {/* Header with Ranking */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {getRankingBadge(data.rank)}
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12 ring-2 ring-border/40">
                <AvatarImage
                  src={exchange?.logoImage ?? ""}
                  alt={`${exchange?.name ?? data.name} logo`}
                />
                <AvatarFallback
                  className="bg-muted/50 text-foreground font-semibold"
                  style={{
                    backgroundColor: exchange?.logoImage
                      ? undefined
                      : exchange?.logoColor,
                  }}
                >
                  {exchange?.logo ??
                    data.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-bold text-xl text-card-foreground">
                  {exchange?.name ?? data.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {exchange?.website ?? data.username}
                </p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-emerald-600">
              +{data.totalReturn}%
            </div>
            <div className="text-xs text-muted-foreground font-medium">
              {t("paybackRate")}
            </div>
          </div>
        </div>

        {exchange && (
          <div className="space-y-4">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-lg p-3 border border-emerald-200/50 dark:border-emerald-700/30">
                <div className="text-xs text-emerald-700 dark:text-emerald-300 font-medium mb-1">
                  {t("paybackRate")}
                </div>
                <div className="text-lg font-bold text-emerald-800 dark:text-emerald-200">
                  {exchange.paybackRate}%
                </div>
              </div>
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-3 border border-blue-200/50 dark:border-blue-700/30">
                <div className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">
                  {t("tradingDiscount")}
                </div>
                <div className="text-lg font-bold text-blue-800 dark:text-blue-200">
                  {exchange.tradingDiscount}
                </div>
              </div>
            </div>

            {/* Detailed Stats */}
            <div className="space-y-3">
              <div className="flex items-center justify-between py-3 border-b border-border/30">
                <span className="text-sm font-medium text-muted-foreground">
                  {t("limitOrderFee")}
                </span>
                <span className="font-bold text-card-foreground">
                  {exchange.limitOrderFee}
                </span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-border/30">
                <span className="text-sm font-medium text-muted-foreground">
                  {t("marketOrderFee")}
                </span>
                <span className="font-bold text-card-foreground">
                  {exchange.marketOrderFee}
                </span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-sm font-medium text-muted-foreground">
                  {t("event")}
                </span>
                <span className="font-bold text-card-foreground">
                  {exchange.event}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);
MobileCard.displayName = "MobileCard";

interface TopExchangeCardsProps {
  exchanges?: Exchange[];
}

export const TopExchangeCards = ({
  exchanges: propExchanges,
}: TopExchangeCardsProps) => {
  const t = useTranslations("exchange");
  const { exchanges, loading } = useExchangeStore();

  // Use prop exchanges if provided, otherwise use fetched exchanges
  const displayExchanges = propExchanges || exchanges;

  // Create card data from the top 3 exchanges
  const CARD_DATA = createCardData(displayExchanges);

  if (loading) {
    return (
      <div className="relative min-h-[700px] flex items-center justify-center gap-12 px-8 mb-16">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t("loadingTopExchanges")}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[700px] px-4">
      {/* Desktop Layout */}
      <div
        className="hidden md:flex items-center justify-center gap-12"
        style={{ perspective: "1200px" }}
      >
        {CARD_DATA.map((cardData) => {
          const exchangeIndex = cardData.rank - 1;
          const exchange = displayExchanges[exchangeIndex];

          if (!exchange || cardData.rank > 3) return null;

          return (
            <TraderCard
              key={cardData.rank}
              data={cardData}
              exchange={exchange}
            />
          );
        })}
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden space-y-4">
        {CARD_DATA.map((cardData) => {
          const exchangeIndex = cardData.rank - 1;
          const exchange = displayExchanges[exchangeIndex];

          if (!exchange || cardData.rank > 3) return null;

          return (
            <div key={cardData.rank} className="w-full">
              <MobileCard data={cardData} exchange={exchange} />
            </div>
          );
        })}
      </div>
    </div>
  );
};
