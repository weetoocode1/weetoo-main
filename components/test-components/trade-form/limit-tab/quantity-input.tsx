import { ChevronDownIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Extend Window interface for custom properties
declare global {
  interface Window {
    _limit_last_value_ref?: { current: number };
    _limit_user_capital_ref?: { current: number };
  }
}

interface QuantityInputProps {
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

export function QuantityInput({
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
}: QuantityInputProps) {
  const qtyInputId = "limit-qty-input";

  // Local state for input display value
  const [inputValue, setInputValue] = useState<number>(0);

  const lastValueRef =
    typeof window !== "undefined" && window._limit_last_value_ref
      ? window._limit_last_value_ref
      : { current: 0 };
  if (typeof window !== "undefined") {
    window._limit_last_value_ref = lastValueRef;
  }

  // Update input value when mode changes
  useEffect(() => {
    if (placementMode === "value") {
      // In value mode, input shows ORDER VALUE (USDT), not capital.
      // If no capital provided but qty exists, derive capital from qty.
      let capital = valueModeCapital || 0;
      if (!capital && qty > 0 && price > 0 && leverage > 0) {
        capital = (qty * price) / leverage;
        if (onValueModeCapitalChange) onValueModeCapitalChange(capital);
      }
      lastValueRef.current = capital;
      const orderValue = capital * (leverage || 1);
      setInputValue(Math.round(orderValue * 100) / 100);
    } else {
      // Switching to qty mode - show current BTC quantity
      setInputValue(Math.round((qty || 0) * 100) / 100); // Round to 2 decimals (display)
    }
  }, [
    placementMode,
    valueModeCapital,
    leverage,
    qty,
    price,
    onValueModeCapitalChange,
  ]);

  // Handle input change based on mode
  const handleInputChange = (num: number) => {
    setInputValue(num);

    if (placementMode === "value") {
      // In value mode, user types ORDER VALUE (USDT)
      const orderValue = num;
      const capital = leverage > 0 ? orderValue / leverage : 0; // store as capital
      lastValueRef.current = capital;
      if (onValueModeCapitalChange) onValueModeCapitalChange(capital);
      // Quantity = Order Value ÷ Price
      const computed = price > 0 ? orderValue / price : 0;
      setQty(Math.round(computed * 100000000) / 100000000); // 8 decimals for BTC

      // Store user's capital for leverage changes
      if (typeof window !== "undefined") {
        window._limit_user_capital_ref = { current: capital };
      }
    } else {
      // In qty mode, user is entering BTC amount directly
      setQty(Math.round(num * 100000000) / 100000000); // Round to 8 decimal places for BTC

      // Calculate user's capital from quantity
      if (price > 0 && leverage > 0) {
        // Capital = (Quantity × Price) ÷ Leverage
        const userCapital = (num * price) / leverage;
        if (typeof window !== "undefined") {
          window._limit_user_capital_ref = {
            current: Math.round(userCapital * 100) / 100, // Round to 2 decimal places for USDT
          };
        }
      }
    }
  };

  // Reflect external qty changes into the input when in qty mode (e.g., 10%/25% clicks)
  useEffect(() => {
    if (placementMode === "qty") {
      setInputValue(Math.round((qty || 0) * 100) / 100);
    }
     
  }, [qty, placementMode]);

  // Handle mode change
  const handleModeChange = (mode: "qty" | "value") => {
    // Update the mode immediately
    setPlacementMode(mode);

    // The useEffect will handle the value conversion
  };

  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground" htmlFor={qtyInputId}>
        Quantity
      </Label>
      <div className="relative">
        <Input
          id={qtyInputId}
          type="number"
          value={inputValue}
          onChange={(e) => handleInputChange(Number(e.target.value))}
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
                Order Placement Preferences
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              {/* Order by Qty */}
              <button
                type="button"
                onClick={() => handleModeChange("qty")}
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
                      Order by Quantity
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">BTC</span>
                </div>
                <div className="mt-1 pl-5 text-[11px] leading-snug text-muted-foreground">
                  Please enter your order qty denominated in BTC terms.
                </div>
              </button>

              {/* Order by Value */}
              <button
                type="button"
                onClick={() => handleModeChange("value")}
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
                    <span className="text-sm font-medium">Order by Value</span>
                    <span className="ml-1 rounded-sm bg-primary/10 px-1 text-[10px] font-medium text-primary">
                      NEW
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">USDT</span>
                </div>
                <div className="mt-1 pl-5 text-[11px] leading-snug text-muted-foreground">
                  Please enter your desired order value. You can modify the
                  required margin by adjusting the applied leverage.
                </div>
              </button>

              {placementMode === "value" && (
                <div className="mt-2 rounded-md border border-border bg-muted/20 p-3">
                  <div className="text-[11px] font-medium text-muted-foreground mb-1">
                    * Note
                  </div>
                  <div className="text-[11px] leading-relaxed text-muted-foreground">
                    Your order quantity will be calculated based on the value of
                    your filled order. Please note that in the event of extreme
                    market fluctuations, your order placement may fail.
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="w-full">
              <div className="grid w-full grid-cols-2 gap-2">
                <DialogTrigger asChild>
                  <Button className="w-full" onClick={handleConfirmPrefs}>
                    Confirm
                  </Button>
                </DialogTrigger>
                <DialogTrigger asChild>
                  <Button className="w-full" variant="outline">
                    Cancel
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
