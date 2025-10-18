import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangleIcon } from "lucide-react";

interface BasicProps {
  takeProfitValue: number;
  setTakeProfitValue: (v: number) => void;
  stopLossValue: number;
  setStopLossValue: (v: number) => void;
  tpEnabled: boolean;
  setTpEnabled: (enabled: boolean) => void;
  slEnabled: boolean;
  setSlEnabled: (enabled: boolean) => void;
  orderType: "market" | "limit";
}

export const BasicTpSl = ({
  takeProfitValue,
  setTakeProfitValue,
  stopLossValue,
  setStopLossValue,
  tpEnabled,
  setTpEnabled,
  slEnabled,
  setSlEnabled,
  orderType,
}: BasicProps) => {
  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center gap-x-4">
        {/* Take Profit Section */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="tp-enabled"
              checked={tpEnabled}
              onCheckedChange={setTpEnabled}
              aria-label="Enable Take Profit"
              className="cursor-pointer"
            />
            <Label
              htmlFor="tp-enabled"
              className="text-xs font-medium cursor-pointer"
            >
              Enable Take Profit
            </Label>
          </div>
        </div>

        {/* Stop Loss Section */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="sl-enabled"
              checked={slEnabled}
              onCheckedChange={setSlEnabled}
              aria-label="Enable Stop Loss"
              className="cursor-pointer"
            />
            <Label
              htmlFor="sl-enabled"
              className="text-xs font-medium cursor-pointer"
            >
              Enable Stop Loss
            </Label>
          </div>
        </div>
      </div>
      {tpEnabled && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            Take Profit Price
          </Label>
          <Input
            type="number"
            value={Number.isFinite(takeProfitValue) ? takeProfitValue : ""}
            onChange={(e) => setTakeProfitValue(Number(e.target.value))}
            placeholder="Enter TP price"
            className="h-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
      )}

      {slEnabled && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            Stop Loss Price
          </Label>
          <Input
            type="number"
            value={Number.isFinite(stopLossValue) ? stopLossValue : ""}
            onChange={(e) => setStopLossValue(Number(e.target.value))}
            placeholder="Enter SL price"
            className="h-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
      )}

      {/* Risk Warning */}
      {!slEnabled && (
        <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded-md">
          <AlertTriangleIcon className="h-4 w-4 text-orange-600" />
          <span className="text-xs text-orange-800">
            No stop loss set — higher downside risk
          </span>
        </div>
      )}

      {/* Order Type Info */}
      <div className="text-xs text-muted-foreground">
        {orderType === "market"
          ? "TP/SL will activate immediately after position opens"
          : "TP/SL will activate only after limit order fills"}
      </div>
    </div>
  );
};
