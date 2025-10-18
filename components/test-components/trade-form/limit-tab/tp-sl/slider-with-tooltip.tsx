import { Slider } from "@/components/ui/slider";
import type { SliderWithTooltipProps } from "./types";

export const SliderWithTooltip = ({
  value,
  min,
  max,
  step,
  onChange,
  showTooltip,
  setShowTooltip,
  gradientClassName,
  getTooltipText,
}: SliderWithTooltipProps) => {
  return (
    <div className="relative w-full mt-4 py-2">
      {showTooltip && (
        <div
          className="absolute -top-10 left-0 flex flex-col items-center pointer-events-none z-50"
          style={{
            left: `${Math.max(5, Math.min(95, (value / max) * 100))}%`,
            transform: "translateX(-50%)",
          }}
          aria-hidden="true"
        >
          <div className="relative">
            <div className="rounded-md bg-background border border-border px-3 py-1.5 text-xs font-medium text-foreground shadow-lg whitespace-nowrap">
              {getTooltipText(value)}
            </div>
            <div className="absolute top-full left-1/2 transform -translate-x-1/2">
              <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-border"></div>
              <div className="absolute top-[-1px] left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-background"></div>
            </div>
          </div>
        </div>
      )}

      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <Slider
          value={[value]}
          min={min}
          max={max}
          step={step}
          onValueChange={(vals: number[]) => {
            onChange(vals[0]);
            setShowTooltip(true);
          }}
          onPointerDown={() => setShowTooltip(true)}
          onPointerUp={() => setShowTooltip(false)}
          className={`w-full ${gradientClassName}`}
        />
      </div>
    </div>
  );
};
