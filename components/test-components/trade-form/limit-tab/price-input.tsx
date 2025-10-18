import { useRef } from "react";
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
          value={Number.isFinite(price) ? price : 0}
          onChange={(e) => setPrice(Number(e.target.value))}
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
