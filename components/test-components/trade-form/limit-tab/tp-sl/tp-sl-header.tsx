import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RefreshCwIcon } from "lucide-react";

interface TpSlHeaderProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  mode: "basic" | "advanced";
  onToggleMode: () => void;
}

export const TpSlHeader = ({
  checked,
  onCheckedChange,
  mode,
  onToggleMode,
}: TpSlHeaderProps) => {
  return (
    <div className="flex items-center space-x-2 pt-1">
      <Checkbox
        id="tp-sl"
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label="Enable TP/SL"
      />
      <Label htmlFor="tp-sl" className="text-xs cursor-pointer">
        TP/SL
      </Label>
      {checked && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onToggleMode}
          className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground h-6 px-2"
        >
          {mode === "basic" ? "Basic" : "Advanced"}
          <RefreshCwIcon className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
};
