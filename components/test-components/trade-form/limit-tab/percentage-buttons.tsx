import { Button } from "@/components/ui/button";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";

interface PercentageButtonsProps {
  onPercentageSelect: (percentage: number) => void;
}

const PERCENTAGES = [10, 25, 50, 75, 100] as const;

function PercentageButtonsInner({ onPercentageSelect }: PercentageButtonsProps) {
  const t = useTranslations("trade.form");
  const [activePercentage, setActivePercentage] = useState<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastSentRef = useRef<number | null>(null);

  const labels = useMemo(
    () =>
      PERCENTAGES.map((p) => ({
        value: p,
        aria: t("percentage.aria", { percent: p }),
      })),
    [t]
  );

  const handlePercentageSelect = useCallback(
    (percentage: number) => {
      const next = activePercentage === percentage ? 0 : percentage;
      setActivePercentage(next === 0 ? null : percentage);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        if (lastSentRef.current !== next) {
          lastSentRef.current = next;
          onPercentageSelect(next);
        }
      });
    },
    [activePercentage, onPercentageSelect]
  );

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-5 gap-1">
        {labels.map((item) => (
          <Button
            key={item.value}
            type="button"
            variant={activePercentage === item.value ? "default" : "outline"}
            size="sm"
            onClick={() => handlePercentageSelect(item.value)}
            className={`h-8 text-xs font-medium ${
              activePercentage === item.value
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "hover:bg-accent"
            }`}
            aria-label={item.aria}
          >
            {item.value}%
          </Button>
        ))}
      </div>
    </div>
  );
}

export const PercentageButtons = React.memo(PercentageButtonsInner);
