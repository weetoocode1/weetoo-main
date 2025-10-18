// Trading symbols config for use in create-room and edit-room
export interface TradingSymbol {
  value: string;
  label: string;
  name?: string; // Human-friendly asset name (e.g., Bitcoin for BTC)
  isNew?: boolean;
}
// { value: "SOLUSDT", label: "SOLUSDT", isNew: true },

export const TRADING_SYMBOLS: TradingSymbol[] = [
  { value: "BTCUSDT", label: "BTC/USDT", name: "Bitcoin" },
  { value: "ETHUSDT", label: "ETH/USDT", name: "Ethereum" },
  { value: "BNBUSDT", label: "BNB/USDT", name: "Binance Coin (BNB)" },
  { value: "XRPUSDT", label: "XRP/USDT", name: "XRP (Ripple)", isNew: true },
  { value: "SOLUSDT", label: "SOL/USDT", name: "Solana", isNew: true },
  { value: "ADAUSDT", label: "ADA/USDT", name: "Cardano", isNew: true },
  { value: "SUIUSDT", label: "SUI/USDT", name: "Sui", isNew: true },
  { value: "DOGEUSDT", label: "DOGE/USDT", name: "Dogecoin", isNew: true },
  // { value: "MATICUSDT", label: "MATIC/USDT", name: "Polygon (MATIC)", isNew: true },
  { value: "LINKUSDT", label: "LINK/USDT", name: "Chainlink", isNew: true },
  { value: "DOTUSDT", label: "DOT/USDT", name: "Polkadot", isNew: true },
];
