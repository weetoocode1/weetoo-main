"use client";

import { SimpleTable } from "./shared/simple-table";
import type { Symbol } from "@/types/market";
import { useOpenOrders } from "@/hooks/use-open-orders";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { EditOrderTpSlDialog } from "./edit-order-tp-sl-dialog";
import { PencilIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface OpenOrder {
  id: string;
  symbol: string;
  side: string;
  order_type: string;
  limit_price: number;
  quantity: number;
  status: string;
  created_at: string;
  tp_enabled?: boolean;
  sl_enabled?: boolean;
  take_profit_price?: number;
  stop_loss_price?: number;
}

interface OpenOrdersTabsProps {
  symbol?: Symbol;
  roomId: string;
}

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const getBadgeStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-yellow-500/20 text-yellow-400";
      case "triggered":
        return "bg-blue-500/20 text-blue-400";
      case "filled":
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

// TP/SL status indicator with edit functionality
const TpSlIndicator = ({
  order,
  onEdit,
}: {
  order: OpenOrder;
  onEdit: () => void;
}) => {
  const hasTp = order.tp_enabled && order.take_profit_price;
  const hasSl = order.sl_enabled && order.stop_loss_price;

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
              <span className="px-1.5 py-0.5 rounded text-xs bg-green-500/20 text-green-400 font-medium">
                TP
              </span>
            )}
            {hasSl && (
              <span className="px-1.5 py-0.5 rounded text-xs bg-red-500/20 text-red-400 font-medium">
                SL
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

interface OpenOrdersTabsProps {
  symbol?: Symbol;
  roomId: string;
}

export function OpenOrdersTabs({ symbol, roomId }: OpenOrdersTabsProps) {
  const t = useTranslations("trading.openOrders");
  const queryClient = useQueryClient();
  const [editingOrder, setEditingOrder] = useState<OpenOrder | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Clear selection when dialog closes (even if user cancels)
  useEffect(() => {
    if (!editDialogOpen) {
      setEditingOrder(null);
    }
  }, [editDialogOpen]);
  const col = {
    time: t("columns.time"),
    symbol: t("columns.symbol"),
    type: t("columns.type"),
    side: t("columns.side"),
    price: t("columns.price"),
    amount: t("columns.amount"),
    tpsl: t("columns.tpsl"),
    status: t("columns.status"),
    totalValue: t("columns.totalValue"),
    action: t("columns.action"),
  } as const;
  const columns = [
    col.time,
    col.symbol,
    col.type,
    col.side,
    col.price,
    col.amount,
    col.tpsl,
    col.status,
    col.totalValue,
    col.action,
  ] as const;
  const dataKeys = [
    "Time",
    "Symbol",
    "Type",
    "Side",
    "Price",
    "Amount",
    "TP/SL",
    "Status",
    "Total Value",
    "Action",
  ] as const;

  const { data } = useOpenOrders(roomId, {
    symbol: symbol as string,
    status: "open",
  });

  const rows =
    data?.data?.map((o: OpenOrder) => ({
      [dataKeys[0]]: new Date(o.created_at).toTimeString().split(" ")[0],
      [dataKeys[1]]: o.symbol,
      [dataKeys[2]]: t("common.limit"),
      [dataKeys[3]]: o.side === "long" ? t("common.buy") : t("common.sell"),
      [dataKeys[4]]: Number(o.limit_price).toFixed(2),
      [dataKeys[5]]: Number(o.quantity).toFixed(8),
      [dataKeys[6]]: (
        <TpSlIndicator
          order={o}
          onEdit={() => {
            setEditingOrder(o);
            setEditDialogOpen(true);
          }}
        />
      ),
      [dataKeys[7]]: <StatusBadge status={o.status || "active"} />,
      [dataKeys[8]]: (Number(o.limit_price) * Number(o.quantity)).toFixed(2),
      [dataKeys[9]]: (
        <button
          type="button"
          className="action-btn px-2 py-1 text-xs rounded border border-border hover:bg-muted/30 cursor-pointer"
          onClick={async () => {
            if (!roomId) return;
            await fetch(`/api/trading-room/${roomId}/open-orders`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "cancel", orderId: o.id }),
            });
            queryClient.invalidateQueries({
              queryKey: ["open-orders", roomId],
            });
          }}
        >
          {t("actions.cancel")}
        </button>
      ),
    })) || [];

  const handleRowClick = async () => {
    // No-op: actions handled by buttons above
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-hidden">
        <SimpleTable
          columns={columns}
          dataKeys={dataKeys as unknown as string[]}
          data={rows}
          emptyStateText={t("empty.noOpenOrders")}
          onRowClick={handleRowClick}
          widenMatchers={[col.symbol, col.totalValue]}
          narrowMatchers={[col.action, col.tpsl, col.status]}
          showFilters={true}
          filterableColumns={["Symbol", "Side", "Type"]}
        />
      </div>

      {editingOrder && (
        <EditOrderTpSlDialog
          key={editingOrder.id}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          order={{
            id: editingOrder.id,
            symbol: editingOrder.symbol,
            side: editingOrder.side as "long" | "short",
            limit_price: editingOrder.limit_price,
            quantity: editingOrder.quantity,
            tp_enabled: editingOrder.tp_enabled,
            sl_enabled: editingOrder.sl_enabled,
            take_profit_price: editingOrder.take_profit_price,
            stop_loss_price: editingOrder.stop_loss_price,
          }}
          roomId={roomId}
          orderType="open"
          onSuccess={() => {
            queryClient.invalidateQueries({
              queryKey: ["open-orders", roomId],
            });
            setEditingOrder(null);
          }}
        />
      )}
    </div>
  );
}
