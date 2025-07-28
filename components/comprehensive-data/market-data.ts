// Optimized market data with memoized chart generation
export interface ChartDataPoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface InstrumentData {
  id: string;
  name: string;
  symbol: string;
  type: "forex" | "commodity";
  price: number;
  changePercent: number;
  changeValue: number;
  high24h: number;
  low24h: number;
  chartData: ChartDataPoint[];
}

// Memoized chart data generation with improved caching
const chartDataCache = new Map<string, ChartDataPoint[]>();

const generateChartData = (
  basePrice: number,
  points = 30,
  volatility = 0.01,
  cacheKey?: string
): ChartDataPoint[] => {
  if (cacheKey && chartDataCache.has(cacheKey)) {
    return chartDataCache.get(cacheKey)!;
  }

  // Generate data with reduced precision for smaller bundle size
  const data: ChartDataPoint[] = [];
  let lastClose = basePrice;
  const precision = basePrice < 10 ? 3 : 1; // Reduced precision

  for (let i = 0; i < points; i++) {
    const open = Number.parseFloat(lastClose.toFixed(precision));
    const highChange = Math.random() * volatility * open;
    const lowChange = Math.random() * volatility * open;
    const closeChange = (Math.random() - 0.5) * 2 * volatility * open;

    let high = open + highChange;
    let low = open - lowChange;
    let close = open + closeChange;

    if (low > open) low = open - Math.random() * (volatility / 2) * open;
    if (high < open) high = open + Math.random() * (volatility / 2) * open;

    const ohlc = [open, high, low, close];
    high = Math.max(...ohlc);
    low = Math.min(...ohlc);
    close = Math.max(low, Math.min(high, close));

    data.push({
      time: `T-${points - 1 - i}`,
      open: Number.parseFloat(open.toFixed(precision)),
      high: Number.parseFloat(high.toFixed(precision)),
      low: Number.parseFloat(low.toFixed(precision)),
      close: Number.parseFloat(close.toFixed(precision)),
    });
    lastClose = close;
    if (lastClose <= 0) lastClose = basePrice * 0.01;
  }

  const result = data.reverse();
  if (cacheKey) {
    chartDataCache.set(cacheKey, result);
  }
  return result;
};

export const forexData: InstrumentData[] = [
  {
    id: "eurusd",
    name: "EUR/USD",
    symbol: "EURUSD",
    type: "forex",
    price: 1.0853,
    changePercent: 0.25,
    changeValue: 0.0027,
    high24h: 1.0875,
    low24h: 1.0821,
    chartData: generateChartData(1.0853, 30, 0.005, "eurusd"),
  },
  {
    id: "gbpusd",
    name: "GBP/USD",
    symbol: "GBPUSD",
    type: "forex",
    price: 1.2731,
    changePercent: -0.11,
    changeValue: -0.0014,
    high24h: 1.2755,
    low24h: 1.271,
    chartData: generateChartData(1.2731, 30, 0.005, "gbpusd"),
  },
  {
    id: "usdjpy",
    name: "USD/JPY",
    symbol: "USDJPY",
    type: "forex",
    price: 157.02,
    changePercent: 0.45,
    changeValue: 0.7,
    high24h: 157.3,
    low24h: 156.5,
    chartData: generateChartData(157.02, 30, 0.003, "usdjpy"),
  },
  {
    id: "audusd",
    name: "AUD/USD",
    symbol: "AUDUSD",
    type: "forex",
    price: 0.6658,
    changePercent: 0.05,
    changeValue: 0.0003,
    high24h: 0.667,
    low24h: 0.6635,
    chartData: generateChartData(0.6658, 30, 0.006, "audusd"),
  },
  {
    id: "usdcad",
    name: "USD/CAD",
    symbol: "USDCAD",
    type: "forex",
    price: 1.3725,
    changePercent: -0.2,
    changeValue: -0.0027,
    high24h: 1.376,
    low24h: 1.3715,
    chartData: generateChartData(1.3725, 30, 0.004, "usdcad"),
  },
  {
    id: "usdchf",
    name: "USD/CHF",
    symbol: "USDCHF",
    type: "forex",
    price: 0.8976,
    changePercent: 0.15,
    changeValue: 0.0013,
    high24h: 0.899,
    low24h: 0.895,
    chartData: generateChartData(0.8976, 30, 0.005, "usdchf"),
  },
  {
    id: "nzdusd",
    name: "NZD/USD",
    symbol: "NZDUSD",
    type: "forex",
    price: 0.6134,
    changePercent: -0.08,
    changeValue: -0.0005,
    high24h: 0.615,
    low24h: 0.612,
    chartData: generateChartData(0.6134, 30, 0.006, "nzdusd"),
  },
  {
    id: "eurgbp",
    name: "EUR/GBP",
    symbol: "EURGBP",
    type: "forex",
    price: 0.8524,
    changePercent: 0.3,
    changeValue: 0.0026,
    high24h: 0.854,
    low24h: 0.85,
    chartData: generateChartData(0.8524, 30, 0.004, "eurgbp"),
  },
  {
    id: "eurjpy",
    name: "EUR/JPY",
    symbol: "EURJPY",
    type: "forex",
    price: 170.45,
    changePercent: 0.65,
    changeValue: 1.1,
    high24h: 170.8,
    low24h: 169.9,
    chartData: generateChartData(170.45, 30, 0.003, "eurjpy"),
  },
  {
    id: "gbpjpy",
    name: "GBP/JPY",
    symbol: "GBPJPY",
    type: "forex",
    price: 199.98,
    changePercent: 0.35,
    changeValue: 0.7,
    high24h: 200.5,
    low24h: 199.5,
    chartData: generateChartData(199.98, 30, 0.003, "gbpjpy"),
  },
];

export const commoditiesData: InstrumentData[] = [
  {
    id: "xauusd",
    name: "Gold Spot",
    symbol: "XAUUSD",
    type: "commodity",
    price: 2350.75,
    changePercent: 0.55,
    changeValue: 12.85,
    high24h: 2360.5,
    low24h: 2335.2,
    chartData: generateChartData(2350.75, 30, 0.002, "xauusd"),
  },
  {
    id: "usoil",
    name: "Crude Oil (WTI)",
    symbol: "USOIL",
    type: "commodity",
    price: 78.65,
    changePercent: -1.2,
    changeValue: -0.95,
    high24h: 79.8,
    low24h: 78.1,
    chartData: generateChartData(78.65, 30, 0.01, "usoil"),
  },
];
