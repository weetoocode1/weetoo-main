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
import { Button } from "@/components/ui/button";
import {
  useCancelScheduledOrder,
  useScheduledOrders,
} from "@/hooks/use-scheduled-orders";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SimpleTable } from "./shared/simple-table";
import { useTranslations } from "next-intl";
import { EditOrderTpSlDialog } from "./edit-order-tp-sl-dialog";
import { PencilIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface ScheduledOrder {
  id: string;
  symbol: string;
  side: string;
  order_type: string;
  quantity: number;
  price?: number;
  leverage: number;
  schedule_type: string;
  scheduled_at?: string;
  trigger_condition?: string;
  trigger_price?: number;
  status: string;
  tp_enabled?: boolean;
  sl_enabled?: boolean;
  take_profit_price?: number;
  stop_loss_price?: number;
}

// TP/SL status indicator for scheduled orders with edit functionality
const ScheduledTpSlIndicator = ({
  order,
  onEdit,
}: {
  order: ScheduledOrder;
  onEdit: () => void;
}) => {
  const hasTp = order.tp_enabled && order.take_profit_price;
  const hasSl = order.sl_enabled && order.stop_loss_price;
  const statusLower = order.status?.toLowerCase();
  const isExecuted = statusLower === "executed";
  const isCancelled = statusLower === "cancelled";
  const isNonEditable = isExecuted || isCancelled;

  if (!hasTp && !hasSl) {
    // Executed or cancelled: show disabled state without edit button
    if (isNonEditable) {
      return (
        <span className="text-xs text-muted-foreground">No TP/SL</span>
      );
    }

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
      {/* Only show edit button if order is not executed/cancelled */}
      {!isNonEditable && (
          <button
            type="button"
          onClick={() => onEdit()}
          className="action-btn p-0.5 text-muted-foreground hover:text-foreground transition-colors rounded"
            title="Edit TP/SL"
          >
            <PencilIcon className="h-3 w-3" />
          </button>
      )}
    </div>
  );
};

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const getBadgeStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
      case "pending":
        return "bg-yellow-500/20 text-yellow-400";
      case "triggered":
      case "watching":
        return "bg-blue-500/20 text-blue-400";
      case "filled":
      case "executed":
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

interface ScheduledOrdersTabsProps {
  roomId: string;
}

const STATUS_DISPLAY_MAP = {
  pending: "Pending",
  watching: "Watching",
  executed: "Executed",
  cancelled: "Cancelled",
  failed: "Failed",
} as const;

const TRIGGER_DISPLAY_MAP = {
  above: "Rises Above",
  below: "Falls Below",
} as const;

export function ScheduledOrdersTabs({ roomId }: ScheduledOrdersTabsProps) {
  const t = useTranslations("trading.scheduled");
  const queryClient = useQueryClient();
  const [currentTime, setCurrentTime] = useState(new Date());
  const { data: ordersData, isLoading, error } = useScheduledOrders(roomId);
  const cancelOrderMutation = useCancelScheduledOrder(roomId);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [targetOrderId, setTargetOrderId] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<ScheduledOrder | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Clear selection when dialog closes (even on cancel)
  useEffect(() => {
    if (!editDialogOpen) {
      setEditingOrder(null);
    }
  }, [editDialogOpen]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleCancelOrder = async (orderId: string) => {
    try {
      await cancelOrderMutation.mutateAsync(orderId);
      toast.success(t("toasts.cancelSuccess"));
    } catch (_error) {
      toast.error(t("toasts.cancelFailed"));
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculateCountdown = (scheduledAt: string) => {
    const scheduled = new Date(scheduledAt);
    const now = currentTime;
    const diff = scheduled.getTime() - now.getTime();

    const isExpired = diff <= 0;
    const isExecuting = Math.abs(diff) < 30000; // Within 30 seconds

    const timeMap = {
      expired: () => t("countdown.expired"),
      executing: () => t("countdown.executing"),
      countdown: () => {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        return `${hours}h ${minutes}m ${seconds}s`;
      },
    };

    const getCountdownDisplay = () => {
      const isExpiredCheck = isExpired;
      const isExecutingCheck = isExecuting && !isExpired;

      return isExpiredCheck
        ? timeMap.expired()
        : isExecutingCheck
        ? timeMap.executing()
        : timeMap.countdown();
    };

    return getCountdownDisplay();
  };

  const getTriggerDisplay = (order: ScheduledOrder) => {
    const triggerMap = {
      time_based: () => formatDateTime(order.scheduled_at || ""),
      price_based: () =>
        `${
          TRIGGER_DISPLAY_MAP[
            order.trigger_condition as keyof typeof TRIGGER_DISPLAY_MAP
          ]
        } ${order.trigger_price}`,
    };

    const triggerHandler =
      triggerMap[order.schedule_type as keyof typeof triggerMap];
    return triggerHandler ? triggerHandler() : "Unknown";
  };

  const getOrderDisplay = (order: ScheduledOrder) => {
    const orderMap = {
      market: () => `${order.side === "buy" ? "Buy" : "Sell"} @ Market`,
      limit: () => `${order.side === "buy" ? "Buy" : "Sell"} @ ${order.price}`,
    };

    const orderHandler = orderMap[order.order_type as keyof typeof orderMap];
    return orderHandler ? orderHandler() : "Unknown";
  };

  // Define translated column labels and stable data keys BEFORE using them
  const columns = [
    t("columns.id"),
    t("columns.symbol"),
    t("columns.type"),
    t("columns.side"),
    t("columns.trigger"),
    t("columns.order"),
    t("columns.amount"),
    t("columns.tpsl"),
    t("columns.countdown"),
    t("columns.status"),
    t("columns.action"),
  ] as const;
  const dataKeys = [
    "ID",
    "Symbol",
    "Type",
    "Side",
    "Trigger",
    "Order",
    "Amount",
    "TP/SL",
    "Countdown",
    "Status",
    "Action",
  ] as const;

  const processedData =
    ordersData?.data?.map((order: ScheduledOrder) => ({
      _id: order.id, // internal id for actions
      [dataKeys[0]]: order.id.slice(0, 8),
      [dataKeys[1]]: order.symbol,
      [dataKeys[2]]:
        order.order_type.charAt(0).toUpperCase() + order.order_type.slice(1),
      [dataKeys[3]]: order.side.charAt(0).toUpperCase() + order.side.slice(1),
      [dataKeys[6]]: order.quantity,
      [dataKeys[4]]: getTriggerDisplay(order),
      [dataKeys[5]]: getOrderDisplay(order),
      [dataKeys[7]]: (
        <ScheduledTpSlIndicator
          order={order}
          onEdit={() => {
            // Prevent editing executed or cancelled orders
            const statusLower = order.status?.toLowerCase();
            if (statusLower === "executed" || statusLower === "cancelled") {
              return;
            }
            setEditingOrder(order);
            setEditDialogOpen(true);
          }}
        />
      ),
      [dataKeys[8]]:
        order.schedule_type === "time_based"
          ? calculateCountdown(order.scheduled_at || "")
          : "Monitoring",
      [dataKeys[9]]: (
        <StatusBadge
          status={
            STATUS_DISPLAY_MAP[order.status as keyof typeof STATUS_DISPLAY_MAP]
          }
        />
      ),
      [dataKeys[10]]:
        order.status === "pending" || order.status === "watching" ? (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            className="action-btn h-6 px-4 text-xs"
            onClick={() => {
              setTargetOrderId(order.id);
              setConfirmOpen(true);
            }}
          >
            Cancel
          </Button>
        ) : (
          <span className="text-muted-foreground">Done</span>
        ),
    })) || [];

  const handleRowClick = (_row: Record<string, unknown>) => {};

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-muted-foreground">{t("loading")}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-destructive">{t("errors.failed")}</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-hidden">
        <SimpleTable
          columns={columns}
          dataKeys={dataKeys as unknown as string[]}
          data={processedData}
          emptyStateText={t("empty.noScheduled")}
          onRowClick={handleRowClick}
          widenMatchers={[t("columns.symbol"), t("columns.countdown")]}
          narrowMatchers={[
            t("columns.action"),
            t("columns.status"),
            t("columns.id"),
            t("columns.tpsl"),
          ]}
          showFilters={true}
          filterableColumns={["Symbol", "Side", "Type", "Status"]}
        />
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="rounded-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("dialog.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="rounded-md"
              onClick={() => setConfirmOpen(false)}
            >
              {t("dialog.keep")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white rounded-md hover:bg-destructive/90"
              onClick={async () => {
                if (targetOrderId) {
                  await handleCancelOrder(targetOrderId);
                }
                setConfirmOpen(false);
                setTargetOrderId(null);
              }}
            >
              {t("dialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {editingOrder && editingOrder.status?.toLowerCase() !== "executed" && (
        <EditOrderTpSlDialog
          key={editingOrder.id}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          order={{
            id: editingOrder.id,
            symbol: editingOrder.symbol,
            side: editingOrder.side as "buy" | "sell",
            price: editingOrder.price,
            quantity: editingOrder.quantity,
            tp_enabled: editingOrder.tp_enabled,
            sl_enabled: editingOrder.sl_enabled,
            take_profit_price: editingOrder.take_profit_price,
            stop_loss_price: editingOrder.stop_loss_price,
          }}
          roomId={roomId}
          orderType="scheduled"
          onSuccess={() => {
            queryClient.invalidateQueries({
              queryKey: ["scheduled-orders", roomId],
            });
            setEditingOrder(null);
          }}
        />
      )}
    </div>
  );
}
