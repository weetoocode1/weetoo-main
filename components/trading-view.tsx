import { useEffect, useRef } from "react";
import {
  ChartingLibraryWidgetOptions,
  LanguageCode,
  ResolutionString,
  widget,
} from "@/public/static/charting_library";
import { BinanceDatafeed } from "./binance-datafeed";
import { useTheme } from "next-themes";

export const TradingViewChart = (
  props: Partial<ChartingLibraryWidgetOptions>
) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const tvWidgetRef = useRef<InstanceType<typeof widget> | null>(null);
  const initializedRef = useRef(false);
  const { theme } = useTheme();

  // Initialize ONCE
  useEffect(() => {
    if (initializedRef.current) return;
    if (!chartContainerRef.current) return;

    const widgetOptions: ChartingLibraryWidgetOptions = {
      symbol: (props.symbol as string) || "BTCUSDT",
      datafeed: new BinanceDatafeed(),
      interval: props.interval as ResolutionString,
      container: chartContainerRef.current!,
      library_path: props.library_path,
      locale: props.locale as LanguageCode,
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

    const tvWidgetInstance = new widget(widgetOptions);
    tvWidgetRef.current = tvWidgetInstance;
    initializedRef.current = true;

    return () => {
      try {
        tvWidgetInstance.remove();
      } catch (_) {}
      tvWidgetRef.current = null;
      initializedRef.current = false;
    };
    // Intentionally no props in deps to avoid re-creating the widget
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
