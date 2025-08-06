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
  const { theme } = useTheme();

  useEffect(() => {
    const widgetOptions: ChartingLibraryWidgetOptions = {
      symbol: props.symbol || "BTCUSDT",
      // custom Binance datafeed
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
      theme: theme === "light" ? "light" : "dark",
    };

    const tvWidget = new widget(widgetOptions);

    return () => {
      tvWidget.remove();
    };
  }, [props, theme]);

  return (
    <>
      <div ref={chartContainerRef} className="h-full w-full !bg-background" />
    </>
  );
};
