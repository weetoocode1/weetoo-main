export type TriggerMethod = "roi" | "change" | "pnl";
export type PriceType = "last" | "index" | "mark";

export interface SliderWithTooltipProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (val: number) => void;
  showTooltip: boolean;
  setShowTooltip: (show: boolean) => void;
  gradientClassName: string;
  getTooltipText: (value: number) => string;
}

export interface RiskMessageProps {
  show: boolean;
  triggerPrice: number;
  percentage: number;
  isProfit: boolean;
}
