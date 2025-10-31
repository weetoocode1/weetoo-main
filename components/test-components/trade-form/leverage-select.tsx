import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";
import React, { useCallback } from "react";

interface LeverageSelectProps {
  value: string;
  options: ReadonlyArray<string>;
  onChange: (v: string) => void;
  onOpenCustomize: () => void;
}

function LeverageSelectInner({
  value,
  options,
  onChange,
  onOpenCustomize,
}: LeverageSelectProps) {
  const t = useTranslations("trade.form");
  const handleValueChange = useCallback(
    (v: string) => (v === "customize" ? onOpenCustomize() : onChange(v)),
    [onChange, onOpenCustomize]
  );
  const stableOptions = options; // options is already memoized in parent
  return (
    <Select
      value={value}
      onValueChange={handleValueChange}
    >
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {stableOptions.map((opt) => (
          <SelectItem key={opt} value={opt}>
            {opt}
          </SelectItem>
        ))}
        <div className="my-1 h-px bg-border" />
        <SelectItem value="customize">{t("customize")}</SelectItem>
      </SelectContent>
    </Select>
  );
}

export const LeverageSelect = React.memo(LeverageSelectInner);
