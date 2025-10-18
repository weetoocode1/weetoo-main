"use client";

import type {
  ChartingLibraryWidgetOptions,
  LanguageCode,
  ResolutionString,
  widget,
} from "@/public/static/charting_library";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useRef, useState } from "react";
import { BybitUdfDatafeed } from "./datafeed/bybit-udf-datafeed";
import { QuickTradePanel } from "./quick-trade-panel";
import { TradingViewToolbar } from "./toolbar";
import { resolveAppBackground, resolveCssVarToColor } from "./utils/color";

// ===== TYPES =====
// types moved to dedicated files

interface TradingViewChartTestProps {
  symbol?: string;
  roomId?: string;
}

export function TradingViewChartTest({
  symbol,
  roomId,
}: TradingViewChartTestProps) {
  const { theme, resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const widgetRef = useRef<InstanceType<typeof widget> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeRes, setActiveRes] = useState<ResolutionString>(
    "30" as ResolutionString
  );
  const [selectedChartType, setSelectedChartType] =
    useState<TvChartTypeAction>("chartTypeCandles");
  const [priceType, setPriceType] = useState<"lastPrice" | "markPrice">(
    "lastPrice"
  );
  const [isChangingPriceType, setIsChangingPriceType] = useState(false);
  const STORAGE_KEY = "tv_active_resolution";
  const VISIBLE_KEY = "tv_visible_intervals";

  const currentTheme = resolvedTheme || theme;
  const key = useMemo(
    () => `${symbol}-${currentTheme}`,
    [symbol, currentTheme]
  );

  const allIntervals: ResolutionString[] = [
    "1",
    "3",
    "5",
    "15",
    "30",
    "60",
    "120",
    "240",
    "360",
    "720",
    "1D",
    "1W",
    "1M",
  ] as unknown as ResolutionString[];

  const labelFor = (res: ResolutionString) => {
    const map: Record<string, string> = {
      "1": "1m",
      "3": "3m",
      "5": "5m",
      "15": "15m",
      "30": "30m",
      "60": "1h",
      "120": "2h",
      "240": "4h",
      "360": "6h",
      "720": "12h",
      "1D": "1D",
      "1W": "1W",
      "1M": "1M",
    };
    return (map as Record<string, string>)[res] ?? String(res);
  };

  const [visibleRes, setVisibleRes] = useState<ResolutionString[]>([
    "1",
    "3",
    "5",
    "15",
    "30",
    "60",
    "240",
    "1D",
    "1W",
    "1M",
  ] as unknown as ResolutionString[]);

  // Load persisted interval on first mount
  useEffect(() => {
    try {
      const savedActive = localStorage.getItem(STORAGE_KEY) || "";
      if (savedActive && (allIntervals as string[]).includes(savedActive)) {
        setActiveRes(savedActive as unknown as ResolutionString);
      }
      const savedVisible = localStorage.getItem(VISIBLE_KEY) || "";
      if (savedVisible) {
        const parsed = JSON.parse(savedVisible) as string[];
        const filtered = parsed.filter((r) =>
          (allIntervals as string[]).includes(r)
        ) as unknown as ResolutionString[];
        if (filtered.length) setVisibleRes(filtered);
      }
    } catch {}
  }, []);

  const persistVisible = (next: ResolutionString[]) => {
    setVisibleRes(next);
    try {
      localStorage.setItem(
        VISIBLE_KEY,
        JSON.stringify(next as unknown as string[])
      );
    } catch {}
  };

  const tv = useMemo(() => {
    if (typeof window === "undefined") return null;
    // Dynamic import for TradingView library
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require("@/public/static/charting_library");
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current || !tv) return;

    const datafeed = new BybitUdfDatafeed(priceType);
    const datafeedRef = { current: datafeed };
    const appBg = resolveAppBackground(currentTheme);
    const options: ChartingLibraryWidgetOptions = {
      symbol,
      interval: activeRes,
      container: containerRef.current,
      library_path: "/static/charting_library/",
      datafeed: datafeed,
      locale: "en" as LanguageCode,
      fullscreen: false,
      autosize: true,
      // Avoid study templates requests; also provide valid storage config
      charts_storage_url: "https://saveload.tradingview.com",
      charts_storage_api_version: "1.1",
      client_id: "tv",
      user_id: "public",
      // Add loading screen for instant feedback
      loading_screen: {
        backgroundColor: currentTheme === "light" ? "#ffffff" : "#0a0a0a",
        foregroundColor: currentTheme === "light" ? "#000000" : "#ffffff",
      },
      // Force initial theme to match app theme to avoid white flash
      theme: (currentTheme === "dark" ? "dark" : "light") as "dark" | "light",
      // Enable screenshot functionality
      snapshot_url: "https://www.tradingview.com/x/",
      // Aggressive performance optimizations for instant loading and live streaming
      debug: false,
      auto_save_delay: 0,
      // Enable instant rendering features for live trading
      enabled_features: [
        "side_toolbar_in_fullscreen_mode",
        "header_in_fullscreen_mode",
        "timezone_menu",
      ],
      // Disable features that slow down loading
      disabled_features: [
        "use_localstorage_for_settings",
        "header_widget",
        "header_compare",
        "header_symbol_search",
        "header_resolutions",
        "header_undo_redo",
        "header_fullscreen_button",
        "header_settings",
        "header_indicators",
        // removed timeframes_toolbar from disabled so we can show it
        "volume_force_overlay",
        "create_volume_indicator_by_default",
        "study_templates",
        "save_chart_properties_to_local_storage",
        "use_localstorage_for_settings",
        "volume_force_overlay",
      ],
      // Show bottom timeframe buttons and UTC/log/auto controls
      time_frames: [
        { text: "1D", resolution: "1D" as ResolutionString },
        { text: "5D", resolution: "30" as ResolutionString },
        { text: "1M", resolution: "240" as ResolutionString },
        { text: "3M", resolution: "1D" as ResolutionString },
        { text: "6M", resolution: "1D" as ResolutionString },
        { text: "1Y", resolution: "1W" as ResolutionString },
      ],
      timezone: "Etc/UTC" as const,
      // Disable default volume indicator from the start
      studies_overrides: {
        "volume.show": false, // Disable default volume indicator
      },
      // Try to disable volume in main chart
      overrides: {
        // Pane/bg colors matched to globals.css background
        "paneProperties.background": appBg,
        "scalesProperties.backgroundColor": appBg,

        "scalesProperties.showVolume": false,
        // Use colors from globals.css
        // "paneProperties.crossHairProperties.color":
        //   theme === "light" ? "#000000" : "#ffffff",
        // "paneProperties.crossHairProperties.width": 1,
        // "paneProperties.crossHairProperties.style": 2, // Dashed line
        // "scalesProperties.lineColor": theme === "light" ? "#000000" : "#ffffff",
        // "scalesProperties.textColor": theme === "light" ? "#000000" : "#ffffff",
        // Additional grid line properties for red color
        // "paneProperties.vertGridProperties.color": "#ef4444",
        // "paneProperties.horzGridProperties.color": "#ef4444",
        // Chart colors using globals.css variables
        "mainSeriesProperties.candleStyle.upColor":
          theme === "light" ? "#22c55e" : "#22c55e",
        "mainSeriesProperties.candleStyle.downColor":
          theme === "light" ? "#ef4444" : "#ef4444",
        "mainSeriesProperties.candleStyle.borderUpColor":
          theme === "light" ? "#16a34a" : "#16a34a",
        "mainSeriesProperties.candleStyle.borderDownColor":
          theme === "light" ? "#dc2626" : "#dc2626",
        "mainSeriesProperties.candleStyle.wickUpColor":
          theme === "light" ? "#16a34a" : "#16a34a",
        "mainSeriesProperties.candleStyle.wickDownColor":
          theme === "light" ? "#dc2626" : "#dc2626",
        // Volume colors and height
        volumePaneSize: "tiny",
        "paneProperties.volumePaneSize": "tiny",
        "scalesProperties.volumePaneSize": "tiny",
        // Force smaller volume pane
        "volume.volume.scale": 0.2,
        "volume.volume.transparency": 0,
      },
    };

    if (widgetRef.current) {
      try {
        widgetRef.current.remove();
      } catch {}
      widgetRef.current = null;
    }

    const tvWidget = new tv.widget(options);
    widgetRef.current = tvWidget;

    // Set background colors immediately to prevent white flash
    try {
      const bgColor = appBg;
      const textColor = currentTheme === "light" ? "#000000" : "#ffffff";

      tvWidget.setCSSCustomProperty("--tv-color-platform-background", bgColor);
      tvWidget.setCSSCustomProperty("--tv-color-pane-background", bgColor);
      tvWidget.setCSSCustomProperty("--themed-color-chart-page-bg", bgColor);
      tvWidget.setCSSCustomProperty("--themed-color-body-bg", bgColor);
      tvWidget.setCSSCustomProperty("--tv-color-text-primary", textColor);
      tvWidget.setCSSCustomProperty("--tv-color-text-secondary", textColor);
    } catch {}

    tvWidget.onChartReady(() => {
      const paneBg =
        resolveCssVarToColor("--background") ||
        (theme === "light" ? "#ffffff" : "#171717");
      const platformBg = paneBg;
      const foregroundColor =
        resolveCssVarToColor("--foreground") ||
        (theme === "light" ? "#000000" : "#ffffff");
      const borderColor =
        resolveCssVarToColor("--border") ||
        (theme === "light" ? "#e5e7eb" : "#374151");

      try {
        // Set background colors
        tvWidget.setCSSCustomProperty(
          "--tv-color-platform-background",
          platformBg
        );
        tvWidget.setCSSCustomProperty("--tv-color-pane-background", paneBg);
        tvWidget.setCSSCustomProperty(
          "--themed-color-chart-page-bg",
          platformBg
        );
        tvWidget.setCSSCustomProperty("--themed-color-body-bg", platformBg);

        // Set text and line colors from globals.css
        tvWidget.setCSSCustomProperty(
          "--tv-color-text-primary",
          foregroundColor
        );
        tvWidget.setCSSCustomProperty(
          "--tv-color-text-secondary",
          foregroundColor
        );
        tvWidget.setCSSCustomProperty("--tv-color-border", borderColor);
        tvWidget.setCSSCustomProperty("--tv-color-grid", "#ef4444"); // Red grid lines

        // Set profit/loss colors from globals.css
        const profitColor = resolveCssVarToColor("--profit") || "#22c55e";
        const lossColor = resolveCssVarToColor("--loss") || "#ef4444";
        tvWidget.setCSSCustomProperty("--tv-color-profit", profitColor);
        tvWidget.setCSSCustomProperty("--tv-color-loss", lossColor);
      } catch {}

      // Mark as loaded
      setIsLoading(false);

      // Crosshair styling is handled via overrides; remove invalid direct API calls
      // (Older/newer library builds may not expose setCrosshairMode/Style.)
      // If needed, adjust via overrides: paneProperties.crossHairProperties

      // Add volume chart below the main chart
      try {
        const chart = tvWidget.chart();

        // Create volume study instantly (no delays at all)
        try {
          // Create volume study immediately without any delays
          chart.createStudy(
            "Volume",
            false,
            false,
            [],
            { heightRatio: 0.15 }, // Set volume pane to 15% of chart height
            (studyId: string) => {
              console.log("Created volume study:", studyId);
              // Configure volume study appearance
              chart.setStudyInputs(studyId, {
                "plot.color": theme === "light" ? "#22c55e" : "#22c55e",
                "plot.transparency": 0,
                "plot.display": "histogram",
                "plot.scale": 0.3, // Reduce volume height to 30%
              });

              // Add Volume SMA overlay on the SAME pane (not separate)
              chart.createStudy(
                "Volume SMA",
                false,
                false,
                [studyId], // This makes it an overlay on the volume study
                null,
                (smaId: string) => {
                  chart.setStudyInputs(smaId, {
                    length: 9,
                    "plot.color": theme === "light" ? "#2196f3" : "#2196f3",
                    "plot.linewidth": 1,
                  });
                }
              );
            }
          );
        } catch (error) {
          console.warn("Failed to create volume study:", error);
        }
      } catch (error) {
        console.warn("Failed to add volume chart:", error);
      }

      // Keep our custom toolbar in sync if user changes resolution elsewhere
      try {
        const chart = tvWidget.chart();
        // Some builds expose onIntervalChanged; guard in case not available
        if (
          chart &&
          typeof (
            chart as {
              onIntervalChanged?: () => {
                subscribe: (callback: (res: string) => void) => void;
              };
            }
          ).onIntervalChanged === "function"
        ) {
          (
            chart as {
              onIntervalChanged: () => {
                subscribe: (callback: (res: string) => void) => void;
              };
            }
          )
            .onIntervalChanged()
            .subscribe((res: string) => {
              const r = res as unknown as ResolutionString;
              setActiveRes(r);
              try {
                localStorage.setItem(STORAGE_KEY, r as unknown as string);
              } catch {}
            });
        }
      } catch {}

      // Force refresh current price to ensure chart shows latest data
      setTimeout(() => {
        if (datafeedRef.current && symbol) {
          datafeedRef.current.refreshCurrentPrice(symbol);
        }
      }, 1000); // Small delay to ensure chart is fully ready

      // Set up periodic refresh to keep chart synchronized
      const refreshInterval = setInterval(() => {
        if (datafeedRef.current && symbol) {
          datafeedRef.current.refreshCurrentPrice(symbol);
        }
      }, 5000); // Refresh every 5 seconds

      // Store interval for cleanup
      (datafeedRef as { refreshInterval?: NodeJS.Timeout }).refreshInterval =
        refreshInterval;
    });

    return () => {
      try {
        // Clear refresh interval
        if (
          (datafeedRef as { refreshInterval?: NodeJS.Timeout }).refreshInterval
        ) {
          clearInterval(
            (datafeedRef as { refreshInterval?: NodeJS.Timeout })
              .refreshInterval
          );
        }
        tvWidget.remove();
      } catch {}
      widgetRef.current = null;
    };
  }, [key, theme, symbol, priceType]);

  // Handle price type change with loading state to prevent white flash
  useEffect(() => {
    setIsChangingPriceType(true);
    // Hide loading after widget recreation completes
    const timer = setTimeout(() => {
      setIsChangingPriceType(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [priceType]);

  // Refresh current price when price type changes
  useEffect(() => {
    if (widgetRef.current && symbol) {
      const datafeed = (
        widgetRef.current as {
          datafeed?: { refreshCurrentPrice?: (symbol: string) => void };
        }
      ).datafeed;
      if (datafeed && typeof datafeed.refreshCurrentPrice === "function") {
        datafeed.refreshCurrentPrice(symbol);
      }
    }
  }, [priceType, symbol]);

  const intervals: { label: string; res: ResolutionString }[] = visibleRes.map(
    (r) => ({
      label: labelFor(r),
      res: r,
    })
  );

  const handleIntervalClick = (res: ResolutionString) => {
    setActiveRes(res);
    try {
      localStorage.setItem(STORAGE_KEY, res as unknown as string);
    } catch {}
    try {
      const tvw = widgetRef.current as {
        chart?: () => {
          setResolution?: (res: ResolutionString, callback: () => void) => void;
        };
      } | null;
      const chart = tvw?.chart?.() ?? null;
      if (chart && typeof chart.setResolution === "function") {
        chart.setResolution(res, () => {});
      }
    } catch {}
  };

  // const handleSelectInterval = (e: React.ChangeEvent<HTMLSelectElement>) => {
  //   const value = e.target.value as unknown as ResolutionString;
  //   if (!value) return;
  //   handleIntervalClick(value);
  // };

  const extraIntervals: { label: string; res: ResolutionString }[] = [
    { label: "3m", res: "3" as ResolutionString },
    { label: "2h", res: "120" as ResolutionString },
    { label: "6h", res: "360" as ResolutionString },
    { label: "12h", res: "720" as ResolutionString },
  ];
  // const [extrasOpen, setExtrasOpen] = useState(false);

  // const extraActive = extraIntervals.find((x) => x.res === activeRes);

  const toggleCustom = (res: ResolutionString) => {
    const exists = (visibleRes as string[]).includes(res as unknown as string);
    if (exists) {
      const next = visibleRes.filter((r) => r !== res);
      persistVisible(next);
    } else {
      const next = [...visibleRes, res];
      // keep a stable ordering based on allIntervals ordering
      const order = (a: ResolutionString, b: ResolutionString) =>
        (allIntervals as string[]).indexOf(a as unknown as string) -
        (allIntervals as string[]).indexOf(b as unknown as string);
      persistVisible(next.sort(order));
    }
  };

  const openIndicators = () => {
    try {
      const tvw = widgetRef.current as {
        executeActionById?: (action: string) => void;
        chart?: () => { executeActionById?: (action: string) => void };
      } | null;
      if (!tvw) return;
      // Try on widget first, then on chart instance
      if (typeof tvw.executeActionById === "function") {
        tvw.executeActionById("insertIndicator");
        return;
      }
      const chart = tvw.chart?.();
      if (chart && typeof chart.executeActionById === "function") {
        chart.executeActionById("insertIndicator");
      }
    } catch {}
  };

  const openSettings = () => {
    try {
      const tvw = widgetRef.current as {
        executeActionById?: (action: string) => void;
        chart?: () => { executeActionById?: (action: string) => void };
      } | null;
      if (!tvw) return;
      // Try on widget first, then on chart instance
      if (typeof tvw.executeActionById === "function") {
        tvw.executeActionById("chartProperties");
        return;
      }
      const chart = tvw.chart?.();
      if (chart && typeof chart.executeActionById === "function") {
        chart.executeActionById("chartProperties");
      }
    } catch {}
  };

  const openCompareSymbols = () => {
    try {
      const tvw = widgetRef.current as {
        executeActionById?: (action: string) => void;
        chart?: () => { executeActionById?: (action: string) => void };
      } | null;
      if (!tvw) return;
      // Try on widget first, then on chart instance
      if (typeof tvw.executeActionById === "function") {
        tvw.executeActionById("compareOrAdd");
        return;
      }
      const chart = tvw.chart?.();
      if (chart && typeof chart.executeActionById === "function") {
        chart.executeActionById("compareOrAdd");
      }
    } catch {}
  };

  const captureScreenshot = () => {
    try {
      const tvw = widgetRef.current as {
        takeScreenshot?: () => void;
        chart?: () => { takeScreenshot?: () => void };
      } | null;
      if (!tvw) return;

      // Use TradingView's built-in screenshot method (not deprecated action)
      if (typeof tvw.takeScreenshot === "function") {
        tvw.takeScreenshot();
        return;
      }

      // Fallback: Try on chart instance
      const chart = tvw.chart?.();
      if (chart && typeof chart.takeScreenshot === "function") {
        chart.takeScreenshot();
      }
    } catch {}
  };

  const toggleFullscreen = () => {
    try {
      const chartContainer = wrapperRef.current || containerRef.current;
      if (!chartContainer) return;

      // Use browser's native fullscreen API for chart container only
      if (!document.fullscreenElement) {
        // Enter fullscreen for chart container
        if (chartContainer.requestFullscreen) {
          chartContainer.requestFullscreen();
        } else if (
          (
            chartContainer as unknown as HTMLElement & {
              mozRequestFullScreen?: () => void;
            }
          ).mozRequestFullScreen
        ) {
          (
            chartContainer as unknown as HTMLElement & {
              mozRequestFullScreen: () => void;
            }
          ).mozRequestFullScreen();
        } else if (
          (
            chartContainer as unknown as HTMLElement & {
              webkitRequestFullscreen?: () => void;
            }
          ).webkitRequestFullscreen
        ) {
          (
            chartContainer as unknown as HTMLElement & {
              webkitRequestFullscreen: () => void;
            }
          ).webkitRequestFullscreen();
        } else if (
          (
            chartContainer as unknown as HTMLElement & {
              msRequestFullscreen?: () => void;
            }
          ).msRequestFullscreen
        ) {
          (
            chartContainer as unknown as HTMLElement & {
              msRequestFullscreen: () => void;
            }
          ).msRequestFullscreen();
        }
      } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (
          (document as Document & { mozCancelFullScreen?: () => void })
            .mozCancelFullScreen
        ) {
          (
            document as Document & { mozCancelFullScreen: () => void }
          ).mozCancelFullScreen();
        } else if (
          (document as Document & { webkitExitFullscreen?: () => void })
            .webkitExitFullscreen
        ) {
          (
            document as Document & { webkitExitFullscreen: () => void }
          ).webkitExitFullscreen();
        } else if (
          (document as Document & { msExitFullscreen?: () => void })
            .msExitFullscreen
        ) {
          (
            document as Document & { msExitFullscreen: () => void }
          ).msExitFullscreen();
        }
      }
    } catch (error) {
      console.error("Fullscreen error:", error);
    }
  };

  // ===== Chart Type Selector =====
  type TvChartTypeAction =
    | "chartTypeBars"
    | "chartTypeCandles"
    | "chartTypeHollowCandle"
    | "chartTypeHeikinAshi"
    | "chartTypeLine"
    | "chartTypeArea"
    | "chartTypeBaseline";

  const chartTypeOptions: { id: TvChartTypeAction; label: string }[] = [
    { id: "chartTypeBars", label: "Bars" },
    { id: "chartTypeCandles", label: "Candles" },
    { id: "chartTypeHollowCandle", label: "Hollow Candles" },
    { id: "chartTypeHeikinAshi", label: "Heikin Ashi" },
    { id: "chartTypeLine", label: "Line" },
    { id: "chartTypeArea", label: "Area" },
    { id: "chartTypeBaseline", label: "Baseline" },
  ];

  const applyChartType = (action: TvChartTypeAction) => {
    try {
      setSelectedChartType(action); // Track selected chart type
      const tvw = widgetRef.current as {
        executeActionById?: (action: string) => void;
        activeChart?: () => { executeActionById?: (action: string) => void };
        chart?: () => {
          executeActionById?: (action: string) => void;
          setChartType?: (id: number) => void;
        };
        applyOverrides?: (overrides: Record<string, unknown>) => void;
      } | null;
      if (!tvw) return;

      // Preferred path
      if (typeof tvw.executeActionById === "function") {
        try {
          tvw.executeActionById(action);
        } catch {}
      }

      const chart =
        typeof tvw.activeChart === "function"
          ? tvw.activeChart()
          : typeof tvw.chart === "function"
          ? tvw.chart()
          : null;
      if (!chart) return;

      // Try action on chart as well
      if (typeof chart.executeActionById === "function") {
        try {
          chart.executeActionById(action);
        } catch {}
      }

      // Always apply a concrete chart type via setChartType as a reliable fallback
      const numericMap: Record<TvChartTypeAction, number> = {
        chartTypeBars: 0, // Bars
        chartTypeCandles: 1, // Candles
        chartTypeHollowCandle: 9, // Hollow Candles
        chartTypeHeikinAshi: 8, // Heikin Ashi
        chartTypeLine: 2, // Line
        chartTypeArea: 3, // Area
        chartTypeBaseline: 8, // Baseline
      };
      const id = numericMap[action];
      if (
        typeof (chart as { setChartType?: (id: number) => void })
          .setChartType === "function" &&
        typeof id === "number"
      ) {
        (chart as { setChartType: (id: number) => void }).setChartType(id);
      }

      // Apply specific overrides for baseline chart type
      if (
        action === "chartTypeBaseline" &&
        typeof tvw.applyOverrides === "function"
      ) {
        const foreground = resolvedTheme === "dark" ? "#ffffff" : "#000000";
        const up = "#22c55e";
        const down = "#ef4444";

        tvw.applyOverrides({
          "mainSeriesProperties.style": 8, // Corrected to 8
          "mainSeriesProperties.baselineStyle.baseLevelPercentage": 50, // Corrected property path
          "mainSeriesProperties.baselineStyle.topFillColor1": up,
          "mainSeriesProperties.baselineStyle.topFillColor2": up,
          "mainSeriesProperties.baselineStyle.topLineColor": up,
          "mainSeriesProperties.baselineStyle.bottomFillColor1": down,
          "mainSeriesProperties.baselineStyle.bottomFillColor2": down,
          "mainSeriesProperties.baselineStyle.bottomLineColor": down,
          "mainSeriesProperties.baselineStyle.topLineWidth": 1,
          "mainSeriesProperties.baselineStyle.bottomLineWidth": 1,
          "mainSeriesProperties.baselineStyle.topLineStyle": 0,
          "mainSeriesProperties.baselineStyle.bottomLineStyle": 0,
          "mainSeriesProperties.priceLineColor": foreground,
        });
      } else if (typeof tvw.applyOverrides === "function") {
        // Last resort: change main series style via overrides for other chart types
        const overrideMap: Record<TvChartTypeAction, number> = {
          chartTypeBars: 0,
          chartTypeCandles: 1,
          chartTypeHollowCandle: 9,
          chartTypeHeikinAshi: 8,
          chartTypeLine: 2,
          chartTypeArea: 3,
          chartTypeBaseline: 8, // Corrected to 8
        };
        const style = overrideMap[action];
        if (typeof style === "number") {
          tvw.applyOverrides({ "mainSeriesProperties.style": style });
        }
      }
    } catch {}
  };

  return (
    <div
      ref={wrapperRef}
      className="border border-border bg-background rounded-none text-sm p-0 h-full w-full tv-no-drag relative"
      style={{
        backgroundColor: currentTheme === "light" ? "#ffffff" : "#0a0a0a",
      }}
    >
      {/* Custom interval toolbar */}
      <TradingViewToolbar
        intervals={intervals}
        activeRes={activeRes}
        handleIntervalClick={handleIntervalClick}
        extraIntervals={extraIntervals}
        allIntervals={allIntervals}
        visibleRes={visibleRes}
        toggleCustom={toggleCustom}
        labelFor={labelFor}
        openIndicators={openIndicators}
        openSettings={openSettings}
        openCompareSymbols={openCompareSymbols}
        priceType={priceType}
        setPriceType={setPriceType}
        captureScreenshot={captureScreenshot}
        toggleFullscreen={toggleFullscreen}
        chartTypeOptions={chartTypeOptions}
        selectedChartType={selectedChartType}
        applyChartType={applyChartType}
      />
      <div
        ref={containerRef}
        className="h-[calc(100%-4rem)] lg:h-[calc(100%-2.25rem)] w-full"
        style={{
          backgroundColor: currentTheme === "light" ? "#ffffff" : "#0a0a0a",
        }}
      />
      <QuickTradePanel parentRef={wrapperRef} symbol={symbol} roomId={roomId} />
      {(isLoading || isChangingPriceType) && (
        <div className="absolute inset-0 flex items-center justify-center bg-background">
          <div className="text-muted-foreground">
            {isChangingPriceType
              ? "Updating price type..."
              : "Loading chart..."}
          </div>
        </div>
      )}
    </div>
  );
}
