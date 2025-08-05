import {
  Bar,
  DatafeedErrorCallback,
  HistoryCallback,
  IDatafeedChartApi,
  IExternalDatafeed,
  LibrarySymbolInfo,
  OnReadyCallback,
  PeriodParams,
  ResolutionString,
  ResolveCallback,
  SearchSymbolsCallback,
  SubscribeBarsCallback,
} from "@/public/static/charting_library/datafeed-api";
import { fetchBinanceCandles } from "@/hooks/use-binance-futures";

class BinanceDatafeed implements IDatafeedChartApi, IExternalDatafeed {
  onReady(callback: OnReadyCallback) {
    setTimeout(
      () =>
        callback({
          supported_resolutions: [
            "1",
            "5",
            "15",
            "30",
            "60",
            "240",
            "1D",
            "1W",
            "1M",
          ] as ResolutionString[],
          // Disable exchanges to prevent symbol search
          exchanges: [],
          // Disable symbols_types to prevent symbol search
          symbols_types: [],
        }),
      0
    );
  }

  searchSymbols(
    userInput: string,
    exchange: string,
    symbolType: string,
    onResult: SearchSymbolsCallback
  ) {
    // Disable built-in symbol search - users should use the custom dropdown instead
    onResult([]);
  }

  resolveSymbol(
    symbolName: string,
    onResolve: ResolveCallback,
    onError: DatafeedErrorCallback
  ) {
    const symbolInfo: LibrarySymbolInfo = {
      name: symbolName,
      ticker: symbolName,
      description: symbolName,
      type: "crypto",
      session: "24x7",
      timezone: "Etc/UTC",
      minmov: 1,
      pricescale: 100,
      has_intraday: true,
      has_daily: true,
      has_weekly_and_monthly: true,
      supported_resolutions: [
        "1",
        "5",
        "15",
        "30",
        "60",
        "240",
        "1D",
        "1W",
        "1M",
      ] as ResolutionString[],
      volume_precision: 2,
      data_status: "streaming",
      exchange: "BINANCE",
      listed_exchange: "BINANCE",
      format: "price",
    };

    onResolve(symbolInfo);
  }

  getBars(
    symbolInfo: LibrarySymbolInfo,
    resolution: ResolutionString,
    periodParams: PeriodParams,
    onResult: HistoryCallback,
    onError: DatafeedErrorCallback
  ) {
    // Convert TradingView resolution to Binance interval
    const intervalMap: { [key: string]: string } = {
      "1": "1m",
      "5": "5m",
      "15": "15m",
      "30": "30m",
      "60": "1h",
      "240": "4h",
      "1D": "1d",
      "1W": "1w",
      "1M": "1M",
    };

    const interval = intervalMap[resolution] || "1d";
    const symbol = symbolInfo.name;

    // Use our centralized utility function
    fetchBinanceCandles(symbol, interval)
      .then((candles) => {
        // Transform candle data to TradingView Bar format
        const bars: Bar[] = candles.map((candle, index) => {
          const bar = {
            time: candle.time * 1000, // Convert to milliseconds
            low: candle.low,
            high: candle.high,
            open: candle.open,
            close: candle.close,
            volume: candle.volume,
          };

          // Debug log for first few bars to verify volume data
          if (index < 3) {
            console.log("Bar data:", bar);
          }

          return bar;
        });

        onResult(bars, { noData: bars.length === 0 });
      })
      .catch((error) => {
        console.error("Error fetching bars:", error);
        onError(error.message);
      });
  }

  subscribeBars(
    symbolInfo: LibrarySymbolInfo,
    resolution: ResolutionString,
    onTick: SubscribeBarsCallback,
    listenerGuid: string,
    onResetCacheNeededCallback: () => void
  ) {
    // For real-time updates, you would implement WebSocket connection here
    // For now, we'll just log that subscription was requested
    console.log(
      "Subscription requested for:",
      symbolInfo.name,
      "with resolution:",
      resolution
    );
  }

  unsubscribeBars(listenerGuid: string) {
    // Clean up real-time subscription
    console.log("Unsubscribing from bars for:", listenerGuid);
  }
}

export { BinanceDatafeed };
