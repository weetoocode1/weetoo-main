// Factory pattern for creating broker API instances

import { BrokerAPI, BrokerType } from "./broker-types";
import { hasBrokerCredentials } from "./broker-utils";

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

    try {
      switch (brokerType) {
        case "deepcoin":
          const { DeepCoinAPI } = await import("./deepcoin-api");
          return new DeepCoinAPI();

        case "orangex":
          const { OrangeXAPI } = await import("./orangex-api");
          return new OrangeXAPI();

        // Future brokers will be added here
        case "bingx":
        case "okx":
        case "bybit":
        case "gate":
        case "kucoin":
        case "mexc":
        case "binance":
          console.warn(`${brokerType} API not yet implemented`);
          return null;

        default:
          console.error(`Unknown broker type: ${brokerType}`);
          return null;
      }
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
      "deepcoin",
      "orangex",
      "bingx",
      "okx",
      "bybit",
      "gate",
      "kucoin",
      "mexc",
      "binance",
    ];

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
