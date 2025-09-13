interface TradingStatsSection {
  buy: number; // Long P&L %
  sell: number; // Short P&L %
}

interface TradingStats {
  today?: TradingStatsSection;
  total?: TradingStatsSection;
}

export function TradingOverview({ stats }: { stats?: TradingStats }) {
  const todayBuyPnl = stats?.today?.buy ?? 0;
  const todaySellPnl = stats?.today?.sell ?? 0;
  const totalBuyPnl = stats?.total?.buy ?? 0;
  const totalSellPnl = stats?.total?.sell ?? 0;

  return (
    <div className="flex h-full w-full items-center justify-center px-4">
      <div className="flex items-center gap-8 w-full max-w-4xl">
        {/* Today Records Section */}
        <div className="flex flex-col items-center min-w-[140px]">
          <span className="text-muted-foreground text-xs font-medium mb-2">
            Today Records
          </span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <span className="text-xs text-foreground">Buy</span>
              <span
                className={`text-sm font-semibold ${
                  todayBuyPnl >= 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                {todayBuyPnl >= 0 ? "↑" : "↓"} {todayBuyPnl.toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-foreground">Sell</span>
              <span
                className={`text-sm font-semibold ${
                  todaySellPnl >= 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                {todaySellPnl >= 0 ? "↑" : "↓"} {todaySellPnl.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        {/* Separator */}
        <div className="h-8 w-px bg-border" />

        {/* Total Records Section */}
        <div className="flex flex-col items-center min-w-[140px]">
          <span className="text-muted-foreground text-xs font-medium mb-2">
            Total Records
          </span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <span className="text-xs text-foreground">Buy</span>
              <span
                className={`text-sm font-semibold ${
                  totalBuyPnl >= 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                {totalBuyPnl >= 0 ? "↑" : "↓"} {totalBuyPnl.toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-foreground">Sell</span>
              <span
                className={`text-sm font-semibold ${
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
