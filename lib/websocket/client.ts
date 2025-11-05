// ===== WEBSOCKET CLIENT UTILITY =====
// Client-side utility for connecting to our WebSocket server
// Handles connection management and message parsing

import type {
  ConnectionStatus,
  Interval,
  KlineData,
  OrderBookData,
  Symbol,
  TickerData,
  TradeData,
} from "@/types/market";
import { EventEmitter } from "events";

// Get WebSocket URL dynamically
async function getWebSocketUrl(): Promise<string> {
  // 1) Prefer explicit env, which Next.js inlines on the client
  const envUrl = process.env.NEXT_PUBLIC_WS_URL;
  if (envUrl && typeof envUrl === "string" && envUrl.trim().length > 0) {
    return envUrl;
  }

  // 2) Try dynamic discovery from our API (same-origin)
  try {
    const response = await fetch("/api/websocket");
    if (!response.ok) {
      throw new Error(`API responded with ${response.status}`);
    }

    const data = await response.json();

    if (data.success && data.data?.port) {
      const isSecure =
        typeof window !== "undefined" && window.location.protocol === "https:";
      const scheme = isSecure ? "wss" : "ws";
      const host =
        typeof window !== "undefined" ? window.location.hostname : "localhost";
      const port = data.data.port;

      return `${scheme}://${host}:${port}`;
    }
  } catch (error) {
    console.warn("Failed to get WebSocket URL from API:", error);
  }

  // 3) Safe final fallback - use Bybit directly for production
  const isSecure =
    typeof window !== "undefined" && window.location.protocol === "https:";

  // For production (Vercel), use Bybit directly
  if (
    typeof window !== "undefined" &&
    window.location.hostname.includes("vercel.app")
  ) {
    return "wss://stream.bybit.com/v5/public/linear";
  }

  // For local development, use local server
  const scheme = isSecure ? "wss" : "ws";
  const host =
    typeof window !== "undefined" ? window.location.hostname : "localhost";
  const port = isSecure ? 443 : 8080;
  return `${scheme}://${host}:${port}`;
}

interface ClientMessage {
  type: string;
  data: unknown;
}

export class WebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private url: string;
  private directBybitMode: boolean = false;
  private reconnectInterval: number;
  private maxReconnectAttempts: number;
  private reconnectAttempts: number = 0;
  private isConnecting: boolean = false;
  private isDestroyed: boolean = false;
  private subscriptions: Set<string> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  // Direct-Bybit order book buffering (snapshot + queued deltas)
  private obSnapshots: Map<
    string,
    { b: string[][]; a: string[][]; s?: string }
  > = new Map();
  private obQueues: Map<string, Array<{ b?: string[][]; a?: string[][] }>> =
    new Map();
  private currentTickerData = new Map<string, TickerData>();
  private obEmitInterval: NodeJS.Timeout | null = null;

  private getCurrentTickerPrice(symbol: string): {
    lastPrice: string;
    markPrice: string;
  } {
    const ticker = this.currentTickerData.get(symbol);
    return {
      lastPrice: ticker?.lastPrice || "0",
      markPrice: ticker?.markPrice || "0",
    };
  }

  constructor(
    config: {
      url?: string;
      reconnectInterval?: number;
      maxReconnectAttempts?: number;
    } = {}
  ) {
    super();

    // Prefer env-driven URL; will be updated dynamically on connect()
    const envUrl = process.env.NEXT_PUBLIC_WS_URL;
    this.url =
      config.url ||
      (envUrl && envUrl.trim().length > 0 ? envUrl : "ws://localhost:8080");
    this.reconnectInterval = config.reconnectInterval || 2000; // Faster initial reconnect
    this.maxReconnectAttempts = config.maxReconnectAttempts || 20; // More attempts
  }

  // ===== CONNECTION MANAGEMENT =====

  async connect(): Promise<void> {
    if (this.isConnecting || this.isDestroyed) {
      return;
    }

    this.isConnecting = true;
    this.emit("status", {
      connected: false,
      reconnecting: true,
    } as ConnectionStatus);

    try {
      // Resolve target URL from env/discovery
      this.url = await getWebSocketUrl();
      // Detect direct Bybit connection from env (mainnet/testnet)
      this.directBybitMode = /stream(-testnet|-demo)?\.bybit\.com/.test(
        this.url
      );
      console.log(`🔌 Attempting to connect to WebSocket: ${this.url}`);

      // Only ensure internal server if not using direct Bybit mode
      if (!this.directBybitMode) {
        const serverAvailable = await this.testServerAvailability();
        if (!serverAvailable) {
          console.log(
            "⚠️ WebSocket server not available, attempting to start it..."
          );
          await this.attemptServerStart();
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }

      this.ws = new WebSocket(this.url);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
    } catch (error) {
      console.error("❌ Failed to initialize WebSocket connection:", error);
      this.handleError(error as Event);
    }
  }

  // ===== SERVER AVAILABILITY TESTING =====

  private async testServerAvailability(): Promise<boolean> {
    try {
      const response = await fetch("/api/websocket", {
        method: "GET",
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (response.ok) {
        const data = await response.json();
        return data.success && data.data?.running === true;
      }

      return false;
    } catch (error) {
      console.log("🔍 Server availability test failed:", error);
      return false;
    }
  }

  private handleOpen(): void {
    this.isConnecting = false;
    this.reconnectAttempts = 0;

    console.log(`✅ WebSocket connected to: ${this.url}`);

    this.emit("status", {
      connected: true,
      reconnecting: false,
      lastConnected: new Date(),
    } as ConnectionStatus);

    this.startHeartbeat();
    this.startDirectOrderBookProcessing();

    // Add small delay before resubscribing to ensure connection is stable
    setTimeout(() => {
      this.resubscribeAll();
    }, 1000);
  }

  private handleClose(event: CloseEvent): void {
    this.isConnecting = false;
    this.stopHeartbeat();
    this.stopDirectOrderBookProcessing();

    this.emit("status", {
      connected: false,
      reconnecting: false,
      error: `Connection closed: ${event.code} - ${event.reason}`,
    } as ConnectionStatus);

    // Handle different close codes with industry-standard approaches
    if (event.code !== 1000 && event.code !== 1001) {
      console.log(
        `❌ WebSocket disconnected: ${event.code} - ${
          event.reason || "No reason provided"
        }`
      );

      // Industry-standard handling for common error codes
      if (event.code === 1006) {
        console.log("💡 Error 1006: Connection closed abnormally");
        if (!this.directBybitMode) {
          console.log("   🔧 Attempting automatic server startup...");
          // For 1006 errors against our proxy, try to start the server immediately
          this.attemptServerStart();
          return; // Don't use normal reconnection logic for 1006
        }
      } else if (event.code === 1002) {
        console.log("💡 Error 1002: Protocol error - invalid data received");
      } else if (event.code === 1003) {
        console.log("💡 Error 1003: Unsupported data type");
      } else if (event.code === 1011) {
        console.log("💡 Error 1011: Server error - internal server error");
      } else if (event.code === 1012) {
        console.log("💡 Error 1012: Service restart - server restarting");
      }
    }

    if (!this.isDestroyed) {
      this.scheduleReconnect();
    }
  }

  private handleError(error: Event): void {
    this.isConnecting = false;
    this.stopHeartbeat();
    this.stopDirectOrderBookProcessing();

    this.emit("status", {
      connected: false,
      reconnecting: false,
      error: "Connection error",
    } as ConnectionStatus);

    if (!this.isDestroyed) {
      this.scheduleReconnect();
    }
  }

  // ===== RECONNECTION LOGIC =====

  private scheduleReconnect(): void {
    if (
      this.isDestroyed ||
      this.reconnectAttempts >= this.maxReconnectAttempts
    ) {
      this.emit("status", {
        connected: false,
        reconnecting: false,
        error: "Max reconnection attempts reached",
      } as ConnectionStatus);

      // Try to start WebSocket server if max attempts reached (proxy mode only)
      if (!this.directBybitMode) {
        this.attemptServerStart();
      }
      return;
    }

    this.reconnectAttempts++;

    // Industry-standard exponential backoff with jitter
    const baseDelay = Math.min(
      this.reconnectInterval *
        Math.pow(2, Math.min(this.reconnectAttempts - 1, 5)), // Exponential backoff, max 2^5
      30000 // Max 30 seconds
    );

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 1000; // 0-1 second jitter
    const delay = baseDelay + jitter;

    console.log(
      `🔄 Scheduling reconnect attempt ${this.reconnectAttempts}/${
        this.maxReconnectAttempts
      } in ${Math.round(delay)}ms`
    );

    setTimeout(() => {
      if (!this.isDestroyed && !this.isConnecting) {
        this.connect();
      }
    }, delay);
  }

  // ===== SERVER STARTUP LOGIC =====

  private async attemptServerStart(): Promise<void> {
    try {
      console.log("🚀 Attempt ing to start WebSocket server...");

      const response = await fetch("/api/websocket", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "start" }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("✅ WebSocket server started:", result.message);

        // Reset reconnection attempts and try connecting again
        this.reconnectAttempts = 0;
        setTimeout(() => {
          if (!this.isDestroyed) {
            this.connect();
          }
        }, 2000); // Wait 2 seconds for server to be ready
      } else {
        console.error(
          "❌ Failed to start WebSocket server:",
          await response.text()
        );
      }
    } catch (error) {
      console.error("❌ Error starting WebSocket server:", error);
    }
  }

  // ===== HEARTBEAT MANAGEMENT =====

  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        try {
          // Always use application-level ping for browser compatibility
          this.sendMessage({ type: "ping", data: { t: Date.now() } });
          // Silent ping - no console logs
        } catch (error) {
          // Silent error handling - don't spam console
          this.handleError(error as Event);
        }
      } else if (!this.isConnecting) {
        // Silent reconnection attempt with jitter
        const jitter = Math.random() * 2000; // 0-2 second jitter
        setTimeout(() => {
          if (!this.isConnecting) {
            this.connect();
          }
        }, jitter);
      }
    }, 45000); // 45s heartbeat (conservative, avoids timer churn)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // ===== SUBSCRIPTION MANAGEMENT =====

  subscribe(topic: string): void {
    this.subscriptions.add(topic);
    // console.log(
    //   `📡 Subscribing to topic: ${topic} (Direct Bybit: ${this.directBybitMode})`
    // );
    if (this.ws?.readyState === WebSocket.OPEN) {
      if (this.directBybitMode) {
        // Bybit expects { op: 'subscribe', args: [topic] }
        const message = { op: "subscribe", args: [topic] };
        // console.log(`📤 Sending Bybit subscription:`, message);
        this.ws.send(JSON.stringify(message));
      } else {
        this.sendMessage({ type: "subscribe", data: { topic } });
      }
    } else {
      console.log(`⚠️ WebSocket not ready, topic queued: ${topic}`);
    }
  }

  unsubscribe(topic: string): void {
    this.subscriptions.delete(topic);
    if (this.ws?.readyState === WebSocket.OPEN) {
      if (this.directBybitMode) {
        this.ws.send(JSON.stringify({ op: "unsubscribe", args: [topic] }));
      } else {
        this.sendMessage({ type: "unsubscribe", data: { topic } });
      }
    }
  }

  private resubscribeAll(): void {
    this.subscriptions.forEach((topic) => {
      this.sendMessage({ type: "subscribe", data: { topic } });
    });
  }

  // ===== MESSAGE HANDLING =====

  private handleMessage(event: MessageEvent): void {
    try {
      const messageString = event.data.toString();
      const parsed = JSON.parse(messageString);

      // Debug: Log all incoming messages to understand the format
      if (parsed?.topic || parsed?.success !== undefined) {
        // console.log("📨 Raw message:", parsed);
      }

      if (this.directBybitMode) {
        // Handle subscription confirmations
        if (parsed?.success !== undefined) {
          // console.log("📝 Subscription response:", parsed);
          return;
        }

        // Bybit format: { topic, data, type }
        const topic: string | undefined = parsed?.topic;
        const data = parsed?.data;
        const type: string | undefined = parsed?.type;

        if (typeof topic === "string") {
          // console.log("📨 Processing message:", {
          //   topic,
          //   type,
          //   hasData: !!data,
          // });

          if (topic.startsWith("tickers.")) {
            const tickerData = this.mapBybitTickerData(data);
            // Store current ticker data for price synchronization
            this.currentTickerData.set(tickerData.symbol, tickerData);
            // console.log(
            //   `📊 Ticker price for ${tickerData.symbol}: ${tickerData.lastPrice}`
            // );
            this.emit("ticker", tickerData);
            return;
          }
          if (topic.startsWith("orderbook.")) {
            const symbol = topic.split(".").pop() || "";
            if (type === "snapshot") {
              this.obSnapshots.set(symbol, {
                b: (data?.b as string[][]) || [],
                a: (data?.a as string[][]) || [],
                s: symbol,
              });
              // Emit immediately to paint
              this.emit("orderbook", this.buildOrderBookData(symbol));
              return;
            }
            // Queue deltas to merge at cadence
            const queue = this.obQueues.get(symbol) || [];
            queue.push({
              b: (data?.b as string[][]) || [],
              a: (data?.a as string[][]) || [],
            });
            this.obQueues.set(symbol, queue);
            return;
          }
          if (topic.startsWith("publicTrade.")) {
            this.emit("trade", this.mapBybitTradeData(data));
            return;
          }
          if (topic.startsWith("kline.")) {
            this.emit("kline", data as KlineData);
            return;
          }
          // Unknown Bybit topic → ignore silently
          // console.log(`❓ Unknown Bybit topic: ${topic}`);
          return;
        }
        // Non-topic messages (ping/pong etc.) → ignore
        // console.log(`📝 Non-topic Bybit message:`, parsed);
        return;
      }

      const message: ClientMessage = parsed as ClientMessage;
      this.processMessage(message);
    } catch (error) {
      console.error("❌ Failed to parse WebSocket message:", error);
    }
  }

  // ===== DIRECT BYBIT ORDER BOOK MERGING =====

  private startDirectOrderBookProcessing(): void {
    if (!this.directBybitMode) return;
    if (this.obEmitInterval) clearInterval(this.obEmitInterval);
    // Emit at ~200ms cadence for smoother updates
    this.obEmitInterval = setInterval(() => {
      this.obQueues.forEach((deltas, symbol) => {
        if (deltas.length === 0) return;
        const snapshot = this.obSnapshots.get(symbol);
        if (!snapshot) return;

        // Apply all queued deltas to snapshot
        const bidMap = new Map(snapshot.b.map(([p, q]) => [p, q]));
        const askMap = new Map(snapshot.a.map(([p, q]) => [p, q]));

        deltas.forEach((d) => {
          (d.b || []).forEach(([p, q]) => {
            if (parseFloat(q) === 0) bidMap.delete(p);
            else bidMap.set(p, q);
          });
          (d.a || []).forEach(([p, q]) => {
            if (parseFloat(q) === 0) askMap.delete(p);
            else askMap.set(p, q);
          });
        });

        // Update snapshot
        snapshot.b = Array.from(bidMap.entries());
        snapshot.a = Array.from(askMap.entries());
        this.obSnapshots.set(symbol, snapshot);

        // Clear queue and emit snapshot
        this.obQueues.set(symbol, []);
        this.emit("orderbook", this.buildOrderBookData(symbol));
      });
    }, 200);
  }

  private stopDirectOrderBookProcessing(): void {
    if (this.obEmitInterval) {
      clearInterval(this.obEmitInterval);
      this.obEmitInterval = null;
    }
    this.obQueues.clear();
    this.obSnapshots.clear();
  }

  private buildOrderBookData(symbol: string): OrderBookData {
    const snap = this.obSnapshots.get(symbol) || { b: [], a: [], s: symbol };

    // Process bids (descending order - highest first)
    const bidsData = snap.b
      .filter(([_, q]) => parseFloat(q) > 0)
      .map(([price, qty]) => ({
        price: parseFloat(price),
        qty: parseFloat(qty),
      }))
      .sort((a, b) => b.price - a.price) // Sort descending
      .slice(0, 50);

    // Process asks (ascending order - lowest first)
    const asksData = snap.a
      .filter(([_, q]) => parseFloat(q) > 0)
      .map(([price, qty]) => ({
        price: parseFloat(price),
        qty: parseFloat(qty),
      }))
      .sort((a, b) => a.price - b.price) // Sort ascending
      .slice(0, 50);

    // Calculate cumulative totals for bids
    let bidCumulative = 0;
    const bids = bidsData.map((item) => {
      bidCumulative += item.qty;
      return {
        price: item.price.toString(),
        qty: item.qty.toString(),
        Id: item.price,
        side: "Buy" as const,
        symbol,
        total: bidCumulative,
        currentValue: item.price * item.qty,
        totalValue: item.price * bidCumulative,
        inc: true,
        width: "0%", // Will be calculated in UI
      };
    });

    // Calculate cumulative totals for asks
    let askCumulative = 0;
    const asks = asksData.map((item) => {
      askCumulative += item.qty;
      return {
        price: item.price.toString(),
        qty: item.qty.toString(),
        Id: item.price,
        side: "Sell" as const,
        symbol,
        total: askCumulative,
        currentValue: item.price * item.qty,
        totalValue: item.price * askCumulative,
        inc: true,
        width: "0%", // Will be calculated in UI
      };
    });

    // Get the current ticker price for this symbol to ensure consistency
    const currentTicker = this.getCurrentTickerPrice(symbol);

    return {
      symbol,
      bids,
      asks,
      lastPrice: currentTicker.lastPrice || "0",
      markPrice: currentTicker.markPrice || "0",
      timestamp: Date.now().toString(),
      type: "snapshot",
    } as OrderBookData;
  }

  private mapBybitTickerData(raw: unknown): TickerData {
    const d = (Array.isArray(raw) ? raw[0] : raw) as Record<string, unknown>;

    // For optional fields (h24, l24, fr), check both shortened and full names
    const h24 = d?.h24 !== undefined && d?.h24 !== null
      ? (d.h24 as string)
      : (d?.highPrice24h !== undefined && d?.highPrice24h !== null
          ? (d.highPrice24h as string)
          : undefined);
    const l24 = d?.l24 !== undefined && d?.l24 !== null
      ? (d.l24 as string)
      : (d?.lowPrice24h !== undefined && d?.lowPrice24h !== null
          ? (d.lowPrice24h as string)
          : undefined);
    const fr = d?.fr !== undefined && d?.fr !== null
      ? (d.fr as string)
      : (d?.fundingRate !== undefined && d?.fundingRate !== null
          ? (d.fundingRate as string)
          : undefined);

    return {
      symbol: (d?.s as string) || (d?.symbol as string) || "",
      lastPrice: (d?.lp as string) || (d?.lastPrice as string) || "0",
      price24hPcnt:
        (d?.p24hPcnt as string) || (d?.price24hPcnt as string) || "0",
      prevPrice24h: (d?.prevPrice24h as string) || undefined,
      change24h: (d?.change24h as string) || "0",
      tickDirection: (d?.tickDirection as string) || "",
      // Only include if field exists (not undefined/null)
      highPrice24h: h24,
      lowPrice24h: l24,
      volume24h: (d?.v24 as string) || (d?.volume24h as string) || "0",
      turnover24h: (d?.turnover24h as string) || "0",
      // Only include if field exists (not undefined/null)
      fundingRate: fr,
      predictedFundingRate: (d?.predictedFundingRate as string) || undefined,
      openInterest: (d?.oi as string) || (d?.openInterest as string) || "0",
      markPrice: (d?.mp as string) || (d?.markPrice as string) || "0",
      indexPrice: (d?.idx as string) || (d?.indexPrice as string) || "0",
      nextFundingTime: (d?.nextFundingTime as string) || "0",
    } as TickerData;
  }

  private mapBybitTradeData(raw: unknown): TradeData {
    const d = (Array.isArray(raw) ? raw[0] : raw) as Record<string, unknown>;

    return {
      symbol: (d?.s as string) || (d?.symbol as string) || "",
      price: (d?.p as string) || (d?.price as string) || "0",
      qty: (d?.v as string) || (d?.qty as string) || (d?.q as string) || "0",
      side: ((d?.S as string) || (d?.side as string) || "Buy") as
        | "Buy"
        | "Sell",
      time: (d?.T as string) || (d?.time as string) || Date.now().toString(),
      tradeId: (d?.i as string) || (d?.tradeId as string) || "",
      tickDirection: (d?.L as string) || (d?.tickDirection as string) || "",
      execId: (d?.i as string) || (d?.execId as string) || "",
      execPrice: (d?.p as string) || (d?.execPrice as string) || "0",
      execQty: (d?.v as string) || (d?.execQty as string) || "0",
      execTime: (d?.T as string) || (d?.execTime as string) || "",
      tradeType: (d?.tradeType as string) || "",
    } as TradeData;
  }

  private processMessage(message: ClientMessage): void {
    const { type, data } = message;

    switch (type) {
      // Meta/control messages from our proxy - safely ignore
      case "connection":
      case "subscription_confirmed":
      case "subscribe":
      case "unsubscribe":
      case "status":
      case "ping":
      case "pong":
        // treat as activity to avoid false timeouts
        // no-op, but could store timestamp if needed
        return;
      case "ticker":
        this.emit("ticker", data as TickerData);
        break;
      case "orderbook":
        this.emit("orderbook", data as OrderBookData);
        break;
      case "trade":
        // console.log("Client receiving trade data:", data);
        this.emit("trade", data as TradeData);
        break;
      case "kline":
        this.emit("kline", data as KlineData);
        break;
      case "bybit_status":
        this.emit("bybit_status", data);
        break;
      case "bybit_error":
        this.emit("bybit_error", data);
        break;
      default:
        console.warn(`⚠️ Unknown message type: ${type}`);
    }
  }

  // ===== MESSAGE SENDING =====

  private sendMessage(message: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  // ===== PUBLIC METHODS =====

  subscribeToTicker(symbol: Symbol): void {
    // Bybit v5 format: tickers.{symbol}
    this.subscribe(`tickers.${symbol}`);
  }

  subscribeToOrderBook(symbol: Symbol, depth: number = 50): void {
    this.subscribe(`orderbook.${depth}.${symbol}`);
  }

  subscribeToTrades(symbol: Symbol): void {
    this.subscribe(`publicTrade.${symbol}`);
  }

  subscribeToKlines(symbol: Symbol, interval: Interval): void {
    this.subscribe(`kline.${interval}.${symbol}`);
  }

  disconnect(): void {
    this.isDestroyed = true;
    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  getConnectionStatus(): ConnectionStatus {
    return {
      connected: this.ws?.readyState === WebSocket.OPEN,
      reconnecting: this.isConnecting,
      lastConnected: new Date(),
    };
  }
}
