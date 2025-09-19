"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useBinanceFutures } from "@/hooks/use-binance-futures";
import { useMarketPurchases } from "@/hooks/use-market-purchases";
import { usePositions } from "@/hooks/use-positions";
import {
  useLatestRoomReset,
  usePerformRoomReset,
} from "@/hooks/use-room-reset";
import { VIRTUAL_BALANCE_KEY } from "@/hooks/use-virtual-balance";
import { createClient } from "@/lib/supabase/client";
import { Info, Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { mutate } from "swr";
import { Icons } from "../icons";
import { TRADER_PNL_KEY } from "./trading-overview-container";

interface OpenPosition {
  id: string;
  symbol: string;
  side: string;
  quantity: number;
  size: number;
  entry_price: number;
  initial_margin: number;
}

interface ClosedPosition {
  id: string;
  symbol: string;
  side: string;
  size: number;
  entry_price: number;
  close_price: number;
  pnl: number;
}

// Component for individual position row with symbol-specific price
function PositionRow({
  position,
  isHost,
  closePosition,
  roomId,
  sinceResetAt,
}: {
  position: OpenPosition;
  isHost: boolean;
  closePosition: (id: string, price: number) => Promise<void>;
  roomId: string;
  sinceResetAt?: string;
}) {
  const tr = useTranslations("room.tradeHistory");
  // Get the current price for this specific position's symbol
  const marketData = useBinanceFutures(position.symbol);
  const currentPositionPrice = marketData?.ticker?.lastPrice
    ? parseFloat(marketData.ticker.lastPrice)
    : undefined;

  // Helper to calculate live PNL with percent for this position
  const unrealizedPnlWithPercent = () => {
    if (!currentPositionPrice) return "-";

    const entry = Number(position.entry_price);
    const qty = Number(position.quantity);
    const side = (position.side ?? "").toLowerCase();
    const pnlValue =
      side === "long"
        ? (currentPositionPrice - entry) * qty
        : (entry - currentPositionPrice) * qty;
    const pnlPercent =
      side === "long"
        ? ((currentPositionPrice - entry) / entry) * 100
        : ((entry - currentPositionPrice) / entry) * 100;
    const formattedValue = pnlValue.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    });
    const formattedPercent = `${pnlPercent >= 0 ? "" : "-"}${Math.abs(
      pnlPercent
    ).toFixed(2)}%`;
    return `${formattedValue} (${formattedPercent})`;
  };

  return (
    <tr
      style={{
        display: "table",
        tableLayout: "fixed",
        width: "100%",
      }}
      className="hover:bg-muted border-0 !border-b-0"
    >
      <td
        className="text-foreground text-xs p-2 text-left"
        style={{ width: "12%" }}
      >
        {position.symbol ?? "-"}
      </td>
      <td
        className={`text-xs p-2 text-left ${
          (position.side ?? "").toLowerCase() === "long"
            ? "text-green-500"
            : "text-red-500"
        }`}
        style={{ width: "10%" }}
      >
        {(() => {
          const s = (position.side ?? "").toLowerCase();
          if (s === "long") return tr("sides.long");
          if (s === "short") return tr("sides.short");
          return position.side ?? "-";
        })()}
      </td>
      <td
        className="text-foreground text-xs p-2 text-left"
        style={{ width: "16%" }}
      >
        {position.quantity ?? "-"}
      </td>
      <td
        className="text-foreground text-xs p-2 text-left"
        style={{ width: "14%" }}
      >
        {position.size ?? "-"}
      </td>
      <td
        className="text-foreground text-xs p-2 text-left"
        style={{ width: "14%" }}
      >
        {position.entry_price ?? "-"}
      </td>
      <td
        className="text-foreground text-xs p-2 text-left"
        style={{ width: "14%" }}
      >
        {position.initial_margin ?? "-"}
      </td>
      <td
        className={`text-xs p-2 text-left ${
          unrealizedPnlWithPercent().includes("-")
            ? "text-red-500"
            : "text-green-500"
        }`}
        style={{ width: "12%" }}
      >
        {unrealizedPnlWithPercent()}
      </td>
      <td className="p-2 text-left" style={{ width: "8%" }}>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              size="sm"
              className="px-3 py-1 text-xs h-auto rounded-sm"
              disabled={!isHost}
              title={!isHost ? tr("tooltips.onlyHostClose") : undefined}
            >
              {tr("actions.close")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{tr("close.title")}</AlertDialogTitle>
              <AlertDialogDescription>
                {tr("close.description")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{tr("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  await closePosition(
                    position.id,
                    currentPositionPrice || position.entry_price
                  );
                  mutate(VIRTUAL_BALANCE_KEY(roomId)); // Refetch balance after closing
                  mutate(TRADER_PNL_KEY(roomId)); // Refetch P&L stats after closing
                  if (sinceResetAt) {
                    mutate(
                      `${TRADER_PNL_KEY(roomId)}?since=${encodeURIComponent(
                        sinceResetAt
                      )}`
                    );
                  }
                }}
                className="bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60"
              >
                {tr("close.confirm")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </td>
    </tr>
  );
}

// Industry standard: Calculate unrealized PNL for open positions live in the frontend using the latest price.
// Only display stored PNL from the database for closed positions.

export function TradeHistoryTabs({
  roomId,
  currentPrice,
  hostId,
}: {
  roomId: string;
  currentPrice?: number;
  hostId: string;
}) {
  // Latest reset marker for this room (soft reset)
  const { data: latestResetData } = useLatestRoomReset(roomId);
  const sinceResetAt = latestResetData?.latest?.reset_at;

  const { openPositions, closedPositions, closePosition, closeAllPositions } =
    usePositions(roomId, { sinceResetAt }) as {
      openPositions: OpenPosition[];
      closedPositions: ClosedPosition[];
      closePosition: (id: string, price: number) => Promise<void>;
      closeAllPositions: (
        getClosePrice: (position: OpenPosition) => Promise<number>
      ) => Promise<void>;
    };

  // Get current user id
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data?.user?.id || null);
    });
  }, []);
  const isHost = currentUserId === hostId;

  // Get user's market purchases to check for reset credits
  const { user, computed } = useAuth();
  const { purchases } = useMarketPurchases(user?.id);

  // Calculate available reset credits
  const resetCredits = purchases
    .filter((purchase) => purchase.product_key === "tradingHistoryReset")
    .reduce((total, purchase) => total + purchase.quantity, 0);

  // Track used reset credits (this would be stored in database in real implementation)
  const [usedResetCredits, setUsedResetCredits] = useState(0);
  const availableResetCredits = resetCredits - usedResetCredits;

  // Market dialog state
  const [isMarketDialogOpen, setIsMarketDialogOpen] = useState(false);
  const [marketQuantities, setMarketQuantities] = useState({
    tradingHistoryReset: 0,
    chatReset: 0,
    messageRights: 0,
  });

  // Check if user can reset trading history
  // const canResetTradingHistory =
  //   isHost && availableResetCredits > 0 && closedPositions.length > 0;

  // Market dialog functionality
  const t = useTranslations("weetooMarket");
  const tr = useTranslations("room.tradeHistory");
  const { purchaseItems, isPurchasing } = useMarketPurchases(user?.id);

  const marketProducts = [
    {
      key: "tradingHistoryReset" as const,
      name: t("memberHistoryReset"),
      description: t("memberHistoryResetDesc"),
      price: 10000,
    },
  ];

  const marketTotal = marketProducts.reduce(
    (sum, p) => sum + marketQuantities[p.key] * p.price,
    0
  );

  const handleMarketQtyChange = (key: "tradingHistoryReset", delta: number) => {
    setMarketQuantities((prev) => ({
      ...prev,
      [key]: Math.max(0, Math.min(99, prev[key] + delta)),
    }));
  };

  const handleMarketPurchase = async () => {
    if (marketTotal === 0 || !user) return;

    const currentBalance = computed?.kor_coins || 0;
    if (currentBalance < marketTotal) {
      return;
    }

    const itemsToPurchase = marketProducts
      .filter((product) => marketQuantities[product.key] > 0)
      .map((product) => ({
        product_key: product.key,
        product_name: product.name,
        product_description: product.description,
        quantity: marketQuantities[product.key],
        unit_price: product.price,
        total_price: product.price * marketQuantities[product.key],
      }));

    if (itemsToPurchase.length === 0) return;

    purchaseItems(itemsToPurchase);

    setMarketQuantities({
      tradingHistoryReset: 0,
      chatReset: 0,
      messageRights: 0,
    });

    setIsMarketDialogOpen(false);
  };

  // Perform reset functionality (insert reset marker)
  const { mutate: performReset, isPending: isResetting } =
    usePerformRoomReset();

  // Default starting balance for snapshot at reset time
  const [startingBalance, setStartingBalance] = useState<number | null>(null);
  useEffect(() => {
    const fetchStart = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("app_settings")
          .select("value")
          .eq("key", "startingBalance")
          .maybeSingle();
        if (data && typeof data.value === "number") {
          setStartingBalance(data.value);
        }
      } catch (_e) {
        // ignore; UI will still create marker with 0 if needed
      }
    };
    fetchStart();
  }, []);

  return (
    <>
      <Tabs
        defaultValue="positions"
        className="w-full h-full flex flex-col gap-0"
      >
        <div className="flex justify-between items-center px-4 py-2 border-b border-border">
          <TabsList className="grid w-fit grid-cols-2 h-auto p-0 bg-transparent rounded-none">
            <TabsTrigger
              value="positions"
              className="relative data-[state=active]:text-red-500 data-[state=inactive]:text-gray-400 data-[state=active]:bg-transparent data-[state=inactive]:bg-transparent text-xs font-medium transition-all duration-200 px-2 py-2 border-b-2 border-transparent data-[state=active]:border-red-500 rounded-none shadow-none select-none cursor-pointer"
            >
              {tr("tabs.positions")}
            </TabsTrigger>
            <TabsTrigger
              value="trade-history"
              className="relative data-[state=active]:text-red-500 data-[state=inactive]:text-gray-400 data-[state=active]:bg-transparent data-[state=inactive]:bg-transparent text-xs font-medium transition-all duration-200 px-2 py-2 border-b-2 border-transparent data-[state=active]:border-red-500 rounded-none shadow-none select-none cursor-pointer"
            >
              {tr("tabs.tradeHistory")}
            </TabsTrigger>
          </TabsList>
          <div className="flex gap-2 items-center">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="px-3 py-1 text-xs rounded-sm select-none"
                >
                  {tr("reset.button")}
                  {availableResetCredits > 0 && (
                    <span className="ml-1 text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 w-5 h-5 rounded-full flex items-center justify-center">
                      {availableResetCredits}
                    </span>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{tr("reset.title")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {!isHost ? (
                      tr("reset.onlyHost")
                    ) : closedPositions.length === 0 ? (
                      tr("reset.nothingToReset")
                    ) : availableResetCredits === 0 ? (
                      <>
                        {tr("reset.noCreditsLine1")}
                        <br />
                        <br />
                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                          {tr("reset.noCreditsHint")}
                        </span>
                      </>
                    ) : (
                      <>
                        {tr("reset.confirmText", {
                          credits: availableResetCredits,
                          pluralS: availableResetCredits > 1 ? "s" : "",
                        })}
                      </>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{tr("common.cancel")}</AlertDialogCancel>
                  {isHost &&
                  closedPositions.length > 0 &&
                  availableResetCredits > 0 ? (
                    <AlertDialogAction
                      onClick={() => {
                        if (!user?.id) return;
                        const snapshot =
                          typeof startingBalance === "number"
                            ? startingBalance
                            : 0;
                        performReset({
                          roomId,
                          initiatedBy: user.id,
                          resetStartBalance: snapshot,
                        });
                        // Locally consume one credit (UI simulation until persisted usage)
                        setUsedResetCredits((prev) => prev + 1);
                      }}
                      className="bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60"
                    >
                      {isResetting
                        ? tr("reset.resetting")
                        : tr("reset.actionLabel")}
                    </AlertDialogAction>
                  ) : (
                    <>
                      {/* Contextual secondary action */}
                      {(!isHost || closedPositions.length === 0) && (
                        <AlertDialogAction className="bg-blue-600 text-white shadow-xs hover:bg-blue-700 focus-visible:ring-blue-500/20">
                          {tr("actions.ok")}
                        </AlertDialogAction>
                      )}
                      {isHost &&
                        closedPositions.length > 0 &&
                        availableResetCredits === 0 && (
                          <AlertDialogAction
                            onClick={() => setIsMarketDialogOpen(true)}
                            className="bg-blue-600 text-white shadow-xs hover:bg-blue-700 focus-visible:ring-blue-500/20"
                          >
                            {tr("actions.goToMarket")}
                          </AlertDialogAction>
                        )}
                    </>
                  )}
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  className="px-3 py-1 text-xs rounded-sm select-none"
                  disabled={!isHost || openPositions.length === 0}
                  title={
                    !isHost
                      ? tr("tooltips.onlyHostCloseAll")
                      : openPositions.length === 0
                      ? tr("tooltips.noOpenPositions")
                      : undefined
                  }
                >
                  {tr("actions.closeAllPositions")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{tr("closeAll.title")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {tr("closeAll.description")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{tr("common.cancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      await closeAllPositions(
                        async (position: OpenPosition) => {
                          // Fetch current price for this position's symbol
                          const response = await fetch(
                            `https://api.binance.us/api/v3/ticker/24hr?symbol=${position.symbol}`
                          );
                          if (response.ok) {
                            const data = await response.json();
                            return parseFloat(data.lastPrice);
                          }
                          return position.entry_price; // Fallback to entry price if API fails
                        }
                      );
                      mutate(VIRTUAL_BALANCE_KEY(roomId)); // Refetch balance after closing all
                      mutate(TRADER_PNL_KEY(roomId)); // Refetch P&L stats after closing all
                      if (sinceResetAt) {
                        mutate(
                          `${TRADER_PNL_KEY(roomId)}?since=${encodeURIComponent(
                            sinceResetAt
                          )}`
                        );
                      }
                    }}
                    className="bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60"
                  >
                    {tr("actions.closeAll")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        <TabsContent
          value="positions"
          className="h-auto mt-0 bg-background select-none"
        >
          <div className="relative">
            {openPositions.length === 0 ? (
              <div className="flex items-center justify-center h-24 text-muted-foreground text-sm select-none">
                {tr("empty.noOpenPositions")}
              </div>
            ) : (
              <div className="w-full overflow-x-auto md:overflow-visible">
                <div className="min-w-[720px] md:min-w-0">
                  <Table className="w-full table-fixed">
                    <TableHeader
                      className="bg-[--table-header-background] sticky top-0 z-10"
                      style={{
                        display: "table",
                        width: "100%",
                        tableLayout: "fixed",
                      }}
                    >
                      <TableRow className="border-b border-border">
                        <TableHead
                          style={{ width: "12%" }}
                          className="text-muted-foreground font-bold text-xs p-2 text-left whitespace-nowrap"
                        >
                          {tr("headers.symbol")}
                        </TableHead>
                        <TableHead
                          style={{ width: "10%" }}
                          className="text-muted-foreground font-bold text-xs p-2 text-left whitespace-nowrap"
                        >
                          {tr("headers.side")}
                        </TableHead>
                        <TableHead
                          style={{ width: "16%" }}
                          className="text-muted-foreground font-bold text-xs p-2 text-left whitespace-nowrap"
                        >
                          {tr("headers.quantity")}
                        </TableHead>
                        <TableHead
                          style={{ width: "14%" }}
                          className="text-muted-foreground font-bold text-xs p-2 text-left whitespace-nowrap"
                        >
                          {tr("headers.size")}
                        </TableHead>
                        <TableHead
                          style={{ width: "14%" }}
                          className="text-muted-foreground font-bold text-xs p-2 text-left whitespace-nowrap"
                        >
                          <div className="flex items-center gap-1">
                            {tr("headers.entry")} {""}
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </div>
                        </TableHead>
                        <TableHead
                          style={{ width: "14%" }}
                          className="text-muted-foreground font-bold text-xs p-2 text-left whitespace-nowrap"
                        >
                          <div className="flex items-center gap-1">
                            {tr("headers.initialMargin")}
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </div>
                        </TableHead>
                        <TableHead
                          style={{ width: "12%" }}
                          className="text-muted-foreground font-bold text-xs p-2 text-left whitespace-nowrap"
                        >
                          <div className="flex items-center gap-1">
                            {tr("headers.pnl")} {""}
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </div>
                        </TableHead>
                        <TableHead
                          style={{ width: "8%" }}
                          className="text-muted-foreground font-bold text-xs p-2 text-left whitespace-nowrap"
                        >
                          {tr("headers.actions")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <tbody
                      style={{
                        display: "block",
                        maxHeight: "160px",
                        overflowY: "auto",
                        width: "100%",
                      }}
                    >
                      {openPositions.map((position) => (
                        <PositionRow
                          key={position.id}
                          position={position}
                          isHost={isHost}
                          closePosition={closePosition}
                          roomId={roomId}
                          sinceResetAt={sinceResetAt}
                        />
                      ))}
                    </tbody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
        <TabsContent
          value="trade-history"
          className="h-auto mt-0 bg-background select-none"
        >
          <div className="relative">
            {closedPositions.length === 0 ? (
              <div className="flex items-center justify-center h-24 text-muted-foreground text-sm select-none">
                {tr("empty.noTradeHistory")}
              </div>
            ) : (
              <div className="w-full overflow-x-auto md:overflow-visible">
                <div className="min-w-[720px] md:min-w-0">
                  <div className="max-h-[200px] overflow-y-auto border rounded-md">
                    <Table className="w-full table-fixed">
                      <TableHeader
                        className="bg-[--table-header-background] sticky top-0 z-10"
                        style={{
                          display: "table",
                          width: "100%",
                          tableLayout: "fixed",
                        }}
                      >
                        <TableRow className="border-b border-border">
                          <TableHead
                            style={{ width: "16%" }}
                            className="text-muted-foreground font-bold text-xs p-2 text-left whitespace-nowrap"
                          >
                            {tr("headers.symbol")}
                          </TableHead>
                          <TableHead
                            style={{ width: "12%" }}
                            className="text-muted-foreground font-bold text-xs p-2 text-left whitespace-nowrap"
                          >
                            {tr("headers.side")}
                          </TableHead>
                          <TableHead
                            style={{ width: "18%" }}
                            className="text-muted-foreground font-bold text-xs p-2 text-left whitespace-nowrap"
                          >
                            {tr("headers.size")}
                          </TableHead>
                          <TableHead
                            style={{ width: "18%" }}
                            className="text-muted-foreground font-bold text-xs p-2 text-left whitespace-nowrap"
                          >
                            {tr("headers.entry")}
                          </TableHead>
                          <TableHead
                            style={{ width: "18%" }}
                            className="text-muted-foreground font-bold text-xs p-2 text-left whitespace-nowrap"
                          >
                            {tr("headers.exit")}
                          </TableHead>
                          <TableHead
                            style={{ width: "18%" }}
                            className="text-muted-foreground font-bold text-xs p-2 text-left whitespace-nowrap"
                          >
                            {tr("headers.pnl")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <tbody
                        style={{
                          display: "table",
                          width: "100%",
                          tableLayout: "fixed",
                        }}
                      >
                        {closedPositions.map((item) => (
                          <tr
                            key={item.id}
                            style={{
                              display: "table",
                              tableLayout: "fixed",
                              width: "100%",
                            }}
                            className="hover:bg-muted border-0 !border-b-0"
                          >
                            <td
                              className="text-foreground text-xs p-2 text-left"
                              style={{ width: "16%" }}
                            >
                              {item.symbol ?? "-"}
                            </td>
                            <td
                              className={`text-xs p-2 text-left ${
                                (item.side ?? "").toLowerCase() === "long"
                                  ? "text-green-500"
                                  : "text-red-500"
                              }`}
                              style={{ width: "12%" }}
                            >
                              {(() => {
                                const s = (item.side ?? "").toLowerCase();
                                if (s === "long") return tr("sides.long");
                                if (s === "short") return tr("sides.short");
                                return item.side ?? "-";
                              })()}
                            </td>
                            <td
                              className="text-foreground text-xs p-2 text-left"
                              style={{ width: "18%" }}
                            >
                              {item.size ?? "-"}
                            </td>
                            <td
                              className="text-foreground text-xs p-2 text-left"
                              style={{ width: "18%" }}
                            >
                              {item.entry_price ?? "-"}
                            </td>
                            <td
                              className="text-foreground text-xs p-2 text-left"
                              style={{ width: "18%" }}
                            >
                              {item.close_price ?? "-"}
                            </td>
                            <td
                              className={`text-xs p-2 text-left ${
                                (item.pnl ?? "").toString().includes("-")
                                  ? "text-red-500"
                                  : "text-green-500"
                              }`}
                              style={{ width: "18%" }}
                            >
                              {item.pnl ?? "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Market Dialog */}
      <Dialog open={isMarketDialogOpen} onOpenChange={setIsMarketDialogOpen}>
        <DialogContent className="max-w-md p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Icons.market className="w-6 h-6 text-yellow-400" />
              {t("weetooMarket")}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 px-6 pb-2">
            {marketProducts.map((product) => (
              <div
                key={product.key}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl border bg-background/80 shadow-sm hover:shadow-lg transition-shadow group w-full min-w-0 overflow-x-hidden"
              >
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <div className="font-semibold text-base truncate group-hover:text-yellow-500 transition-colors">
                    {product.name}
                  </div>
                  <div className="text-xs text-muted-foreground group-hover:text-yellow-700 dark:group-hover:text-yellow-300 transition-colors">
                    {product.description}
                  </div>
                  <div className="text-sm font-bold text-yellow-500 mt-1">
                    {product.price.toLocaleString()} {t("korCoins")}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 sm:mt-0 sm:ml-4 shrink-0 self-start sm:self-center">
                  <Button
                    variant="outline"
                    size="icon"
                    className="w-8 h-8"
                    onClick={() => handleMarketQtyChange(product.key, -1)}
                    disabled={marketQuantities[product.key] <= 0}
                    aria-label={`Decrease quantity for ${product.name}`}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="w-8 text-center font-semibold text-base select-none">
                    {marketQuantities[product.key]}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="w-8 h-8"
                    onClick={() => handleMarketQtyChange(product.key, 1)}
                    disabled={marketQuantities[product.key] >= 99}
                    aria-label={`Increase quantity for ${product.name}`}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Total and Purchase Button */}
          <div className="px-6 pt-4 pb-6 border-t bg-background/95 rounded-b-2xl shadow-inner">
            {/* KOR Coins Balance */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                Your Balance
              </span>
              <span className="text-lg font-bold tabular-nums text-yellow-500">
                {(computed?.kor_coins || 0).toLocaleString()} {t("korCoins")}
              </span>
            </div>

            {/* Total Cost */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-base font-semibold text-muted-foreground">
                {t("total")}
              </span>
              <span className="text-2xl font-bold tabular-nums text-yellow-500">
                {marketTotal.toLocaleString()} {t("korCoins")}
              </span>
            </div>

            {/* Insufficient Balance Warning */}
            {marketTotal > 0 && (computed?.kor_coins || 0) < marketTotal && (
              <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-600 dark:text-red-400">
                  Insufficient KOR coins. You need{" "}
                  {(marketTotal - (computed?.kor_coins || 0)).toLocaleString()}{" "}
                  more.
                </p>
              </div>
            )}

            <Button
              className="w-full h-12 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold rounded-xl text-lg transition-colors shadow-md disabled:opacity-60"
              disabled={
                marketTotal === 0 ||
                (computed?.kor_coins || 0) < marketTotal ||
                isPurchasing
              }
              onClick={handleMarketPurchase}
            >
              {isPurchasing ? "Processing..." : t("purchase")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
