import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangleIcon } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";

interface BasicProps {
  takeProfitValue: number | "";
  setTakeProfitValue: (v: number | "") => void;
  stopLossValue: number | "";
  setStopLossValue: (v: number | "") => void;
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
  const t = useTranslations("trade.form");
  // Local state for input display values (allow empty string, 0, and intermediate states)
  const [tpInputValue, setTpInputValue] = useState<string>("");
  const [slInputValue, setSlInputValue] = useState<string>("");

  const handleTpInputChange = (raw: string) => {
    // Allow empty string
    if (raw === "") {
      setTpInputValue("");
      setTakeProfitValue("");
      return;
    }

    // Allow intermediate states like "0." or "0.0" while typing
    if (raw === "0." || raw.endsWith(".") || /^0\.0*$/.test(raw)) {
      setTpInputValue(raw);
      return;
    }

    const num = Number(raw);
    if (isNaN(num)) {
      return; // Invalid input, don't update
    }

    setTpInputValue(raw);
    setTakeProfitValue(num);
  };

  const handleSlInputChange = (raw: string) => {
    // Allow empty string
    if (raw === "") {
      setSlInputValue("");
      setStopLossValue("");
      return;
    }

    // Allow intermediate states like "0." or "0.0" while typing
    if (raw === "0." || raw.endsWith(".") || /^0\.0*$/.test(raw)) {
      setSlInputValue(raw);
      return;
    }

    const num = Number(raw);
    if (isNaN(num)) {
      return; // Invalid input, don't update
    }

    setSlInputValue(raw);
    setStopLossValue(num);
  };
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
              aria-label={t("tpsl.basic.enableTpAria")}
              className="cursor-pointer"
            />
            <Label
              htmlFor="tp-enabled"
              className="text-xs font-medium cursor-pointer"
            >
              {t("tpsl.basic.enableTp")}
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
              aria-label={t("tpsl.basic.enableSlAria")}
              className="cursor-pointer"
            />
            <Label
              htmlFor="sl-enabled"
              className="text-xs font-medium cursor-pointer"
            >
              {t("tpsl.basic.enableSl")}
            </Label>
          </div>
        </div>
      </div>
      {tpEnabled && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            {t("tpsl.basic.tpPrice")}
          </Label>
          <Input
            type="number"
            value={tpInputValue}
            onChange={(e) => handleTpInputChange(e.target.value)}
            placeholder="0"
            className="h-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
      )}

      {slEnabled && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            {t("tpsl.basic.slPrice")}
          </Label>
          <Input
            type="number"
            value={slInputValue}
            onChange={(e) => handleSlInputChange(e.target.value)}
            placeholder="0"
            className="h-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
      )}

      {/* Risk Warning */}
      {!slEnabled && (
        <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded-md">
          <AlertTriangleIcon className="h-4 w-4 text-orange-600" />
          <span className="text-xs text-orange-800">
            {t("tpsl.basic.warnNoSl")}
          </span>
        </div>
      )}

      {/* Order Type Info */}
      <div className="text-xs text-muted-foreground">
        {orderType === "market"
          ? t("tpsl.basic.info.market")
          : t("tpsl.basic.info.limit")}
      </div>
    </div>
  );
};
