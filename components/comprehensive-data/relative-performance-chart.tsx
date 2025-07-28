"use client";

import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { memo, useMemo } from "react";

// Global Set to track which charts have already animated
const animatedCharts = new Set<string>();

export interface PerformanceData {
  symbol: string;
  name: string;
  performance: number;
}

// Memoized bar component
const PerformanceBar = memo(
  ({
    item,
    index,
    maxAbsValue,
  }: {
    item: PerformanceData;
    index: number;
    maxAbsValue: number;
  }) => {
    const isPositive = item.performance >= 0;
    const barHeight = useMemo(() => {
      const normalizedHeight = (Math.abs(item.performance) / maxAbsValue) * 100;
      return Math.max(4, normalizedHeight);
    }, [item.performance, maxAbsValue]);
    const formattedPercentage = useMemo(() => {
      const sign = item.performance > 0 ? "+" : "";
      return `${sign}${item.performance.toFixed(2)}%`;
    }, [item.performance]);
    return (
      <div className="flex flex-col items-center flex-1 group min-w-[60px]">
        {/* Performance value */}
        <div
          className={cn(
            "text-xs font-mono mb-2",
            isPositive
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          )}
        >
          {formattedPercentage}
        </div>

        {/* Bar */}
        <div className="relative w-full h-80 flex items-end">
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: `${barHeight}%` }}
            transition={{ duration: 0.6, delay: index * 0.02 }}
            className={cn("w-full", isPositive ? "bg-green-500" : "bg-red-500")}
            style={{ minHeight: "2px" }}
          />
        </div>

        {/* Symbol */}
        <div className="mt-2 text-xs font-medium text-neutral-700 dark:text-neutral-300">
          {item.symbol}
        </div>
      </div>
    );
  }
);
PerformanceBar.displayName = "PerformanceBar";

export const RelativePerformanceChart = memo(function RelativePerformanceChart({
  data,
}: {
  data: PerformanceData[];
}) {
  // Sort: positive (green) left, negative (red) right
  const sorted = useMemo(
    () => [...data].sort((a, b) => b.performance - a.performance),
    [data]
  );
  const maxAbsValue = useMemo(
    () => Math.max(...sorted.map((d) => Math.abs(d.performance))),
    [sorted]
  );
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  // Create a unique key for the main chart
  const chartKey = "relative-performance-chart";
  const hasAnimated = animatedCharts.has(chartKey);

  return (
    <motion.div
      initial={hasAnimated ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      onAnimationComplete={() => {
        animatedCharts.add(chartKey);
      }}
      className="w-full"
    >
      <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            24H Relative Performance vs USDT
          </h3>
        </div>

        {/* Chart */}
        <div className="p-6">
          <div className="flex items-end justify-between gap-2 h-96 overflow-x-auto pb-4">
            {sorted.map((item, index) => (
              <PerformanceBar
                key={item.symbol}
                item={item}
                index={index}
                maxAbsValue={maxAbsValue}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
          <div className="flex justify-between text-xs text-neutral-600 dark:text-neutral-400">
            <span>
              Best: {best.symbol} {best.performance > 0 ? "+" : ""}
              {best.performance.toFixed(2)}%
            </span>
            <span>
              Worst: {worst.symbol} {worst.performance > 0 ? "+" : ""}
              {worst.performance.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
});
