"use client";

import {
  ResolutionString,
  LanguageCode,
  ChartingLibraryWidgetOptions,
} from "@/public/static/charting_library";
import dynamic from "next/dynamic";
import Script from "next/script";
import React, { useCallback, useMemo, useState } from "react";

// Dynamic import for TradingView chart
const TradingViewChart = dynamic(
  () => import("@/components/trading-view").then((mod) => mod.TradingViewChart),
  { ssr: false }
);

interface TradingViewChartProps {
  symbol: string;
  isHost?: boolean;
}

export const TradingViewChartComponent = React.memo(
  ({ symbol, isHost = false }: TradingViewChartProps) => {
    const [isScriptReady, setIsScriptReady] = useState(false);

    console.log("TradingViewChartComponent - isHost:", isHost);

    const widgetProps = useMemo(
      (): Partial<ChartingLibraryWidgetOptions> => ({
        symbol: symbol,
        interval: "1D" as ResolutionString,
        library_path: "/static/charting_library/",
        locale: "en" as LanguageCode,
        charts_storage_url: "https://saveload.tradingview.com",
        charts_storage_api_version: "1.1" as const,
        client_id: "tradingview.com",
        user_id: "public_user_id",
        fullscreen: false,
        autosize: true,
        disabled_features: isHost
          ? ["use_localstorage_for_settings"]
          : [
              "use_localstorage_for_settings",
              "left_toolbar",
              "header_widget",
              "header_compare",
              "header_undo_redo",
              "header_screenshot",
              "header_fullscreen_button",
              "header_settings",
              "header_indicators",
              "header_chart_type",
              "header_symbol_search",
              "header_resolutions",
              "header_saveload",
              "timeframes_toolbar",
              "control_bar",
            ],
      }),
      [symbol, isHost]
    );

    const handleScriptReady = useCallback(() => {
      setIsScriptReady(true);
    }, []);

    return (
      <div data-testid="trading-view-chart" className="w-full h-full">
        <Script
          src="/static/datafeeds/udf/dist/bundle.js"
          strategy="lazyOnload"
          onReady={handleScriptReady}
        />
        {isScriptReady && <TradingViewChart key={symbol} {...widgetProps} />}
      </div>
    );
  }
);

TradingViewChartComponent.displayName = "TradingViewChartComponent";
