import { useRef, useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";
import * as React from "react";

interface PriceInputProps {
  price: number;
  setPrice: (price: number) => void;
  lastButton?: boolean;
  disabled?: boolean;
  onLastClick?: () => void;
}

function PriceInputInner({
  price,
  setPrice,
  lastButton = false,
  disabled = false,
  onLastClick,
}: PriceInputProps) {
  const priceInputRef = useRef<HTMLInputElement | null>(null);
  const priceInputId = "limit-price-input";
  const t = useTranslations("trade.form");

  const [inputValue, setInputValue] = useState<string>("");
  const isUserTypingRef = useRef<boolean>(false);

  const handleInputChange = useCallback(
    (raw: string) => {
      isUserTypingRef.current = true;

      if (raw === "") {
        setInputValue("");
            setPrice(0);
        return;
          }

      const decimalCount = (raw.match(/\./g) || []).length;
      if (decimalCount > 1) {
        return;
      }

      if (raw.startsWith(".")) {
        setInputValue("0" + raw);
        const num = Number("0" + raw);
        if (!isNaN(num) && num >= 0) {
          setPrice(num);
        }
        return;
      }

      const num = Number(raw);
      if (isNaN(num) || num < 0) {
        return;
      }

      setInputValue(raw);
          setPrice(num);
    },
    [setPrice]
  );

  useEffect(() => {
    if (!isUserTypingRef.current && price > 0) {
      const priceStr = price.toString();
      if (inputValue !== priceStr) {
        setInputValue(priceStr);
      }
    } else if (!isUserTypingRef.current && price === 0 && inputValue !== "") {
      setInputValue("");
    }
  }, [price, inputValue]);

  const handleBlur = useCallback(() => {
    isUserTypingRef.current = false;
    if (inputValue === "" || inputValue === "." || inputValue === "0.") {
      setInputValue("");
      setPrice(0);
    }
  }, [inputValue, setPrice]);

  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground" htmlFor={priceInputId}>
        {t("price.label")}
      </Label>
      <div className="relative">
        <Input
          ref={priceInputRef}
          id={priceInputId}
          type="number"
          inputMode="decimal"
          step="any"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onBlur={handleBlur}
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
            {t("price.last")}
          </button>
        )}
      </div>
    </div>
  );
}

export const PriceInput = React.memo(PriceInputInner);

