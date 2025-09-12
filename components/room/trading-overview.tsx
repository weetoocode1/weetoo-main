interface TradingStatsSection {
  buy: number; // Long P&L %
  sell: number; // Short P&L %
}

interface TradingStats {
  today?: TradingStatsSection;
  total?: TradingStatsSection;
}

export function TradingOverview({ stats }: { stats?: TradingStats }) {
  // These are now profit percentages, not counts!
  const todayBuyPnl = stats?.today?.buy ?? 0;
  const todaySellPnl = stats?.today?.sell ?? 0;
  const totalBuyPnl = stats?.total?.buy ?? 0;
  const totalSellPnl = stats?.total?.sell ?? 0;

  return (
    <div className="flex h-full w-full flex-col lg:flex-row lg:items-center lg:justify-evenly lg:flex-nowrap min-w-0">
      <div className="w-full lg:w-1/2 p-2 lg:py-1 min-w-0 flex-shrink">
        <div className="text-left lg:text-center">
          <span className="text-muted-foreground text-sm">Today Records</span>
          <div className="flex flex-col lg:flex-row gap-2 lg:gap-4 mt-1 justify-start lg:justify-center">
            <div className="flex items-center gap-2 justify-start lg:justify-center min-w-0 flex-shrink">
              <span className="text-sm">Buy</span>
              <span
                className={`text-sm ${
                  todayBuyPnl >= 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                {todayBuyPnl >= 0 ? "↑" : "↓"} {todayBuyPnl.toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center gap-2 justify-start lg:justify-center min-w-0 flex-shrink">
              <span className="text-sm">Sell</span>
              <span
                className={`text-sm ${
                  todaySellPnl >= 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                {todaySellPnl >= 0 ? "↑" : "↓"} {todaySellPnl.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="w-full lg:w-1/2 p-2 lg:py-1 min-w-0 flex-shrink">
        <div className="text-left lg:text-center">
          <span className="text-muted-foreground text-sm">Total Records</span>
          <div className="flex flex-col lg:flex-row gap-2 lg:gap-4 mt-1 justify-start lg:justify-center">
            <div className="flex items-center gap-2 justify-start lg:justify-center min-w-0 flex-shrink">
              <span className="text-sm">Buy</span>
              <span
                className={`text-sm ${
                  totalBuyPnl >= 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                {totalBuyPnl >= 0 ? "↑" : "↓"} {totalBuyPnl.toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center gap-2 justify-start lg:justify-center min-w-0 flex-shrink">
              <span className="text-sm">Sell</span>
              <span
                className={`text-sm ${
                  totalSellPnl >= 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                {totalSellPnl >= 0 ? "↑" : "↓"} {totalSellPnl.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
