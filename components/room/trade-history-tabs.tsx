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
import { usePositions } from "@/hooks/use-positions";
import { Info } from "lucide-react";
import { useState } from "react";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { mutate } from "swr";
import { VIRTUAL_BALANCE_KEY } from "@/hooks/use-virtual-balance";
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
      closeAllPositions: (price: number) => Promise<void>;
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

  // Helper to calculate live PNL with percent for open positions
  const unrealizedPnlWithPercent = (position: OpenPosition) => {
    if (!position || !currentPrice) return "-";
    const entry = Number(position.entry_price);
    const qty = Number(position.quantity);
    const side = (position.side ?? "").toLowerCase();
    const pnlValue =
      side === "long"
        ? (currentPrice - entry) * qty
        : (entry - currentPrice) * qty;
    const pnlPercent =
      side === "long"
        ? ((currentPrice - entry) / entry) * 100
        : ((entry - currentPrice) / entry) * 100;
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
                  await closeAllPositions(currentPrice ?? 0);
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
                      Entry <Info className="h-3 w-3 text-muted-foreground" />
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
                  <tr
                    key={position.id}
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
                        unrealizedPnlWithPercent(position).includes("-")
                          ? "text-red-500"
                          : "text-green-500"
                      }`}
                      style={{ width: "12%" }}
                    >
                      {unrealizedPnlWithPercent(position)}
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
                              Are you sure you want to close this position? This
                              action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={async () => {
                                await closePosition(
                                  position.id,
                                  currentPrice || position.entry_price
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
                ))}
              </tbody>
            </Table>
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
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
