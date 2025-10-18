import { HelpCircleIcon, RefreshCwIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ApplicableToToggleProps {
  value: "entire" | "current";
  onToggle: () => void;
}

export const ApplicableToToggle = ({
  value,
  onToggle,
}: ApplicableToToggleProps) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Applicable to</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircleIcon className="h-3 w-3 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm p-4">
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-medium">Entire Position</span>
                    <br />
                    The TP/SL applies to the entire position. Once this order is
                    fully or partially filled, the TP/SL order will be placed.
                  </div>
                  <div>
                    <span className="font-medium">Current Order</span>
                    <br />
                    The TP/SL applies to the current order quantity. Once this
                    order is fully or partially filled, the TP/SL order will be
                    placed.
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>
            {value === "entire" ? "Entire Position" : "Current Order"}
          </span>
          <RefreshCwIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
