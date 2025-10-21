import { useRef, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PriceInputProps {
  price: number;
  setPrice: (price: number) => void;
  lastButton?: boolean;
  disabled?: boolean;
  onLastClick?: () => void;
}

export function PriceInput({
  price,
  setPrice,
  lastButton = false,
  disabled = false,
  onLastClick,
}: PriceInputProps) {
  const priceInputRef = useRef<HTMLInputElement | null>(null);
  const priceInputId = "limit-price-input";

  // Local state for input display value (allow empty string, 0, and intermediate states)
  const [inputValue, setInputValue] = useState<string>("");

  const handleInputChange = (raw: string) => {
    // Allow empty string
    if (raw === "") {
      setInputValue("");
      setPrice(0);
      return;
    }

    // Allow intermediate states like "0." or "0.0" while typing
    if (raw === "0." || raw.endsWith(".") || /^0\.0*$/.test(raw)) {
      setInputValue(raw);
      return;
    }

    const num = Number(raw);
    if (isNaN(num)) {
      return; // Invalid input, don't update
    }

    setInputValue(raw);
    setPrice(num);
  };

  // Update input value when price changes externally (e.g., from Last button)
  useEffect(() => {
    if (price > 0) {
      setInputValue(price.toString());
    } else if (price === 0) {
      setInputValue("");
    }
  }, [price]);

  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground" htmlFor={priceInputId}>
        Price
      </Label>
      <div className="relative">
        <Input
          ref={priceInputRef}
          id={priceInputId}
          type="number"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="0"
          disabled={disabled}
          className="pr-14 h-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        {lastButton && (
          <button
            type="button"
            onClick={() => {
              if (onLastClick) {
                onLastClick();
              } else {
                priceInputRef.current?.focus();
              }
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground select-none cursor-pointer"
            disabled={disabled}
          >
            Last
          </button>
        )}
      </div>
    </div>
  );
}
