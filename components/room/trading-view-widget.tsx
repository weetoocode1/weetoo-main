"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    TradingView: {
      widget: new (config: {
        container_id: string;
        symbol: string;
        interval: string;
        timezone: string;
        theme: string;
        style: string;
        locale: string;
        backgroundColor: string;
        hide_side_toolbar: boolean;
        hide_top_toolbar: boolean;
        save_image: boolean;
        withdateranges: boolean;
        height: string;
        width: string;
        support_host: string;
      }) => void;
    };
  }
}

interface TradingViewWidgetProps {
  symbol: string;
}

export function TradingViewWidget({ symbol }: TradingViewWidgetProps) {
  const container = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    // Remove previous widget if exists
    if (container.current) {
      container.current.innerHTML = "";
    }
    // Remove previous script if exists
    const prevScript = document.getElementById(`tradingview-script-${symbol}`);
    if (prevScript) prevScript.remove();

    const script = document.createElement("script");
    script.id = `tradingview-script-${symbol}`;
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => {
      if (typeof window.TradingView !== "undefined" && container.current) {
        new window.TradingView.widget({
          container_id: container.current.id,
          symbol: symbol,
          interval: "D",
          timezone: "Asia/Seoul",
          theme: theme === "light" ? "light" : "dark",
          style: "1",
          locale: "kr",
          backgroundColor: theme === "light" ? "#fff" : "rgba(0, 0, 0, 1)",
          hide_side_toolbar: false,
          hide_top_toolbar: false,
          save_image: false,
          withdateranges: true,
          height: "100%",
          width: "100%",
          support_host: "https://www.tradingview.com",
        });
      }
    };
    document.head.appendChild(script);

    return () => {
      if (container.current) {
        container.current.innerHTML = "";
      }
      const prevScript = document.getElementById(
        `tradingview-script-${symbol}`
      );
      if (prevScript) prevScript.remove();
    };
  }, [symbol, theme]);

  return (
    <div
      id={`tradingview_${symbol}`}
      ref={container}
      className="w-full h-full"
    />
  );
}
