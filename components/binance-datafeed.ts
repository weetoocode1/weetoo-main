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

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface MarketDataResponse {
  candles?: CandleData[];
  candlesError?: string;
}

class BinanceDatafeed implements IDatafeedChartApi, IExternalDatafeed {
  private baseUrl: string;

  constructor() {
    this.baseUrl = "/api/market-data";
  }

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

    fetch(
      `${this.baseUrl}?symbol=${symbol}&include=candles&interval=${interval}`
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json() as Promise<MarketDataResponse>;
      })
      .then((data) => {
        if (data.candlesError) {
          throw new Error(data.candlesError);
        }

        const bars: Bar[] = (data.candles || []).map(
          (candle: CandleData, index: number) => {
            const bar = {
              time: candle.time * 1000, // Convert to milliseconds
              low: candle.low,
              high: candle.high,
              open: candle.open,
              close: candle.close,
              volume: candle.volume || 0, // Use actual volume data from API
            };

            // Debug log for first few bars to verify volume data
            if (index < 3) {
              console.log("Bar data:", bar);
            }

            return bar;
          }
        );

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
