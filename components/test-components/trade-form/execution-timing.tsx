"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Clock, ClockIcon, Info } from "lucide-react";
import { useId, useMemo } from "react";
import { DatePicker } from "./date-picker";

interface ExecutionTimingProps {
  value: "now" | "time_based" | "price_based";
  onChange: (v: "now" | "time_based" | "price_based") => void;
  scheduledDate: Date | undefined;
  onScheduledDateChange: (d: Date | undefined) => void;
  scheduledTime: string;
  onScheduledTimeChange: (t: string) => void;
  triggerCondition: "above" | "below";
  onTriggerConditionChange: (c: "above" | "below") => void;
  triggerPrice: string;
  onTriggerPriceChange: (p: string) => void;
  currentPrice: number;
  timezone?: string;
  onTimezoneChange?: (tz: string) => void;
  // Context from parent to render confirmations
  orderContext?: "market" | "limit";
  // The user-entered limit price (for Limit tab)
  limitPrice?: number;
}

const TRIGGER_CONDITION_MAP = {
  above: "Rises Above",
  below: "Falls Below",
} as const;

const TIMEZONE_OPTIONS = [
  { value: "Asia/Seoul", label: "KST" },
  { value: "Asia/Kolkata", label: "IST" },
  { value: "UTC", label: "UTC" },
] as const;

export function ExecutionTiming({
  value,
  onChange,
  scheduledDate,
  onScheduledDateChange,
  scheduledTime,
  onScheduledTimeChange,
  triggerCondition,
  onTriggerConditionChange,
  triggerPrice,
  onTriggerPriceChange,
  currentPrice,
  timezone = "Asia/Seoul",
  onTimezoneChange,
  orderContext = "limit",
  limitPrice,
}: ExecutionTimingProps) {
  const nowId = useId();
  const timeId = useId();
  const priceId = useId();

  // Default to current time + 1 hour
  const defaultTime = useMemo(() => {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    return oneHourLater.toTimeString().slice(0, 5); // HH:MM format
  }, []);

  const aboveId = useId();
  const belowId = useId();

  const calculateDistance = () => {
    const trigger = parseFloat(triggerPrice);
    if (!trigger || !currentPrice) return { value: 0, percentage: 0 };

    const diff = trigger - currentPrice;
    const percentage = (diff / currentPrice) * 100;

    return {
      value: diff.toFixed(2),
      percentage: percentage.toFixed(2),
    };
  };

  const distance = calculateDistance();

  // ===== Derived values for confirmations =====
  // const tzLabel =
  //   TIMEZONE_OPTIONS.find((tz) => tz.value === timezone)?.label ?? "UTC";

  // const scheduledDateTime = useMemo(() => {
  //   if (!scheduledDate || !scheduledTime) return undefined as Date | undefined;
  //   const isoDate = `${
  //     scheduledDate.toISOString().split("T")[0]
  //   }T${scheduledTime}`;
  //   return new Date(isoDate);
  // }, [scheduledDate, scheduledTime]);

  // const countdown = useMemo(() => {
  //   if (!scheduledDateTime) return "";
  //   const now = new Date();
  //   const diffMs = scheduledDateTime.getTime() - now.getTime();
  //   if (diffMs <= 0) return "0s";
  //   const totalSeconds = Math.floor(diffMs / 1000);
  //   const h = Math.floor(totalSeconds / 3600);
  //   const m = Math.floor((totalSeconds % 3600) / 60);
  //   const s = totalSeconds % 60;
  //   const parts: string[] = [];
  //   if (h) parts.push(`${h}h`);
  //   if (m) parts.push(`${m}m`);
  //   parts.push(`${s}s`);
  //   return parts.join(" ");
  // }, [scheduledDateTime]);

  // const triggerPriceNum = useMemo(() => {
  //   const n = Number(triggerPrice);
  //   return Number.isFinite(n) ? n : undefined;
  // }, [triggerPrice]);

  return (
    <div className="mt-3 space-y-3 border py-2.5 px-2 bg-muted/20 rounded-md">
      <div className="text-xs font-medium text-muted-foreground flex items-center gap-2">
        <ClockIcon className="w-4 h-4" /> Execution Timing
      </div>

      <RadioGroup
        value={value}
        onValueChange={(v) =>
          onChange(v as "now" | "time_based" | "price_based")
        }
        className="flex flex-col gap-2"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem id={nowId} value="now" />
          <Label htmlFor={nowId} className="text-sm cursor-pointer">
            Execute Now
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <RadioGroupItem id={timeId} value="time_based" />
          <Label htmlFor={timeId} className="text-sm cursor-pointer">
            Schedule by Time
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <RadioGroupItem id={priceId} value="price_based" />
          <Label htmlFor={priceId} className="text-sm cursor-pointer">
            Schedule by Price
          </Label>
        </div>
      </RadioGroup>

      {value === "time_based" && (
        <div className="space-y-3">
          <div className="space-y-3">
            <div className="flex flex-col gap-1">
              <Label
                htmlFor="schedule-date"
                className="text-xs text-muted-foreground"
              >
                Date
              </Label>
              <DatePicker
                value={scheduledDate}
                onChange={onScheduledDateChange}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label
                htmlFor="schedule-time"
                className="text-xs text-muted-foreground"
              >
                Time
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                  </span>
                  <Input
                    id="schedule-time"
                    type="time"
                    step="60"
                    value={scheduledTime || defaultTime}
                    onChange={(e) => onScheduledTimeChange(e.target.value)}
                    className="h-9 text-xs pl-8 pr-3 bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                  />
                </div>
                <Select
                  value={timezone}
                  onValueChange={(value) => onTimezoneChange?.(value)}
                >
                  <SelectTrigger className="h-9 text-xs w-[100px] px-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONE_OPTIONS.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Time-based confirmation intentionally removed per request */}
        </div>
      )}

      {value === "price_based" && (
        <div className="space-y-3">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">
              Trigger when price:
            </Label>
            <RadioGroup
              value={triggerCondition}
              onValueChange={(v) =>
                onTriggerConditionChange(v as "above" | "below")
              }
              className="flex flex-col gap-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem id={aboveId} value="above" />
                <Label htmlFor={aboveId} className="text-sm cursor-pointer">
                  {TRIGGER_CONDITION_MAP.above}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem id={belowId} value="below" />
                <Label htmlFor={belowId} className="text-sm cursor-pointer">
                  {TRIGGER_CONDITION_MAP.below}
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex flex-col gap-1">
            <Label
              htmlFor="trigger-price"
              className="text-xs text-muted-foreground"
            >
              Trigger Price
            </Label>
            <Input
              id="trigger-price"
              type="number"
              step="0.01"
              value={triggerPrice}
              onChange={(e) => onTriggerPriceChange(e.target.value)}
              placeholder="Enter trigger price"
              className="h-9 text-xs"
            />
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <div>Current: {currentPrice.toLocaleString()}</div>
            <div className="flex items-center gap-2">
              <span>Distance:</span>
              <span
                className={
                  parseFloat(distance.value.toString()) >= 0
                    ? "text-emerald-500"
                    : "text-red-500"
                }
              >
                {parseFloat(distance.value.toString()) >= 0 ? "+" : ""}
                {distance.value}
              </span>
              <span
                className={
                  parseFloat(distance.percentage.toString()) >= 0
                    ? "text-emerald-500"
                    : "text-red-500"
                }
              >
                ({parseFloat(distance.percentage.toString()) >= 0 ? "+" : ""}
                {distance.percentage}%)
              </span>
            </div>
          </div>

          {/* Price-based Confirmation Preview */}
          {triggerPrice && (
            <div className="mt-3 p-3 bg-muted/50 rounded-lg border">
              <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <span>Price Trigger Confirmation</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label="Trigger Price Info"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[300px] w-full">
                      <div className="space-y-1 text-xs">
                        <div>
                          <span className="font-medium">Trigger Price:</span>{" "}
                          When market price {">"}=
                          {"above" === triggerCondition ? "=" : ""}{" "}
                          {triggerCondition === "above"
                            ? "reaches or exceeds"
                            : "reaches or falls below"}{" "}
                          your trigger, the system will act.
                          {orderContext === "market"
                            ? " For Market orders, the position opens immediately at the current price."
                            : " For Limit orders, an order is placed at your Limit Price."}
                        </div>
                        {typeof limitPrice === "number" && (
                          <div>
                            <span className="font-medium">Limit Price:</span>{" "}
                            The price where your limit order is posted after
                            trigger. It may not fill immediately if the market
                            hasn’t reached it.
                          </div>
                        )}
                        <div>
                          <span className="font-medium">Current Price:</span>{" "}
                          The live market price used to check the trigger.
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="text-xs">
                {typeof limitPrice === "number" && (
                  <div className="text-xs">
                    Note: Your limit ({limitPrice.toLocaleString()}) is{" "}
                    {parseFloat(triggerPrice) > limitPrice
                      ? "below"
                      : parseFloat(triggerPrice) < limitPrice
                      ? "above"
                      : "equal to"}{" "}
                    trigger ({parseFloat(triggerPrice).toLocaleString()}). Order
                    may not fill immediately.
                  </div>
                )}
                {orderContext === "market" && (
                  <div className="text-xs text-muted-foreground">
                    Market order will execute at current price when BTC{" "}
                    {triggerCondition === "above" ? "rises to" : "falls to"}{" "}
                    {parseFloat(triggerPrice).toLocaleString()}.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
