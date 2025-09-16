"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface CreateNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNoteCreated: () => void;
}

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export function CreateNoteDialog({
  open,
  onOpenChange,
  onNoteCreated,
}: CreateNoteDialogProps) {
  const t = useTranslations("admin.adminNotes.createDialog");
  const [formData, setFormData] = useState({
    user_id: "general",
    note: "",
    priority: "Medium" as "High" | "Medium" | "Low",
    date: new Date(),
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

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

      // Get current user ID
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Not authenticated");
      }

      // Create the note
      const { error } = await supabase.from("admin_notes").insert({
        user_id: formData.user_id === "general" ? null : formData.user_id, // Allow null for general notes
        note: formData.note.trim(),
        priority: formData.priority,
        created_by: user.id,
        date: formData.date.toISOString(),
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      // Invalidate queries for real-time updates
      queryClient.invalidateQueries({ queryKey: ["admin-notes"] });
      queryClient.invalidateQueries({ queryKey: ["admin-notes-stats"] });

      toast.success(t("success.created"));
      onNoteCreated();
      onOpenChange(false);

      // Reset form
      setFormData({
        user_id: "general",
        note: "",
        priority: "Medium",
        date: new Date(),
      });
    } catch (error) {
      console.error("Error creating note:", error);
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
            {isSubmitting ? t("creating") : t("createNote")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
