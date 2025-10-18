import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LeverageSelectProps {
  value: string;
  options: ReadonlyArray<string>;
  onChange: (v: string) => void;
  onOpenCustomize: () => void;
}

export function LeverageSelect({
  value,
  options,
  onChange,
  onOpenCustomize,
}: LeverageSelectProps) {
  return (
    <Select
      value={value}
      onValueChange={(v) =>
        v === "customize" ? onOpenCustomize() : onChange(v)
      }
    >
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt} value={opt}>
            {opt}
          </SelectItem>
        ))}
        <div className="my-1 h-px bg-border" />
        <SelectItem value="customize">Customize</SelectItem>
      </SelectContent>
    </Select>
  );
}
