// ===== ERROR HANDLING & LOGGING UTILITIES =====
// Comprehensive error handling and logging system
// Provides structured logging and error management

import type { WebSocketError, MarketDataError } from "@/types/market";

// ===== LOG LEVELS =====

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

// ===== LOGGER CLASS =====

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;
  private context: string;

  constructor(
    context: string = "WebSocket",
    logLevel: LogLevel = LogLevel.INFO
  ) {
    this.context = context;
    this.logLevel = logLevel;
  }

  static getInstance(context?: string): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(context);
    }
    return Logger.instance;
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private formatMessage(
    level: string,
    message: string,
    data?: unknown
  ): string {
    const timestamp = new Date().toISOString();
    const baseMessage = `[${timestamp}] [${level}] [${this.context}] ${message}`;

    if (data) {
      return `${baseMessage}\n${JSON.stringify(data, null, 2)}`;
    }

    return baseMessage;
  }

  debug(message: string, data?: unknown): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.formatMessage("DEBUG", message, data));
    }
  }

  info(message: string, data?: unknown): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage("INFO", message, data));
    }
  }

  warn(message: string, data?: unknown): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage("WARN", message, data));
    }
  }

  error(message: string, data?: unknown): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage("ERROR", message, data));
    }
  }
}

// ===== ERROR HANDLER CLASS =====

export class ErrorHandler {
  private static instance: ErrorHandler;
  private logger: Logger;

  constructor() {
    this.logger = Logger.getInstance("ErrorHandler");
  }

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  // ===== WEBSOCKET ERROR HANDLING =====

  handleWebSocketError(error: Error, context: string): WebSocketError {
    const wsError: WebSocketError = {
      code: this.getErrorCode(error),
      message: error.message,
      timestamp: new Date(),
      context,
    };

    this.logger.error(`WebSocket error in ${context}`, wsError);
    return wsError;
  }

  handleConnectionError(error: Error, url: string): WebSocketError {
    const wsError: WebSocketError = {
      code: -1,
      message: `Connection failed to ${url}: ${error.message}`,
      timestamp: new Date(),
      context: "Connection",
    };

    this.logger.error("Connection error", wsError);
    return wsError;
  }

  handleReconnectionError(
    attempt: number,
    maxAttempts: number,
    error: Error
  ): WebSocketError {
    const wsError: WebSocketError = {
      code: -2,
      message: `Reconnection attempt ${attempt}/${maxAttempts} failed: ${error.message}`,
      timestamp: new Date(),
      context: "Reconnection",
    };

    this.logger.warn("Reconnection error", wsError);
    return wsError;
  }

  // ===== MARKET DATA ERROR HANDLING =====

  handleDataParsingError(error: Error, rawData: unknown): MarketDataError {
    const marketError: MarketDataError = {
      type: "parsing",
      message: `Failed to parse market data: ${error.message}`,
      timestamp: new Date(),
      data: rawData,
    };

    this.logger.error("Data parsing error", marketError);
    return marketError;
  }

  handleSubscriptionError(topic: string, error: Error): MarketDataError {
    const marketError: MarketDataError = {
      type: "subscription",
      message: `Failed to subscribe to ${topic}: ${error.message}`,
      timestamp: new Date(),
    };

    this.logger.error("Subscription error", marketError);
    return marketError;
  }

  handleDataValidationError(
    data: unknown,
    expectedFields: string[]
  ): MarketDataError {
    const missingFields = expectedFields.filter(
      (field) => typeof data === "object" && data !== null && !(field in data)
    );

    const marketError: MarketDataError = {
      type: "data",
      message: `Data validation failed. Missing fields: ${missingFields.join(
        ", "
      )}`,
      timestamp: new Date(),
      data,
    };

    this.logger.error("Data validation error", marketError);
    return marketError;
  }

  // ===== UTILITY METHODS =====

  private getErrorCode(error: Error): number {
    // Map common error types to specific codes
    if (error.message.includes("ECONNREFUSED")) return -100;
    if (error.message.includes("ETIMEDOUT")) return -101;
    if (error.message.includes("ENOTFOUND")) return -102;
    if (error.message.includes("Unexpected server response")) return -200;
    if (error.message.includes("WebSocket connection closed")) return -201;

    return -1; // Generic error
  }

  // ===== ERROR RECOVERY =====

  shouldRetry(error: WebSocketError): boolean {
    // Retry on connection errors, not on data errors
    return error.code < 0 && error.code > -100;
  }

  getRetryDelay(attempt: number): number {
    // Exponential backoff with jitter
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    const jitter = Math.random() * 1000; // Add up to 1 second jitter

    return delay + jitter;
  }
}

// ===== PERFORMANCE MONITORING =====

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  private logger: Logger;

  constructor() {
    this.logger = Logger.getInstance("PerformanceMonitor");
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startTimer(label: string): () => void {
    const start = performance.now();

    return () => {
      const duration = performance.now() - start;
      this.recordMetric(label, duration);
    };
  }

  recordMetric(label: string, value: number): void {
    if (!this.metrics.has(label)) {
      this.metrics.set(label, []);
    }

    const values = this.metrics.get(label)!;
    values.push(value);

    // Keep only last 100 measurements
    if (values.length > 100) {
      values.shift();
    }
  }

  getStats(
    label: string
  ): { avg: number; min: number; max: number; count: number } | null {
    const values = this.metrics.get(label);
    if (!values || values.length === 0) return null;

    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const count = values.length;

    return { avg, min, max, count };
  }

  logStats(label: string): void {
    const stats = this.getStats(label);
    if (stats) {
      this.logger.info(`Performance stats for ${label}`, stats);
    }
  }
}

// ===== EXPORT SINGLETONS =====

export const logger = Logger.getInstance();
export const errorHandler = ErrorHandler.getInstance();
export const performanceMonitor = PerformanceMonitor.getInstance();
