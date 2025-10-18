import { useState } from "react";
import { SimpleTable } from "./shared/simple-table";

export function TradeHistoryTabs() {
  const [activeRange, setActiveRange] = useState<"7d" | "30d" | "180d">("7d");

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const columns = [
    "Market",
    "Instrument",
    "Order Type",
    "Direction",
    "Filled Value",
    "Filled Price",
    "Filled Qty",
    "Filled Type",
    "Trading Fees",
    "Transaction Time",
    "Transaction ID",
    "Implied Volatility",
    "Index Price",
  ] as const;

  const rightActions = (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setActiveRange("7d")}
        onMouseDown={handleMouseDown}
        className={`px-2 py-1 text-xs transition-colors duration-200 cursor-pointer ${
          activeRange === "7d"
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Last 7D
      </button>
      <button
        onClick={() => setActiveRange("30d")}
        onMouseDown={handleMouseDown}
        className={`px-2 py-1 text-xs transition-colors duration-200 cursor-pointer ${
          activeRange === "30d"
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Last 30D
      </button>
      <button
        onClick={() => setActiveRange("180d")}
        onMouseDown={handleMouseDown}
        className={`px-2 py-1 text-xs transition-colors duration-200 cursor-pointer ${
          activeRange === "180d"
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Last 180D
      </button>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center px-2 py-1.5">
        <div className="flex items-center overflow-x-auto scrollbar-hide">
          {rightActions}
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <SimpleTable columns={columns} data={[]} />
      </div>
    </div>
  );
}
