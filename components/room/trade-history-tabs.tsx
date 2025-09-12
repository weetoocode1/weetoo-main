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
import { Table, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBinanceFutures } from "@/hooks/use-binance-futures";
import { usePositions } from "@/hooks/use-positions";
import { VIRTUAL_BALANCE_KEY } from "@/hooks/use-virtual-balance";
import { createClient } from "@/lib/supabase/client";
import { Info } from "lucide-react";
import { useEffect, useState } from "react";
import { mutate } from "swr";
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
}: {
  position: OpenPosition;
  isHost: boolean;
  closePosition: (id: string, price: number) => Promise<void>;
  roomId: string;
}) {
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
        {position.side ?? "-"}
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
              title={
                !isHost
                  ? "Only the room creator can close positions."
                  : undefined
              }
            >
              Close
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Close Position</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to close this position? This action cannot
                be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  await closePosition(
                    position.id,
                    currentPositionPrice || position.entry_price
                  );
                  mutate(VIRTUAL_BALANCE_KEY(roomId)); // Refetch balance after closing
                  mutate(TRADER_PNL_KEY(roomId)); // Refetch P&L stats after closing
                }}
                className="bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60"
              >
                Close Position
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
  const { openPositions, closedPositions, closePosition, closeAllPositions } =
    usePositions(roomId) as {
      openPositions: OpenPosition[];
      closedPositions: ClosedPosition[];
      closePosition: (id: string, price: number) => Promise<void>;
      closeAllPositions: (
        getClosePrice: (position: OpenPosition) => Promise<number>
      ) => Promise<void>;
    };
  const [showCloseAllDialog, setShowCloseAllDialog] = useState(false);

  // Get current user id
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data?.user?.id || null);
    });
  }, []);
  const isHost = currentUserId === hostId;

  return (
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
            Positions
          </TabsTrigger>
          <TabsTrigger
            value="trade-history"
            className="relative data-[state=active]:text-red-500 data-[state=inactive]:text-gray-400 data-[state=active]:bg-transparent data-[state=inactive]:bg-transparent text-xs font-medium transition-all duration-200 px-2 py-2 border-b-2 border-transparent data-[state=active]:border-red-500 rounded-none shadow-none select-none cursor-pointer"
          >
            Trade History
          </TabsTrigger>
        </TabsList>
        <Button
          variant="destructive"
          size="sm"
          className="px-3 py-1 text-xs rounded-sm select-none"
          onClick={() => setShowCloseAllDialog(true)}
          disabled={!isHost}
          title={
            !isHost
              ? "Only the room creator can close all positions."
              : undefined
          }
        >
          Close All Positions
        </Button>
        <AlertDialog
          open={showCloseAllDialog}
          onOpenChange={setShowCloseAllDialog}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Close All Positions</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to close all open positions? This action
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  await closeAllPositions(async (position: OpenPosition) => {
                    // Fetch current price for this position's symbol
                    const response = await fetch(
                      `https://api.binance.us/api/v3/ticker/24hr?symbol=${position.symbol}`
                    );
                    if (response.ok) {
                      const data = await response.json();
                      return parseFloat(data.lastPrice);
                    }
                    return position.entry_price; // Fallback to entry price if API fails
                  });
                  setShowCloseAllDialog(false);
                  mutate(VIRTUAL_BALANCE_KEY(roomId)); // Refetch balance after closing all
                  mutate(TRADER_PNL_KEY(roomId)); // Refetch P&L stats after closing all
                }}
                className="bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60"
              >
                Close All
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <TabsContent
        value="positions"
        className="h-auto mt-0 bg-background select-none"
      >
        <div className="relative">
          {openPositions.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-muted-foreground text-sm select-none">
              No open positions.
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
                        Symbol
                      </TableHead>
                      <TableHead
                        style={{ width: "10%" }}
                        className="text-muted-foreground font-bold text-xs p-2 text-left whitespace-nowrap"
                      >
                        Side
                      </TableHead>
                      <TableHead
                        style={{ width: "16%" }}
                        className="text-muted-foreground font-bold text-xs p-2 text-left whitespace-nowrap"
                      >
                        Quantity
                      </TableHead>
                      <TableHead
                        style={{ width: "14%" }}
                        className="text-muted-foreground font-bold text-xs p-2 text-left whitespace-nowrap"
                      >
                        Size
                      </TableHead>
                      <TableHead
                        style={{ width: "14%" }}
                        className="text-muted-foreground font-bold text-xs p-2 text-left whitespace-nowrap"
                      >
                        <div className="flex items-center gap-1">
                          Entry{" "}
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </div>
                      </TableHead>
                      <TableHead
                        style={{ width: "14%" }}
                        className="text-muted-foreground font-bold text-xs p-2 text-left whitespace-nowrap"
                      >
                        <div className="flex items-center gap-1">
                          Initial Margin
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </div>
                      </TableHead>
                      <TableHead
                        style={{ width: "12%" }}
                        className="text-muted-foreground font-bold text-xs p-2 text-left whitespace-nowrap"
                      >
                        <div className="flex items-center gap-1">
                          PNL <Info className="h-3 w-3 text-muted-foreground" />
                        </div>
                      </TableHead>
                      <TableHead
                        style={{ width: "8%" }}
                        className="text-muted-foreground font-bold text-xs p-2 text-left whitespace-nowrap"
                      >
                        Actions
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
              No trade history yet.
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
                        style={{ width: "16%" }}
                        className="text-muted-foreground font-bold text-xs p-2 text-left whitespace-nowrap"
                      >
                        Symbol
                      </TableHead>
                      <TableHead
                        style={{ width: "12%" }}
                        className="text-muted-foreground font-bold text-xs p-2 text-left whitespace-nowrap"
                      >
                        Side
                      </TableHead>
                      <TableHead
                        style={{ width: "18%" }}
                        className="text-muted-foreground font-bold text-xs p-2 text-left whitespace-nowrap"
                      >
                        Size
                      </TableHead>
                      <TableHead
                        style={{ width: "18%" }}
                        className="text-muted-foreground font-bold text-xs p-2 text-left whitespace-nowrap"
                      >
                        Entry
                      </TableHead>
                      <TableHead
                        style={{ width: "18%" }}
                        className="text-muted-foreground font-bold text-xs p-2 text-left whitespace-nowrap"
                      >
                        Exit
                      </TableHead>
                      <TableHead
                        style={{ width: "18%" }}
                        className="text-muted-foreground font-bold text-xs p-2 text-left whitespace-nowrap"
                      >
                        PNL
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
                          {item.side ?? "-"}
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
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
