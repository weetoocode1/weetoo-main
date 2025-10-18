"use client";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  BarChart3,
  Camera,
  ChevronDown,
  Maximize,
  Plus,
  Settings,
  TrendingUp,
} from "lucide-react";
import React from "react";
import type { ResolutionString } from "@/public/static/charting_library/datafeed-api";

type TvChartTypeAction =
  | "chartTypeBars"
  | "chartTypeCandles"
  | "chartTypeHollowCandle"
  | "chartTypeHeikinAshi"
  | "chartTypeLine"
  | "chartTypeArea"
  | "chartTypeBaseline";

interface ToolbarProps {
  intervals: { label: string; res: ResolutionString }[];
  activeRes: ResolutionString;
  handleIntervalClick: (res: ResolutionString) => void;
  extraIntervals: { label: string; res: ResolutionString }[];
  allIntervals: ResolutionString[];
  visibleRes: ResolutionString[];
  toggleCustom: (res: ResolutionString) => void;
  labelFor: (res: ResolutionString) => string;
  openIndicators: () => void;
  openSettings: () => void;
  openCompareSymbols: () => void;
  priceType: "lastPrice" | "markPrice";
  setPriceType: (pt: "lastPrice" | "markPrice") => void;
  captureScreenshot: () => void;
  toggleFullscreen: () => void;
  chartTypeOptions: { id: TvChartTypeAction; label: string }[];
  selectedChartType: TvChartTypeAction;
  applyChartType: (action: TvChartTypeAction) => void;
}

export const TradingViewToolbar: React.FC<ToolbarProps> = ({
  intervals,
  activeRes,
  handleIntervalClick,
  extraIntervals,
  allIntervals,
  visibleRes,
  toggleCustom,
  labelFor,
  openIndicators,
  openSettings,
  openCompareSymbols,
  priceType,
  setPriceType,
  captureScreenshot,
  toggleFullscreen,
  chartTypeOptions,
  selectedChartType,
  applyChartType,
}) => {
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
  };
  const extraActive = extraIntervals.find((x) => x.res === activeRes);
  return (
    <div className="w-full border-b border-border/50 bg-background">
      {/* Desktop Layout - Horizontal */}
      <div className="hidden lg:flex h-9 w-full px-2 items-center gap-2 relative">
        {intervals.map((it) => (
          <div key={it.label} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleIntervalClick(it.res)}
              onMouseDown={handleMouseDown}
              className={`text-xs transition-colors select-none focus:outline-none px-1 ${
                activeRes === it.res
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {it.label}
            </button>
            {it.label === "1M" && (
              <>
                {extraActive && (
                  <span className="text-xs font-medium text-primary px-1">
                    {extraActive.label.toUpperCase()}
                  </span>
                )}
                <HoverCard openDelay={50} closeDelay={50}>
                  <HoverCardTrigger asChild>
                    <button
                      type="button"
                      aria-label="More intervals"
                      onMouseDown={handleMouseDown}
                      className="w-6 h-6 inline-flex items-center justify-center rounded border border-border/40 text-muted-foreground hover:text-foreground focus:outline-none"
                      title="More intervals"
                    >
                      <ChevronDown size={12} className="text-current" />
                    </button>
                  </HoverCardTrigger>
                  <HoverCardContent
                    align="start"
                    sideOffset={8}
                    className="bg-background/95 backdrop-blur border-border rounded-xl p-2 shadow-lg"
                  >
                    <div className="grid grid-cols-4 gap-2 px-1 py-1">
                      {extraIntervals.map((x) => (
                        <button
                          key={x.label}
                          type="button"
                          onClick={() => handleIntervalClick(x.res)}
                          onMouseDown={handleMouseDown}
                          className={`px-3 py-2 text-xs rounded-lg border transition-colors ${
                            activeRes === x.res
                              ? "bg-secondary text-foreground border-border"
                              : "bg-secondary/30 hover:bg-secondary text-foreground border-border/50"
                          }`}
                        >
                          {x.label}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 -mx-2 border-t border-border/40" />
                    <div className="px-1 py-2">
                      <div className="mb-2 text-xs text-muted-foreground">
                        Custom Time Frame
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {allIntervals.map((r) => (
                          <button
                            key={r as unknown as string}
                            type="button"
                            onClick={() => toggleCustom(r)}
                            onMouseDown={handleMouseDown}
                            className={`px-2 py-2 text-xs rounded-lg border transition-colors ${
                              (visibleRes as string[]).includes(
                                r as unknown as string
                              )
                                ? "bg-secondary text-foreground border-border"
                                : "bg-secondary/30 hover:bg-secondary text-foreground border-border/50"
                            }`}
                          >
                            {labelFor(r)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </>
            )}
          </div>
        ))}
        <div className="mx-0.5 h-6 w-px bg-accent" />
        <button
          type="button"
          onClick={openIndicators}
          onMouseDown={handleMouseDown}
          title="Indicators"
          className="w-5 h-5 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-secondary/40"
        >
          <TrendingUp size={16} className="text-current" />
        </button>
        <HoverCard openDelay={50} closeDelay={50}>
          <HoverCardTrigger asChild>
            <button
              type="button"
              title="Chart Type"
              onMouseDown={handleMouseDown}
              className="ml-1 w-5 h-5 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-secondary/40"
            >
              <BarChart3 size={16} className="text-current" />
            </button>
          </HoverCardTrigger>
          <HoverCardContent
            align="start"
            sideOffset={8}
            className="bg-background/95 backdrop-blur border-border rounded-none p-1 shadow-lg w-32"
          >
            <div className="flex flex-col">
              {chartTypeOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => applyChartType(opt.id)}
                  onMouseDown={handleMouseDown}
                  className={`flex items-center gap-2 px-2 py-1.5 text-xs rounded-none text-left transition-colors hover:bg-secondary/40 ${
                    selectedChartType === opt.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground/90"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </HoverCardContent>
        </HoverCard>
        <button
          type="button"
          onClick={openSettings}
          onMouseDown={handleMouseDown}
          title="Chart Settings"
          className="ml-1 w-5 h-5 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-secondary/40"
        >
          <Settings size={16} className="text-current" />
        </button>
        <button
          type="button"
          onClick={openCompareSymbols}
          onMouseDown={handleMouseDown}
          title="Compare Symbols"
          className="ml-1 w-5 h-5 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-secondary/40"
        >
          <Plus size={16} className="text-current" />
        </button>
        <HoverCard openDelay={50} closeDelay={50}>
          <HoverCardTrigger asChild className="rounded-none">
            <button
              type="button"
              title="Price Type"
              onMouseDown={handleMouseDown}
              className="ml-1 px-2 py-1 inline-flex items-center gap-1 rounded-none text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/40 border border-border/40"
            >
              <span className="text-xs">
                {priceType === "lastPrice" ? "Last Traded Price" : "Mark Price"}
              </span>
              <ChevronDown size={10} className="text-current" />
            </button>
          </HoverCardTrigger>
          <HoverCardContent
            align="start"
            sideOffset={8}
            className="bg-background/95 backdrop-blur border-border !rounded-none p-1 shadow-lg w-40"
          >
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => setPriceType("lastPrice")}
                onMouseDown={handleMouseDown}
                className={`flex items-center gap-2 px-2 py-1.5 text-xs rounded-none text-left transition-colors hover:bg-secondary/40 ${
                  priceType === "lastPrice"
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground/90"
                }`}
              >
                Last Traded Price
              </button>
              <button
                type="button"
                onClick={() => setPriceType("markPrice")}
                onMouseDown={handleMouseDown}
                className={`flex items-center gap-2 px-2 py-1.5 text-xs rounded-none text-left transition-colors hover:bg-secondary/40 ${
                  priceType === "markPrice"
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground/90"
                }`}
              >
                Mark Price
              </button>
            </div>
          </HoverCardContent>
        </HoverCard>
        <button
          type="button"
          onClick={captureScreenshot}
          onMouseDown={handleMouseDown}
          title="Take Screenshot"
          className="ml-auto w-5 h-5 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-secondary/40"
        >
          <Camera size={16} className="text-current" />
        </button>
        <button
          type="button"
          onClick={toggleFullscreen}
          onMouseDown={handleMouseDown}
          title="Toggle Fullscreen"
          className="ml-1 w-5 h-5 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-secondary/40"
        >
          <Maximize size={16} className="text-current" />
        </button>
      </div>

      {/* Mobile/Tablet Layout - Stacked */}
      <div className="flex flex-col lg:hidden w-full">
        {/* Top Row: Time Intervals */}
        <div className="h-8 px-2 flex items-center gap-1 overflow-x-auto scrollbar-none">
          {intervals.slice(0, 6).map((it) => (
            <button
              key={it.label}
              type="button"
              onClick={() => handleIntervalClick(it.res)}
              onMouseDown={handleMouseDown}
              className={`text-xs transition-colors select-none focus:outline-none px-2 py-1 whitespace-nowrap ${
                activeRes === it.res
                  ? "text-primary bg-primary/10 rounded"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {it.label}
            </button>
          ))}
          {intervals.length > 6 && (
            <HoverCard openDelay={50} closeDelay={50}>
              <HoverCardTrigger asChild>
                <button
                  type="button"
                  aria-label="More intervals"
                  onMouseDown={handleMouseDown}
                  className="w-6 h-6 inline-flex items-center justify-center rounded border border-border/40 text-muted-foreground hover:text-foreground focus:outline-none ml-1"
                  title="More intervals"
                >
                  <ChevronDown size={12} className="text-current" />
                </button>
              </HoverCardTrigger>
              <HoverCardContent
                align="start"
                sideOffset={8}
                className="bg-background/95 backdrop-blur border-border rounded-xl p-2 shadow-lg"
              >
                <div className="grid grid-cols-3 gap-2 px-1 py-1">
                  {intervals.slice(6).map((it) => (
                    <button
                      key={it.label}
                      type="button"
                      onClick={() => handleIntervalClick(it.res)}
                      onMouseDown={handleMouseDown}
                      className={`px-3 py-2 text-xs rounded-lg border transition-colors ${
                        activeRes === it.res
                          ? "bg-secondary text-foreground border-border"
                          : "bg-secondary/30 hover:bg-secondary text-foreground border-border/50"
                      }`}
                    >
                      {it.label}
                    </button>
                  ))}
                </div>
                <div className="mt-2 -mx-2 border-t border-border/40" />
                <div className="px-1 py-2">
                  <div className="mb-2 text-xs text-muted-foreground">
                    Extra Intervals
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {extraIntervals.map((x) => (
                      <button
                        key={x.label}
                        type="button"
                        onClick={() => handleIntervalClick(x.res)}
                        onMouseDown={handleMouseDown}
                        className={`px-2 py-1 text-xs rounded border transition-colors ${
                          activeRes === x.res
                            ? "bg-secondary text-foreground border-border"
                            : "bg-secondary/30 hover:bg-secondary text-foreground border-border/50"
                        }`}
                      >
                        {x.label}
                      </button>
                    ))}
                  </div>
                </div>
              </HoverCardContent>
            </HoverCard>
          )}
        </div>

        {/* Bottom Row: Tools and Actions */}
        <div className="h-8 px-2 flex items-center justify-between">
          {/* Left Side: Chart Tools */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={openIndicators}
              onMouseDown={handleMouseDown}
              title="Indicators"
              className="w-6 h-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-secondary/40"
            >
              <TrendingUp size={14} className="text-current" />
            </button>
            <HoverCard openDelay={50} closeDelay={50}>
              <HoverCardTrigger asChild>
                <button
                  type="button"
                  title="Chart Type"
                  onMouseDown={handleMouseDown}
                  className="w-6 h-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                >
                  <BarChart3 size={14} className="text-current" />
                </button>
              </HoverCardTrigger>
              <HoverCardContent
                align="start"
                sideOffset={8}
                className="bg-background/95 backdrop-blur border-border rounded-none p-1 shadow-lg w-32"
              >
                <div className="flex flex-col">
                  {chartTypeOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => applyChartType(opt.id)}
                      onMouseDown={handleMouseDown}
                      className={`flex items-center gap-2 px-2 py-1.5 text-xs rounded-none text-left transition-colors hover:bg-secondary/40 ${
                        selectedChartType === opt.id
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-foreground/90"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </HoverCardContent>
            </HoverCard>
            <button
              type="button"
              onClick={openSettings}
              onMouseDown={handleMouseDown}
              title="Chart Settings"
              className="w-6 h-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-secondary/40"
            >
              <Settings size={14} className="text-current" />
            </button>
            <button
              type="button"
              onClick={openCompareSymbols}
              onMouseDown={handleMouseDown}
              title="Compare Symbols"
              className="w-6 h-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-secondary/40"
            >
              <Plus size={14} className="text-current" />
            </button>
          </div>

          {/* Center: Price Type */}
          <HoverCard openDelay={50} closeDelay={50}>
            <HoverCardTrigger asChild className="rounded-none">
              <button
                type="button"
                title="Price Type"
                onMouseDown={handleMouseDown}
                className="px-2 py-1 inline-flex items-center gap-1 rounded-none text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/40 border border-border/40"
              >
                <span className="text-xs">
                  {priceType === "lastPrice" ? "Last" : "Mark"}
                </span>
                <ChevronDown size={10} className="text-current" />
              </button>
            </HoverCardTrigger>
            <HoverCardContent
              align="start"
              sideOffset={8}
              className="bg-background/95 backdrop-blur border-border !rounded-none p-1 shadow-lg w-40"
            >
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => setPriceType("lastPrice")}
                  onMouseDown={handleMouseDown}
                  className={`flex items-center gap-2 px-2 py-1.5 text-xs rounded-none text-left transition-colors hover:bg-secondary/40 ${
                    priceType === "lastPrice"
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground/90"
                  }`}
                >
                  Last Traded Price
                </button>
                <button
                  type="button"
                  onClick={() => setPriceType("markPrice")}
                  onMouseDown={handleMouseDown}
                  className={`flex items-center gap-2 px-2 py-1.5 text-xs rounded-none text-left transition-colors hover:bg-secondary/40 ${
                    priceType === "markPrice"
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground/90"
                  }`}
                >
                  Mark Price
                </button>
              </div>
            </HoverCardContent>
          </HoverCard>

          {/* Right Side: Actions */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={captureScreenshot}
              onMouseDown={handleMouseDown}
              title="Take Screenshot"
              className="w-6 h-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-secondary/40"
            >
              <Camera size={14} className="text-current" />
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              onMouseDown={handleMouseDown}
              title="Toggle Fullscreen"
              className="w-6 h-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-secondary/40"
            >
              <Maximize size={14} className="text-current" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
