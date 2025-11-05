import { TRADING_SYMBOLS } from "@/lib/trading/symbols-config";

export interface TickerData {
  symbol: string;
  lastPrice: string;
  price24hPcnt: string;
  prevPrice24h?: string;
  change24h: string;
  tickDirection: string;
  highPrice24h?: string; // Optional - not included in all ticker updates
  lowPrice24h?: string; // Optional - not included in all ticker updates
  volume24h: string;
  turnover24h: string;
  fundingRate?: string; // Optional - not included in all ticker updates
  predictedFundingRate?: string;
  openInterest: string;
  markPrice: string;
  indexPrice: string;
  nextFundingTime: string;
}

export interface OrderBookLevel {
  price: string;
  qty: string;
  Id?: number;
  side?: "Buy" | "Sell";
  symbol?: string;
  total?: number;
  currentValue?: number;
  totalValue?: number;
  inc?: boolean;
  width?: string;
}

export interface OrderBookData {
  symbol: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  lastPrice: string;
  markPrice: string;
  timestamp: string;
  type?: "snapshot" | "delta";
}

export interface TradeData {
  symbol: string;
  price: string;
  qty: string;
  side: "Buy" | "Sell";
  time: string;
  tradeId: string;
  tickDirection?: string;
  execId?: string;
  execPrice?: string;
  execQty?: string;
  execTime?: string;
  tradeType?: string;
}

export interface KlineData {
  symbol: string;
  interval: string;
  start: string;
  end: string;
  open: string;
  close: string;
  high: string;
  low: string;
  volume: string;
  turnover: string;
}

// ===== WEBSOCKET MESSAGE TYPES =====

export interface WebSocketMessage {
  topic?: string;
  type?: "snapshot" | "delta";
  data?: any;
  ts?: number;
  op?: "ping" | "pong";
}

export interface SubscriptionMessage {
  op: "subscribe" | "unsubscribe";
  args: string[];
}

export interface ConnectionStatus {
  connected: boolean;
  reconnecting: boolean;
  error?: string;
  lastConnected?: Date;
}

// ===== CLIENT-SIDE DATA TYPES =====

export interface MarketDataState {
  ticker: TickerData | null;
  orderBook: OrderBookData | null;
  recentTrades: TradeData[];
  klines: KlineData[];
  connectionStatus: ConnectionStatus;
}

export interface WebSocketConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
}

// Generate Symbol type dynamically from symbols config
export type Symbol = (typeof TRADING_SYMBOLS)[number]["value"];
export type Interval =
  | "1"
  | "3"
  | "5"
  | "15"
  | "30"
  | "60"
  | "120"
  | "240"
  | "360"
  | "720"
  | "D"
  | "W"
  | "M";
export type Side = "Buy" | "Sell";

// ===== ERROR TYPES =====

export interface WebSocketError {
  code: number;
  message: string;
  timestamp: Date;
  context?: string;
}

export interface MarketDataError {
  type: "connection" | "subscription" | "data" | "parsing";
  message: string;
  timestamp: Date;
  data?: any;
}
