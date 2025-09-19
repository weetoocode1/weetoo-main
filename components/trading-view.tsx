import { useEffect, useRef } from "react";
import {
  ChartingLibraryWidgetOptions,
  LanguageCode,
  ResolutionString,
  widget,
} from "@/public/static/charting_library";
import { BinanceDatafeed } from "./binance-datafeed";
import { useTheme } from "next-themes";
import { useLocale } from "next-intl";

export const TradingViewChart = (
  props: Partial<ChartingLibraryWidgetOptions>
) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const tvWidgetRef = useRef<InstanceType<typeof widget> | null>(null);
  const { theme } = useTheme();
  const locale = useLocale();

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

    return () => {
      try {
        tvWidgetInstance.remove();
      } catch (_) {}
      tvWidgetRef.current = null;
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
};
