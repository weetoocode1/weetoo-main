"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar, Coins, Settings, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";

interface RewardRule {
  id: string;
  type: string;
  title: string;
  description: string;
  exp_per_action: number;
  kor_per_action: number;
  daily_count_limit: number;
  daily_exp_limit: number;
  daily_kor_limit: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface RewardRuleDetailsDialogProps {
  rule: RewardRule | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RewardRuleDetailsDialog({
  rule,
  open,
  onOpenChange,
}: RewardRuleDetailsDialogProps) {
  const t = useTranslations("admin.rewardRules.detailsDialog");

  if (!rule) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full lg:max-w-xl rounded-none">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{rule.title}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {t("description", { type: rule.type.replace(/_/g, " ") })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Basic Information */}
          <div className="space-y-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {t("sections.basicInfo")}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5 md:col-span-2">
                <div className="text-xs text-muted-foreground">
                  {t("fields.type")}
                </div>
                <div className="p-2.5 border border-border rounded-none bg-muted/30">
                  <span className="text-sm font-medium">
                    {rule.type.replace(/_/g, " ").toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <div className="text-xs text-muted-foreground">
                  {t("fields.description")}
                </div>
                <div className="p-2.5 border border-border rounded-none bg-muted/30">
                  <span className="text-sm leading-relaxed">
                    {rule.description || "-"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Reward Values */}
          <div className="space-y-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {t("sections.rewardValues")}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" />
                  {t("fields.expPerAction")}
                </div>
                <div className="p-2.5 border border-border rounded-none">
                  <span className="text-base font-mono font-semibold text-amber-700">
                    +{rule.exp_per_action.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Coins className="h-3.5 w-3.5" />
                  {t("fields.korPerAction")}
                </div>
                <div className="p-2.5 border border-border rounded-none">
                  <span className="text-base font-mono font-semibold text-emerald-700">
                    +{rule.kor_per_action.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Limits */}
          <div className="space-y-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {t("sections.dailyLimits")}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <div className="text-xs text-muted-foreground">
                  {t("fields.dailyCountLimit")}
                </div>
                <div className="p-2.5 border border-border rounded-none bg-muted/30">
                  <span className="text-base font-mono font-semibold">
                    {rule.daily_count_limit.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-xs text-muted-foreground">
                  {t("fields.dailyExpLimit")}
                </div>
                <div className="p-2.5 border border-border rounded-none">
                  <span className="text-base font-mono font-semibold text-amber-700">
                    {rule.daily_exp_limit.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-xs text-muted-foreground">
                  {t("fields.dailyKorLimit")}
                </div>
                <div className="p-2.5 border border-border rounded-none">
                  <span className="text-base font-mono font-semibold text-emerald-700">
                    {rule.daily_kor_limit.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="space-y-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {t("sections.timestamps")}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {t("fields.createdAt")}
                </div>
                <div className="p-2.5 border border-border rounded-none bg-muted/30">
                  <span className="text-xs">{formatDate(rule.created_at)}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {t("fields.updatedAt")}
                </div>
                <div className="p-2.5 border border-border rounded-none bg-muted/30">
                  <span className="text-xs">{formatDate(rule.updated_at)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
