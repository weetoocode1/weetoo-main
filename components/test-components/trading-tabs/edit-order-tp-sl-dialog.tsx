"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangleIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

interface EditOrderTpSlDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: {
    id: string;
    symbol: string;
    side: "long" | "short" | "buy" | "sell";
    limit_price?: number;
    price?: number;
    quantity: number;
    tp_enabled?: boolean;
    sl_enabled?: boolean;
    take_profit_price?: number;
    stop_loss_price?: number;
  };
  roomId: string;
  orderType: "open" | "scheduled";
  onSuccess?: () => void;
}

export function EditOrderTpSlDialog({
  open,
  onOpenChange,
  order,
  roomId,
  orderType,
  onSuccess,
}: EditOrderTpSlDialogProps) {
  const t = useTranslations("trading.orders.editTpSl");
  const [tpEnabled, setTpEnabled] = useState(false);
  const [slEnabled, setSlEnabled] = useState(false);
  const [tpPrice, setTpPrice] = useState<string>("");
  const [slPrice, setSlPrice] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{ tp?: string; sl?: string }>({});

  // Lock body scroll only while dialog is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Initialize fields only when opening for a given order id
  useEffect(() => {
    if (!open) return;
    if (!order) return;
    setTpEnabled(order.tp_enabled || false);
    setSlEnabled(order.sl_enabled || false);
    setTpPrice(
      order.take_profit_price ? order.take_profit_price.toString() : ""
    );
    setSlPrice(order.stop_loss_price ? order.stop_loss_price.toString() : "");
    setErrors({});
  }, [open, order?.id]);

  const validateInputs = () => {
    const newErrors: { tp?: string; sl?: string } = {};
    const referencePrice = order.limit_price || order.price || 0;
    const isLong = order.side === "long" || order.side === "buy";

    if (tpEnabled) {
      const tp = Number(tpPrice);
      if (!tpPrice || isNaN(tp) || tp <= 0) {
        newErrors.tp = t("errors.tpPriceRequired");
      } else if (isLong && tp <= referencePrice) {
        newErrors.tp = t("errors.tpLongInvalid", { referencePrice });
      } else if (!isLong && tp >= referencePrice) {
        newErrors.tp = t("errors.tpShortInvalid", { referencePrice });
      }
    }

    if (slEnabled) {
      const sl = Number(slPrice);
      if (!slPrice || isNaN(sl) || sl <= 0) {
        newErrors.sl = t("errors.slPriceRequired");
      } else if (isLong && sl >= referencePrice) {
        newErrors.sl = t("errors.slLongInvalid", { referencePrice });
      } else if (!isLong && sl <= referencePrice) {
        newErrors.sl = t("errors.slShortInvalid", { referencePrice });
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateInputs()) {
      toast.error(t("errors.fixErrors"));
      return;
    }

    setIsSaving(true);
    try {
      const endpoint =
        orderType === "open"
          ? `/api/trading-room/${roomId}/open-orders/${order.id}/tpsl`
          : `/api/trading-room/${roomId}/scheduled-orders/${order.id}/tpsl`;

      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tp_enabled: tpEnabled,
          sl_enabled: slEnabled,
          take_profit_price: tpEnabled && tpPrice ? Number(tpPrice) : null,
          stop_loss_price: slEnabled && slPrice ? Number(slPrice) : null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t("errors.saveFailed"));
      }

      toast.success(t("toasts.saveSuccess"));
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error updating TP/SL:", error);
      toast.error(
        error instanceof Error ? error.message : t("errors.saveFailed")
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleTpInputChange = (value: string) => {
    if (value === "") {
      setTpPrice("");
      return;
    }

    if (value === "0." || value.endsWith(".") || /^0\.0*$/.test(value)) {
      setTpPrice(value);
      return;
    }

    const num = Number(value);
    if (isNaN(num)) {
      return;
    }

    setTpPrice(value);
    if (errors.tp) {
      setErrors((prev) => ({ ...prev, tp: undefined }));
    }
  };

  const handleSlInputChange = (value: string) => {
    if (value === "") {
      setSlPrice("");
      return;
    }

    if (value === "0." || value.endsWith(".") || /^0\.0*$/.test(value)) {
      setSlPrice(value);
      return;
    }

    const num = Number(value);
    if (isNaN(num)) {
      return;
    }

    setSlPrice(value);
    if (errors.sl) {
      setErrors((prev) => ({ ...prev, sl: undefined }));
    }
  };

  const referencePrice = order.limit_price || order.price || 0;
  const priceLabel = order.limit_price
    ? t("labels.limitPrice")
    : order.price
    ? t("labels.price")
    : t("labels.triggerPrice");
  const sideLabel =
    order.side === "long" || order.side === "buy"
      ? t("labels.longBuy")
      : t("labels.shortSell");
  const isLong = order.side === "long" || order.side === "buy";

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={() => onOpenChange(false)}
    >
      <div className="absolute inset-0 bg-background/50 backdrop-blur-sm" />

      <div className="relative z-50 w-full max-w-lg mx-4 bg-background border border-border rounded-lg p-6 shadow-lg animate-in fade-in-0 zoom-in-95">
        <div className="p-0 mb-5 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{t("title")}</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted focus:outline-none focus:ring-2 focus:ring-border cursor-pointer"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 mb-5">
          <p className="text-sm text-muted-foreground">
            {t("description", {
              side: sideLabel,
              orderType:
                orderType === "open"
                  ? t("labels.limitOrder")
                  : t("labels.scheduledOrder"),
              symbol: order.symbol,
            })}
            <br />
            <span className="text-xs text-muted-foreground mt-1 block">
              {priceLabel}: ${referencePrice.toFixed(2)} |{" "}
              {t("labels.quantity")}: {order.quantity}
            </span>
          </p>
          <div className="flex items-center gap-x-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-order-tp-enabled"
                checked={tpEnabled}
                onCheckedChange={(checked) => {
                  setTpEnabled(checked === true);
                  if (!checked) {
                    setTpPrice("");
                    setErrors((prev) => ({ ...prev, tp: undefined }));
                  }
                }}
                className="cursor-pointer"
              />
              <Label
                htmlFor="edit-order-tp-enabled"
                className="text-sm font-medium cursor-pointer"
              >
                {t("labels.takeProfit")}
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-order-sl-enabled"
                checked={slEnabled}
                onCheckedChange={(checked) => {
                  setSlEnabled(checked === true);
                  if (!checked) {
                    setSlPrice("");
                    setErrors((prev) => ({ ...prev, sl: undefined }));
                  }
                }}
                className="cursor-pointer"
              />
              <Label
                htmlFor="edit-order-sl-enabled"
                className="text-sm font-medium cursor-pointer"
              >
                {t("labels.stopLoss")}
              </Label>
            </div>
          </div>

          {tpEnabled && (
            <div className="space-y-2">
              <Label htmlFor="edit-order-tp-price" className="text-sm">
                {t("labels.tpPrice")}
                {isLong && (
                  <span className="text-xs text-muted-foreground ml-2">
                    {t("hints.tpLongMustBe", {
                      price: referencePrice.toFixed(2),
                    })}
                  </span>
                )}
                {!isLong && (
                  <span className="text-xs text-muted-foreground ml-2">
                    {t("hints.tpShortMustBe", {
                      price: referencePrice.toFixed(2),
                    })}
                  </span>
                )}
              </Label>
              <Input
                id="edit-order-tp-price"
                type="number"
                step="any"
                inputMode="decimal"
                value={tpPrice}
                onChange={(e) => handleTpInputChange(e.target.value)}
                placeholder={t("placeholders.tpPrice")}
                className={`h-10 ${
                  errors.tp
                    ? "border-destructive focus-visible:ring-destructive"
                    : ""
                }`}
              />
              {errors.tp && (
                <p className="text-xs text-destructive">{errors.tp}</p>
              )}
            </div>
          )}

          {slEnabled && (
            <div className="space-y-2">
              <Label htmlFor="edit-order-sl-price" className="text-sm">
                {t("labels.slPrice")}
                {isLong && (
                  <span className="text-xs text-muted-foreground ml-2">
                    {t("hints.slLongMustBe", {
                      price: referencePrice.toFixed(2),
                    })}
                  </span>
                )}
                {!isLong && (
                  <span className="text-xs text-muted-foreground ml-2">
                    {t("hints.slShortMustBe", {
                      price: referencePrice.toFixed(2),
                    })}
                  </span>
                )}
              </Label>
              <Input
                id="edit-order-sl-price"
                type="number"
                step="any"
                inputMode="decimal"
                value={slPrice}
                onChange={(e) => handleSlInputChange(e.target.value)}
                placeholder={t("placeholders.slPrice")}
                className={`h-10 ${
                  errors.sl
                    ? "border-destructive focus-visible:ring-destructive"
                    : ""
                }`}
              />
              {errors.sl && (
                <p className="text-xs text-destructive">{errors.sl}</p>
              )}
            </div>
          )}

          {!slEnabled && (
            <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-md">
              <AlertTriangleIcon className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0" />
              <span className="text-xs text-orange-800 dark:text-orange-200">
                {t("warnings.noStopLoss")}
              </span>
            </div>
          )}
        </div>

        <div className="mt-4">
          <div className="grid w-full grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className="h-10 bg-transparent"
            >
              {t("buttons.cancel")}
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="h-10"
            >
              {isSaving ? t("buttons.saving") : t("buttons.save")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
