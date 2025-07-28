import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CandlestickChart, SlidersHorizontal } from "lucide-react";
import React from "react";
import {
  CHART_TYPES,
  ChartType,
  MAIN_PERIODS,
  Period,
  PERIODS,
} from "./lightweight-chart-constants";

interface ChartTopBarProps {
  selectedPeriod: string;
  setSelectedPeriod: (period: string) => void;
  chartType: string;
  setChartType: (type: string) => void;
  isHost: boolean;
}

const ChartTopBar: React.FC<ChartTopBarProps> = ({
  selectedPeriod,
  setSelectedPeriod,
  chartType,
  setChartType,
  isHost,
}) => {
  const handlePeriodChange = (period: string) => {
    if (!isHost) return;
    setSelectedPeriod(period);
  };

  const handleChartTypeChange = (type: string) => {
    if (!isHost) return;
    setChartType(type);
  };

  return (
    <div className="w-full border-b h-10 flex items-center px-3 text-sm justify-between relative z-10 bg-background">
      <div className="flex items-center gap-1">
        {MAIN_PERIODS.map((period: string) => (
          <button
            key={period}
            className={`px-2 py-1 font-medium transition-colors text-xs ${
              isHost ? "cursor-pointer" : "cursor-not-allowed opacity-50"
            }
            ${
              selectedPeriod.toLowerCase() === period.toLowerCase()
                ? "bg-muted text-primary"
                : "hover:bg-accent text-muted-foreground"
            }
          `}
            onClick={() => handlePeriodChange(period)}
            disabled={!isHost}
          >
            {period.toUpperCase()}
          </button>
        ))}
        <Popover>
          <PopoverTrigger asChild>
            <button
              className={`ml-1 p-1 text-muted-foreground flex items-center ${
                isHost
                  ? "hover:bg-accent cursor-pointer"
                  : "cursor-not-allowed opacity-50"
              }`}
              aria-label="More intervals"
              disabled={!isHost}
            >
              <SlidersHorizontal size={16} />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-2 rounded-none">
            <div className="grid grid-cols-4 gap-2">
              {PERIODS.map((p: Period) => (
                <button
                  key={p.value}
                  className={`px-2 py-1 font-medium transition-colors text-xs ${
                    isHost ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                  }
                  ${
                    selectedPeriod.toLowerCase() === p.value.toLowerCase()
                      ? "bg-muted text-primary"
                      : "hover:bg-accent text-muted-foreground"
                  }
                `}
                  onClick={() => handlePeriodChange(p.value)}
                  disabled={!isHost}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <button
              className={`ml-1 p-1 text-muted-foreground flex items-center ${
                isHost
                  ? "hover:bg-accent cursor-pointer"
                  : "cursor-not-allowed opacity-50"
              }`}
              aria-label="Chart type"
              disabled={!isHost}
            >
              {(() => {
                const selectedType = CHART_TYPES.find(
                  (t: ChartType) => t.value === chartType
                );
                return selectedType?.icon ? (
                  React.createElement(selectedType.icon, { size: 18 })
                ) : (
                  <CandlestickChart size={18} />
                );
              })()}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-36 p-1.5 rounded-none">
            <div className="flex flex-col gap-1">
              {CHART_TYPES.map((type: ChartType) => (
                <button
                  key={type.value}
                  className={`flex items-center gap-2 px-3 h-8 text-xs font-medium transition-colors text-left ${
                    isHost ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                  }
                  ${
                    chartType === type.value
                      ? "bg-muted text-primary"
                      : "hover:bg-accent text-muted-foreground"
                  }
                `}
                  onClick={() => handleChartTypeChange(type.value)}
                  disabled={!isHost}
                >
                  {React.createElement(type.icon, { size: 18 })}
                  {type.label}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default ChartTopBar;
