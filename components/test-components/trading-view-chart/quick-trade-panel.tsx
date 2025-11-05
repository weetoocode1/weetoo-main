"use client";

import { Input } from "@/components/ui/input";
import { useTickerData } from "@/hooks/websocket/use-market-data";
import type { Symbol } from "@/types/market";
import { GripVertical, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface QuickTradePanelProps {
  parentRef: React.RefObject<HTMLDivElement | null>;
  symbol?: string; // pass TV symbol like BTCUSDT
  roomId?: string; // current room id for API
}

export function QuickTradePanel({
  parentRef,
  symbol,
  roomId,
}: QuickTradePanelProps) {
  const t = useTranslations("trade.quick");
  const panelRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [qty, setQty] = useState<string>("");
  const [, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const livePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const startRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const originRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pendingRef = useRef<{ x: number; y: number } | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const boundsRef = useRef<{
    parentW: number;
    parentH: number;
    panelW: number;
    panelH: number;
  }>({ parentW: 0, parentH: 0, panelW: 0, panelH: 0 });

  // Dialog state
  const [showDialog, setShowDialog] = useState(false);
  const [dialogData, setDialogData] = useState<{
    side: "long" | "short";
    price: number;
    qty: number;
  } | null>(null);

  const currentSymbol = symbol || "BTCUSDT";
  const ticker = useTickerData(currentSymbol as Symbol);
  
  // Persist last price to prevent flickering
  const lastPriceRef = useRef<number>(0);
  useEffect(() => {
    if (ticker?.lastPrice && ticker.lastPrice !== "0" && ticker.lastPrice !== "") {
      const p = parseFloat(ticker.lastPrice);
      if (Number.isFinite(p) && p > 0) {
        lastPriceRef.current = p;
      }
    }
  }, [ticker?.lastPrice]);
  
  const lastPrice = useMemo(() => {
    const p = ticker?.lastPrice && ticker.lastPrice !== "0" && ticker.lastPrice !== ""
      ? parseFloat(ticker.lastPrice)
      : lastPriceRef.current;
    return Number.isFinite(p) && p > 0 ? p : lastPriceRef.current;
  }, [ticker?.lastPrice]);

  // Handle trade button clicks
  const handleTradeClick = (side: "long" | "short") => {
    const qtyNum = parseFloat(qty) || 0;
    if (qtyNum <= 0) {
      toast.error(t("errors.qtyInvalid"), {
        description: t("errors.qtyGreaterThanZero"),
      });
      return;
    }

    setDialogData({
      side,
      price: lastPrice,
      qty: qtyNum,
    });
    setShowDialog(true);
  };

  const handleConfirmTrade = async () => {
    if (!dialogData) return;
    try {
      if (!roomId) {
        toast.error(t("errors.missingRoomContext"));
        return;
      }
      const resp = await fetch(`/api/trading-room/${roomId}/positions/open`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: currentSymbol,
          side: dialogData.side,
          quantity: dialogData.qty,
          entryPrice: dialogData.price,
          leverage: 1,
          orderType: "market",
        }),
      });
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}));
        throw new Error(j?.error || t("errors.openFailed"));
      }
      toast.success(
        t("toasts.placed", {
          side:
            dialogData.side === "long" ? t("common.long") : t("common.short"),
        }),
        {
          description: t("toasts.placedDesc", {
            qty: dialogData.qty,
            symbol: currentSymbol,
            price: dialogData.price.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
          }),
        }
      );
    } catch (e) {
      toast.error(t("errors.orderFailed"), {
        description:
          e instanceof Error ? e.message : t("errors.unexpectedOpenError"),
      });
    } finally {
      setShowDialog(false);
      setDialogData(null);
    }
  };

  const handleCancelTrade = () => {
    setShowDialog(false);
    setDialogData(null);
  };

  useEffect(() => {
    const centerPanel = () => {
      const parent = parentRef.current;
      const el = panelRef.current;
      if (!parent || !el) return;

      const pb = parent.getBoundingClientRect();
      const wb = el.getBoundingClientRect();

      // Only center if parent has reasonable dimensions
      if (pb.width > 100 && pb.height > 100) {
        const initial = {
          x: Math.max(8, (pb.width - wb.width) / 2),
          y: Math.max(8, (pb.height - wb.height) / 2),
        };
        livePosRef.current = initial;
        setPos(initial);
        el.style.transform = `translate3d(${initial.x}px, ${initial.y}px, 0)`;
      }
    };

    // Center immediately
    centerPanel();

    // Also center after a short delay to ensure TradingView is rendered
    const timeoutId = setTimeout(centerPanel, 100);

    // Center on window resize
    window.addEventListener("resize", centerPanel);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", centerPanel);
    };
  }, [parentRef]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || !isOpen) return null;

  const clampWithinParent = (x: number, y: number) => {
    const { parentW, parentH, panelW, panelH } = boundsRef.current;
    if (parentW && parentH && panelW && panelH) {
      const maxX = Math.max(0, parentW - panelW - 8);
      const maxY = Math.max(0, parentH - panelH - 8);
      return {
        x: Math.min(Math.max(8, x), maxX),
        y: Math.min(Math.max(8, y), maxY),
      };
    }
    const parent = parentRef.current;
    const panel = panelRef.current;
    if (!parent || !panel) return { x, y };
    const pb = parent.getBoundingClientRect();
    const wb = panel.getBoundingClientRect();
    const maxX = Math.max(0, pb.width - wb.width - 8);
    const maxY = Math.max(0, pb.height - wb.height - 8);
    return {
      x: Math.min(Math.max(8, x), maxX),
      y: Math.min(Math.max(8, y), maxY),
    };
  };

  const onDragStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const panel = panelRef.current;
    if (!panel) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const parent = parentRef.current;
    if (parent) {
      const pb = parent.getBoundingClientRect();
      const wb = panel.getBoundingClientRect();
      boundsRef.current = {
        parentW: pb.width,
        parentH: pb.height,
        panelW: wb.width,
        panelH: wb.height,
      };
    }
    startRef.current = { x: e.clientX, y: e.clientY };
    originRef.current = { ...livePosRef.current };
    window.addEventListener("pointermove", onDragMove);
    window.addEventListener("pointerup", onDragEnd, { once: true });
  };

  const onDragMove = (e: PointerEvent) => {
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    const next = clampWithinParent(
      originRef.current.x + dx,
      originRef.current.y + dy
    );
    pendingRef.current = next;
    if (rafIdRef.current == null) {
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        if (!pendingRef.current) return;
        const p = pendingRef.current;
        livePosRef.current = p;
        const el = panelRef.current;
        if (el) el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
      });
    }
  };

  const onDragEnd = () => {
    window.removeEventListener("pointermove", onDragMove);
    setPos(livePosRef.current);
  };

  return (
    <div
      ref={panelRef}
      className="absolute z-40 select-none quick-trade-panel no-rgl-drag lg:block hidden"
      style={{ left: 0, top: 0, touchAction: "none", willChange: "transform" }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-stretch bg-background/95 border border-border rounded-md shadow-md overflow-hidden">
        {/* Drag handle */}
        <button
          type="button"
          aria-label={t("aria.drag")}
          onPointerDown={onDragStart}
          className="qt-drag-handle px-2 bg-muted/40 hover:bg-muted flex items-center justify-center cursor-grab"
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Long */}
        <button
          type="button"
          onClick={() => handleTradeClick("long")}
          onMouseDown={(e) => e.stopPropagation()}
          className="px-3 py-2 bg-profit/20 text-foreground hover:bg-profit/30 transition-colors cursor-pointer"
        >
          <div className="text-[11px] font-medium">
            {t("buttons.marketLong")}
          </div>
          <div className="text-[13px] font-semibold tabular-nums font-mono">
            {lastPrice.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </button>

        {/* Qty input */}
        <div className="px-3 py-2 border-l border-r border-border bg-muted/20 text-foreground flex items-center justify-center">
          <Input
            type="number"
            inputMode="decimal"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            className="h-7 w-24 text-xs text-center border-none px-2 tabular-nums font-mono focus:outline-none focus:ring-0 [appearance:textfield] !bg-transparent [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            placeholder={t("inputs.qtyPlaceholder")}
          />
        </div>

        {/* Short */}
        <button
          type="button"
          onClick={() => handleTradeClick("short")}
          onMouseDown={(e) => e.stopPropagation()}
          className="px-3 py-2 bg-loss/20 text-foreground hover:bg-loss/30 transition-colors cursor-pointer"
        >
          <div className="text-[11px] font-medium">
            {t("buttons.marketShort")}
          </div>
          <div className="text-[13px] font-semibold tabular-nums font-mono">
            {lastPrice.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </button>

        {/* Close */}
        <button
          type="button"
          aria-label={t("aria.close")}
          onClick={() => setIsOpen(false)}
          className="px-2 bg-muted/40 hover:bg-muted flex items-center justify-center cursor-pointer"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Confirmation Dialog */}
      {showDialog && dialogData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background border border-border rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{t("dialog.title")}</h3>
              <button
                type="button"
                onClick={handleCancelTrade}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Trade Details */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("dialog.symbol")}
                </span>
                <span className="font-mono">{currentSymbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("dialog.side")}
                </span>
                <span
                  className={`font-semibold ${
                    dialogData.side === "long" ? "text-profit" : "text-loss"
                  }`}
                >
                  {dialogData.side === "long"
                    ? t("common.long")
                    : t("common.short")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("dialog.orderType")}
                </span>
                <span className="font-mono">{t("common.market")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("dialog.price")}
                </span>
                <span className="font-mono">
                  {dialogData.price.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("dialog.quantity")}
                </span>
                <span className="font-mono">{dialogData.qty}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("dialog.orderValue")}
                </span>
                <span className="font-mono">
                  {(dialogData.price * dialogData.qty).toLocaleString(
                    undefined,
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }
                  )}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCancelTrade}
                className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded-md hover:bg-muted/80 transition-colors"
              >
                {t("buttons.cancel")}
              </button>
              <button
                type="button"
                onClick={handleConfirmTrade}
                className={`flex-1 px-4 py-2 rounded-md font-semibold transition-colors ${
                  dialogData.side === "long"
                    ? "bg-profit text-white hover:bg-profit/90"
                    : "bg-loss text-white hover:bg-loss/90"
                }`}
              >
                {t("buttons.confirmWithSide", {
                  side:
                    dialogData.side === "long"
                      ? t("common.long")
                      : t("common.short"),
                })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
