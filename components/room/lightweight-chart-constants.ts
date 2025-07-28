// Chart constants for use in LightweightChart and ChartTopBar
import {
  CandlestickChart,
  BarChart2,
  LineChart,
  AreaChart,
  Activity,
  Waves,
} from "lucide-react";
import { LucideIcon } from "lucide-react";

// TypeScript interfaces
export interface ChartType {
  label: string;
  value: string;
  icon: LucideIcon;
}

export interface Period {
  label: string;
  value: string;
}

export const CHART_TYPES: ChartType[] = [
  {
    label: "Candles",
    value: "candlestick",
    icon: CandlestickChart,
  },
  {
    label: "Bars",
    value: "bar",
    icon: BarChart2,
  },
  {
    label: "Line",
    value: "line",
    icon: LineChart,
  },
  {
    label: "Area",
    value: "area",
    icon: AreaChart,
  },
  {
    label: "Baseline",
    value: "baseline",
    icon: Activity,
  },
  {
    label: "Heikin Ashi",
    value: "heikin_ashi",
    icon: Waves,
  },
];

export const PERIODS: Period[] = [
  { label: "1m", value: "1m" },
  { label: "3m", value: "3m" },
  { label: "5m", value: "5m" },
  { label: "10m", value: "10m" },
  { label: "15m", value: "15m" },
  { label: "30m", value: "30m" },
  { label: "1h", value: "1h" },
  { label: "2h", value: "2h" },
  { label: "3h", value: "3h" },
  { label: "4h", value: "4h" },
  { label: "6h", value: "6h" },
  { label: "12h", value: "12h" },
  { label: "1D", value: "1d" },
  { label: "1W", value: "1w" },
  { label: "1M", value: "1M" },
];

export const MAIN_PERIODS: string[] = ["1m", "5m", "15m", "1h", "1d"];
