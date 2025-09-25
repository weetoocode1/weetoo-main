"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, Eye, MoreHorizontal, Save, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { RewardRuleDetailsDialog } from "./reward-rule-details-dialog";

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

export function RewardRulesTable() {
  const t = useTranslations("admin.rewardRules");
  const tActivity = useTranslations("admin.activityLog");
  const { computed } = useAuth();
  const [editingRule, setEditingRule] = useState<RewardRule | null>(null);
  const [viewingRule, setViewingRule] = useState<RewardRule | null>(null);
  const [editForm, setEditForm] = useState<Partial<RewardRule>>({});
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();
  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Check if user can edit (only super_admin)
  const canEdit = computed?.role === "super_admin";

  const { data: rules, isLoading } = useQuery({
    queryKey: ["admin", "reward-rules"],
    queryFn: async (): Promise<RewardRule[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("reward_rules")
        .select("*")
        .order("type", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    staleTime: 60_000,
  });

  // Derived lists for filters
  const typeOptions = Array.from(
    new Set((rules || []).map((r) => r.type))
  ).sort();

  const filteredRules = (rules || []).filter((rule) => {
    const matchesSearch = searchTerm
      ? (rule.title?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (rule.description?.toLowerCase() || "").includes(
          searchTerm.toLowerCase()
        ) ||
        rule.type.toLowerCase().includes(searchTerm.toLowerCase())
      : true;
    const matchesType = typeFilter === "all" || rule.type === typeFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" ? rule.active : !rule.active);
    return matchesSearch && matchesType && matchesStatus;
  });

  // Keyboard shortcut: Ctrl/Cmd + F to focus search
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleEdit = (rule: RewardRule) => {
    setEditingRule(rule);
    setEditForm({
      title: rule.title,
      description: rule.description,
      exp_per_action: rule.exp_per_action,
      kor_per_action: rule.kor_per_action,
      daily_count_limit: rule.daily_count_limit,
      daily_exp_limit: rule.daily_exp_limit,
      daily_kor_limit: rule.daily_kor_limit,
    });
  };

  const handleSave = async () => {
    if (!editingRule) return;

    setIsSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("reward_rules")
        .update({
          title: editForm.title,
          description: editForm.description,
          exp_per_action: editForm.exp_per_action,
          kor_per_action: editForm.kor_per_action,
          daily_count_limit: editForm.daily_count_limit,
          daily_exp_limit: editForm.daily_exp_limit,
          daily_kor_limit: editForm.daily_kor_limit,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingRule.id);

      if (error) throw error;

      toast.success(t("toast.updated"));
      queryClient.invalidateQueries({ queryKey: ["admin", "reward-rules"] });
      setEditingRule(null);
      setEditForm({});
    } catch (error) {
      console.error("Error updating reward rule:", error);
      toast.error(t("toast.updateFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingRule(null);
    setEditForm({});
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {/* Table Skeleton */}
        <div className="border border-border rounded-none">
          <div className="p-4 border-b border-border">
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="p-4 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-4 border border-border/30"
              >
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-8" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search & Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Input
            placeholder={t("table.searchPlaceholder", {
              default: "Search reward rules...",
            })}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            ref={searchInputRef}
            className="w-64 shadow-none rounded-none h-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40 shadow-none rounded-none h-10">
              <SelectValue
                placeholder={t("table.filters.allTypes", {
                  default: "All types",
                })}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("table.filters.allTypes", { default: "All types" })}
              </SelectItem>
              {typeOptions.map((type) => (
                <SelectItem key={type} value={type}>
                  {tActivity(`filters.typeNames.${type}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 shadow-none rounded-none h-10">
              <SelectValue
                placeholder={t("table.filters.allStatuses", {
                  default: "All statuses",
                })}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("table.filters.allStatuses", { default: "All statuses" })}
              </SelectItem>
              <SelectItem value="active">{t("status.active")}</SelectItem>
              <SelectItem value="inactive">{t("status.inactive")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {/* Custom Table */}
      <div className="relative">
        <div className="border border-border rounded-none">
          {/* Corner borders */}
          <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-primary pointer-events-none" />
          <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-primary pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-primary pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-primary pointer-events-none" />

          {/* Desktop Table */}
          <div className="hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/20">
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      {t("table.columns.type")}
                    </th>
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      {t("table.columns.title")}
                    </th>
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      {t("table.columns.expPerAction")}
                    </th>
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      {t("table.columns.korPerAction")}
                    </th>
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      {t("table.columns.dailyCountLimit")}
                    </th>
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      {t("table.columns.status")}
                    </th>
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      {t("table.columns.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRules &&
                    filteredRules.map((rule) => (
                      <tr
                        key={`${rule.id}-${rule.updated_at}`}
                        className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-muted-foreground">
                            {tActivity(`filters.typeNames.${rule.type}`)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium">
                            {tActivity(`filters.typeNames.${rule.type}`)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {t(`descriptions.${rule.type}`, {
                              default: rule.description || "",
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-mono text-amber-600">
                            +{rule.exp_per_action.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-mono text-emerald-600">
                            +{rule.kor_per_action.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-mono font-medium">
                            {rule.daily_count_limit.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-sm text-xs font-medium ${
                              rule.active
                                ? "bg-green-50 text-green-700 border border-green-200"
                                : "bg-red-50 text-red-700 border border-red-200"
                            }`}
                          >
                            {rule.active
                              ? t("status.active")
                              : t("status.inactive")}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">
                                    {t("table.menu.open")}
                                  </span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="w-48 rounded-none"
                              >
                                <DropdownMenuLabel>
                                  {t("table.menu.title")}
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  key="view-details"
                                  onClick={() => {
                                    setViewingRule(rule);
                                  }}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  {t("table.menu.viewDetails")}
                                </DropdownMenuItem>
                                {canEdit ? (
                                  <DropdownMenuItem
                                    key="edit-rule"
                                    onClick={() => handleEdit(rule)}
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    {t("table.menu.editRule")}
                                  </DropdownMenuItem>
                                ) : null}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden">
            <div className="space-y-4 p-4">
              {filteredRules &&
                filteredRules.map((rule) => (
                  <div
                    key={`${rule.id}-${rule.updated_at}`}
                    className="border border-border/30 rounded-none p-4 space-y-3"
                  >
                    {/* Rule Header */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{rule.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {tActivity(`filters.typeNames.${rule.type}`)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">
                                {t("table.menu.open")}
                              </span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>
                              {t("table.menu.title")}
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              key="view-details-mobile"
                              onClick={() => {
                                setViewingRule(rule);
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              {t("table.menu.viewDetails")}
                            </DropdownMenuItem>
                            {canEdit ? (
                              <DropdownMenuItem
                                key="edit-rule-mobile"
                                onClick={() => handleEdit(rule)}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                {t("table.menu.editRule")}
                              </DropdownMenuItem>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Rule Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {t("table.columns.expPerAction")}:
                        </span>
                        <span className="font-mono text-amber-600">
                          +{rule.exp_per_action.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {t("table.columns.korPerAction")}:
                        </span>
                        <span className="font-mono text-emerald-600">
                          +{rule.kor_per_action.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {t("table.columns.dailyCountLimit")}:
                        </span>
                        <span className="font-mono">
                          {rule.daily_count_limit.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {t("table.columns.status")}:
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-sm text-xs font-medium ${
                            rule.active
                              ? "bg-green-100 text-green-800 border border-green-300"
                              : "bg-red-100 text-red-800 border border-red-300"
                          }`}
                        >
                          {rule.active
                            ? t("status.active")
                            : t("status.inactive")}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* No Results */}
          {rules?.length === 0 && (
            <div className="p-8 text-center">
              <div className="text-muted-foreground">
                <div className="text-lg font-medium mb-2">
                  {t("table.empty.title")}
                </div>
                <div className="text-sm">{t("table.empty.subtitle")}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      {editingRule && (
        <Dialog open={!!editingRule} onOpenChange={handleCancel}>
          <DialogContent className="w-full lg:max-w-xl rounded-none">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">
                {t("editDialog.title")}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {t("editDialog.description", { type: editingRule.type })}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              {/* Basic Info */}
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {t("sections.basicInfo", { default: "Basic Information" })}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-medium">
                    {t("editDialog.fields.title")}{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={editForm.title || ""}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    className="h-10 rounded-none"
                    placeholder={t("editDialog.placeholders.title", {
                      default: "Enter title",
                    })}
                  />
                </div>

                <div className="space-y-2 md:col-span-1">
                  <Label htmlFor="description" className="text-sm font-medium">
                    {t("editDialog.fields.description")}{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="description"
                    value={editForm.description || ""}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    className="h-10 rounded-none"
                    placeholder={t("editDialog.placeholders.description", {
                      default: "Enter description",
                    })}
                  />
                </div>
              </div>

              {/* Reward Values */}
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {t("sections.rewardValues", { default: "Reward Values" })}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label
                    htmlFor="exp_per_action"
                    className="text-sm font-medium"
                  >
                    {t("editDialog.fields.expPerAction")}{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="exp_per_action"
                    type="number"
                    value={editForm.exp_per_action || 0}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        exp_per_action: parseInt(e.target.value) || 0,
                      }))
                    }
                    className="h-10 rounded-none"
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="kor_per_action"
                    className="text-sm font-medium"
                  >
                    {t("editDialog.fields.korPerAction")}{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="kor_per_action"
                    type="number"
                    value={editForm.kor_per_action || 0}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        kor_per_action: parseInt(e.target.value) || 0,
                      }))
                    }
                    className="h-10 rounded-none"
                    min="0"
                  />
                </div>
              </div>

              {/* Daily Limits */}
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {t("sections.dailyLimits", { default: "Daily Limits" })}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label
                    htmlFor="daily_count_limit"
                    className="text-sm font-medium"
                  >
                    {t("editDialog.fields.dailyCountLimit")}{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="daily_count_limit"
                    type="number"
                    value={editForm.daily_count_limit || 0}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        daily_count_limit: parseInt(e.target.value) || 0,
                      }))
                    }
                    className="h-10 rounded-none"
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="daily_exp_limit"
                    className="text-sm font-medium"
                  >
                    {t("editDialog.fields.dailyExpLimit")}{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="daily_exp_limit"
                    type="number"
                    value={editForm.daily_exp_limit || 0}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        daily_exp_limit: parseInt(e.target.value) || 0,
                      }))
                    }
                    className="h-10 rounded-none"
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="daily_kor_limit"
                    className="text-sm font-medium"
                  >
                    {t("editDialog.fields.dailyKorLimit")}{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="daily_kor_limit"
                    type="number"
                    value={editForm.daily_kor_limit || 0}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        daily_kor_limit: parseInt(e.target.value) || 0,
                      }))
                    }
                    className="h-10 rounded-none"
                    min="0"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
                className="h-10"
              >
                <X className="h-4 w-4 mr-2" />
                {t("editDialog.actions.cancel")}
              </Button>
              <Button
                onClick={handleSave}
                disabled={
                  isSaving ||
                  !editForm.title?.trim() ||
                  !editForm.description?.trim()
                }
                className="h-10"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving
                  ? t("editDialog.actions.saving")
                  : t("editDialog.actions.save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* View Details Dialog */}
      {viewingRule && (
        <RewardRuleDetailsDialog
          rule={viewingRule}
          open={!!viewingRule}
          onOpenChange={(open) => !open && setViewingRule(null)}
        />
      )}
    </div>
  );
}
