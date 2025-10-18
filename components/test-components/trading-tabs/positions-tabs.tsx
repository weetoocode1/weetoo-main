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
} from "@/components/ui/alert-dialog";
import { usePositions } from "@/hooks/use-positions";
import { useTickerData } from "@/hooks/websocket/use-market-data";
import type { Symbol } from "@/types/market";
import { useState } from "react";
import { SimpleTable } from "./shared/simple-table";

interface Position {
  id: string;
  symbol: string;
  side: string;
  quantity: number;
  entry_price: number;
  liquidation_price?: number;
  leverage?: number;
  tp_enabled?: boolean;
  sl_enabled?: boolean;
  take_profit_price?: number;
  stop_loss_price?: number;
  tp_status?: string;
  sl_status?: string;
  status?: string;
}

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const getBadgeStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
      case "filled":
      case "open":
        return "bg-yellow-500/20 text-yellow-400";
      case "triggered":
        return "bg-blue-500/20 text-blue-400";
      case "closed":
        return "bg-green-500/20 text-green-400";
      case "cancelled":
        return "bg-gray-500/20 text-gray-400";
      case "failed":
        return "bg-red-500/20 text-red-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${getBadgeStyle(
        status
      )}`}
    >
      {status}
    </span>
  );
};

// TP/SL status indicator for positions
const PositionTpSlIndicator = ({ position }: { position: Position }) => {
  const hasTp = position.tp_enabled && position.take_profit_price;
  const hasSl = position.sl_enabled && position.stop_loss_price;
  const tpActive = position.tp_status === "active";
  const slActive = position.sl_status === "active";

  // Debug logging to see what data we have
  console.log("PositionTpSlIndicator data:", {
    id: position.id,
    tp_enabled: position.tp_enabled,
    sl_enabled: position.sl_enabled,
    take_profit_price: position.take_profit_price,
    stop_loss_price: position.stop_loss_price,
    tp_status: position.tp_status,
    sl_status: position.sl_status,
    hasTp,
    hasSl,
    tpActive,
    slActive,
  });

  if (!hasTp && !hasSl) return null;

  return (
    <div className="flex gap-1">
      {hasTp && (
        <span
          className={`px-1.5 py-0.5 rounded text-xs font-medium ${
            tpActive
              ? "bg-green-500/20 text-green-400"
              : "bg-gray-500/20 text-gray-400"
          }`}
        >
          TP{tpActive ? " ✓" : ""}
        </span>
      )}
      {hasSl && (
        <span
          className={`px-1.5 py-0.5 rounded text-xs font-medium ${
            slActive
              ? "bg-red-500/20 text-red-400"
              : "bg-gray-500/20 text-gray-400"
          }`}
        >
          SL{slActive ? " ✓" : ""}
        </span>
      )}
    </div>
  );
};

interface PositionsTabsProps {
  roomId: string;
  symbol?: Symbol;
  // Optional: provide a function to fetch latest close price per position
  getClosePrice?: (position: Position) => Promise<number>;
  livePriceOverride?: number;
}

export function PositionsTabs({
  roomId,
  symbol,
  getClosePrice,
  livePriceOverride,
}: PositionsTabsProps) {
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
  };
  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
  };
  const columns = [
    "Symbol",
    "Side",
    "Size",
    "Entry Price",
    "Mark Price",
    "Last Price",
    "TP/SL",
    "Status",
    "Liquidation Price",
    "Distance to Liquidation",
    "Unrealized P&L (%)",
    "Unrealized P&L ($)",
    "Actions",
  ] as const;

  const { openPositions, loadingOpen } = usePositions(roomId);
  const [closingId, setClosingId] = useState<string | null>(null);
  const formatSize = (n: number) => (n >= 1 ? n.toFixed(2) : n.toFixed(3));

  // Live price for current room symbol (fallback to entry if unavailable)
  const ticker = useTickerData(symbol || "BTCUSDT");
  const livePrice =
    livePriceOverride ??
    (ticker?.lastPrice
      ? parseFloat(String(ticker.lastPrice).replace(/,/g, ""))
      : undefined);

  const handleRowClick = (row: Record<string, unknown>) => {
    const id = row.id as string | undefined;
    if (id) setClosingId(id);
  };

  const rows = (openPositions || []).map((pos: Position) => {
    // const sideLabel = pos.side === "long" ? "Long" : "Short";
    const size = Number(pos.quantity);
    const entry = Number(pos.entry_price);
    const last = livePrice ?? Number(pos.entry_price);
    const mark = last; // show same value for now
    // Calculate liquidation price if not available or invalid
    let liq = pos.liquidation_price ? Number(pos.liquidation_price) : 0;

    // Fallback calculation if liquidation price is 0 or invalid
    if (!liq || liq <= 0) {
      const leverage = Number(pos.leverage || 1);
      const MMR = 0.005; // Maintenance margin rate
      if (entry > 0 && leverage > 0) {
        liq =
          pos.side === "long"
            ? entry * (1 - 1 / leverage + MMR)
            : entry * (1 + 1 / leverage - MMR);
      }
    }

    const distanceToLiq =
      liq && last && liq > 0
        ? ((Math.abs(last - liq) / last) * 100).toFixed(2) + "%"
        : "-";
    const direction = pos.side === "short" ? -1 : 1;
    const unrealized = (last - entry) * size * direction;
    const basis = entry * size || 0;
    const unrealizedPct = basis
      ? ((unrealized / basis) * 100).toFixed(2) + "%"
      : "0%";

    return {
      id: pos.id,
      Symbol: pos.symbol,
      Side: pos.side === "long" ? "Buy" : "Sell",
      Size: formatSize(size),
      "Entry Price": entry.toFixed(2),
      "Mark Price": mark.toFixed(2),
      "Last Price": last.toFixed(2),
      "TP/SL": <PositionTpSlIndicator position={pos} />,
      Status: <StatusBadge status={pos.status || "filled"} />,
      "Liquidation Price": liq ? liq.toFixed(2) : "-",
      "Distance to Liquidation": distanceToLiq,
      "Unrealized P&L (%)": unrealizedPct,
      "Unrealized P&L ($)": unrealized.toFixed(2),
      Actions: "Close",
    } as Record<string, unknown>;
  });

  return (
    <div
      className="h-full flex flex-col"
      onMouseDown={handleMouseDown}
      onPointerDown={handlePointerDown}
      data-grid-no-drag
    >
      <div className="flex-1 overflow-hidden">
        <SimpleTable
          columns={columns}
          data={rows}
          emptyStateText={loadingOpen ? "Loading..." : "No Open Positions"}
          onRowClick={handleRowClick}
          widenMatchers={[
            "Unrealized P&L ($)",
            "Unrealized P&L (%)",
            "Distance to Liquidation",
            "Liquidation Price",
          ]}
          narrowMatchers={["Actions", "Side", "TP/SL", "Status"]}
          showFilters={true}
          filterableColumns={["Symbol", "Side"]}
        />
      </div>

      {/* Close dialog */}
      <AlertDialog
        open={!!closingId}
        onOpenChange={(open) => !open && setClosingId(null)}
      >
        <AlertDialogContent
          onMouseDown={handleMouseDown}
          onPointerDown={handlePointerDown}
          data-grid-no-drag
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Close Position</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to close this position? This will realize
              PnL and update your virtual balance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const pos = (openPositions || []).find(
                  (p: Position) => p.id === closingId
                );
                if (!pos) return setClosingId(null);
                const price = getClosePrice
                  ? await getClosePrice(pos)
                  : livePrice || Number(pos.entry_price);
                await fetch(`/api/trading-room/${roomId}/positions/close`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    positionId: pos.id,
                    closePrice: price,
                  }),
                });
                setClosingId(null);
              }}
            >
              Confirm Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
