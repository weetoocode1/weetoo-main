"use client";
import { usePositions } from "@/hooks/use-positions";
import { useTickerData } from "@/hooks/websocket/use-market-data";
import type { Symbol } from "@/types/market";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { SimpleTable } from "./shared/simple-table";
import { useTranslations } from "next-intl";

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

// TP/SL status indicator for positions
const PositionTpSlIndicator = ({ position }: { position: Position }) => {
  const hasTp = position.tp_enabled && position.take_profit_price;
  const hasSl = position.sl_enabled && position.stop_loss_price;
  const tpActive = position.tp_status === "active";
  const slActive = position.sl_status === "active";

  // Debug logging to see what data we have
  // console.log("PositionTpSlIndicator data:", {
  //   id: position.id,
  //   tp_enabled: position.tp_enabled,
  //   sl_enabled: position.sl_enabled,
  //   take_profit_price: position.take_profit_price,
  //   stop_loss_price: position.stop_loss_price,
  //   tp_status: position.tp_status,
  //   sl_status: position.sl_status,
  //   hasTp,
  //   hasSl,
  //   tpActive,
  //   slActive,
  // });

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
  const t = useTranslations("trading.positions");
  // Simple approach - just track if we're currently closing any position
  const [isClosing, setIsClosing] = useState(false);

  // Handle position closing - simple and clean
  const handleClosePosition = async (position: Position) => {
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
  };
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

  const queryClientRef = useRef<ReturnType<typeof useQueryClient> | null>(null);
  const dispatchedPositionsRef = useRef<Set<string>>(new Set());
  const qcLocal = useQueryClient();
  queryClientRef.current = qcLocal;
  const { openPositions, loadingOpen, closePosition } = usePositions(roomId);
  // Dialog removed; instant close on click
  const formatSize = (n: number) => (n >= 1 ? n.toFixed(2) : n.toFixed(3));

  // No dialog body overflow handling needed

  // Live price for current room symbol (fallback to entry if unavailable)
  const ticker = useTickerData(symbol || "BTCUSDT");
  const livePrice =
    livePriceOverride ??
    (ticker?.lastPrice
      ? parseFloat(String(ticker.lastPrice).replace(/,/g, ""))
      : undefined);

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
      [dataKeys[6]]: <PositionTpSlIndicator position={pos} />,
      [dataKeys[7]]: <StatusBadge status={pos.status || "filled"} />,
      [dataKeys[8]]: liq ? liq.toFixed(2) : "-",
      [dataKeys[9]]: distanceToLiq,
      [dataKeys[10]]: <PnLDisplay value={unrealizedPct} isPercentage={true} />,
      [dataKeys[11]]: <PnLDisplay value={unrealized.toFixed(2)} />,
      [dataKeys[12]]: (
        <button
          type="button"
          className={`px-2 py-1 text-xs rounded border border-border ${
            isClosing
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-muted/30 cursor-pointer"
          }`}
          onMouseDown={(e) => {
            e.stopPropagation(); // Stop event bubbling up to parent grid item
            e.preventDefault(); // Prevent default browser drag behavior
            // This is crucial - prevents react-grid-layout from detecting drag initiation
          }}
          onClick={(e) => {
            e.stopPropagation(); // Ensure onClick also stops propagation
            e.preventDefault(); // Prevent default button behavior
            handleClosePosition(pos);
          }}
          disabled={isClosing}
          data-grid-no-drag
          style={{
            pointerEvents: "auto",
            position: "relative",
            zIndex: 9999,
          }}
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
    <div
      className="h-full flex flex-col"
      onMouseDown={(e) => {
        // Only stop propagation if the event target is NOT the close button or its immediate children.
        // This makes sure the parent's onMouseDown doesn't interfere with the button's own event handling.
        const target = e.target as HTMLElement;
        const isCloseButton = target.closest(
          'button[data-grid-no-drag][type="button"]'
        );
        if (!isCloseButton) {
          e.stopPropagation();
        }
      }}
      data-grid-no-drag
    >
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

      {/* Dialog removed per request */}
    </div>
  );
}
