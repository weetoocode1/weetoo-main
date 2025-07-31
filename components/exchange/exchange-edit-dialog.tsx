"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Edit3, Info, Save, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { type Exchange } from "./exchanges-data";

interface ExchangeEditDialogProps {
  exchange: Exchange | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (exchange: Exchange) => void;
}

export function ExchangeEditDialog({
  exchange,
  open,
  onOpenChange,
  onSave,
}: ExchangeEditDialogProps) {
  const t = useTranslations("exchange");
  const [editedExchange, setEditedExchange] = useState<Exchange | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize edited exchange when dialog opens
  useEffect(() => {
    if (exchange && open) {
      setEditedExchange({ ...exchange });
    }
  }, [exchange, open]);

  const handleSave = async () => {
    if (!editedExchange) return;

    setIsLoading(true);
    try {
      // Here you would typically save to your backend/database
      await onSave(editedExchange);
      toast.success(`Updated ${editedExchange.name} successfully`);
      onOpenChange(false);
    } catch (_error) {
      toast.error("Failed to update exchange");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditedExchange(exchange ? { ...exchange } : null);
    onOpenChange(false);
  };

  const handleInputChange = (
    field: keyof Exchange,
    value: string | number | string[]
  ) => {
    if (!editedExchange) return;

    setEditedExchange({
      ...editedExchange,
      [field]: value,
    });
  };

  // Calculate score breakdown
  const calculateScoreBreakdown = (exchange: Exchange) => {
    const paybackPoints = Math.min(exchange.paybackRate * 0.4, 40);
    const discountPoints = exchange.tradingDiscount !== "-" ? 20 : 0;
    const totalFees =
      parseFloat(exchange.limitOrderFee.replace("%", "")) +
      parseFloat(exchange.marketOrderFee.replace("%", ""));
    const feePoints = Math.max(0, 20 - totalFees * 2);
    const eventPoints = exchange.event && exchange.event !== "-" ? 20 : 0;
    const totalScore = Math.round(
      paybackPoints + discountPoints + feePoints + eventPoints
    );

    return {
      paybackPoints: Math.round(paybackPoints),
      discountPoints,
      feePoints: Math.round(feePoints),
      eventPoints,
      totalScore,
    };
  };

  if (!exchange || !editedExchange) return null;

  const scoreBreakdown = calculateScoreBreakdown(editedExchange);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[70vh] flex flex-col">
        {/* Fixed Header */}
        <DialogHeader className="flex-shrink-0 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="w-5 h-5" />
            {t("editExchange")}: {exchange.name}
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable Content */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-6 pr-4 pb-4">
            {/* Score Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">
                {t("scoreInformation")}
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>{t("currentScore")}</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                        >
                          <Info className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="w-64">
                        <div className="space-y-2">
                          <div className="font-semibold">
                            {t("scoreCalculation")}
                          </div>
                          <div className="text-xs space-y-1">
                            <div className="flex justify-between">
                              <span>
                                Payback Rate ({editedExchange.paybackRate}%):
                              </span>
                              <span className="font-mono">
                                +{scoreBreakdown.paybackPoints} pts
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>{t("tradingDiscount")}:</span>
                              <span className="font-mono">
                                +{scoreBreakdown.discountPoints} pts
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>
                                Fees (
                                {(
                                  parseFloat(
                                    editedExchange.limitOrderFee.replace(
                                      "%",
                                      ""
                                    )
                                  ) +
                                  parseFloat(
                                    editedExchange.marketOrderFee.replace(
                                      "%",
                                      ""
                                    )
                                  )
                                ).toFixed(3)}
                                %):
                              </span>
                              <span className="font-mono">
                                +{scoreBreakdown.feePoints} pts
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>{t("eventBonus")}:</span>
                              <span className="font-mono">
                                +{scoreBreakdown.eventPoints} pts
                              </span>
                            </div>
                            <div className="border-t pt-1 mt-1">
                              <div className="flex justify-between font-semibold">
                                <span>{t("total")}:</span>
                                <span className="font-mono">
                                  {scoreBreakdown.totalScore} pts
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {scoreBreakdown.totalScore} {t("points")}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("scoreAutoCalculated")}
                </div>
              </div>
            </div>

            {/* Trading Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">
                {t("tradingInformation")}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="paybackRate">{t("paybackRatePercent")}</Label>
                  <Input
                    id="paybackRate"
                    type="number"
                    min="0"
                    max="100"
                    value={editedExchange.paybackRate}
                    onChange={(e) =>
                      handleInputChange(
                        "paybackRate",
                        parseInt(e.target.value) || 0
                      )
                    }
                    placeholder="0-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tradingDiscount">
                    {t("tradingDiscount")}
                  </Label>
                  <Input
                    id="tradingDiscount"
                    value={editedExchange.tradingDiscount}
                    onChange={(e) =>
                      handleInputChange("tradingDiscount", e.target.value)
                    }
                    placeholder="e.g., 15%"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="limitOrderFee">{t("limitOrderFee")}</Label>
                  <Input
                    id="limitOrderFee"
                    value={editedExchange.limitOrderFee}
                    onChange={(e) =>
                      handleInputChange("limitOrderFee", e.target.value)
                    }
                    placeholder="e.g., 0.024%"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="marketOrderFee">{t("marketOrderFee")}</Label>
                  <Input
                    id="marketOrderFee"
                    value={editedExchange.marketOrderFee}
                    onChange={(e) =>
                      handleInputChange("marketOrderFee", e.target.value)
                    }
                    placeholder="e.g., 0.045%"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="averageRebatePerUser">
                  {t("averageRebatePerUser")}
                </Label>
                <Input
                  id="averageRebatePerUser"
                  value={editedExchange.averageRebatePerUser}
                  onChange={(e) =>
                    handleInputChange("averageRebatePerUser", e.target.value)
                  }
                  placeholder="e.g., $2,450"
                />
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 flex justify-end gap-3 pt-6 border-t mt-4">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
            className="h-10 cursor-pointer"
          >
            <X className="w-4 h-4 mr-2" />
            {t("cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading}
            className="h-10 cursor-pointer"
          >
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? t("saving") : t("saveChanges")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
