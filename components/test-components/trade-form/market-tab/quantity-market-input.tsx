import { ChevronDownIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useEffect, useState, useRef } from "react";
import { useTranslations } from "next-intl";

interface QuantityMarketInputProps {
  qty: number;
  setQty: (qty: number) => void;
  unitSymbol: "BTC" | "USDT";
  placementMode: "qty" | "value";
  setPlacementMode: (mode: "qty" | "value") => void;
  handleConfirmPrefs: () => void;
  leverage: number;
  price: number;
  valueModeCapital?: number; // USDT value when in value mode
  onValueModeCapitalChange?: (v: number) => void;
}

export function QuantityMarketInput({
  qty,
  setQty,
  unitSymbol,
  placementMode,
  setPlacementMode,
  handleConfirmPrefs,
  leverage,
  price,
  valueModeCapital = 0,
  onValueModeCapitalChange,
}: QuantityMarketInputProps) {
  const qtyInputId = "limit-qty-input";
  const t = useTranslations("trade.form");

  const [inputValue, setInputValue] = useState<string>("");
  const isUserTypingRef = useRef<boolean>(false);

  useEffect(() => {
    if (isUserTypingRef.current) return;

    if (placementMode === "value") {
      let capital = valueModeCapital || 0;
      if (!capital && qty > 0 && price > 0 && leverage > 0) {
        capital = (qty * price) / leverage;
        onValueModeCapitalChange?.(capital);
      }
      if (capital > 0) {
        setInputValue(capital.toString());
      } else {
        setInputValue("");
      }
    } else {
      if (qty > 0) {
        setInputValue(qty.toString());
      } else {
        setInputValue("");
      }
    }
  }, [
    placementMode,
    valueModeCapital,
    leverage,
    qty,
    price,
    onValueModeCapitalChange,
  ]);

  const handleInputChange = (raw: string) => {
    isUserTypingRef.current = true;

    if (raw === "") {
      setInputValue("");
      setQty(0);
      onValueModeCapitalChange?.(0);
      return;
    }

    const decimalCount = (raw.match(/\./g) || []).length;
    if (decimalCount > 1) {
      return;
    }

    if (raw.startsWith(".")) {
      const normalized = "0" + raw;
      setInputValue(normalized);
      const num = Number(normalized);
      if (!isNaN(num) && num >= 0) {
        if (placementMode === "value") {
          const capital = num;
          const orderValue = capital * (leverage || 1);
          onValueModeCapitalChange?.(capital);
          const computed = price > 0 ? orderValue / price : 0;
          setQty(computed);
          if (typeof window !== "undefined") {
            (
              window as unknown as Record<string, unknown>
            )._limit_user_capital_ref = { current: capital };
          }
        } else {
          setQty(num);
          if (price > 0 && leverage > 0) {
            const capital = (num * price) / leverage;
            if (typeof window !== "undefined") {
              (
                window as unknown as Record<string, unknown>
              )._limit_user_capital_ref = {
                current: capital,
              };
            }
          }
        }
      }
      return;
    }

    const num = Number(raw);
    if (isNaN(num) || num < 0) {
      return;
    }

    setInputValue(raw);

    if (placementMode === "value") {
      const capital = num;
      const orderValue = capital * (leverage || 1);
      onValueModeCapitalChange?.(capital);
      const computed = price > 0 ? orderValue / price : 0;
      setQty(computed);
      if (typeof window !== "undefined") {
        (window as unknown as Record<string, unknown>)._limit_user_capital_ref =
          { current: capital };
      }
    } else {
      setQty(num);
      if (price > 0 && leverage > 0) {
        const capital = (num * price) / leverage;
        if (typeof window !== "undefined") {
          (
            window as unknown as Record<string, unknown>
          )._limit_user_capital_ref = {
            current: capital,
          };
        }
      }
    }
  };

  const handleBlur = () => {
    isUserTypingRef.current = false;
    if (inputValue === "" || inputValue === "." || inputValue === "0.") {
      setInputValue("");
      setQty(0);
      onValueModeCapitalChange?.(0);
    }
  };

  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground" htmlFor={qtyInputId}>
        {t("quantity.label")}
      </Label>
      <div className="relative">
        <Input
          id={qtyInputId}
          type="number"
          inputMode="decimal"
          step="any"
          value={inputValue}
          placeholder="0"
          onChange={(e) => handleInputChange(e.target.value)}
          onBlur={handleBlur}
          className="pr-20 h-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 text-xs px-2 py-1 text-foreground hover:text-foreground/80 cursor-pointer"
            >
              {unitSymbol} <ChevronDownIcon className="h-3.5 w-3.5" />
            </button>
          </DialogTrigger>
          <DialogContent className="!sm:max-w-lg !max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base">
                {t("quantity.dialog.title")}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              {/* Order by Qty */}
              <button
                type="button"
                onClick={() => setPlacementMode("qty")}
                className="w-full text-left rounded-md border border-border px-3 py-3 hover:bg-muted/30"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block h-3 w-3 rounded-full border ${
                        placementMode === "qty"
                          ? "bg-primary border-primary"
                          : "border-muted-foreground"
                      }`}
                    />
                    <span className="text-sm font-medium">
                      {t("quantity.dialog.orderByQtyShort")}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">BTC</span>
                </div>
                <div className="mt-1 pl-5 text-[11px] leading-snug text-muted-foreground">
                  {t("quantity.dialog.orderByQtyHelp")}
                </div>
              </button>

              {/* Order by Value */}
              <button
                type="button"
                onClick={() => setPlacementMode("value")}
                className="w-full text-left rounded-md border border-border px-3 py-3 hover:bg-muted/30"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block h-3 w-3 rounded-full border ${
                        placementMode === "value"
                          ? "bg-primary border-primary"
                          : "border-muted-foreground"
                      }`}
                    />
                    <span className="text-sm font-medium">
                      {t("quantity.dialog.orderByValue")}
                    </span>
                    <span className="ml-1 rounded-sm bg-primary/10 px-1 text-[10px] font-medium text-primary">
                      {t("badges.new")}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">USDT</span>
                </div>
                <div className="mt-1 pl-5 text-[11px] leading-snug text-muted-foreground">
                  {t("quantity.dialog.orderByValueHelp")}
                </div>
              </button>

              {placementMode === "value" && (
                <div className="mt-2 rounded-md border border-border bg-muted/20 p-3">
                  <div className="text-[11px] font-medium text-muted-foreground mb-1">
                    {t("quantity.dialog.noteTitle")}
                  </div>
                  <div className="text-[11px] leading-relaxed text-muted-foreground">
                    {t("quantity.dialog.noteBody")}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="w-full">
              <div className="grid w-full grid-cols-2 gap-2">
                <Button className="w-full" onClick={handleConfirmPrefs}>
                  {t("buttons.confirm")}
                </Button>
                <DialogTrigger asChild>
                  <Button className="w-full" variant="outline">
                    {t("buttons.cancel")}
                  </Button>
                </DialogTrigger>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
