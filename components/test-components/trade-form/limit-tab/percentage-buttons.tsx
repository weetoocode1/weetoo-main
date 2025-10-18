import { Button } from "@/components/ui/button";
import { useState } from "react";

interface PercentageButtonsProps {
  onPercentageSelect: (percentage: number) => void;
}

export function PercentageButtons({
  onPercentageSelect,
}: PercentageButtonsProps) {
  const percentages = [10, 25, 50, 75, 100];
  const [activePercentage, setActivePercentage] = useState<number | null>(null);

  const handlePercentageSelect = (percentage: number) => {
    // If clicking the same button that's already active, deactivate it
    if (activePercentage === percentage) {
      setActivePercentage(null);
      onPercentageSelect(0); // Pass 0 to clear the selection
    } else {
      setActivePercentage(percentage);
      onPercentageSelect(percentage);
    }
  };

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-5 gap-1">
        {percentages.map((percentage) => (
          <Button
            key={percentage}
            type="button"
            variant={activePercentage === percentage ? "default" : "outline"}
            size="sm"
            onClick={() => handlePercentageSelect(percentage)}
            className={`h-8 text-xs font-medium ${
              activePercentage === percentage
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "hover:bg-accent"
            }`}
          >
            {percentage}%
          </Button>
        ))}
      </div>
    </div>
  );
}
