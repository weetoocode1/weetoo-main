import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";
import React from "react";

interface CrossSelectProps {
  value: string;
  onChange: (v: string) => void;
}

function CrossSelectInner({ value, onChange }: CrossSelectProps) {
  const t = useTranslations("trade.form");
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="cross">{t("cross")}</SelectItem>
        <SelectItem value="isolated">{t("isolated")}</SelectItem>
      </SelectContent>
    </Select>
  );
}

export const CrossSelect = React.memo(CrossSelectInner);
