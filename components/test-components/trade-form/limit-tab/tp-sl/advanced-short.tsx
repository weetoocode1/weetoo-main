import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Separator } from "@/components/ui/separator";
import { ChevronDownIcon, MinusIcon, PlusIcon } from "lucide-react";
import {
  CHANGE_MAX_SL,
  CHANGE_MAX_TP,
  CHANGE_STEP,
  RiskMessage,
  ROI_MAX,
  ROI_STEP,
  SliderWithTooltip,
} from "./index";

interface AdvancedShortProps {
  shortTriggerPrice: number;
  setShortTriggerPrice: (v: number) => void;
  shortTriggerPriceType: string;
  setShortTriggerPriceType: (v: string) => void;

  shortRoiValue: number;
  setShortRoiValue: (v: number) => void;
  showShortTakeProfitTooltip: boolean;
  setShowShortTakeProfitTooltip: (v: boolean) => void;
  shortTakeProfitTriggerMethod: "roi" | "change" | "pnl";
  setShortTakeProfitTriggerMethod: (v: "roi" | "change" | "pnl") => void;

  shortStopLossValue: number;
  setShortStopLossValue: (v: number) => void;
  showShortStopLossTooltip: boolean;
  setShowShortStopLossTooltip: (v: boolean) => void;
  shortStopLossTriggerMethod: "roi" | "change" | "pnl";
  setShortStopLossTriggerMethod: (v: "roi" | "change" | "pnl") => void;
}

export const AdvancedShort = (props: AdvancedShortProps) => {
  const {
    shortTriggerPrice,
    setShortTriggerPrice,
    shortTriggerPriceType,
    setShortTriggerPriceType,
    shortRoiValue,
    setShortRoiValue,
    showShortTakeProfitTooltip,
    setShowShortTakeProfitTooltip,
    shortTakeProfitTriggerMethod,
    setShortTakeProfitTriggerMethod,
    shortStopLossValue,
    setShortStopLossValue,
    showShortStopLossTooltip,
    setShowShortStopLossTooltip,
    shortStopLossTriggerMethod,
    setShortStopLossTriggerMethod,
  } = props;

  return (
    <div className="space-y-1.5">
      {/* Take Profit Label + Trigger Dialog */}
      <div className="flex items-center justify-between">
        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 text-sm font-medium hover:text-foreground transition-colors cursor-pointer"
            >
              {shortTakeProfitTriggerMethod === "roi" &&
                "Take Profit-Trigger by ROI (%)"}
              {shortTakeProfitTriggerMethod === "change" &&
                "Take Profit-Trigger by Change %"}
              {shortTakeProfitTriggerMethod === "pnl" &&
                "Take Profit-Trigger by P&L"}
              <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
            </button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] !max-w-lg overflow-y-auto">
            <DialogHeader>
              <DialogTitle>TP/SL Settings</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <RadioGroup
                defaultValue="roi"
                value={shortTakeProfitTriggerMethod}
                onValueChange={(v: "roi" | "change" | "pnl") =>
                  setShortTakeProfitTriggerMethod(v)
                }
                className="space-y-6"
              >
                <div className="flex items-start space-x-3">
                  <RadioGroupItem
                    value="roi"
                    id="trigger-roi-short"
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="trigger-roi-short"
                      className="text-sm font-medium text-foreground cursor-pointer"
                    >
                      Trigger by ROI (%)
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Please enter your desired ROI (%) to calculate the trigger
                      price of TP/SL.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <RadioGroupItem
                    value="change"
                    id="trigger-change-short"
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="trigger-change-short"
                      className="text-sm font-medium text-foreground cursor-pointer"
                    >
                      Trigger by Change %
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Please enter your preferred TP/SL trigger price, or select
                      a percentage increase or decrease of the entry price to
                      calculate it.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <RadioGroupItem
                    value="pnl"
                    id="trigger-pnl-short"
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="trigger-pnl-short"
                      className="text-sm font-medium text-foreground cursor-pointer"
                    >
                      Trigger by P&L
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Please enter your expected profit or loss to calculate the
                      trigger price of TP/SL.
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>
            <DialogFooter className="mt-6">
              <div className="grid w-full grid-cols-2 gap-2">
                <DialogTrigger asChild>
                  <Button className="w-full h-10">Confirm</Button>
                </DialogTrigger>
                <DialogTrigger asChild>
                  <Button className="w-full h-10" variant="outline">
                    Cancel
                  </Button>
                </DialogTrigger>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Input Fields */}
      <div className="flex gap-1">
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground mb-1 block sr-only">
            Trigger Price
          </Label>
          <div className="flex items-center border border-border rounded-md">
            <Input
              type="number"
              placeholder="Trigger Price"
              value={
                Number.isFinite(shortTriggerPrice) ? shortTriggerPrice : ""
              }
              onChange={(e) => setShortTriggerPrice(Number(e.target.value))}
              className="flex-1 h-11 focus-visible:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none border-none !bg-transparent"
            />
            <div className="flex">
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-6 p-0 text-xs rounded-sm"
                onClick={() => setShortTriggerPrice(shortTriggerPrice + 1)}
              >
                <PlusIcon className="h-4 w-4" />
              </Button>
              <div className="border-l border-border h-5 w-px" />
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-6 p-0 text-xs rounded-sm"
                onClick={() =>
                  setShortTriggerPrice(Math.max(0, shortTriggerPrice - 1))
                }
              >
                <MinusIcon className="h-4 w-4" />
              </Button>
            </div>
            <Select
              value={shortTriggerPriceType}
              onValueChange={(v) => setShortTriggerPriceType(v)}
            >
              <SelectTrigger className="w-20 h-11 border-0 bg-transparent text-xs focus:ring-0 rounded-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last">Last</SelectItem>
                <SelectItem value="index">Index</SelectItem>
                <SelectItem value="mark">Mark</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="w-32">
          <div className="relative">
            <Input
              type="number"
              placeholder="ROI"
              value={Number.isFinite(shortRoiValue) ? shortRoiValue : ""}
              onChange={(e) => setShortRoiValue(Number(e.target.value))}
              className="h-11 pr-6 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none !bg-transparent"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              {props.shortTakeProfitTriggerMethod === "pnl" ? "USDT" : "%"}
            </span>
          </div>
        </div>
      </div>

      {shortTakeProfitTriggerMethod !== "pnl" && (
        <>
          <SliderWithTooltip
            value={shortRoiValue}
            min={0}
            max={
              shortTakeProfitTriggerMethod === "change"
                ? CHANGE_MAX_TP
                : ROI_MAX
            }
            step={
              shortTakeProfitTriggerMethod === "change" ? CHANGE_STEP : ROI_STEP
            }
            onChange={(v) => setShortRoiValue(v)}
            showTooltip={showShortTakeProfitTooltip}
            setShowTooltip={setShowShortTakeProfitTooltip}
            gradientClassName="loss-slider"
            getTooltipText={(v) => `${v.toFixed(1)}%`}
          />
          <RiskMessage
            show={shortRoiValue > 0}
            triggerPrice={shortTriggerPrice}
            percentage={shortRoiValue}
            isProfit={true}
          />
        </>
      )}

      <Separator className="my-6" />

      {/* Stop Loss */}
      <div className="flex items-center justify-between">
        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 text-sm font-medium hover:text-foreground transition-colors cursor-pointer"
            >
              {shortStopLossTriggerMethod === "roi" &&
                "Stop Loss-Trigger by ROI (%)"}
              {shortStopLossTriggerMethod === "change" &&
                "Stop Loss-Trigger by Change %"}
              {shortStopLossTriggerMethod === "pnl" &&
                "Stop Loss-Trigger by P&L"}
              <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
            </button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] !max-w-lg overflow-y-auto">
            <DialogHeader>
              <DialogTitle>TP/SL Settings</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <RadioGroup
                defaultValue="roi"
                value={shortStopLossTriggerMethod}
                onValueChange={(v: "roi" | "change" | "pnl") =>
                  setShortStopLossTriggerMethod(v)
                }
                className="space-y-6"
              >
                <div className="flex items-start space-x-3">
                  <RadioGroupItem
                    value="roi"
                    id="trigger-roi-stop-loss-short"
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="trigger-roi-stop-loss-short"
                      className="text-sm font-medium text-foreground cursor-pointer"
                    >
                      Trigger by ROI (%)
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Please enter your desired ROI (%) to calculate the trigger
                      price of TP/SL.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <RadioGroupItem
                    value="change"
                    id="trigger-change-stop-loss-short"
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="trigger-change-stop-loss-short"
                      className="text-sm font-medium text-foreground cursor-pointer"
                    >
                      Trigger by Change %
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Please enter your preferred TP/SL trigger price, or select
                      a percentage increase or decrease of the entry price to
                      calculate it.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <RadioGroupItem
                    value="pnl"
                    id="trigger-pnl-stop-loss-short"
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="trigger-pnl-stop-loss-short"
                      className="text-sm font-medium text-foreground cursor-pointer"
                    >
                      Trigger by P&L
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Please enter your expected profit or loss to calculate the
                      trigger price of TP/SL.
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>
            <DialogFooter className="mt-6">
              <div className="grid w-full grid-cols-2 gap-2">
                <DialogTrigger asChild>
                  <Button className="w-full h-10">Confirm</Button>
                </DialogTrigger>
                <DialogTrigger asChild>
                  <Button className="w-full h-10" variant="outline">
                    Cancel
                  </Button>
                </DialogTrigger>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stop loss inputs */}
      <div className="flex gap-1">
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground mb-1 block sr-only">
            Trigger Price
          </Label>
          <div className="flex items-center border border-border rounded-md">
            <Input
              type="number"
              placeholder="Trigger Price"
              value={
                Number.isFinite(shortTriggerPrice) ? shortTriggerPrice : ""
              }
              onChange={(e) => setShortTriggerPrice(Number(e.target.value))}
              className="flex-1 h-11 focus-visible:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none border-none !bg-transparent"
            />
            <div className="flex">
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-6 p-0 text-xs rounded-sm"
                onClick={() => setShortTriggerPrice(shortTriggerPrice + 1)}
              >
                <PlusIcon className="h-4 w-4" />
              </Button>
              <div className="border-l border-border h-5 w-px" />
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-6 p-0 text-xs rounded-sm"
                onClick={() =>
                  setShortTriggerPrice(Math.max(0, shortTriggerPrice - 1))
                }
              >
                <MinusIcon className="h-4 w-4" />
              </Button>
            </div>
            <Select
              value={shortTriggerPriceType}
              onValueChange={(v) => setShortTriggerPriceType(v)}
            >
              <SelectTrigger className="w-20 h-11 border-0 bg-transparent text-xs focus:ring-0 rounded-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last">Last</SelectItem>
                <SelectItem value="index">Index</SelectItem>
                <SelectItem value="mark">Mark</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="w-32">
          <div className="relative">
            <Input
              type="number"
              placeholder="ROI"
              value={
                Number.isFinite(shortStopLossValue) ? shortStopLossValue : ""
              }
              onChange={(e) => setShortStopLossValue(Number(e.target.value))}
              className="h-11 pr-6 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none !bg-transparent"
            />
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">
              {props.shortStopLossTriggerMethod === "pnl" ? "USDT" : "%"}
            </span>
          </div>
        </div>
      </div>

      {shortStopLossTriggerMethod !== "pnl" && (
        <>
          <SliderWithTooltip
            value={shortStopLossValue}
            min={0}
            max={shortStopLossTriggerMethod === "change" ? CHANGE_MAX_SL : 75}
            step={
              shortStopLossTriggerMethod === "change" ? CHANGE_STEP : ROI_STEP
            }
            onChange={(v) => setShortStopLossValue(v)}
            showTooltip={showShortStopLossTooltip}
            setShowTooltip={setShowShortStopLossTooltip}
            gradientClassName="loss-slider"
            getTooltipText={(v) => `${v.toFixed(1)}%`}
          />
          <RiskMessage
            show={shortStopLossValue > 0}
            triggerPrice={shortTriggerPrice}
            percentage={shortStopLossValue}
            isProfit={false}
          />
        </>
      )}
    </div>
  );
};
