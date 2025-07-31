export interface Room {
  name: string;
  creator: { name: string };
  symbol: string;
  category: string;
  isPublic: boolean;
  participants: number;
}

export const tradingRooms: Room[] = [
  {
    name: "BTC Strategy Discussion",
    creator: { name: "Alex Thompson" },
    symbol: "BTCUSDT",
    category: "Chat",
    isPublic: true,
    participants: 24,
  },
  {
    name: "ETH Technical Analysis",
    creator: { name: "Sarah Kim" },
    symbol: "ETHUSDT",
    category: "Voice",
    isPublic: true,
    participants: 18,
  },
  {
    name: "Futures Trading Strategies",
    creator: { name: "Emma Wilson" },
    symbol: "BTCUSDT",
    category: "Chat",
    isPublic: true,
    participants: 15,
  },
  {
    name: "Day Trading Strategies",
    creator: { name: "William Taylor" },
    symbol: "BNBUSDT",
    category: "Voice",
    isPublic: true,
    participants: 19,
  },
  {
    name: "VIP BTC Room",
    creator: { name: "David Lee" },
    symbol: "BTCUSDT",
    category: "Voice",
    isPublic: false,
    participants: 9,
  },
  {
    name: "ETH Swing Group",
    creator: { name: "Olivia Brown" },
    symbol: "ETHUSDT",
    category: "Chat",
    isPublic: true,
    participants: 27,
  },
  {
    name: "BNB Quick Trades",
    creator: { name: "Sophia Garcia" },
    symbol: "BNBUSDT",
    category: "Chat",
    isPublic: false,
    participants: 12,
  },
  {
    name: "BTCUSDT Morning Brief",
    creator: { name: "Grace Hall" },
    symbol: "BTCUSDT",
    category: "Chat",
    isPublic: true,
    participants: 21,
  },
  {
    name: "ETHUSDT Pro Signals",
    creator: { name: "Ethan Wright" },
    symbol: "ETHUSDT",
    category: "Chat",
    isPublic: false,
    participants: 14,
  },
  {
    name: "BNBUSDT Insights",
    creator: { name: "Nina Patel" },
    symbol: "BNBUSDT",
    category: "Voice",
    isPublic: true,
    participants: 17,
  },
];
