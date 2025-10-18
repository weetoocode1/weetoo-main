import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MinusIcon, PlusIcon } from "lucide-react";

interface PriceInputProps {
  value: number;
  onChange: (val: number) => void;
  priceType: "last" | "index" | "mark";
  onPriceTypeChange: (t: "last" | "index" | "mark") => void;
}

export const PriceInput = ({
  value,
  onChange,
  priceType,
  onPriceTypeChange,
}: PriceInputProps) => {
  return (
    <div className="flex-1">
      <Label className="text-xs text-muted-foreground mb-1 block sr-only">
        Trigger Price
      </Label>
      <div className="flex items-center border border-border rounded-md">
        <Input
          type="number"
          placeholder="Trigger Price"
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 h-11 focus-visible:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none border-none !bg-transparent"
        />
        <div className="flex">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-6 p-0 text-xs rounded-sm"
            onClick={() => onChange(value + 1)}
          >
            <PlusIcon className="h-4 w-4" />
          </Button>
          <div className="border-l border-border h-5 w-px" />
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-6 p-0 text-xs rounded-sm"
            onClick={() => onChange(Math.max(0, value - 1))}
          >
            <MinusIcon className="h-4 w-4" />
          </Button>
        </div>
        <Select
          value={priceType}
          onValueChange={(v) =>
            onPriceTypeChange(v as "last" | "index" | "mark")
          }
        >
          <SelectTrigger className="w-20 h-11 border-0 bg-transparent text-xs focus:ring-0 rounded-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last">Last</SelectItem>
            <SelectItem value="index">Index</SelectItem>
            <SelectItem value="mark">Mark</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
