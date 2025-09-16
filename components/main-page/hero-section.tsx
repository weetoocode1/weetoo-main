"use client";

import {
  AnimatedGridBackground,
  createThemeGrid,
} from "@/components/background";
import { Icons } from "@/components/icons";
import { Marquee } from "@/components/magicui/marquee";
import { useBinanceFutures } from "@/hooks/use-binance-futures";
import {
  ArrowRight,
  Globe,
  Lock,
  TrendingUp,
  Users,
  Users2,
} from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

// Trading Room Card Component
const TradingRoomCard = ({
  roomName,
  hostName,
  participants,
  duration,
  roomType,
  symbol,
  isLive = false,
  t,
}: {
  roomName: string;
  hostName: string;
  participants: string;
  duration: string;
  roomType: string;
  symbol: string;
  isLive?: boolean;
  t: (key: string) => string;
}) => {
  const handleCardClick = () => {
    window.location.href = "/trading";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleCardClick();
    }
  };

  return (
    <div
      className="relative h-fit w-80 cursor-pointer overflow-hidden rounded-lg bg-card border border-border/50 hover:border-primary/30 hover:shadow-sm transition-all duration-200 group touch-manipulation select-none"
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Join ${roomName} trading room`}
    >
      {/* Thumbnail */}
      <div className="relative">
        <Image
          src="/img.png"
          alt="Trading Room Preview"
          width={352}
          height={198}
          draggable={false}
          priority
          className="w-full h-40 object-cover"
        />

        {/* Live Indicator */}
        {isLive && (
          <div className="absolute top-3 left-3">
            <div className="flex items-center space-x-1.5 bg-red-600 text-white px-2 py-0.5 rounded-sm text-xs font-bold shadow-md">
              <span className="text-xs">{t("live")}</span>
            </div>
          </div>
        )}

        {/* Room Type Indicator */}
        <div className="absolute top-3 right-3">
          {roomType === "Private" ? (
            <div className="flex items-center justify-center w-6 h-6 bg-orange-500 text-white rounded-sm shadow-md">
              <Lock className="w-3 h-3" />
            </div>
          ) : (
            <div className="flex items-center justify-center w-6 h-6 bg-green-500 text-white rounded-sm shadow-md">
              <Users2 className="w-3 h-3" />
            </div>
          )}
        </div>

        {/* Duration */}
        <div className="absolute bottom-3 right-3 bg-background/80 text-foreground text-xs px-2 py-1 rounded">
          {duration}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Room Name & Symbol */}
        <div className="flex items-start justify-between">
          <h4 className="font-medium text-card-foreground text-base line-clamp-2 group-hover:text-primary transition-colors flex-1 mr-2">
            {roomName}
          </h4>
          <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded font-medium flex-shrink-0">
            {symbol}
          </span>
        </div>

        {/* Host & Watching */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-primary text-xs font-medium">
                {hostName.charAt(0)}
              </span>
            </div>
            <span className="text-sm text-muted-foreground">{hostName}</span>
          </div>
          <div className="flex items-center space-x-1 text-sm text-muted-foreground">
            <Users className="w-4 h-4 text-primary/60" />
            <span>{participants}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Trading Room Data
const tradingRooms = [
  {
    id: 1,
    roomName: "Bitcoin Bulls Trading Room",
    hostName: "CryptoKing",
    participants: "2.4K",
    duration: "2h 15m",
    roomType: "Public",
    symbol: "BTC",
    isLive: true,
  },
  {
    id: 2,
    roomName: "Ethereum Elite Strategies",
    hostName: "EtherMaster",
    participants: "1.8K",
    duration: "1h 45m",
    roomType: "Private",
    symbol: "ETH",
    isLive: false,
  },
  {
    id: 3,
    roomName: "Altcoin Analysis Hub",
    hostName: "AltcoinPro",
    participants: "3.2K",
    duration: "3h 30m",
    roomType: "Public",
    symbol: "ADA",
    isLive: true,
  },
  {
    id: 4,
    roomName: "DeFi Trading Masterclass",
    hostName: "DeFiExpert",
    participants: "1.5K",
    duration: "4h 10m",
    roomType: "Public",
    symbol: "UNI",
    isLive: false,
  },
  {
    id: 5,
    roomName: "Solana Speed Trading",
    hostName: "SolanaPro",
    participants: "2.1K",
    duration: "2h 45m",
    roomType: "Public",
    symbol: "SOL",
    isLive: true,
  },
  {
    id: 6,
    roomName: "Polygon DeFi Strategies",
    hostName: "PolygonGuru",
    participants: "1.2K",
    duration: "3h 15m",
    roomType: "Private",
    symbol: "MATIC",
    isLive: false,
  },
];

const firstRow = tradingRooms.slice(0, Math.ceil(tradingRooms.length / 2));
const secondRow = tradingRooms.slice(Math.ceil(tradingRooms.length / 2));

export function HeroSection() {
  const t = useTranslations("hero");
  const [, setVisibleCards] = useState<Set<number>>(new Set());
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Fetch real-time market data for Bitcoin and Ethereum
  const btcData = useBinanceFutures("BTCUSDT");
  const ethData = useBinanceFutures("ETHUSDT");

  // Smooth scrolling setup
  useEffect(() => {
    document.documentElement.style.scrollBehavior = "smooth";
    return () => {
      document.documentElement.style.scrollBehavior = "auto";
    };
  }, []);

  // Intersection Observer for lazy loading
  const observerCallback = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const index = parseInt(
            entry.target.getAttribute("data-index") || "0"
          );
          setVisibleCards((prev) => new Set([...prev, index]));
        }
      });
    },
    []
  );

  useEffect(() => {
    const observer = new IntersectionObserver(observerCallback, {
      threshold: 0.1,
      rootMargin: "50px",
    });

    cardRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [observerCallback]);

  return (
    <>
      {/* Hero Section */}
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background px-4 py-20 md:px-8 md:py-40">
        <AnimatedGridBackground
          gridConfig={createThemeGrid()}
          columns={4}
          gap="gap-10"
          rotation="-rotate-45"
        />
        {/* Professional Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-bg-background via-bg-background to-bg-muted/20">
          {/* Subtle Grid Pattern */}
          <div className="absolute inset-0 opacity-30">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
                `,
                backgroundSize: "40px 40px",
              }}
            ></div>
          </div>

          {/* Subtle Accent Elements */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-chart-1/5 rounded-full blur-3xl"></div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 max-w-[1600px] mx-auto w-full">
          <div className="flex flex-col lg:flex-row items-center justify-between w-full gap-8 lg:gap-12">
            {/* Left Column - Content */}
            <motion.div
              className="space-y-10 w-full max-w-[580px]"
              initial={{ opacity: 0, x: -30, y: 20 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{
                duration: 0.7,
                delay: 0.1,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            >
              {/* Badge */}
              <motion.div
                className="inline-flex items-center space-x-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.2,
                  duration: 0.6,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
              >
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span className="text-sm font-medium text-primary uppercase tracking-wide">
                  {t("tradeSmarter")}
                </span>
              </motion.div>

              {/* Main Headline */}
              <motion.div
                className="space-y-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.3,
                  duration: 0.6,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
              >
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight text-balance">
                  {t("experienceNextGen")}
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed text-balance">
                  {t("joinCommunity")}
                </p>
              </motion.div>

              {/* Live Market Data */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-card border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="rounded-full flex items-center justify-center">
                        <Icons.bitcoin className="w-9 h-9" />
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Bitcoin
                        </div>
                        <div className="text-xs text-muted-foreground">
                          BTC/USD
                        </div>
                      </div>
                    </div>
                    <div
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        btcData.ticker &&
                        parseFloat(btcData.ticker.priceChangePercent) >= 0
                          ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                      }`}
                    >
                      {btcData.ticker ? (
                        <>
                          {parseFloat(btcData.ticker.priceChangePercent) >= 0
                            ? "+"
                            : ""}
                          {parseFloat(
                            btcData.ticker.priceChangePercent
                          ).toFixed(2)}
                          %
                        </>
                      ) : (
                        "--"
                      )}
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {btcData.ticker
                      ? `$${parseFloat(
                          btcData.ticker.lastPrice
                        ).toLocaleString()}`
                      : "--"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {btcData.ticker
                      ? `24h: $${(
                          parseFloat(btcData.ticker.quoteVolume) / 1000000000
                        ).toFixed(1)}B volume`
                      : "Loading..."}
                  </div>
                </div>

                <div className="bg-card border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="rounded-full flex items-center justify-center">
                        <Icons.ethereum className="w-9 h-9" />
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Ethereum
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ETH/USD
                        </div>
                      </div>
                    </div>
                    <div
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        ethData.ticker &&
                        parseFloat(ethData.ticker.priceChangePercent) >= 0
                          ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                      }`}
                    >
                      {ethData.ticker ? (
                        <>
                          {parseFloat(ethData.ticker.priceChangePercent) >= 0
                            ? "+"
                            : ""}
                          {parseFloat(
                            ethData.ticker.priceChangePercent
                          ).toFixed(2)}
                          %
                        </>
                      ) : (
                        "--"
                      )}
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {ethData.ticker
                      ? `$${parseFloat(
                          ethData.ticker.lastPrice
                        ).toLocaleString()}`
                      : "--"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {ethData.ticker
                      ? `24h: $${(
                          parseFloat(ethData.ticker.quoteVolume) / 1000000000
                        ).toFixed(1)}B volume`
                      : "Loading..."}
                  </div>
                </div>
              </div>

              {/* CTA Buttons */}
              <motion.div
                className="flex flex-col sm:flex-row gap-4 w-full"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.5,
                  duration: 0.6,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
              >
                <Link href="/trading" className="w-full sm:w-auto">
                  <motion.button
                    className="group bg-primary hover:bg-primary/90 active:bg-primary/80 text-primary-foreground px-6 py-3 text-base font-medium rounded-lg shadow-md hover:shadow-xl active:shadow-lg transition-all duration-300 flex items-center justify-center cursor-pointer relative overflow-hidden touch-manipulation select-none w-full"
                    whileHover={{
                      scale: 1.02,
                      boxShadow:
                        "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                    }}
                    whileTap={{ scale: 0.98 }}
                    onTouchStart={(e) =>
                      e.currentTarget.classList.add("active:scale-95")
                    }
                  >
                    <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    <motion.div
                      className="flex items-center"
                      whileHover={{ x: 2 }}
                    >
                      <span>{t("getStarted")}</span>
                      <motion.div
                        whileHover={{ x: 4 }}
                        transition={{ duration: 0.3 }}
                      >
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </motion.div>
                    </motion.div>
                  </motion.button>
                </Link>
                <Link href="/comprehensive-data" className="w-full sm:w-auto">
                  <motion.button
                    className="group border border-border bg-background text-foreground px-6 py-3 text-base font-medium rounded-lg transition-all duration-300 flex items-center justify-center z-50 hover:bg-muted hover:border-primary/30 active:bg-muted/80 cursor-pointer relative overflow-hidden touch-manipulation select-none w-full"
                    whileHover={{
                      scale: 1.02,
                      boxShadow:
                        "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                    }}
                    whileTap={{ scale: 0.98 }}
                    onTouchStart={(e) =>
                      e.currentTarget.classList.add("active:scale-95")
                    }
                  >
                    <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    <motion.div
                      className="flex items-center"
                      whileHover={{ x: 2 }}
                    >
                      <motion.div
                        whileHover={{ rotate: 5 }}
                        transition={{ duration: 0.3 }}
                      >
                        <TrendingUp className="w-4 h-4 mr-2" />
                      </motion.div>
                      <span>{t("viewMarkets")}</span>
                    </motion.div>
                  </motion.button>
                </Link>
              </motion.div>

              {/* Trust Indicators */}
              <motion.div
                className="flex flex-wrap items-center gap-6 pt-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
              >
                <motion.div
                  className="flex items-center space-x-2 text-muted-foreground hover:text-primary transition-colors duration-200"
                  whileHover={{ scale: 1.05 }}
                >
                  <TrendingUp className="w-5 h-5" />
                  <span className="text-sm font-medium">
                    {t("realTimeAnalytics")}
                  </span>
                </motion.div>
                <motion.div
                  className="flex items-center space-x-2 text-muted-foreground hover:text-primary transition-colors duration-200"
                  whileHover={{ scale: 1.05 }}
                >
                  <Users className="w-5 h-5" />
                  <span className="text-sm font-medium">
                    {t("expertTraders")}
                  </span>
                </motion.div>
                <motion.div
                  className="flex items-center space-x-2 text-muted-foreground hover:text-primary transition-colors duration-200"
                  whileHover={{ scale: 1.05 }}
                >
                  <Globe className="w-5 h-5" />
                  <span className="text-sm font-medium">
                    {t("globalCommunity")}
                  </span>
                </motion.div>
              </motion.div>
            </motion.div>

            {/* Right Column - Trading Rooms Marquee */}
            <motion.div
              className="relative w-full max-w-5xl"
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.8,
                delay: 0.2,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            >
              {/* 2-Row Marquee Container */}
              <div className="relative h-[400px] sm:h-[500px] lg:h-[600px] flex w-full flex-row items-center lg:justify-end justify-center overflow-hidden">
                <Marquee pauseOnHover vertical className="[--duration:20s]">
                  {firstRow.map((room, index) => (
                    <div
                      key={room.id}
                      ref={(el) => {
                        cardRefs.current[index] = el;
                      }}
                      data-index={index}
                    >
                      <TradingRoomCard {...room} isLive={room.isLive} t={t} />
                    </div>
                  ))}
                </Marquee>
                <Marquee
                  reverse
                  pauseOnHover
                  vertical
                  className="[--duration:20s] md:block hidden"
                >
                  {secondRow.map((room, index) => {
                    const actualIndex = firstRow.length + index;
                    return (
                      <div
                        key={room.id}
                        ref={(el) => {
                          cardRefs.current[actualIndex] = el;
                        }}
                        data-index={actualIndex}
                      >
                        <TradingRoomCard {...room} isLive={room.isLive} t={t} />
                      </div>
                    );
                  })}
                </Marquee>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
}
