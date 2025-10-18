// ===== WEBSOCKET SERVER =====
// Manages user connections and forwards Bybit data to clients
// Handles multiple users efficiently with connection pooling

import { WebSocketServer, WebSocket } from "ws";
import { EventEmitter } from "events";
import { BybitWebSocketClient } from "./bybit-client";
import type {
  TickerData,
  OrderBookData,
  TradeData,
  KlineData,
  ConnectionStatus,
} from "@/types/market";

interface ClientConnection {
  ws: WebSocket;
  id: string;
  subscriptions: Set<string>;
  lastPing: Date;
}

interface BroadcastMessage {
  type: string;
  data: unknown;
}

export class MarketDataServer extends EventEmitter {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, ClientConnection> = new Map();
  private bybitClient: BybitWebSocketClient;
  private isRunning: boolean = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private clientCounter: number = 0;
  private activePort: number = 0;

  constructor() {
    super();
    this.bybitClient = new BybitWebSocketClient();
    this.setupBybitEventHandlers();
  }

  // ===== SERVER MANAGEMENT =====

  async start(port: number = 8080): Promise<void> {
    if (this.isRunning) {
      return;
    }

    // Try to start on the requested port, with fallback
    const actualPort = await this.findAvailablePort(port);
    this.activePort = actualPort;

    try {
      // Start WebSocket server
      this.wss = new WebSocketServer({ port: actualPort });
      this.setupWebSocketServer();

      // Connect to Bybit
      await this.bybitClient.connect();

      // Start heartbeat for client connections
      this.startHeartbeat();

      this.isRunning = true;
      console.log(`🚀 Market Data Server started on port ${actualPort}`);
    } catch (error) {
      console.error("❌ Failed to start Market Data Server:", error);
      throw error;
    }
  }

  private async findAvailablePort(startPort: number): Promise<number> {
    const maxAttempts = 10;
    const portRange = 100;

    for (let i = 0; i < maxAttempts; i++) {
      const testPort = startPort + i;

      try {
        // Test if port is available
        await this.testPort(testPort);
        return testPort;
      } catch (_error) {
        if (i === maxAttempts - 1) {
          throw new Error(
            `No available ports found in range ${startPort}-${
              startPort + portRange
            }`
          );
        }
        continue;
      }
    }

    throw new Error("Failed to find available port");
  }

  private testPort(port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const testServer = new WebSocketServer({ port });

      testServer.on("listening", () => {
        testServer.close(() => resolve());
      });

      testServer.on("error", (error: Error & { code?: string }) => {
        if (error.code === "EADDRINUSE") {
          reject(new Error(`Port ${port} is in use`));
        } else {
          reject(error);
        }
      });
    });
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    this.stopHeartbeat();

    // Close all client connections
    this.clients.forEach((client) => {
      client.ws.close();
    });
    this.clients.clear();

    // Close WebSocket server
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    // Disconnect from Bybit
    this.bybitClient.disconnect();

    console.log("🛑 Market Data Server stopped");
  }

  // ===== WEBSOCKET SERVER SETUP =====

  private setupWebSocketServer(): void {
    if (!this.wss) return;

    this.wss.on("connection", (ws: WebSocket) => {
      const clientId = this.generateClientId();
      const client: ClientConnection = {
        ws,
        id: clientId,
        subscriptions: new Set(),
        lastPing: new Date(),
      };

      this.clients.set(clientId, client);

      // Send welcome message
      this.sendToClient(clientId, {
        type: "connection",
        data: { clientId, status: "connected" },
      });

      // Handle client messages
      ws.on("message", (data: Buffer) => {
        this.handleClientMessage(clientId, data);
      });

      // Handle client disconnect
      ws.on("close", () => {
        this.handleClientDisconnect(clientId);
      });

      // Handle client errors
      ws.on("error", (error: Error) => {
        console.error(`❌ Client ${clientId} error:`, error);
        this.handleClientDisconnect(clientId);
      });

      // Handle pong responses
      ws.on("pong", () => {
        if (this.clients.has(clientId)) {
          this.clients.get(clientId)!.lastPing = new Date();
        }
      });
      // Some browsers deliver pings to message instead of 'ping' event for proxies
      ws.on("ping", () => {
        try {
          ws.pong();
        } catch {}
        if (this.clients.has(clientId)) {
          this.clients.get(clientId)!.lastPing = new Date();
        }
      });
    });
  }

  // ===== CLIENT MESSAGE HANDLING =====

  private handleClientMessage(clientId: string, data: Buffer): void {
    try {
      const message = JSON.parse(data.toString());
      const client = this.clients.get(clientId);

      if (!client) return;

      // Treat any received message as proof of life
      client.lastPing = new Date();

      switch (message.type) {
        case "subscribe":
          this.handleSubscription(clientId, message.data);
          break;
        case "unsubscribe":
          this.handleUnsubscription(clientId, message.data);
          break;
        case "ping":
          // Application-level ping/pong fallback
          client.lastPing = new Date();
          this.sendToClient(clientId, { type: "pong", data: {} });
          break;
        default:
          console.warn(
            `⚠️ Unknown message type from client ${clientId}:`,
            message.type
          );
      }
    } catch (error) {
      console.error(
        `❌ Failed to parse message from client ${clientId}:`,
        error
      );
    }
  }

  private handleSubscription(clientId: string, data: { topic: string }): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { topic } = data;
    client.subscriptions.add(topic);

    // Subscribe to Bybit if not already subscribed
    if (!this.bybitClient.hasSubscription(topic)) {
      this.bybitClient.subscribe(topic);
    }

    this.sendToClient(clientId, {
      type: "subscription_confirmed",
      data: { topic, status: "subscribed" },
    });
  }

  private handleUnsubscription(
    clientId: string,
    data: { topic: string }
  ): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { topic } = data;
    client.subscriptions.delete(topic);

    // Check if any other clients are subscribed to this topic
    const hasOtherSubscribers = Array.from(this.clients.values()).some((c) =>
      c.subscriptions.has(topic)
    );

    // Unsubscribe from Bybit if no other clients need this topic
    if (!hasOtherSubscribers) {
      this.bybitClient.unsubscribe(topic);
    }

    this.sendToClient(clientId, {
      type: "unsubscription_confirmed",
      data: { topic, status: "unsubscribed" },
    });
  }

  // ===== BYBIT EVENT HANDLERS =====

  private setupBybitEventHandlers(): void {
    this.bybitClient.on("ticker", (data: TickerData) => {
      this.broadcastToSubscribers("tickers", data.symbol, {
        type: "ticker",
        data,
      });
    });

    this.bybitClient.on("orderbook", (data: OrderBookData) => {
      this.broadcastToSubscribers("orderbook", data.symbol, {
        type: "orderbook",
        data,
      });
    });

    this.bybitClient.on("trade", (data: TradeData) => {
      this.broadcastToSubscribers("publicTrade", data.symbol, {
        type: "trade",
        data,
      });
    });

    this.bybitClient.on("kline", (data: KlineData) => {
      this.broadcastToSubscribers("kline", data.symbol, {
        type: "kline",
        data,
      });
    });

    this.bybitClient.on("status", (status: ConnectionStatus) => {
      this.broadcastToAll({
        type: "bybit_status",
        data: status,
      });
    });

    this.bybitClient.on("error", (error) => {
      console.error("❌ Bybit client error:", error);
      this.broadcastToAll({
        type: "bybit_error",
        data: error,
      });
    });
  }

  // ===== DATA BROADCASTING =====

  private broadcastToSubscribers(
    topicPrefix: string,
    symbol: string,
    message: BroadcastMessage
  ): void {
    const canonical = `${topicPrefix}.${symbol}`;

    this.clients.forEach((client, clientId) => {
      // Match either canonical (e.g., orderbook.BTCUSDT) or depth-qualified (e.g., orderbook.50.BTCUSDT)
      const hasMatch = Array.from(client.subscriptions).some((sub) => {
        if (sub === canonical) return true;
        if (topicPrefix === "orderbook") {
          // Accept formats like orderbook.<depth>.<symbol>
          return (
            /^orderbook\.[0-9]+\.[A-Z0-9]+$/.test(sub) &&
            sub.endsWith(`.${symbol}`)
          );
        }
        if (topicPrefix === "publicTrade") {
          // Accept formats like publicTrade.<symbol>
          // console.log(`Server broadcasting trade for ${symbol}:`, message.data); // <--- ADD THIS
          return sub === `publicTrade.${symbol}`;
        }
        return false;
      });

      if (hasMatch) {
        this.sendToClient(clientId, message);
      }
    });
  }

  private broadcastToAll(message: BroadcastMessage): void {
    this.clients.forEach((_, clientId) => {
      this.sendToClient(clientId, message);
    });
  }

  private sendToClient(clientId: string, message: BroadcastMessage): void {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      client.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error(`❌ Failed to send message to client ${clientId}:`, error);
      this.handleClientDisconnect(clientId);
    }
  }

  // ===== CLIENT MANAGEMENT =====

  private handleClientDisconnect(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Unsubscribe from topics that no other clients need
    client.subscriptions.forEach((topic) => {
      const hasOtherSubscribers = Array.from(this.clients.values()).some(
        (c) => c.id !== clientId && c.subscriptions.has(topic)
      );

      if (!hasOtherSubscribers) {
        this.bybitClient.unsubscribe(topic);
      }
    });

    try {
      if (
        client.ws.readyState === WebSocket.OPEN ||
        client.ws.readyState === WebSocket.CLOSING
      ) {
        // Forcefully terminate to free resources
        client.ws.terminate();
      }
    } catch {}

    this.clients.delete(clientId);
  }

  private generateClientId(): string {
    return `client_${++this.clientCounter}_${Date.now()}`;
  }

  // ===== HEARTBEAT MANAGEMENT =====

  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((client, clientId) => {
        if (client.ws.readyState === WebSocket.OPEN) {
          try {
            client.ws.ping();

            // Check if client responded to ping
            const timeSinceLastPing = Date.now() - client.lastPing.getTime();
            if (timeSinceLastPing > 120000) {
              // 60 seconds timeout
              console.log(`⚠️ Client ${clientId} ping timeout, disconnecting`);
              this.handleClientDisconnect(clientId);
            }
          } catch (error) {
            console.error(`❌ Failed to ping client ${clientId}:`, error);
            this.handleClientDisconnect(clientId);
          }
        }
      });
    }, 30000); // Ping every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // ===== PUBLIC METHODS =====

  getClientCount(): number {
    return this.clients.size;
  }

  getBybitConnectionStatus(): ConnectionStatus {
    return this.bybitClient.getConnectionStatus();
  }

  getPort(): number {
    return this.activePort || this.wss?.options.port || 8080;
  }

  getServerStatus(): {
    running: boolean;
    clientCount: number;
    bybitStatus: ConnectionStatus;
    port: number;
  } {
    return {
      running: this.isRunning,
      clientCount: this.clients.size,
      bybitStatus: this.bybitClient.getConnectionStatus(),
      port: this.getPort(),
    };
  }
}
