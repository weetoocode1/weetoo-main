import { Input } from "@/components/ui/input";

interface RoiInputProps {
  value: number;
  onChange: (val: number) => void;
  suffix: "%" | "USDT";
}

export const RoiInput = ({ value, onChange, suffix }: RoiInputProps) => {
  return (
    <div className="w-32">
      <div className="relative">
        <Input
          type="number"
          placeholder="ROI"
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-11 pr-6 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none !bg-transparent"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          {suffix}
        </span>
      </div>
    </div>
  );
};
