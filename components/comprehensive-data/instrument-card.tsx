"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { Landmark, TrendingDown, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import React, { memo, useMemo, useRef } from "react";
import {
  Area,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

// Global Set to track which cards have already animated
const animatedCards = new Set<string>();

// Symbol config for display name and icon
const SYMBOL_CONFIG: Record<string, { name: string; icon: React.ReactNode }> = {
  BTCUSDT: {
    name: "Bitcoin",
    icon: <Landmark className="w-4 h-4 text-yellow-500" />,
  },
  ETHUSDT: {
    name: "Ethereum",
    icon: <Landmark className="w-4 h-4 text-indigo-500" />,
  },
  BNBUSDT: {
    name: "Binance Coin",
    icon: <Landmark className="w-4 h-4 text-yellow-400" />,
  },
  SOLUSDT: {
    name: "Solana",
    icon: <Landmark className="w-4 h-4 text-green-500" />,
  },
  XRPUSDT: {
    name: "XRP",
    icon: <Landmark className="w-4 h-4 text-blue-400" />,
  },
  ADAUSDT: {
    name: "Cardano",
    icon: <Landmark className="w-4 h-4 text-blue-600" />,
  },
  DOGEUSDT: {
    name: "Dogecoin",
    icon: <Landmark className="w-4 h-4 text-yellow-300" />,
  },
  AVAXUSDT: {
    name: "Avalanche",
    icon: <Landmark className="w-4 h-4 text-red-400" />,
  },
  TRXUSDT: {
    name: "TRON",
    icon: <Landmark className="w-4 h-4 text-red-500" />,
  },
  LINKUSDT: {
    name: "Chainlink",
    icon: <Landmark className="w-4 h-4 text-blue-500" />,
  },
  MATICUSDT: {
    name: "Polygon",
    icon: <Landmark className="w-4 h-4 text-purple-500" />,
  },
  DOTUSDT: {
    name: "Polkadot",
    icon: <Landmark className="w-4 h-4 text-pink-500" />,
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      delay: index * 0.07,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
};

const MiniChart = memo(
  ({ data }: { data: { time: string; close: number }[] }) => {
    // Calculate min/max for y-axis domain
    const closes = data.map((d) => d.close);
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const margin = (max - min) * 0.1 || 0.01;
    const domain = [min - margin, max + margin];

    return (
      <div className="h-16 -mx-1">
        <ChartContainer
          config={{ desktop: { label: "Price", color: "var(--chart-1)" } }}
          className="w-full h-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ left: 12, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="time"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => value.slice(0, 3)}
              />
              <YAxis domain={domain} hide />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Area
                type="monotone"
                dataKey="close"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.08}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                dataKey="close"
                type="monotone"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    );
  }
);
MiniChart.displayName = "MiniChart";

type Ticker = {
  lastPrice: string;
  highPrice: string;
  lowPrice: string;
  priceChange: string;
  priceChangePercent: string;
};

type Kline = [
  number, // open time
  string, // open
  string, // high
  string, // low
  string, // close
  string, // volume
  ...unknown[] // ignore the rest
];

type ChartPoint = { time: string; close: number };

export const InstrumentCard = memo(function InstrumentCard({
  symbol,
  index,
  ticker,
  klines,
  isLoading,
}: {
  symbol: string;
  index: number;
  ticker: Ticker | null;
  klines: Kline[];
  isLoading: boolean;
}) {
  // Keep previous klines data to prevent chart flicker
  const prevKlines = useRef<Kline[]>([]);
  if (klines && klines.length > 0) {
    prevKlines.current = klines;
  }
  const safeKlines = klines && klines.length > 0 ? klines : prevKlines.current;

  // Keep previous chart data to prevent chart flicker
  const prevChartData = useRef<ChartPoint[]>([]);
  const chartData = useMemo(() => {
    const arr = safeKlines.map((item: Kline) => ({
      time: new Date(item[0]).getHours().toString().padStart(2, "0"),
      close: parseFloat(item[4]),
    }));
    if (arr.length > 0 && arr.every((d: ChartPoint) => d.close !== 0)) {
      prevChartData.current = arr;
      return arr;
    }
    return prevChartData.current;
  }, [safeKlines]);

  const closes = chartData.map((d: ChartPoint) => d.close);

  const price =
    ticker && parseFloat(ticker.lastPrice) > 0
      ? parseFloat(ticker.lastPrice)
      : closes.length > 0
      ? closes[closes.length - 1]
      : 0;

  const high24h =
    ticker && parseFloat(ticker.highPrice) > 0
      ? parseFloat(ticker.highPrice)
      : closes.length > 0
      ? Math.max(...closes)
      : 0;

  const low24h =
    ticker && parseFloat(ticker.lowPrice) > 0
      ? parseFloat(ticker.lowPrice)
      : closes.length > 0
      ? Math.min(...closes)
      : 0;

  // Fallback for changeValue and changePercent
  let changeValue = 0;
  let changePercent = 0;
  if (
    ticker &&
    ticker.priceChange !== undefined &&
    ticker.priceChangePercent !== undefined
  ) {
    changeValue = parseFloat(ticker.priceChange);
    changePercent = parseFloat(ticker.priceChangePercent);
  } else if (closes.length > 1) {
    changeValue = closes[closes.length - 1] - closes[0];
    changePercent =
      closes[0] !== 0
        ? ((closes[closes.length - 1] - closes[0]) / closes[0]) * 100
        : 0;
  }

  const isPositiveChange = changeValue >= 0;
  const cardKey = symbol;
  const hasAnimated = animatedCards.has(cardKey);

  const config = SYMBOL_CONFIG[symbol] || {
    name: symbol,
    icon: <Landmark className="w-4 h-4" />,
  };

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial={hasAnimated ? false : "hidden"}
      animate="visible"
      onAnimationComplete={() => {
        animatedCards.add(cardKey);
      }}
      className={cn(
        "group",
        "bg-card",
        "border",
        "border-border",
        "rounded-xl",
        "transition-all duration-300",
        "w-full max-w-md mx-auto",
        "overflow-hidden"
      )}
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            {config.icon}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {config.name}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">{symbol}</p>
          </div>
        </div>
        <div
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border",
            isPositiveChange
              ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
              : "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
          )}
        >
          {isPositiveChange ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          {isPositiveChange ? "+" : ""}
          {changePercent.toFixed(2)}%
        </div>
      </div>
      {/* Divider */}
      <div className="border-t border-border" />
      {/* Price & Chart */}
      <div className="px-6 py-5">
        {isLoading ? (
          <div className="h-16 flex items-center justify-center text-xs text-muted-foreground">
            Loading...
          </div>
        ) : (
          <>
            <div className="flex items-end justify-between mb-4">
              {/* Price and USD */}
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-foreground">
                  {price}
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  USD
                </span>
              </div>
              {/* Change value and 24h */}
              <div className="flex flex-col items-end">
                <span
                  className={cn(
                    "text-sm font-semibold",
                    isPositiveChange
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  )}
                >
                  {isPositiveChange ? "+" : ""}
                  {changeValue}
                </span>
                <span className="text-xs text-muted-foreground ml-1">24h</span>
              </div>
            </div>
            {/* Chart Section */}
            <MiniChart data={chartData} />
            <div className="text-xs text-muted-foreground text-center mt-1">
              Hour (24h local time)
            </div>
          </>
        )}
      </div>
      {/* Divider */}
      <div className="border-t border-[var(--color-border)]" />
      {/* Footer */}
      <div className="flex justify-between items-center px-6 py-4 bg-[var(--color-card)]">
        <div>
          <p className="text-xs text-muted-foreground mb-1">24H High</p>
          <p className="text-sm font-semibold text-foreground">
            {isLoading ? "-" : high24h}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground mb-1">24H Low</p>
          <p className="text-sm font-semibold text-foreground">
            {isLoading ? "-" : low24h}
          </p>
        </div>
      </div>
    </motion.div>
  );
});
