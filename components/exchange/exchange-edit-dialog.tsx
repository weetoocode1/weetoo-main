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
import { Check, Edit3, Info, Save, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
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
  // const [newTag, setNewTag] = useState("");

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
      // Ensure at least BASIC tag if tags are empty or not set
      const tags = (editedExchange.tags || [])
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
      const deduped = Array.from(new Set(tags));

      const payload: Exchange = {
        ...editedExchange,
        tags: deduped.length === 0 ? ["BASIC"] : deduped,
      };

      await onSave(payload);
      toast.success(t("toast.updated", { name: editedExchange.name }));
      onOpenChange(false);
    } catch (_error) {
      toast.error(t("toast.updateFailed"));
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

  // const addTag = () => {};
  // const removeTag = (_tag: string) => {};

  const predefinedTagOptions: { id: string; i18nKey: string }[] = [
    { id: "TOP", i18nKey: "customTags.top" },
    { id: "HIGH", i18nKey: "customTags.high" },
    { id: "PREMIUM", i18nKey: "customTags.premium" },
    { id: "LEADER", i18nKey: "customTags.leader" },
    { id: "TRENDING", i18nKey: "customTags.trending" },
    { id: "FAST", i18nKey: "customTags.fast" },
    { id: "BASIC", i18nKey: "customTags.basic" },
    { id: "FEATURED", i18nKey: "customTags.featured" },
    { id: "NEW", i18nKey: "customTags.new" },
    { id: "POPULAR", i18nKey: "customTags.popular" },
    { id: "LIMITED_OFFER", i18nKey: "customTags.limited_offer" },
    { id: "EXCLUSIVE", i18nKey: "customTags.exclusive" },
    { id: "RECOMMENDED", i18nKey: "customTags.recommended" },
    { id: "BEST_SELLER", i18nKey: "customTags.best_seller" },
  ];

  const togglePredefinedTag = (tagId: string) => {
    setEditedExchange((prev) => {
      if (!prev) return prev;
      const current = prev.tags || [];
      const has = current.includes(tagId);
      const nextTags = has
        ? current.filter((t) => t !== tagId)
        : current.length >= 4
        ? current
        : [...current, tagId];
      const next: Exchange = { ...prev, tags: nextTags };
      return next;
    });
  };

  const getTagSelectedClasses = (tagId: string) => {
    const map: Record<string, string> = {
      TOP: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700/40",
      HIGH: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700/40",
      PREMIUM:
        "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700/40",
      LEADER:
        "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-700/40",
      TRENDING:
        "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700/40",
      FAST: "bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-900/20 dark:text-cyan-300 dark:border-cyan-700/40",
      BASIC: "bg-muted/30 text-foreground border-border/50",
      FEATURED:
        "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-700/40",
      NEW: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700/40",
      POPULAR:
        "bg-pink-100 text-pink-800 border-pink-300 dark:bg-pink-900/20 dark:text-pink-300 dark:border-pink-700/40",
      LIMITED_OFFER:
        "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-700/40",
      EXCLUSIVE:
        "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-900/20 dark:text-slate-300 dark:border-slate-700/40",
      RECOMMENDED:
        "bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-700/40",
      BEST_SELLER:
        "bg-yellow-100 text-yellow-900 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-700/40",
    };
    return map[tagId] || "bg-primary/10 text-primary border-primary/40";
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
                                {t("paybackRate")} ({editedExchange.paybackRate}
                                %):
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
                                {t("fees")} (
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

            {/* Tags moved below main fields */}

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

            {/* Tags Management (bottom) */}
            <div className="space-y-3 pt-2">
              <h3 className="text-lg font-semibold border-b pb-2">
                {t("tags")}
              </h3>
              <div className="flex flex-wrap gap-2">
                {predefinedTagOptions.map((opt) => {
                  const selected = (editedExchange.tags || []).includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => togglePredefinedTag(opt.id)}
                      className={`group relative inline-flex items-center justify-between px-3.5 py-1.5 text-xs font-medium border rounded-none transition-all h-10 focus:outline-none focus:ring-2 focus:ring-primary/50 whitespace-nowrap ${
                        selected
                          ? getTagSelectedClasses(opt.id)
                          : "bg-transparent text-muted-foreground border-border/40 hover:bg-muted/20 hover:text-foreground hover:border-border/60"
                      }`}
                      aria-pressed={selected}
                    >
                      <span>{t(opt.i18nKey as string)}</span>
                      <span
                        className={`ml-2 inline-flex h-4 w-4 items-center justify-center border transition-colors ${
                          selected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-transparent text-transparent border-border/60 group-hover:text-muted-foreground"
                        }`}
                        aria-hidden="true"
                      >
                        <Check className="h-3 w-3" />
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">{t("tagsHelp")}</p>
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
