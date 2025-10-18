import { SimpleTable } from "./shared/simple-table";
import type { Symbol } from "@/types/market";
import { useOpenOrders } from "@/hooks/use-open-orders";

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

// TP/SL status indicator
const TpSlIndicator = ({ order }: { order: OpenOrder }) => {
  const hasTp = order.tp_enabled && order.take_profit_price;
  const hasSl = order.sl_enabled && order.stop_loss_price;

  if (!hasTp && !hasSl) return null;

  return (
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
  );
};

interface OpenOrdersTabsProps {
  symbol?: Symbol;
  roomId: string;
}

export function OpenOrdersTabs({ symbol, roomId }: OpenOrdersTabsProps) {
  const columns = [
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
      time: new Date(o.created_at).toTimeString().split(" ")[0],
      symbol: o.symbol,
      type: "Limit",
      side: o.side === "long" ? "Buy" : "Sell",
      price: Number(o.limit_price).toFixed(2),
      amount: Number(o.quantity).toFixed(8),
      "TP/SL": <TpSlIndicator order={o} />,
      status: <StatusBadge status={o.status || "active"} />,
      "total value": (Number(o.limit_price) * Number(o.quantity)).toFixed(2),
      action: "Cancel",
    })) || [];

  const handleRowClick = async (row: Record<string, unknown>) => {
    if (!roomId) return;
    const match = data?.data?.find(
      (o: OpenOrder) => o.symbol === (row.Symbol || row.symbol)
    );
    if (!match) return;

    await fetch(`/api/trading-room/${roomId}/open-orders`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel", orderId: match.id }),
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-hidden">
        <SimpleTable
          columns={columns}
          data={rows}
          emptyStateText="No Open Orders"
          onRowClick={handleRowClick}
          widenMatchers={["Symbol", "Total Value"]}
          narrowMatchers={["Action", "TP/SL", "Status"]}
          showFilters={true}
          filterableColumns={["Symbol", "Side", "Type"]}
        />
      </div>
    </div>
  );
}
