// Factory pattern for creating broker API instances

import { BrokerAPI, BrokerType } from "./broker-types";
import { hasBrokerCredentials } from "./broker-utils";

// Broker registry: maps broker type to module path
const BROKER_REGISTRY: Record<string, string> = {
  deepcoin: "./deepcoin-api",
  orangex: "./orangex-api",
  lbank: "./lbank-api",
  bingx: "./bingx-api",
} as const;

// Unimplemented brokers
const UNIMPLEMENTED_BROKERS: Set<BrokerType> = new Set([
  "okx",
  "bybit",
  "gate",
  "kucoin",
  "mexc",
  "binance",
]);

export class BrokerFactory {
  /**
   * Create a broker API instance based on broker type
   */
  static async createBrokerAPI(
    brokerType: BrokerType
  ): Promise<BrokerAPI | null> {
    // Check if credentials are available for this broker
    if (!hasBrokerCredentials(brokerType)) {
      console.warn(`No credentials configured for ${brokerType}`);
      return null;
    }

    // Check if broker is unimplemented
    if (UNIMPLEMENTED_BROKERS.has(brokerType)) {
          console.warn(`${brokerType} API not yet implemented`);
          return null;
    }

    // Get module path from registry
    const modulePath = BROKER_REGISTRY[brokerType];
    if (!modulePath) {
          console.error(`Unknown broker type: ${brokerType}`);
          return null;
      }

    try {
      // Dynamically import and instantiate the broker API
      const BrokerAPIClass = await import(modulePath).then((m) => m.default);
      return new BrokerAPIClass();
    } catch (error) {
      console.error(`Failed to create ${brokerType} API instance:`, error);
      return null;
    }
  }

  /**
   * Get all available broker types that have credentials configured
   */
  static getAvailableBrokers(): BrokerType[] {
    const allBrokers: BrokerType[] = [
      ...Object.keys(BROKER_REGISTRY),
      ...Array.from(UNIMPLEMENTED_BROKERS),
    ] as BrokerType[];

    return allBrokers.filter((brokerType) => hasBrokerCredentials(brokerType));
  }

  /**
   * Check if a specific broker is available
   */
  static isBrokerAvailable(brokerType: BrokerType): boolean {
    return hasBrokerCredentials(brokerType);
  }

  /**
   * Get broker configuration info
   */
  static getBrokerConfig(brokerType: BrokerType) {
    const isAvailable = this.isBrokerAvailable(brokerType);

    return {
      type: brokerType,
      isAvailable,
      hasCredentials: isAvailable,
      // Add more config info as needed
    };
  }
}
