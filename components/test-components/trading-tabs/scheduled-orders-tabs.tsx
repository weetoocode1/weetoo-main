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

// TP/SL status indicator for scheduled orders
const ScheduledTpSlIndicator = ({ order }: { order: ScheduledOrder }) => {
  const hasTp = order.tp_enabled && order.take_profit_price;
  const hasSl = order.sl_enabled && order.stop_loss_price;

  if (!hasTp && !hasSl)
    return <span className="text-gray-500 text-xs">No TP/SL</span>;

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
  const [currentTime, setCurrentTime] = useState(new Date());
  const { data: ordersData, isLoading, error } = useScheduledOrders(roomId);
  const cancelOrderMutation = useCancelScheduledOrder(roomId);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [targetOrderId, setTargetOrderId] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleCancelOrder = async (orderId: string) => {
    try {
      await cancelOrderMutation.mutateAsync(orderId);
      toast.success("Scheduled order cancelled successfully");
    } catch (_error) {
      toast.error("Failed to cancel scheduled order");
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
      expired: () => "Expired",
      executing: () => "Executing...",
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

  const processedData =
    ordersData?.data?.map((order: ScheduledOrder) => ({
      // Keep full id for actions, show short id in the table
      _id: order.id,
      id: order.id.slice(0, 8),
      symbol: order.symbol,
      type:
        order.order_type.charAt(0).toUpperCase() + order.order_type.slice(1),
      side: order.side.charAt(0).toUpperCase() + order.side.slice(1),
      price: order.price || "Market",
      amount: order.quantity,
      trigger: getTriggerDisplay(order),
      order: getOrderDisplay(order),
      "TP/SL": <ScheduledTpSlIndicator order={order} />,
      countdown:
        order.schedule_type === "time_based"
          ? calculateCountdown(order.scheduled_at || "")
          : "Monitoring",
      status: (
        <StatusBadge
          status={
            STATUS_DISPLAY_MAP[order.status as keyof typeof STATUS_DISPLAY_MAP]
          }
        />
      ),
      action:
        order.status === "pending" || order.status === "watching" ? (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            className="h-6 px-4 text-xs"
            data-grid-no-drag
            draggable={false}
            onMouseDown={(e) => {
              e.stopPropagation(); // Stop event bubbling up to parent grid item
              e.preventDefault(); // Prevent default browser drag behavior
              // This is crucial - prevents react-grid-layout from detecting drag initiation
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setTargetOrderId(order.id);
              setConfirmOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                setTargetOrderId(order.id);
                setConfirmOpen(true);
              }
            }}
          >
            Cancel
          </Button>
        ) : (
          <span className="text-muted-foreground">Done</span>
        ),
    })) || [];

  const columns = [
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

  const handleRowClick = (_row: Record<string, unknown>) => {};

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-muted-foreground">Loading scheduled orders...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-destructive">Failed to load scheduled orders</div>
      </div>
    );
  }

  return (
    <div
      className="h-full flex flex-col"
      onMouseDown={(e) => {
        // Only stop propagation if the event target is NOT the cancel button or its immediate children.
        const target = e.target as HTMLElement;
        const isCancelButton = target.closest(
          'button[data-grid-no-drag][type="button"]'
        );
        if (!isCancelButton) {
          e.stopPropagation();
        }
      }}
      data-grid-no-drag
    >
      <div className="flex-1 overflow-hidden">
        <SimpleTable
          columns={columns}
          data={processedData}
          emptyStateText="No Scheduled Orders"
          onRowClick={handleRowClick}
          widenMatchers={["Symbol", "Countdown"]}
          narrowMatchers={["Action", "Status", "ID", "TP/SL"]}
          showFilters={true}
          filterableColumns={["Symbol", "Side", "Type", "Status"]}
        />
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="rounded-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel scheduled order?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the scheduled order. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="rounded-md"
              onClick={() => setConfirmOpen(false)}
            >
              Keep
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
              Confirm Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
