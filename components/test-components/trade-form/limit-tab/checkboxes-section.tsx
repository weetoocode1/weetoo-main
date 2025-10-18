import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export function CheckboxesSection() {
  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <Checkbox id="post-only" />
        <Label htmlFor="post-only" className="text-xs">
          Post-only
        </Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="reduce-only" />
        <Label htmlFor="reduce-only" className="text-xs">
          Reduce only
        </Label>
      </div>
    </div>
  );
}
