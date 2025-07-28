// Trading symbols config for use in create-room and edit-room
export interface TradingSymbol {
  value: string;
  label: string;
  isNew?: boolean;
}
// { value: "SOLUSDT", label: "SOLUSDT", isNew: true },

export const TRADING_SYMBOLS: TradingSymbol[] = [
  { value: "BTCUSDT", label: "BTC/USDT" },
  { value: "ETHUSDT", label: "ETH/USDT" },
  { value: "BNBUSDT", label: "BNB/USDT" },
  { value: "XRPUSDT", label: "XRP/USDT", isNew: true },
  { value: "SOLUSDT", label: "SOL/USDT", isNew: true },
  { value: "ADAUSDT", label: "ADA/USDT", isNew: true },
  { value: "SUIUSDT", label: "SUI/USDT", isNew: true },
  { value: "DOGEUSDT", label: "DOGE/USDT", isNew: true },
  //   { value: "MATICUSDT", label: "MATIC/USDT", isNew: true },
  { value: "LINKUSDT", label: "LINK/USDT", isNew: true },
  { value: "DOTUSDT", label: "DOT/USDT", isNew: true },
];
