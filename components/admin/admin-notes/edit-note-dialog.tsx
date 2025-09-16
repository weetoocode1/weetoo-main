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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface EditNoteDialogProps {
  note: {
    id: string;
    user_id: string | null;
    note: string;
    priority: "High" | "Medium" | "Low";
    date: string;
    created_by: string;
    created_at: string;
    updated_at: string | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNoteUpdated: () => void;
}

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export function EditNoteDialog({
  note,
  open,
  onOpenChange,
  onNoteUpdated,
}: EditNoteDialogProps) {
  const t = useTranslations("admin.adminNotes.editDialog");
  const [formData, setFormData] = useState({
    user_id: note.user_id || "general",
    note: note.note,
    priority: note.priority,
    date: new Date(note.date),
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  // Reset form when note changes
  useEffect(() => {
    setFormData({
      user_id: note.user_id || "general",
      note: note.note,
      priority: note.priority,
      date: new Date(note.date),
    });
  }, [note]);

  // Fetch users for the dropdown
  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["admin-users-list"],
    queryFn: async (): Promise<User[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("users")
        .select("id, first_name, last_name, email")
        .order("first_name", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.note.trim()) {
      toast.error(t("validation.noteRequired"));
      return;
    }

    // Validate user_id is not empty
    if (!formData.user_id) {
      toast.error(t("validation.userRequired"));
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();

      // Update the note
      const { error } = await supabase
        .from("admin_notes")
        .update({
          user_id: formData.user_id === "general" ? null : formData.user_id, // Allow null for general notes
          note: formData.note.trim(),
          priority: formData.priority,
          date: formData.date.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", note.id);

      if (error) throw error;

      // Invalidate queries for real-time updates
      queryClient.invalidateQueries({ queryKey: ["admin-notes"] });
      queryClient.invalidateQueries({ queryKey: ["admin-notes-stats"] });

      toast.success(t("success.updated"));
      onNoteUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating note:", error);
      toast.error(t("error.failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full lg:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* User Selection */}
          <div className="space-y-2">
            <Label htmlFor="user" className="text-sm font-medium">
              {t("userLabel")}
            </Label>
            {isLoadingUsers ? (
              <div className="h-10 rounded-none border border-input bg-muted flex items-center px-3 text-sm text-muted-foreground">
                {t("loadingUsers")}
              </div>
            ) : (
              <Select
                value={formData.user_id}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, user_id: value }))
                }
              >
                <SelectTrigger className="h-10 rounded-none">
                  <SelectValue placeholder={t("userPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">
                    {t("generalNoteOption")}
                  </SelectItem>
                  {users?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Note Content */}
          <div className="space-y-2">
            <Label htmlFor="note" className="text-sm font-medium">
              {t("noteContent")} <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="note"
              value={formData.note}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, note: e.target.value }))
              }
              className="min-h-[120px] resize-none rounded-none"
              placeholder={t("notePlaceholder")}
              required
            />
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority" className="text-sm font-medium">
              {t("priority")}
            </Label>
            <Select
              value={formData.priority}
              onValueChange={(value: "High" | "Medium" | "Low") =>
                setFormData((prev) => ({ ...prev, priority: value }))
              }
            >
              <SelectTrigger className="h-10 rounded-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Low">{t("priorities.low")}</SelectItem>
                <SelectItem value="Medium">{t("priorities.medium")}</SelectItem>
                <SelectItem value="High">{t("priorities.high")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t("date")}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-10 rounded-none",
                    !formData.date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.date ? (
                    format(formData.date, "PPP")
                  ) : (
                    <span>{t("pickDate")}</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.date}
                  onSelect={(date) =>
                    date && setFormData((prev) => ({ ...prev, date }))
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Read-only fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                {t("createdAt")}
              </Label>
              <Input
                value={
                  note.created_at
                    ? new Date(note.created_at).toLocaleDateString("en-GB")
                    : ""
                }
                disabled
                className="h-10 bg-muted/30 rounded-none"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                {t("lastUpdated")}
              </Label>
              <Input
                value={
                  note.updated_at
                    ? new Date(note.updated_at).toLocaleDateString("en-GB")
                    : t("never")
                }
                disabled
                className="h-10 bg-muted/30 rounded-none"
              />
            </div>
          </div>
        </form>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="h-10"
          >
            {t("cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="h-10"
          >
            {isSubmitting ? t("updating") : t("updateNote")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
