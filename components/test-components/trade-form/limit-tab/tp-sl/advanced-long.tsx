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

interface AdvancedLongProps {
  applicableTo: "entire" | "current";
  setApplicableTo: (v: "entire" | "current") => void;

  triggerPrice: number;
  setTriggerPrice: (v: number) => void;
  triggerPriceType: string;
  setTriggerPriceType: (v: string) => void;

  roiValue: number;
  setRoiValue: (v: number) => void;
  showTakeProfitTooltip: boolean;
  setShowTakeProfitTooltip: (v: boolean) => void;
  takeProfitTriggerMethod: "roi" | "change" | "pnl";
  setTakeProfitTriggerMethod: (v: "roi" | "change" | "pnl") => void;

  stopLossValue: number;
  setStopLossValue: (v: number) => void;
  showStopLossTooltip: boolean;
  setShowStopLossTooltip: (v: boolean) => void;
  stopLossTriggerMethod: "roi" | "change" | "pnl";
  setStopLossTriggerMethod: (v: "roi" | "change" | "pnl") => void;

  limitChecked: boolean;
  setLimitChecked: (v: boolean) => void;
  stopLossLimitChecked: boolean;
  setStopLossLimitChecked: (v: boolean) => void;
}

export const AdvancedLong = (props: AdvancedLongProps) => {
  const {
    triggerPrice,
    setTriggerPrice,
    triggerPriceType,
    setTriggerPriceType,
    roiValue,
    setRoiValue,
    showTakeProfitTooltip,
    setShowTakeProfitTooltip,
    takeProfitTriggerMethod,
    setTakeProfitTriggerMethod,
    stopLossValue,
    setStopLossValue,
    showStopLossTooltip,
    setShowStopLossTooltip,
    stopLossTriggerMethod,
    setStopLossTriggerMethod,
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
              {takeProfitTriggerMethod === "roi" &&
                "Take Profit-Trigger by ROI (%)"}
              {takeProfitTriggerMethod === "change" &&
                "Take Profit-Trigger by Change %"}
              {takeProfitTriggerMethod === "pnl" &&
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
                value={takeProfitTriggerMethod}
                onValueChange={(v: "roi" | "change" | "pnl") =>
                  setTakeProfitTriggerMethod(v)
                }
                className="space-y-6"
              >
                <div className="flex items-start space-x-3">
                  <RadioGroupItem
                    value="roi"
                    id="trigger-roi"
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="trigger-roi"
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
                    id="trigger-change"
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="trigger-change"
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
                    id="trigger-pnl"
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="trigger-pnl"
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
              value={Number.isFinite(triggerPrice) ? triggerPrice : ""}
              onChange={(e) => setTriggerPrice(Number(e.target.value))}
              className="flex-1 h-11 focus-visible:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none border-none !bg-transparent"
            />
            <div className="flex">
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-6 p-0 text-xs rounded-sm"
                onClick={() => setTriggerPrice(triggerPrice + 1)}
              >
                <PlusIcon className="h-4 w-4" />
              </Button>
              <div className="border-l border-border h-5 w-px" />
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-6 p-0 text-xs rounded-sm"
                onClick={() => setTriggerPrice(Math.max(0, triggerPrice - 1))}
              >
                <MinusIcon className="h-4 w-4" />
              </Button>
            </div>
            <Select
              value={triggerPriceType}
              onValueChange={(v) => setTriggerPriceType(v)}
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

        {/* ROI Input */}
        <div className="w-32">
          <div className="relative">
            <Input
              type="number"
              placeholder="ROI"
              value={Number.isFinite(roiValue) ? roiValue : ""}
              onChange={(e) => setRoiValue(Number(e.target.value))}
              className="h-11 pr-6 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none !bg-transparent"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              {props.takeProfitTriggerMethod === "pnl" ? "USDT" : "%"}
            </span>
          </div>
        </div>
      </div>

      {takeProfitTriggerMethod !== "pnl" && (
        <>
          <SliderWithTooltip
            value={roiValue}
            min={0}
            max={takeProfitTriggerMethod === "change" ? CHANGE_MAX_TP : ROI_MAX}
            step={takeProfitTriggerMethod === "change" ? CHANGE_STEP : ROI_STEP}
            onChange={(v) => setRoiValue(v)}
            showTooltip={showTakeProfitTooltip}
            setShowTooltip={setShowTakeProfitTooltip}
            gradientClassName="profit-slider"
            getTooltipText={(v) => `${v.toFixed(1)}%`}
          />
          <RiskMessage
            show={roiValue > 0}
            triggerPrice={triggerPrice}
            percentage={roiValue}
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
              {stopLossTriggerMethod === "roi" &&
                "Stop Loss-Trigger by ROI (%)"}
              {stopLossTriggerMethod === "change" &&
                "Stop Loss-Trigger by Change %"}
              {stopLossTriggerMethod === "pnl" && "Stop Loss-Trigger by P&L"}
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
                value={stopLossTriggerMethod}
                onValueChange={(v: "roi" | "change" | "pnl") =>
                  setStopLossTriggerMethod(v)
                }
                className="space-y-6"
              >
                <div className="flex items-start space-x-3">
                  <RadioGroupItem
                    value="roi"
                    id="trigger-roi-stop-loss"
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="trigger-roi-stop-loss"
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
                    id="trigger-change-stop-loss"
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="trigger-change-stop-loss"
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
                    id="trigger-pnl-stop-loss"
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="trigger-pnl-stop-loss"
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
              value={Number.isFinite(triggerPrice) ? triggerPrice : ""}
              onChange={(e) => props.setTriggerPrice(Number(e.target.value))}
              className="flex-1 h-11 focus-visible:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none border-none !bg-transparent"
            />
            <div className="flex">
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-6 p-0 text-xs rounded-sm"
                onClick={() => props.setTriggerPrice(triggerPrice + 1)}
              >
                <PlusIcon className="h-4 w-4" />
              </Button>
              <div className="border-l border-border h-5 w-px" />
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-6 p-0 text-xs rounded-sm"
                onClick={() =>
                  props.setTriggerPrice(Math.max(0, triggerPrice - 1))
                }
              >
                <MinusIcon className="h-4 w-4" />
              </Button>
            </div>
            <Select
              value={triggerPriceType}
              onValueChange={(v) => setTriggerPriceType(v)}
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
              value={Number.isFinite(stopLossValue) ? stopLossValue : ""}
              onChange={(e) => setStopLossValue(Number(e.target.value))}
              className="h-11 pr-6 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none !bg-transparent"
            />
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">
              {props.stopLossTriggerMethod === "pnl" ? "USDT" : "%"}
            </span>
          </div>
        </div>
      </div>

      {stopLossTriggerMethod !== "pnl" && (
        <>
          <SliderWithTooltip
            value={stopLossValue}
            min={0}
            max={stopLossTriggerMethod === "change" ? CHANGE_MAX_SL : 75}
            step={stopLossTriggerMethod === "change" ? CHANGE_STEP : ROI_STEP}
            onChange={(v) => setStopLossValue(v)}
            showTooltip={showStopLossTooltip}
            setShowTooltip={setShowStopLossTooltip}
            gradientClassName="profit-slider"
            getTooltipText={(v) => `${v.toFixed(1)}%`}
          />
          <RiskMessage
            show={stopLossValue > 0}
            triggerPrice={triggerPrice}
            percentage={stopLossValue}
            isProfit={false}
          />
        </>
      )}
    </div>
  );
};
