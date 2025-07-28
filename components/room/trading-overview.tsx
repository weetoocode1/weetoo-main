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
    <div className="flex h-full w-full">
      <div className="w-full p-2">
        <div className="text-center select-none">
          <span className="text-muted-foreground text-sm">Today Records</span>
          <div className="flex gap-4 mt-1 justify-center">
            <div className="flex items-center gap-2">
              <span className="text-sm">Buy</span>
              <span
                className={`text-sm ${
                  todayBuyPnl >= 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                {todayBuyPnl >= 0 ? "↑" : "↓"} {todayBuyPnl.toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center gap-2">
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
      <div className="w-full p-2">
        <div className="text-center select-none">
          <span className="text-muted-foreground text-sm">Total Records</span>
          <div className="flex gap-4 mt-1 justify-center">
            <div className="flex items-center gap-2">
              <span className="text-sm">Buy</span>
              <span
                className={`text-sm ${
                  totalBuyPnl >= 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                {totalBuyPnl >= 0 ? "↑" : "↓"} {totalBuyPnl.toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center gap-2">
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
