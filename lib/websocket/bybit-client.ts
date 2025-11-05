// ===== BYBIT WEBSOCKET CLIENT =====
// Handles connection to Bybit WebSocket with automatic reconnection
// and comprehensive error handling

import WebSocket from "ws";
import { EventEmitter } from "events";
import type {
  TickerData,
  OrderBookData,
  TradeData,
  KlineData,
  WebSocketMessage,
  SubscriptionMessage,
  ConnectionStatus,
  WebSocketError,
  Symbol,
  Interval,
} from "@/types/market";

interface BybitOrderBookSnapshot {
  b: string[][];
  a: string[][];
  s?: string;
}

interface BybitOrderBookDelta {
  b?: string[][];
  a?: string[][];
  s?: string;
}

interface BybitTradeItem {
  s?: string;
  symbol?: string;
  p?: string;
  price?: string;
  v?: string;
  qty?: string;
  S?: string;
  side?: string;
  T?: string;
  time?: string;
  i?: string;
  tradeId?: string;
  L?: string;
  tickDirection?: string;
  execId?: string;
  execPrice?: string;
  execQty?: string;
  execTime?: string;
  tradeType?: string;
}

export class BybitWebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectInterval: number;
  private maxReconnectAttempts: number;
  private reconnectAttempts: number = 0;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private subscriptions: Set<string> = new Set();
  private isConnecting: boolean = false;
  private isDestroyed: boolean = false;
  private lastPongTime: number = 0;
  private connectionHealthCheck: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private lastTickDirection: Map<string, string> = new Map(); // Store last tickDirection per symbol

  // Order book management - proper snapshot/delta handling
  private orderBookSnapshots: Map<string, unknown> = new Map(); // Store full snapshots
  private orderBookQueue: Map<string, unknown[]> = new Map(); // Queue for pending deltas per symbol
  private orderBookThrottleMs = 200; // Unified throttle: Emit order book updates every 200ms
  private orderBookProcessInterval: NodeJS.Timeout | null = null; // Interval to process queue
  private orderBookTimeout: Map<string, NodeJS.Timeout> = new Map(); // Track timeouts per symbol

  constructor(
    config: {
      url?: string;
      reconnectInterval?: number;
      maxReconnectAttempts?: number;
    } = {}
  ) {
    super();

    this.url = config.url || "wss://stream.bybit.com/v5/public/linear";
    this.reconnectInterval = config.reconnectInterval || 2000; // Faster initial reconnect
    this.maxReconnectAttempts = config.maxReconnectAttempts || 20; // More attempts
  }

  // ===== CONNECTION MANAGEMENT =====

  async connect(): Promise<void> {
    if (this.isConnecting || this.isDestroyed) {
      return;
    }

    // Check if we already have a healthy connection
    if (this.ws?.readyState === WebSocket.OPEN) {
      const timeSinceLastPong = Date.now() - this.lastPongTime;
      if (timeSinceLastPong < 60000) {
        // Less than 1 minute since last pong
        return; // Connection is healthy, don't reconnect
      }
    }

    this.isConnecting = true;
    this.emit("status", {
      connected: false,
      reconnecting: true,
    } as ConnectionStatus);

    try {
      // Clean up existing connection
      if (this.ws) {
        this.ws.removeAllListeners();
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.close(1000, "Reconnecting");
        }
      }

      this.ws = new WebSocket(this.url);

      this.ws.on("open", this.handleOpen.bind(this));
      this.ws.on("message", this.handleMessage.bind(this));
      this.ws.on("close", this.handleClose.bind(this));
      this.ws.on("error", this.handleError.bind(this));
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  private handleOpen(): void {
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.lastPongTime = Date.now();

    // Clear any pending reconnection timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.emit("status", {
      connected: true,
      reconnecting: false,
      lastConnected: new Date(),
    } as ConnectionStatus);

    this.startHeartbeat();
    this.startConnectionHealthCheck();
    this.startOrderBookProcessing();
    this.resubscribeAll();
  }

  private handleClose(code: number, reason: Buffer): void {
    this.isConnecting = false;
    this.stopHeartbeat();
    this.stopConnectionHealthCheck();
    this.stopOrderBookProcessing();

    // Industry-standard WebSocket close code handling
    if (code !== 1000 && code !== 1001) {
      console.log(`❌ Bybit WebSocket closed: ${code} - ${reason.toString()}`);

      // Provide specific guidance for common Bybit errors
      if (code === 1006) {
        console.log(
          "💡 Bybit 1006: Abnormal closure - possible network issue or server restart"
        );
        console.log("   🔄 Will attempt reconnection with exponential backoff");
      } else if (code === 1002) {
        console.log("💡 Bybit 1002: Protocol error - check message format");
      } else if (code === 1003) {
        console.log("💡 Bybit 1003: Unsupported data type");
      } else if (code === 1011) {
        console.log("💡 Bybit 1011: Server error - Bybit server issue");
      } else if (code === 1012) {
        console.log("💡 Bybit 1012: Service restart - Bybit server restarting");
      }
    }

    this.emit("status", {
      connected: false,
      reconnecting: false,
      error: `Connection closed: ${code} - ${reason.toString()}`,
    } as ConnectionStatus);

    if (!this.isDestroyed) {
      this.scheduleReconnect();
    }
  }

  private handleError(error: Error): void {
    this.isConnecting = false;
    this.stopHeartbeat();
    this.stopConnectionHealthCheck();
    this.stopOrderBookProcessing();

    // Clear all order book timeouts on error
    this.orderBookTimeout.forEach((timeout) => {
      clearTimeout(timeout);
    });
    this.orderBookTimeout.clear();

    // Only log critical errors, not network timeouts
    if (
      !error.message.includes("timeout") &&
      !error.message.includes("ECONNRESET")
    ) {
      console.error("❌ WebSocket error:", error.message);
    }

    const wsError: WebSocketError = {
      code: -1,
      message: error.message,
      timestamp: new Date(),
      context: "Bybit WebSocket connection",
    };

    this.emit("error", wsError);

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
      return;
    }

    this.reconnectAttempts++;

    // More conservative reconnection strategy for Bybit
    const delay = Math.min(
      this.reconnectInterval * Math.pow(1.2, this.reconnectAttempts - 1), // Very gentle exponential backoff
      15000 // Max 15 seconds - more conservative
    );

    this.reconnectTimeout = setTimeout(() => {
      if (!this.isDestroyed && !this.isConnecting) {
        // Add a small random jitter to prevent thundering herd
        const jitter = Math.random() * 1000; // 0-1 second jitter
        setTimeout(() => {
          if (!this.isDestroyed && !this.isConnecting) {
            this.connect();
          }
        }, jitter);
      }
    }, delay);
  }

  // ===== HEARTBEAT MANAGEMENT =====

  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        try {
          // Send Bybit-compatible ping message (JSON format)
          const pingMessage = {
            op: "ping",
          };
          this.ws.send(JSON.stringify(pingMessage));
          // Silent ping - no console logs
        } catch (error) {
          // Silent error handling - don't spam console
          this.handleError(error as Error);
        }
      } else if (!this.isConnecting) {
        // Silent reconnection attempt
        this.connect();
      }
    }, 30000); // 30s ping (safer, fewer wakeups)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // ===== CONNECTION HEALTH MONITORING =====

  private startConnectionHealthCheck(): void {
    this.stopConnectionHealthCheck();

    this.connectionHealthCheck = setInterval(() => {
      const timeSinceLastPong = Date.now() - this.lastPongTime;

      // If no pong received in 90 seconds, consider connection unhealthy
      if (timeSinceLastPong > 90000) {
        console.log("⚠️ Connection health check failed - no pong received");
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.close(1000, "Health check failed");
        }
      }
    }, 45000); // Check every 45 seconds
  }

  private stopConnectionHealthCheck(): void {
    if (this.connectionHealthCheck) {
      clearInterval(this.connectionHealthCheck);
      this.connectionHealthCheck = null;
    }
  }

  // ===== SUBSCRIPTION MANAGEMENT =====

  subscribe(topic: string): void {
    this.subscriptions.add(topic);

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendSubscription({ op: "subscribe", args: [topic] });
    }
  }

  unsubscribe(topic: string): void {
    this.subscriptions.delete(topic);

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendSubscription({ op: "unsubscribe", args: [topic] });
    }
  }

  private resubscribeAll(): void {
    if (this.subscriptions.size > 0) {
      const topics = Array.from(this.subscriptions);
      this.sendSubscription({ op: "subscribe", args: topics });
    }
  }

  private sendSubscription(message: SubscriptionMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  // ===== MESSAGE HANDLING =====

  private handleMessage(data: Buffer): void {
    try {
      const messageString = data.toString();
      const trimmed = messageString.trim();

      // Skip empty messages
      if (!trimmed) return;

      // Handle raw ping/pong frames sometimes proxied as plain strings
      if (trimmed === "pong") {
        this.lastPongTime = Date.now();
        return;
      }
      if (trimmed === "ping") {
        // Reply with JSON pong per Bybit convention
        try {
          this.ws?.send(JSON.stringify({ op: "pong" }));
        } catch {}
        this.lastPongTime = Date.now();
        return;
      }

      const message: WebSocketMessage = JSON.parse(messageString);
      this.processMessage(message);
    } catch (error) {
      // Only log if it's not a common non-JSON message
      const messageString = data.toString();
      if (messageString !== "pong" && messageString !== "ping") {
        console.error("❌ Failed to parse WebSocket message:", {
          error: (error as Error).message,
          data: messageString.substring(0, 100), // First 100 chars
        });
      }
    }
  }

  private processMessage(message: WebSocketMessage): void {
    // Validate message structure first
    if (!message || typeof message !== "object") {
      return;
    }

    // Handle Bybit pong responses immediately
    if (message.op === "pong") {
      this.lastPongTime = Date.now();
      // Silent pong handling - no console logs
      return;
    }
    // If server sends ping as JSON, reply
    if (message.op === "ping") {
      try {
        this.ws?.send(JSON.stringify({ op: "pong" }));
      } catch {}
      this.lastPongTime = Date.now();
      return;
    }

    const { topic, type, data } = message;

    // Any valid Bybit message counts as activity
    this.lastPongTime = Date.now();

    // Skip messages without topic (like pong responses)
    if (!topic || typeof topic !== "string") {
      return;
    }

    // Route messages based on topic
    if (topic.startsWith("tickers.")) {
      const tickerData = this.parseTickerData(data);
      // Add tickDirection from last trade if available
      const symbol = data.symbol || "";
      if (this.lastTickDirection.has(symbol)) {
        tickerData.tickDirection = this.lastTickDirection.get(symbol) || "";
      }
      this.emit("ticker", tickerData);
    } else if (topic.startsWith("orderbook.")) {
      const symbol = data?.s || "unknown";
      const messageType = type || "unknown"; // type is at message level, not data level
      // const now = Date.now();

      // Add logging to debug order book updates
      // console.log("📊 Order book update:", {
      //   topic,
      //   type: messageType,
      //   symbol,
      //   bidsCount: Array.isArray(data?.b) ? data.b.length : 0,
      //   asksCount: Array.isArray(data?.a) ? data.a.length : 0,
      //   updateId: data?.u,
      //   sequence: data?.seq,
      //   timeSinceLastEmit: 0, // Not used in new unified approach
      //   wsState: this.ws?.readyState,
      //   isConnected: this.ws?.readyState === WebSocket.OPEN,
      //   timestamp: new Date().toISOString(),
      // });

      // Handle snapshots and deltas properly
      if (messageType === "snapshot") {
        // When a snapshot arrives, clear any pending deltas and store the new snapshot
        this.orderBookSnapshots.set(symbol, {
          b: (data as { b: string[][] }).b,
          a: (data as { a: string[][] }).a,
          s: (data as { s: string }).s,
        } as BybitOrderBookSnapshot);
        this.orderBookQueue.set(symbol, []); // Clear queue as snapshot is definitive
        // Immediately emit snapshot so UI doesn't wait
        this.emit("orderbook", this.parseOrderBookData(data, messageType));
        this.setOrderBookTimeout(symbol);
      } else if (messageType === "delta") {
        const currentSnapshot = this.orderBookSnapshots.get(symbol);

        if (!currentSnapshot) {
          console.warn(
            `Delta received for ${symbol} but no snapshot present. Discarding.`
          );
          return;
        }

        // Add this delta to the queue for periodic processing
        const deltas = this.orderBookQueue.get(symbol) || [];
        deltas.push(data as BybitOrderBookDelta);
        this.orderBookQueue.set(symbol, deltas);

        this.setOrderBookTimeout(symbol);
        // console.log(`📥 Delta queued for ${symbol} (${deltas.length} pending)`);
      } else {
        // console.log("❓ Unknown order book message type:", messageType);
      }
    } else if (topic.startsWith("publicTrade.")) {
      const symbolFromTopic = topic.split(".")[1] || "";
      // console.log("Bybit client processing raw trade message:", data); // <--- ADD THIS

      // Bybit sends trade arrays directly under message.data
      const items = Array.isArray(data)
        ? (data as BybitTradeItem[])
        : Array.isArray((data as { data: BybitTradeItem[] })?.data)
        ? (data as { data: BybitTradeItem[] }).data
        : [];
      if (items.length > 0) {
        for (const item of items) {
          const tradeData = this.parseTradeData(item);
          if (!tradeData.symbol && symbolFromTopic) {
            tradeData.symbol = symbolFromTopic;
          }
          if (tradeData.symbol && tradeData.tickDirection) {
            this.lastTickDirection.set(
              tradeData.symbol,
              tradeData.tickDirection
            );
          }
          this.emit("trade", tradeData);
        }
      }
    } else if (topic.startsWith("kline.")) {
      this.emit("kline", this.parseKlineData(data));
    }
  }

  // ===== DATA PARSING =====

  private parseTickerData(data: unknown): TickerData {
    // Validate data structure and provide safe defaults
    if (!data || typeof data !== "object") {
      return this.getEmptyTickerData();
    }

    const tickerData = data as Record<string, unknown>;

    // Bybit v5 uses shortened field names, map them correctly
    // Check both shortened and full field names for compatibility
    const symbol = (tickerData.s as string) || (tickerData.symbol as string) || "";
    const lastPrice = (tickerData.lp as string) || (tickerData.lastPrice as string) || "0";

    // Check if we have essential fields for a valid ticker update
    const hasEssentialFields = symbol && lastPrice && lastPrice !== "0";

    if (!hasEssentialFields) {
      return this.getEmptyTickerData();
    }

    // Map Bybit v5 shortened field names to our format
    // For optional fields (h24, l24, fr), check both shortened and full names
    const h24 = tickerData.h24 !== undefined && tickerData.h24 !== null 
      ? (tickerData.h24 as string) 
      : (tickerData.highPrice24h !== undefined && tickerData.highPrice24h !== null 
          ? (tickerData.highPrice24h as string) 
          : undefined);
    const l24 = tickerData.l24 !== undefined && tickerData.l24 !== null
      ? (tickerData.l24 as string)
      : (tickerData.lowPrice24h !== undefined && tickerData.lowPrice24h !== null
          ? (tickerData.lowPrice24h as string)
          : undefined);
    const fr = tickerData.fr !== undefined && tickerData.fr !== null
      ? (tickerData.fr as string)
      : (tickerData.fundingRate !== undefined && tickerData.fundingRate !== null
          ? (tickerData.fundingRate as string)
          : undefined);

    const result = {
      symbol,
      lastPrice,
      price24hPcnt: (tickerData.p24hPcnt as string) || (tickerData.price24hPcnt as string) || "0",
      prevPrice24h: (tickerData.prevPrice24h as string) || undefined,
      change24h: (tickerData.change24h as string) || "0",
      tickDirection: (tickerData.tickDirection as string) || "",
      // Only include if field exists (not undefined/null)
      highPrice24h: h24,
      lowPrice24h: l24,
      volume24h: (tickerData.v24 as string) || (tickerData.volume24h as string) || "0",
      turnover24h: (tickerData.turnover24h as string) || "0",
      // Only include if field exists (not undefined/null)
      fundingRate: fr,
      predictedFundingRate: (tickerData.predictedFundingRate as string) || undefined,
      openInterest: (tickerData.oi as string) || (tickerData.openInterest as string) || "0",
      markPrice: (tickerData.mp as string) || (tickerData.markPrice as string) || "0",
      indexPrice: (tickerData.idx as string) || (tickerData.indexPrice as string) || "0",
      nextFundingTime: (tickerData.nextFundingTime as string) || "0",
    };

    return result;
  }

  private getEmptyTickerData(): TickerData {
    return {
      symbol: "",
      lastPrice: "0",
      price24hPcnt: "0",
      change24h: "0",
      tickDirection: "",
      // Optional fields are undefined when not present
      volume24h: "0",
      turnover24h: "0",
      openInterest: "0",
      markPrice: "0",
      indexPrice: "0",
      nextFundingTime: "0",
    };
  }

  private parseOrderBookData(
    data: unknown,
    messageType?: string
  ): OrderBookData {
    // Validate data structure
    if (!data || typeof data !== "object") {
      return {
        symbol: "",
        bids: [],
        asks: [],
        lastPrice: "0",
        markPrice: "0",
        timestamp: Date.now().toString(),
        type: "delta",
      };
    }

    const orderBookData = data as Record<string, unknown>;

    // Bybit sends symbol in `s` for orderbook; bids in `b`, asks in `a`
    const symbol =
      (orderBookData.s as string) || (orderBookData.symbol as string) || "";
    const rawBids = (orderBookData.b as string[][]) || [];
    const rawAsks = (orderBookData.a as string[][]) || [];
    const ts =
      (orderBookData.ts as string) ||
      (orderBookData.T as string) ||
      Date.now().toString();

    // console.log("🔍 Parsing order book data:", {
    //   symbol,
    //   type: messageType || data?.type || "unknown",
    //   bidsCount: rawBids.length,
    //   asksCount: rawAsks.length,
    //   sampleBid: rawBids[0] || "none",
    //   sampleAsk: rawAsks[0] || "none",
    // });

    // Convert raw arrays to OrderBookLevel objects with Bybit-style structure
    const bids = rawBids
      .filter((level: string[]) => {
        const isTuple = Array.isArray(level);
        const qty = isTuple
          ? level[1]
          : (level as unknown as { qty: string }).qty;
        return parseFloat(qty) > 0; // Only include non-zero quantities
      })
      .map((level: string[], index: number) => {
        const isTuple = Array.isArray(level);
        const price = isTuple
          ? level[0]
          : (level as unknown as { price: string }).price;
        const qty = isTuple
          ? level[1]
          : (level as unknown as { qty: string }).qty;
        const priceNum = parseFloat(price) || 0;
        const qtyNum = parseFloat(qty) || 0;

        return {
          price: price || "0",
          qty: qty || "0",
          Id: priceNum, // Use price as ID like Bybit
          side: "Buy" as const,
          symbol: symbol,
          total: 0, // Will be calculated in UI
          currentValue: priceNum * qtyNum,
          totalValue: 0, // Will be calculated in UI
          inc: true, // Default to true for new orders
          width: "0%", // Will be calculated in UI
        };
      });

    const asks = rawAsks
      .filter((level: string[]) => {
        const isTuple = Array.isArray(level);
        const qty = isTuple
          ? level[1]
          : (level as unknown as { qty: string }).qty;
        return parseFloat(qty) > 0; // Only include non-zero quantities
      })
      .map((level: string[], index: number) => {
        const isTuple = Array.isArray(level);
        const price = isTuple
          ? level[0]
          : (level as unknown as { price: string }).price;
        const qty = isTuple
          ? level[1]
          : (level as unknown as { qty: string }).qty;
        const priceNum = parseFloat(price) || 0;
        const qtyNum = parseFloat(qty) || 0;

        return {
          price: price || "0",
          qty: qty || "0",
          Id: priceNum, // Use price as ID like Bybit
          side: "Sell" as const,
          symbol: symbol,
          total: 0, // Will be calculated in UI
          currentValue: priceNum * qtyNum,
          totalValue: 0, // Will be calculated in UI
          inc: true, // Default to true for new orders
          width: "0%", // Will be calculated in UI
        };
      });

    return {
      symbol,
      bids,
      asks,
      lastPrice: (orderBookData.lastPrice as string) || "0",
      markPrice: (orderBookData.markPrice as string) || "0",
      timestamp: ts,
      type: (messageType || (orderBookData.type as string) || "delta") as
        | "snapshot"
        | "delta", // Include type for proper handling
    };
  }

  // ===== ORDER BOOK PROCESSING =====

  private startOrderBookProcessing(): void {
    if (this.orderBookProcessInterval) {
      clearInterval(this.orderBookProcessInterval);
    }

    this.orderBookProcessInterval = setInterval(() => {
      this.orderBookQueue.forEach((deltas, symbol) => {
        if (deltas.length > 0) {
          // Process all queued deltas
          let currentSnapshot = this.orderBookSnapshots.get(symbol) as
            | BybitOrderBookSnapshot
            | undefined;
          if (!currentSnapshot) {
            console.warn(`No snapshot for ${symbol} when processing deltas.`);
            currentSnapshot = { b: [], a: [], s: symbol };
          }

          // Apply all deltas in the queue to the snapshot
          deltas.forEach((delta) => {
            this.applyOrderBookDeltaToSnapshot(
              currentSnapshot,
              delta as BybitOrderBookDelta
            );
          });

          // Emit the updated snapshot as a 'snapshot' type to the next layer
          this.emit(
            "orderbook",
            this.parseOrderBookData(currentSnapshot, "snapshot")
          );

          this.orderBookQueue.set(symbol, []); // Clear the queue after processing
        }
      });
    }, this.orderBookThrottleMs);
  }

  private stopOrderBookProcessing(): void {
    if (this.orderBookProcessInterval) {
      clearInterval(this.orderBookProcessInterval);
      this.orderBookProcessInterval = null;
    }
  }

  private applyOrderBookDeltaToSnapshot(
    snapshot: BybitOrderBookSnapshot,
    delta: BybitOrderBookDelta
  ): void {
    const applyChanges = (targetLevels: string[][], changes: string[][]) => {
      const map = new Map<string, string>(
        targetLevels.map((level) => [level[0], level[1]])
      );
      changes.forEach((change) => {
        const price = change[0];
        const qty = change[1];
        if (parseFloat(qty) === 0) {
          map.delete(price); // Remove level
        } else {
          map.set(price, qty); // Add or update level
        }
      });
      return Array.from(map.entries()).map(([price, qty]) => [price, qty]);
    };

    snapshot.b = applyChanges(snapshot.b, delta.b || []);
    snapshot.a = applyChanges(snapshot.a, delta.a || []);
  }

  // ===== ORDER BOOK TIMEOUT MANAGEMENT =====

  private setOrderBookTimeout(symbol: string): void {
    this.clearOrderBookTimeout(symbol);

    // Set a timeout to detect if order book stops updating
    const timeout = setTimeout(() => {
      // Only reconnect if connection is truly unhealthy
      const timeSinceLastPong = Date.now() - this.lastPongTime;
      if (
        !this.isConnecting &&
        this.ws?.readyState !== WebSocket.OPEN &&
        timeSinceLastPong > 120000
      ) {
        // 2 minutes without pong
        this.connect();
      }
    }, 60000); // 60 seconds timeout - more tolerant

    this.orderBookTimeout.set(symbol, timeout);
  }

  private clearOrderBookTimeout(symbol: string): void {
    const timeout = this.orderBookTimeout.get(symbol);
    if (timeout) {
      clearTimeout(timeout);
      this.orderBookTimeout.delete(symbol);
    }
  }

  private parseTradeData(data: unknown): TradeData {
    // Bybit trade payload (publicTrade) is an array of trades in data
    const first = Array.isArray(data) ? data[0] : data;
    if (!first || typeof first !== "object") {
      return {
        symbol: "",
        price: "0",
        qty: "0",
        side: "Buy",
        time: "0",
        tradeId: "",
        tickDirection: undefined,
        execId: "",
        execPrice: "0",
        execQty: "0",
        execTime: "",
        tradeType: "0",
      };
    }

    const tradeItem = first as BybitTradeItem;

    // Parse time - convert to ISO string format like Bybit
    const execTime = tradeItem.T
      ? new Date(parseInt(tradeItem.T)).toISOString()
      : new Date().toISOString();

    return {
      symbol: tradeItem.s || tradeItem.symbol || "",
      price: tradeItem.p || tradeItem.price || "0",
      qty: tradeItem.v || tradeItem.qty || "0",
      side: (tradeItem.S || tradeItem.side || "Buy") as "Buy" | "Sell",
      time: (tradeItem.T || tradeItem.time || Date.now()).toString(),
      tradeId: tradeItem.i || tradeItem.tradeId || "",
      tickDirection: tradeItem.L || tradeItem.tickDirection,
      // Additional Bybit fields
      execId: tradeItem.i || tradeItem.execId || "",
      execPrice: tradeItem.p || tradeItem.execPrice || "0",
      execQty: tradeItem.v || tradeItem.execQty || "0",
      execTime: execTime,
      tradeType: tradeItem.tradeType || "0",
    };
  }

  private parseKlineData(data: unknown): KlineData {
    if (!data || typeof data !== "object") {
      return {
        symbol: "",
        interval: "",
        start: "",
        end: "",
        open: "",
        close: "",
        high: "",
        low: "",
        volume: "",
        turnover: "",
      };
    }

    const klineData = data as Record<string, unknown>;

    return {
      symbol: (klineData.symbol as string) || "",
      interval: (klineData.interval as string) || "",
      start: (klineData.start as string) || "",
      end: (klineData.end as string) || "",
      open: (klineData.open as string) || "",
      close: (klineData.close as string) || "",
      high: (klineData.high as string) || "",
      low: (klineData.low as string) || "",
      volume: (klineData.volume as string) || "",
      turnover: (klineData.turnover as string) || "",
    };
  }

  // ===== PUBLIC METHODS =====

  subscribeToTicker(symbol: Symbol): void {
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
    this.stopConnectionHealthCheck();
    this.stopOrderBookProcessing();

    // Clear all timeouts
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.orderBookTimeout.forEach((timeout) => {
      clearTimeout(timeout);
    });
    this.orderBookTimeout.clear();

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

  hasSubscription(topic: string): boolean {
    return this.subscriptions.has(topic);
  }
}
