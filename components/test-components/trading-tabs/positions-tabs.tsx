"use client";
import { usePositions } from "@/hooks/use-positions";
import type { Symbol } from "@/types/market";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, useCallback } from "react";
import { SimpleTable } from "./shared/simple-table";
import { useTranslations } from "next-intl";
import { EditPositionTpSlDialog } from "./edit-position-tp-sl-dialog";
import { PencilIcon } from "lucide-react";

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

// P&L display component with profit/loss colors
const PnLDisplay = ({
  value,
  isPercentage = false,
}: {
  value: string;
  isPercentage?: boolean;
}) => {
  const numericValue = parseFloat(value.replace(/[%$]/g, ""));
  const isProfit = numericValue > 0;
  const isLoss = numericValue < 0;

  return (
    <span
      className={`font-medium tabular-nums ${
        isProfit
          ? "text-profit"
          : isLoss
          ? "text-loss"
          : "text-muted-foreground"
      }`}
    >
      {value}
    </span>
  );
};

// TP/SL status indicator for positions with edit functionality
const PositionTpSlIndicator = ({
  position,
  roomId,
  onEdit,
}: {
  position: Position;
  roomId: string;
  onEdit: () => void;
}) => {
  const hasTp = position.tp_enabled && position.take_profit_price;
  const hasSl = position.sl_enabled && position.stop_loss_price;
  const tpActive = position.tp_status === "active";
  const slActive = position.sl_status === "active";

  if (!hasTp && !hasSl) {
    return (
      <button
        type="button"
        onClick={() => onEdit()}
        className="action-btn flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors cursor-pointer"
        title="Add TP/SL"
      >
        <PencilIcon className="h-3 w-3" />
        <span>Add TP/SL</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
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
      <button
        type="button"
        onClick={() => onEdit()}
        className="action-btn p-0.5 text-muted-foreground hover:text-foreground transition-colors rounded"
        title="Edit TP/SL"
      >
        <PencilIcon className="h-3 w-3" />
      </button>
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
  const t = useTranslations("trading.positions");
  const [isClosing, setIsClosing] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Ensure stale selection is cleared whenever dialog closes (even via cancel)
  useEffect(() => {
    if (!editDialogOpen) {
      setEditingPosition(null);
    }
  }, [editDialogOpen]);

  // Use stable prop from parent to avoid frequent re-renders
  const livePrice = livePriceOverride;

  const queryClientRef = useRef<ReturnType<typeof useQueryClient> | null>(null);
  const dispatchedPositionsRef = useRef<Set<string>>(new Set());
  const qcLocal = useQueryClient();
  queryClientRef.current = qcLocal;
  const { openPositions, loadingOpen, closePosition } = usePositions(roomId);

  // Handle position closing - stable reference to avoid re-renders breaking click cycle
  const handleClosePosition = useCallback(
    async (position: Position) => {
      if (isClosing) return; // Prevent multiple clicks

      setIsClosing(true);
      try {
        const computedPrice = getClosePrice
          ? await getClosePrice(position)
          : livePrice || Number(position.entry_price);

        // Optimistic chart update
        try {
          window.dispatchEvent(
            new CustomEvent("position-closed", { detail: { id: position.id } })
          );
          console.log("Dispatched position-closed event for ID:", position.id);
        } catch (error) {
          console.error("Failed to dispatch position-closed event:", error);
        }

        await closePosition(position.id, Number(computedPrice));
        // Force immediate table refresh - target specific queries for better performance
        queryClientRef.current?.invalidateQueries({
          queryKey: ["open-positions", roomId],
        });
        queryClientRef.current?.invalidateQueries({
          queryKey: ["closed-positions", roomId],
        });
      } catch (error) {
        console.error("Failed to close position:", error);
      } finally {
        setIsClosing(false);
      }
    },
    [
      isClosing,
      getClosePrice,
      livePriceOverride,
      queryClientRef,
      roomId,
      closePosition,
    ]
  );
  const col = {
    symbol: t("columns.symbol"),
    side: t("columns.side"),
    size: t("columns.size"),
    entry: t("columns.entryPrice"),
    mark: t("columns.markPrice"),
    last: t("columns.lastPrice"),
    tpsl: t("columns.tpsl"),
    status: t("columns.status"),
    liq: t("columns.liqPrice"),
    dist: t("columns.distanceToLiq"),
    upnlPct: t("columns.unrealizedPct"),
    upnlUsd: t("columns.unrealizedUsd"),
    actions: t("columns.actions"),
  } as const;
  const columns = [
    col.symbol,
    col.side,
    col.size,
    col.entry,
    col.mark,
    col.last,
    col.tpsl,
    col.status,
    col.liq,
    col.dist,
    col.upnlPct,
    col.upnlUsd,
    col.actions,
  ] as const;
  const dataKeys = [
    "Symbol",
    "Side",
    "Size",
    "Entry Price",
    "Mark Price",
    "Last Price",
    "TP/SL",
    "Status",
    "Liq. Price",
    "Distance to Liquidation",
    "Unrealized P&L (%)",
    "Unrealized P&L ($)",
    "Actions",
  ] as const;

  // Dialog removed; instant close on click
  const formatSize = (n: number) => (n >= 1 ? n.toFixed(2) : n.toFixed(3));

  // No dialog body overflow handling needed

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
      [dataKeys[0]]: pos.symbol,
      [dataKeys[1]]: pos.side === "long" ? t("common.buy") : t("common.sell"),
      [dataKeys[2]]: formatSize(size),
      [dataKeys[3]]: entry.toFixed(2),
      [dataKeys[4]]: mark.toFixed(2),
      [dataKeys[5]]: last.toFixed(2),
      [dataKeys[6]]: (
        <PositionTpSlIndicator
          position={pos}
          roomId={roomId}
          onEdit={() => {
            setEditingPosition(pos);
            setEditDialogOpen(true);
          }}
        />
      ),
      [dataKeys[7]]: <StatusBadge status={pos.status || "filled"} />,
      [dataKeys[8]]: liq ? liq.toFixed(2) : "-",
      [dataKeys[9]]: distanceToLiq,
      [dataKeys[10]]: <PnLDisplay value={unrealizedPct} isPercentage={true} />,
      [dataKeys[11]]: <PnLDisplay value={unrealized.toFixed(2)} />,
      [dataKeys[12]]: (
        <button
          type="button"
          className={`action-btn px-2 py-1 text-xs rounded border border-border ${
            isClosing
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-muted/30 cursor-pointer"
          }`}
          onClick={() => handleClosePosition(pos)}
          disabled={isClosing}
        >
          {isClosing ? t("actions.closing") : t("actions.close")}
        </button>
      ),
    } as Record<string, unknown>;
  });

  // Emit entry lines to the chart for all open positions whenever the list updates
  useEffect(() => {
    try {
      const currentPositionIds = new Set(
        (openPositions || []).map((p) => p.id)
      );

      // Remove positions that are no longer open
      dispatchedPositionsRef.current.forEach((id) => {
        if (!currentPositionIds.has(id)) {
          window.dispatchEvent(
            new CustomEvent("position-closed", { detail: { id } })
          );
          dispatchedPositionsRef.current.delete(id);
        }
      });

      // Add new positions
      (openPositions || []).forEach((p: Position) => {
        // Skip if we've already dispatched this position
        if (dispatchedPositionsRef.current.has(p.id)) return;

        const price = Number(p.entry_price);
        if (!Number.isFinite(price) || price <= 0) return;
        const side = (
          String(p.side).toLowerCase() === "sell" ? "SHORT" : "LONG"
        ) as "LONG" | "SHORT";

        window.dispatchEvent(
          new CustomEvent("position-opened", {
            detail: {
              id: p.id,
              price,
              side,
              size: Number(p.quantity),
              entryPrice: Number(p.entry_price),
            },
          })
        );

        console.log("Dispatched position-opened event:", {
          id: p.id,
          price,
          side,
        });

        dispatchedPositionsRef.current.add(p.id);
      });
    } catch {}

    // Optional cleanup: if component unmounts, remove lines
    return () => {
      try {
        dispatchedPositionsRef.current.forEach((id) => {
          window.dispatchEvent(
            new CustomEvent("position-closed", { detail: { id } })
          );
        });
        dispatchedPositionsRef.current.clear();
      } catch {}
    };
  }, [openPositions]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-hidden">
        <SimpleTable
          columns={columns}
          dataKeys={dataKeys as unknown as string[]}
          data={rows}
          emptyStateText={loadingOpen ? t("empty.loading") : t("empty.noOpen")}
          widenMatchers={[col.upnlUsd, col.upnlPct, col.dist, col.liq]}
          narrowMatchers={[col.actions, col.side, col.tpsl, col.status]}
          showFilters={true}
          filterableColumns={["Symbol", "Side"]}
        />
      </div>

      {editingPosition && (
        <EditPositionTpSlDialog
          key={editingPosition.id}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          position={{
            id: editingPosition.id,
            symbol: editingPosition.symbol,
            side: editingPosition.side as "long" | "short",
            entry_price: editingPosition.entry_price,
            quantity: editingPosition.quantity,
            tp_enabled: editingPosition.tp_enabled,
            sl_enabled: editingPosition.sl_enabled,
            take_profit_price: editingPosition.take_profit_price,
            stop_loss_price: editingPosition.stop_loss_price,
          }}
          roomId={roomId}
          onSuccess={() => {
            queryClientRef.current?.invalidateQueries({
              queryKey: ["open-positions", roomId],
            });
            setEditingPosition(null);
          }}
        />
      )}
    </div>
  );
}
