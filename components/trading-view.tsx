import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import {
  ChartingLibraryWidgetOptions,
  LanguageCode,
  ResolutionString,
  widget,
} from "@/public/static/charting_library";
import { BinanceDatafeed } from "./binance-datafeed";
import { useTheme } from "next-themes";
import { useLocale } from "next-intl";

export interface TradingViewChartRef {
  getWidget: () => InstanceType<typeof widget> | null;
  isReady: () => boolean;
  priceToY?: (price: number) => number | null;
}

export const TradingViewChart = forwardRef<
  TradingViewChartRef,
  Partial<ChartingLibraryWidgetOptions>
>((props, ref) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const tvWidgetRef = useRef<InstanceType<typeof widget> | null>(null);
  const isReadyRef = useRef(false);
  const { theme } = useTheme();
  const locale = useLocale();

  useImperativeHandle(ref, () => ({
    getWidget: () => tvWidgetRef.current,
    isReady: () => isReadyRef.current,
    priceToY: (price: number) => {
      try {
        const w = tvWidgetRef.current;
        if (!w) return null;
        const chartUnknown =
          typeof w.activeChart === "function" ? w.activeChart() : undefined;
        if (!chartUnknown) return null;
        const chart = chartUnknown as {
          getSeries?: () => unknown;
          _model?: { paneForSource?: (src: unknown) => unknown };
        };
        const seriesWrapper =
          typeof chart.getSeries === "function" ? chart.getSeries() : undefined;
        const series = (seriesWrapper as { _series?: unknown } | undefined)
          ?._series;
        if (!series) return null;
        const paneUnknown = chart._model?.paneForSource?.(series);
        const pane = paneUnknown as
          | {
              priceScale?: (
                id?: unknown
              ) => { priceToCoordinate?: (p: number) => unknown } | undefined;
            }
          | undefined;
        // support both id and object forms
        const priceScaleId = (
          series as { _priceScale?: { _id?: string } | string } | undefined
        )?._priceScale as { _id?: string } | string | undefined;
        const ps = pane?.priceScale?.(
          typeof priceScaleId === "object" ? priceScaleId?._id : priceScaleId
        );
        const coord = ps?.priceToCoordinate?.(price);
        return typeof coord === "number" ? coord : null;
      } catch (_) {
        return null;
      }
    },
  }));

  // Initialize, rebuild on locale change to update TradingView UI language instantly
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const widgetOptions: ChartingLibraryWidgetOptions = {
      symbol: (props.symbol as string) || "BTCUSDT",
      datafeed: new BinanceDatafeed(),
      interval: props.interval as ResolutionString,
      container: chartContainerRef.current!,
      library_path: props.library_path,
      locale:
        (props.locale as LanguageCode) ||
        ((locale === "ko" ? "ko" : "en") as LanguageCode),
      disabled_features: props.disabled_features || [
        "use_localstorage_for_settings",
      ],
      enabled_features: ["study_templates"],
      charts_storage_url: props.charts_storage_url,
      charts_storage_api_version: props.charts_storage_api_version,
      client_id: props.client_id,
      user_id: props.user_id,
      fullscreen: props.fullscreen,
      autosize: props.autosize,
      // Use current theme only at init to avoid rebuilds on theme change
      theme: theme === "light" ? "light" : "dark",
    };

    // Dispose any existing instance before creating a new one (locale change)
    if (tvWidgetRef.current) {
      try {
        tvWidgetRef.current.remove();
      } catch (_) {}
      tvWidgetRef.current = null;
    }

    const tvWidgetInstance = new widget(widgetOptions);
    tvWidgetRef.current = tvWidgetInstance;

    // Use onChartReady callback to ensure widget is fully initialized
    tvWidgetInstance.onChartReady(() => {
      console.log("🎯 TradingView chart is ready!");

      // Add a more comprehensive check for widget readiness
      const checkAPI = (attempt = 0) => {
        const maxAttempts = 20; // Increase max attempts
        const delay = 250; // Increase delay between attempts

        console.log(
          `🔍 Checking API availability (attempt ${attempt + 1}/${maxAttempts})`
        );

        try {
          // Check if widget has activeChart method
          if (
            !tvWidgetInstance ||
            typeof tvWidgetInstance.activeChart !== "function"
          ) {
            console.log(
              `❌ activeChart method not available (attempt ${
                attempt + 1
              }/${maxAttempts})`
            );
            if (attempt < maxAttempts) {
              setTimeout(() => checkAPI(attempt + 1), delay);
            } else {
              console.error(
                "❌ Max attempts reached - activeChart method never became available"
              );
            }
            return;
          }

          // Try to call activeChart
          const chart = tvWidgetInstance.activeChart();
          console.log("📊 Chart object:", chart);

          if (!chart) {
            console.log(
              `❌ Chart object is null/undefined (attempt ${
                attempt + 1
              }/${maxAttempts})`
            );
            if (attempt < maxAttempts) {
              setTimeout(() => checkAPI(attempt + 1), delay);
            } else {
              console.error(
                "❌ Max attempts reached - Chart object never became available"
              );
            }
            return;
          }

          // Check if chart has getSeries method
          if (typeof chart.getSeries !== "function") {
            console.log(
              `❌ getSeries method not available (attempt ${
                attempt + 1
              }/${maxAttempts})`
            );
            if (attempt < maxAttempts) {
              setTimeout(() => checkAPI(attempt + 1), delay);
            } else {
              console.error(
                "❌ Max attempts reached - getSeries method never became available"
              );
            }
            return;
          }

          // All checks passed
          console.log("✅ TradingView API methods are fully available!");
          isReadyRef.current = true;
        } catch (error) {
          console.log(
            `❌ Error checking API (attempt ${attempt + 1}/${maxAttempts}):`,
            error
          );
          if (attempt < maxAttempts) {
            setTimeout(() => checkAPI(attempt + 1), delay);
          } else {
            console.error("❌ Max attempts reached - API check failed");
          }
        }
      };

      // Start checking for API availability
      checkAPI();
    });

    return () => {
      try {
        tvWidgetInstance.remove();
      } catch (_) {}
      tvWidgetRef.current = null;
      isReadyRef.current = false;
    };
  }, [locale]);

  // Update symbol without rebuilding
  useEffect(() => {
    if (!tvWidgetRef.current || !props.symbol) return;
    try {
      tvWidgetRef.current.activeChart().setSymbol(props.symbol as string);
    } catch (_) {}
  }, [props.symbol]);

  return (
    <div ref={chartContainerRef} className="h-full w-full !bg-background" />
  );
});

TradingViewChart.displayName = "TradingViewChart";
