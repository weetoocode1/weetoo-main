import { WebSocketClient } from "@/lib/websocket/client";
import type { Interval } from "@/types/market";
import type {
  IDatafeedChartApi,
  IExternalDatafeed,
  LibrarySymbolInfo,
  OnReadyCallback,
  ResolveCallback,
  DatafeedErrorCallback,
  SearchSymbolsCallback,
  HistoryCallback,
  PeriodParams,
  SubscribeBarsCallback,
  ResolutionString,
  Bar,
} from "@/public/static/charting_library/datafeed-api";

interface BybitKlineData {
  symbol?: string;
  s?: string;
  interval?: string | number;
  i?: string | number;
  start?: number;
  T?: number;
  ts?: number;
  open?: string | number;
  o?: string | number;
  high?: string | number;
  h?: string | number;
  low?: string | number;
  l?: string | number;
  close?: string | number;
  c?: string | number;
  volume?: string | number;
  v?: string | number;
  confirm?: boolean;
}

interface BybitTickerData {
  symbol?: string;
  lastPrice?: string | number;
  markPrice?: string | number;
}

interface BybitKlineResponse {
  result?: {
    list?: Array<[string, string, string, string, string, string]>;
  };
}

interface SubscriptionData {
  cb: SubscribeBarsCallback;
  symbol: string;
  interval: ResolutionString;
  lastTime?: number;
  lastBar?: Bar;
}

export class BybitUdfDatafeed implements IDatafeedChartApi, IExternalDatafeed {
  private wsClient: WebSocketClient;
  private subs = new Map<string, SubscriptionData>();
  private lastPrice = new Map<string, number>();
  private priceType: "lastPrice" | "markPrice";

  constructor(priceType: "lastPrice" | "markPrice" = "lastPrice") {
    this.priceType = priceType;
    this.wsClient = new WebSocketClient();
    this.wsClient.connect();
    this.wsClient.on("kline", (k: BybitKlineData) => {
      try {
        const symbol: string = k.symbol || k.s || "";
        const interval: string = String(k.interval || k.i || "30");
        const key = `${symbol}|${interval}`;
        const sub = this.subs.get(key);
        if (!sub) return;

        const t = Number(k.start || k.T || k.ts || Date.now());
        const o = Number(k.open || k.o);
        const h = Number(k.high || k.h);
        const l = Number(k.low || k.l);
        const c = Number(k.close || k.c);
        const v = Number(k.volume || k.v || 0);
        const confirm = k.confirm || false;

        if (o <= 0 || h <= 0 || l <= 0 || c <= 0 || v < 0) {
          return;
        }

        const validHigh = Math.max(h, o, c);
        const validLow = Math.min(l, o, c);

        const bar: Bar = {
          time: t,
          open: o,
          high: validHigh,
          low: validLow,
          close: c,
          volume: v,
        };

        // Always update the chart for both confirmed and unconfirmed bars
        if (confirm) {
          sub.lastBar = bar;
          sub.lastTime = t;
          sub.cb(bar);
        } else {
          // For unconfirmed bars, update the current period
          const currentBar = sub.lastBar;
          if (currentBar && currentBar.time === t) {
            const updatedBar: Bar = {
              time: t,
              open: currentBar.open,
              high: Math.max(currentBar.high, validHigh),
              low: Math.min(currentBar.low, validLow),
              close: c,
              volume: v,
            };
            sub.lastBar = updatedBar;
            sub.cb(updatedBar);
          } else {
            sub.lastBar = bar;
            sub.lastTime = t;
            sub.cb(bar);
          }
        }
      } catch (error) {
        console.error("Kline processing error:", error);
      }
    });

    this.wsClient.on("ticker", (tkr: BybitTickerData) => {
      try {
        const symbol: string = tkr.symbol || "";
        if (!symbol) return;

        const selectedPrice =
          this.priceType === "lastPrice"
            ? Number(tkr.lastPrice || 0)
            : Number(tkr.markPrice || 0);

        if (Number.isFinite(selectedPrice) && selectedPrice > 0) {
          this.lastPrice.set(symbol, selectedPrice);

          // Force immediate update for all subscriptions
          this.subs.forEach((sub) => {
            if (sub.symbol !== symbol) return;
            if (!Number.isFinite(selectedPrice) || selectedPrice <= 0) return;

            const intervalMs = this.intervalToMs(sub.interval);
            const now = Date.now();
            const periodStart = Math.floor(now / intervalMs) * intervalMs;

            // Always create a new bar for live updates
            const liveBar: Bar = {
              time: periodStart,
              open:
                sub.lastBar?.time === periodStart
                  ? sub.lastBar.open
                  : selectedPrice,
              high:
                sub.lastBar?.time === periodStart
                  ? Math.max(sub.lastBar.high, selectedPrice)
                  : selectedPrice,
              low:
                sub.lastBar?.time === periodStart
                  ? Math.min(sub.lastBar.low, selectedPrice)
                  : selectedPrice,
              close: selectedPrice,
              volume:
                sub.lastBar?.time === periodStart ? sub.lastBar.volume : 0,
            };

            sub.lastBar = liveBar;
            sub.lastTime = periodStart;
            sub.cb(liveBar);
          });
        }
      } catch (error) {
        console.error("Ticker processing error:", error);
      }
    });
  }

  private intervalToMs(res: ResolutionString): number {
    if (res === "1D") return 24 * 60 * 60 * 1000;
    if (res === "1W") return 7 * 24 * 60 * 60 * 1000;
    if (res === "1M") return 30 * 24 * 60 * 60 * 1000;
    const n = Number(res);
    return isNaN(n) ? 60 * 1000 : n * 60 * 1000;
  }

  private fillGaps(
    bars: Bar[],
    interval: ResolutionString,
    _start: number,
    _end: number
  ): Bar[] {
    if (bars.length === 0) return bars;
    const intervalMs = this.intervalToMs(interval);
    const filledBars: Bar[] = [];
    const firstBarTime = Math.floor(bars[0].time / intervalMs) * intervalMs;
    const lastBarTime =
      Math.floor(bars[bars.length - 1].time / intervalMs) * intervalMs;
    let currentTime = firstBarTime;
    let barIndex = 0;
    while (currentTime <= lastBarTime) {
      const existingBar = bars[barIndex];
      if (existingBar && existingBar.time === currentTime) {
        filledBars.push(existingBar);
        barIndex++;
      } else {
        const prevBar = filledBars[filledBars.length - 1];
        const nextBar = bars[barIndex];
        if (prevBar && nextBar) {
          const gapRatio =
            (currentTime - prevBar.time) / (nextBar.time - prevBar.time);
          filledBars.push({
            time: currentTime,
            open: prevBar.close,
            high: Math.max(prevBar.close, nextBar.open),
            low: Math.min(prevBar.close, nextBar.open),
            close: prevBar.close + (nextBar.open - prevBar.close) * gapRatio,
            volume: 0,
          });
        } else if (prevBar) {
          filledBars.push({
            time: currentTime,
            open: prevBar.close,
            high: prevBar.close,
            low: prevBar.close,
            close: prevBar.close,
            volume: 0,
          });
        }
      }
      currentTime += intervalMs;
    }
    return filledBars.length > 0 ? filledBars : bars;
  }

  onReady(callback: OnReadyCallback) {
    setTimeout(
      () =>
        callback({
          supported_resolutions: [
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
          ] as ResolutionString[],
          exchanges: [],
          symbols_types: [],
          supports_time: true,
          supports_marks: false,
          supports_timescale_marks: false,
        }),
      0
    );
  }

  searchSymbols(
    userInput: string,
    _exchange: string,
    _symbolType: string,
    onResult: SearchSymbolsCallback
  ) {
    try {
      const fetchSymbols = async () => {
        try {
          const response = await fetch(
            "https://api.bybit.com/v5/market/instruments-info?category=linear&status=Trading"
          );
          const data = await response.json();
          if (data.retCode === 0 && data.result?.list) {
            const symbols = data.result.list.map(
              (instrument: Record<string, unknown>) => ({
                symbol: instrument.symbol as string,
                full_name: instrument.symbol as string,
                description: `${instrument.baseCoin as string} ${
                  instrument.quoteCoin as string
                } Perpetual`,
                exchange: "BYBIT",
                ticker: instrument.symbol as string,
                type: "crypto",
              })
            );
            const filteredSymbols = symbols.filter(
              (symbol: { symbol: string; description: string }) =>
                symbol.symbol.toLowerCase().includes(userInput.toLowerCase()) ||
                symbol.description
                  .toLowerCase()
                  .includes(userInput.toLowerCase())
            );
            onResult(filteredSymbols);
          } else {
            onResult([]);
          }
        } catch (_error) {
          onResult([]);
        }
      };
      fetchSymbols();
    } catch (_error) {
      onResult([]);
    }
  }

  resolveSymbol(
    symbolName: string,
    onResolve: ResolveCallback,
    onError: DatafeedErrorCallback
  ) {
    try {
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
        ] as ResolutionString[],
        volume_precision: 3,
        data_status: "streaming",
        exchange: "BYBIT",
        listed_exchange: "BYBIT",
        format: "price",
      };
      setTimeout(() => onResolve(symbolInfo), 0);
    } catch (e: unknown) {
      const errorMessage =
        e instanceof Error ? e.message : "resolveSymbol failed";
      setTimeout(() => onError(errorMessage), 0);
    }
  }

  getBars(
    symbolInfo: LibrarySymbolInfo,
    resolution: ResolutionString,
    periodParams: PeriodParams,
    onResult: HistoryCallback,
    onError: DatafeedErrorCallback
  ) {
    const symbol = symbolInfo.name || "BTCUSDT";
    const intervalMap: Record<string, string> = {
      "1": "1",
      "3": "3",
      "5": "5",
      "15": "15",
      "30": "30",
      "60": "60",
      "120": "120",
      "240": "240",
      "360": "360",
      "720": "720",
      "1D": "D",
      "1W": "W",
      "1M": "M",
    };
    const interval = intervalMap[resolution] || "30";

    const toSec = periodParams.to || Math.floor(Date.now() / 1000);
    let fromSec = periodParams.from as number | undefined;
    if (!fromSec) {
      switch (resolution) {
        case "1":
        case "3":
        case "5":
          fromSec = toSec - 7 * 24 * 60 * 60;
          break;
        case "15":
        case "30":
          fromSec = toSec - 30 * 24 * 60 * 60;
          break;
        case "60":
        case "240":
          fromSec = toSec - 180 * 24 * 60 * 60;
          break;
        case "1D":
          fromSec = toSec - 2 * 365 * 24 * 60 * 60;
          break;
        case "1W":
          fromSec = toSec - 5 * 365 * 24 * 60 * 60;
          break;
        case "1M":
          fromSec = toSec - 10 * 365 * 24 * 60 * 60;
          break;
        default:
          fromSec = toSec - 500 * 60;
      }
    }

    const start = (fromSec as number) * 1000;
    const end = toSec * 1000;
    const category = "linear";
    const url = `https://api.bybit.com/v5/market/kline?category=${category}&symbol=${symbol}&interval=${interval}&start=${start}&end=${end}&limit=1000`;

    fetch(url)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const json: BybitKlineResponse = await r.json();
        const list = json?.result?.list || [];
        const ordered = list.slice().reverse();
        const validBars: Bar[] = [];
        for (const c of ordered) {
          const time = Number(c[0]);
          const open = Number(c[1]);
          const high = Number(c[2]);
          const low = Number(c[3]);
          const close = Number(c[4]);
          const volume = Number(c[5]);
          if (
            time <= 0 ||
            open <= 0 ||
            high <= 0 ||
            low <= 0 ||
            close <= 0 ||
            volume < 0
          ) {
            continue;
          }
          const validHigh = Math.max(high, open, close);
          const validLow = Math.min(low, open, close);
          validBars.push({
            time: time as number,
            open,
            high: validHigh,
            low: validLow,
            close,
            volume,
          });
        }

        const bars = validBars.sort((a, b) => a.time - b.time);
        let finalBars = bars;
        if (
          (resolution === "1W" || resolution === "1M") &&
          finalBars.length === 0
        ) {
          try {
            const dailyUrl = `https://api.bybit.com/v5/market/kline?category=${category}&symbol=${symbol}&interval=D&start=${start}&end=${end}&limit=1000`;
            const resp = await fetch(dailyUrl);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const j: BybitKlineResponse = await resp.json();
            const dl = j?.result?.list || [];
            const daily = dl
              .slice()
              .reverse()
              .map((c) => ({
                time: Number(c[0]) as number,
                open: Number(c[1]),
                high: Number(c[2]),
                low: Number(c[3]),
                close: Number(c[4]),
                volume: Number(c[5]),
              }))
              .filter(
                (b) =>
                  b.time > 0 &&
                  b.open > 0 &&
                  b.high > 0 &&
                  b.low > 0 &&
                  b.close > 0
              )
              .sort((a, b) => a.time - b.time);
            const aggregated: Bar[] = [];
            const isWeekly = resolution === "1W";
            let bucket: Bar | null = null;
            const startOfWeek = (t: number) => {
              const d = new Date(t);
              const day = (d.getUTCDay() + 6) % 7;
              d.setUTCDate(d.getUTCDate() - day);
              d.setUTCHours(0, 0, 0, 0);
              return d.getTime();
            };
            const startOfMonth = (t: number) => {
              const d = new Date(t);
              d.setUTCDate(1);
              d.setUTCHours(0, 0, 0, 0);
              return d.getTime();
            };
            const bucketStart = (t: number) =>
              isWeekly ? startOfWeek(t) : startOfMonth(t);
            for (const b of daily as Bar[]) {
              const bs = bucketStart(b.time);
              if (!bucket || bucket.time !== bs) {
                if (bucket) aggregated.push({ ...bucket } as Bar);
                bucket = {
                  time: bs,
                  open: b.open,
                  high: b.high,
                  low: b.low,
                  close: b.close,
                  volume: (b.volume ?? 0) as number,
                } as Bar;
              } else {
                bucket.high = Math.max(bucket.high, b.high);
                bucket.low = Math.min(bucket.low, b.low);
                bucket.close = b.close;
                bucket.volume = ((bucket.volume ?? 0) +
                  (b.volume ?? 0)) as number;
              }
            }
            if (bucket) aggregated.push({ ...bucket } as Bar);
            finalBars = aggregated.sort((a, b) => a.time - b.time);
          } catch {}
        }

        const filledBars = this.fillGaps(finalBars, resolution, start, end);
        setTimeout(
          () => onResult(filledBars, { noData: filledBars.length === 0 }),
          0
        );
      })
      .catch((e) => {
        setTimeout(() => onError(e?.message || "Failed to load bars"), 0);
      });
  }

  subscribeBars(
    symbolInfo: LibrarySymbolInfo,
    resolution: ResolutionString,
    onTick: SubscribeBarsCallback,
    listenerGuid: string,
    _onResetCacheNeededCallback: () => void
  ) {
    const intervalMap: Record<string, string> = {
      "1": "1",
      "3": "3",
      "5": "5",
      "15": "15",
      "30": "30",
      "60": "60",
      "120": "120",
      "240": "240",
      "360": "360",
      "720": "720",
      "1D": "D",
      "1W": "W",
      "1M": "M",
    };
    const interval = intervalMap[resolution] || "30";
    const symbol = symbolInfo.name || "BTCUSDT";
    this.subs.set(`${symbol}|${interval}`, {
      cb: onTick,
      symbol,
      interval: resolution,
      lastTime: undefined,
      lastBar: undefined,
    });
    try {
      this.wsClient.subscribeToKlines(symbol as string, interval as Interval);
      this.wsClient.subscribeToTicker(symbol as string);
    } catch {}
    const last = this.lastPrice.get(symbol);
    if (Number.isFinite(last) && (last as number) > 0) {
      const intervalMs = this.intervalToMs(resolution);
      const now = Date.now();
      const periodStart = Math.floor(now / intervalMs) * intervalMs;
      onTick({
        time: periodStart,
        open: last as number,
        high: last as number,
        low: last as number,
        close: last as number,
        volume: 0,
      });
    }
  }

  unsubscribeBars(_listenerGuid: string) {
    this.subs.clear();
  }

  updatePriceType(newPriceType: "lastPrice" | "markPrice") {
    this.priceType = newPriceType;
  }

  // Force refresh current price for immediate chart update
  async refreshCurrentPrice(symbol: string): Promise<void> {
    try {
      const response = await fetch(
        `https://api.bybit.com/v5/market/tickers?category=linear&symbol=${symbol}`
      );
      const data = await response.json();

      if (data.retCode === 0 && data.result?.list?.[0]) {
        const ticker = data.result.list[0];
        const selectedPrice =
          this.priceType === "lastPrice"
            ? Number(ticker.lastPrice || 0)
            : Number(ticker.markPrice || 0);

        if (Number.isFinite(selectedPrice) && selectedPrice > 0) {
          this.lastPrice.set(symbol, selectedPrice);

          // Force immediate update for all subscriptions
          this.subs.forEach((sub) => {
            if (sub.symbol !== symbol) return;

            const intervalMs = this.intervalToMs(sub.interval);
            const now = Date.now();
            const periodStart = Math.floor(now / intervalMs) * intervalMs;

            const liveBar: Bar = {
              time: periodStart,
              open:
                sub.lastBar?.time === periodStart
                  ? sub.lastBar.open
                  : selectedPrice,
              high:
                sub.lastBar?.time === periodStart
                  ? Math.max(sub.lastBar.high, selectedPrice)
                  : selectedPrice,
              low:
                sub.lastBar?.time === periodStart
                  ? Math.min(sub.lastBar.low, selectedPrice)
                  : selectedPrice,
              close: selectedPrice,
              volume:
                sub.lastBar?.time === periodStart ? sub.lastBar.volume : 0,
            };

            sub.lastBar = liveBar;
            sub.lastTime = periodStart;
            sub.cb(liveBar);
          });
        }
      }
    } catch (error) {
      console.error("Failed to refresh current price:", error);
    }
  }
}
