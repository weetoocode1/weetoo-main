"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangleIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

interface EditPositionTpSlDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position: {
    id: string;
    symbol: string;
    side: "long" | "short";
    entry_price: number;
    quantity: number;
    tp_enabled?: boolean;
    sl_enabled?: boolean;
    take_profit_price?: number;
    stop_loss_price?: number;
  };
  roomId: string;
  onSuccess?: () => void;
}

export function EditPositionTpSlDialog({
  open,
  onOpenChange,
  position,
  roomId,
  onSuccess,
}: EditPositionTpSlDialogProps) {
  const t = useTranslations("trading.positions.editTpSl");
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

  // Initialize fields only when opening for a given position id
  useEffect(() => {
    if (!open) return;
    if (!position) return;
    setTpEnabled(position.tp_enabled || false);
    setSlEnabled(position.sl_enabled || false);
    setTpPrice(
      position.take_profit_price ? position.take_profit_price.toString() : ""
    );
    setSlPrice(
      position.stop_loss_price ? position.stop_loss_price.toString() : ""
    );
    setErrors({});
  }, [open, position?.id]);

  const validateInputs = () => {
    const newErrors: { tp?: string; sl?: string } = {};
    const entry = Number(position.entry_price);

    if (tpEnabled) {
      const tp = Number(tpPrice);
      if (!tpPrice || isNaN(tp) || tp <= 0) {
        newErrors.tp = t("errors.tpPriceRequired");
      } else if (position.side === "long" && tp <= entry) {
        newErrors.tp = t("errors.tpLongInvalid", { entryPrice });
      } else if (position.side === "short" && tp >= entry) {
        newErrors.tp = t("errors.tpShortInvalid", { entryPrice });
      }
    }

    if (slEnabled) {
      const sl = Number(slPrice);
      if (!slPrice || isNaN(sl) || sl <= 0) {
        newErrors.sl = t("errors.slPriceRequired");
      } else if (position.side === "long" && sl >= entry) {
        newErrors.sl = t("errors.slLongInvalid", { entryPrice });
      } else if (position.side === "short" && sl <= entry) {
        newErrors.sl = t("errors.slShortInvalid", { entryPrice });
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
      const response = await fetch(
        `/api/trading-room/${roomId}/positions/${position.id}/tpsl`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tp_enabled: tpEnabled,
            sl_enabled: slEnabled,
            take_profit_price: tpEnabled && tpPrice ? Number(tpPrice) : null,
            stop_loss_price: slEnabled && slPrice ? Number(slPrice) : null,
          }),
        }
      );

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

  const entryPrice = Number(position.entry_price).toFixed(2);
  const sideLabel =
    position.side === "long" ? t("labels.long") : t("labels.short");

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
              symbol: position.symbol,
              entryPrice,
              quantity: position.quantity,
            })}
          </p>
          <div className="flex items-center gap-x-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-tp-enabled"
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
                htmlFor="edit-tp-enabled"
                className="text-sm font-medium cursor-pointer"
              >
                {t("labels.takeProfit")}
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-sl-enabled"
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
                htmlFor="edit-sl-enabled"
                className="text-sm font-medium cursor-pointer"
              >
                {t("labels.stopLoss")}
              </Label>
            </div>
          </div>

          {tpEnabled && (
            <div className="space-y-2">
              <Label htmlFor="edit-tp-price" className="text-sm">
                {t("labels.tpPrice")}
                {position.side === "long" && (
                  <span className="text-xs text-muted-foreground ml-2">
                    {t("hints.tpLongMustBe", { entryPrice })}
                  </span>
                )}
                {position.side === "short" && (
                  <span className="text-xs text-muted-foreground ml-2">
                    {t("hints.tpShortMustBe", { entryPrice })}
                  </span>
                )}
              </Label>
              <Input
                id="edit-tp-price"
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
              <Label htmlFor="edit-sl-price" className="text-sm">
                {t("labels.slPrice")}
                {position.side === "long" && (
                  <span className="text-xs text-muted-foreground ml-2">
                    {t("hints.slLongMustBe", { entryPrice })}
                  </span>
                )}
                {position.side === "short" && (
                  <span className="text-xs text-muted-foreground ml-2">
                    {t("hints.slShortMustBe", { entryPrice })}
                  </span>
                )}
              </Label>
              <Input
                id="edit-sl-price"
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

          {tpEnabled && tpPrice && (
            <div className="text-xs text-muted-foreground p-2 bg-muted rounded-md">
              <strong>{t("info.tpCalculation")}</strong>{" "}
              {t("info.tpCalculationDesc", { price: tpPrice })}
            </div>
          )}

          {slEnabled && slPrice && (
            <div className="text-xs text-muted-foreground p-2 bg-muted rounded-md">
              <strong>{t("info.slCalculation")}</strong>{" "}
              {t("info.slCalculationDesc", { price: slPrice })}
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
