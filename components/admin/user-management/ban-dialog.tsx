"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface BanDialogProps {
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    warningCount: number;
    avatar_url?: string;
    banned?: boolean;
    ban_reason?: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserBanned: () => void;
  currentUserRole: string;
}

export function BanDialog({
  user,
  open,
  onOpenChange,
  onUserBanned,
  currentUserRole,
}: BanDialogProps) {
  const t = useTranslations("adminBanDialog");
  const [banData, setBanData] = useState({
    reason: "",
    permanent: false,
    notifyUser: true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Check if user is banned and load ban data
  useEffect(() => {
    if (!open || !user?.id) return;

    const checkBanStatus = async () => {
      setIsLoading(true);
      try {
        const supabase = createClient();

        // Check if user is banned by looking for active ban record
        const { data: banRecords, error } = await supabase
          .from("user_bans")
          .select("*")
          .eq("user_id", user.id)
          .eq("active", true);

        if (error) {
          console.error("Error checking ban status:", error);
          // Reset form on error
          setBanData({
            reason: "",
            permanent: false,
            notifyUser: true,
          });
          return;
        }

        // Check if user has active ban record
        if (banRecords && banRecords.length > 0) {
          const activeBan = banRecords[0]; // Get first active ban
          setBanData({
            reason: activeBan.reason || "",
            permanent: activeBan.permanent || false,
            notifyUser: true,
          });
        } else {
          // No active ban found, reset form for new ban
          setBanData({
            reason: "",
            permanent: false,
            notifyUser: true,
          });
        }
      } catch (error) {
        console.error("Error checking ban status:", error);
        // Reset form on error
        setBanData({
          reason: "",
          permanent: false,
          notifyUser: true,
        });
      } finally {
        setIsLoading(false);
      }
    };

    checkBanStatus();
  }, [open, user?.id]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [banData.reason]);

  const handleBanUser = async () => {
    if (!banData.reason.trim()) {
      toast.error(t("toast.reasonRequired"));
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();

      // Get current admin user id once to reuse
      const {
        data: { user: adminUser },
      } = await supabase.auth.getUser();
      const adminUserId = adminUser?.id || null;

      // Insert ban record
      const { error } = await supabase.from("user_bans").insert({
        user_id: user.id,
        reason: banData.reason.trim(),
        permanent: banData.permanent,
        active: true,
        banned_at: new Date().toISOString(),
        banned_by: adminUserId,
      });

      if (error) throw error;

      // Update user status to banned
      const nowIso = new Date().toISOString();
      const { error: updateError } = await supabase
        .from("users")
        .update({
          banned: true,
          ban_reason: banData.reason.trim(),
          banned_at: nowIso,
          banned_by: adminUserId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

      // Push a realtime notification so the user's client reacts instantly
      try {
        await supabase.from("notifications").insert({
          user_id: user.id,
          audience: "user",
          type: "user_banned",
          title: "Account Banned",
          body: null,
          metadata: { reason: banData.reason.trim(), banned_at: nowIso },
        });
      } catch (_e) {
        // Non-blocking: ban already applied
      }

      toast.success(t("toast.banSuccess"));
      onUserBanned();
      onOpenChange(false);
    } catch (error) {
      console.error("Error banning user:", error);
      toast.error(t("toast.banFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnbanUser = async () => {
    setIsSubmitting(true);

    try {
      const supabase = createClient();

      // Get current admin user id once to reuse
      const {
        // data: { user: adminUser },
      } = await supabase.auth.getUser();
      // const adminUserId = adminUser?.id || null;

      // Deactivate ban record
      const { error } = await supabase
        .from("user_bans")
        .update({
          active: false,
          unbanned_at: new Date().toISOString(),
          unbanned_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq("user_id", user.id)
        .eq("active", true);

      if (error) throw error;

      // Update user status to unbanned
      const { error: updateError } = await supabase
        .from("users")
        .update({
          banned: false,
          ban_reason: null,
          banned_at: null,
          banned_by: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

      toast.success(t("toast.unbanSuccess"));
      onUserBanned();
      onOpenChange(false);
    } catch (error) {
      console.error("Error unbanning user:", error);
      toast.error(t("toast.unbanFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate fallback initials
  const getInitials = (firstName: string, lastName: string) => {
    const first = firstName && firstName.length > 0 ? firstName.charAt(0) : "U";
    const last = lastName && lastName.length > 0 ? lastName.charAt(0) : "N";
    return `${first}${last}`.toUpperCase();
  };

  // Check if user is currently banned
  const isUserBanned = user.banned;

  // Only super admins can ban/unban
  if (currentUserRole !== "super_admin") {
    return null;
  }

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full lg:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              {t("loadingTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">{t("loadingMessage")}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full lg:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {isUserBanned ? t("unbanTitle") : t("title")}
          </DialogTitle>
          <DialogDescription>
            {isUserBanned
              ? t("unbanDescription", {
                  firstName: user.first_name,
                  lastName: user.last_name,
                })
              : t("description", {
                  firstName: user.first_name,
                  lastName: user.last_name,
                })}
          </DialogDescription>
        </DialogHeader>

        {/* User Info Section */}
        <div className="flex items-center space-x-4 p-4 border border-border rounded-none">
          <div className="relative">
            <Avatar className="h-16 w-16">
              <AvatarImage
                src={user.avatar_url}
                alt={`${user.first_name} ${user.last_name}`}
              />
              <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                {getInitials(user.first_name, user.last_name)}
              </AvatarFallback>
            </Avatar>
            {isUserBanned && (
              <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                BANNED
              </div>
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">
              {user.first_name} {user.last_name}
            </h3>
            <p className="text-sm text-muted-foreground font-mono">
              {user.email}
            </p>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                {t("userInfo.warnings")} {user.warningCount}
              </span>
              {isUserBanned && user.ban_reason && (
                <span className="text-sm text-red-600">
                  {t("userInfo.banReason")} {user.ban_reason}
                </span>
              )}
            </div>
          </div>
        </div>

        {!isUserBanned ? (
          // Ban Form
          <form className="space-y-6">
            {/* Ban Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason" className="text-sm font-medium">
                {t("form.banReasonLabel")}{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Textarea
                ref={textareaRef}
                id="reason"
                value={banData.reason}
                onChange={(e) =>
                  setBanData((prev) => ({
                    ...prev,
                    reason: e.target.value,
                  }))
                }
                className="min-h-[100px] resize-none rounded-none"
                style={{
                  wordBreak: "break-all",
                  whiteSpace: "pre-wrap",
                  overflowWrap: "break-word",
                }}
                placeholder={t("form.banReasonPlaceholder")}
                required
              />
            </div>

            {/* Ban Options */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="permanent"
                  checked={banData.permanent}
                  onCheckedChange={(checked) =>
                    setBanData((prev) => ({
                      ...prev,
                      permanent: checked as boolean,
                    }))
                  }
                />
                <Label htmlFor="permanent" className="text-sm">
                  {t("form.permanentBan")}
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="notifyUser"
                  checked={banData.notifyUser}
                  onCheckedChange={(checked) =>
                    setBanData((prev) => ({
                      ...prev,
                      notifyUser: checked as boolean,
                    }))
                  }
                />
                <Label htmlFor="notifyUser" className="text-sm">
                  {t("form.notifyUser")}
                </Label>
              </div>
            </div>
          </form>
        ) : (
          // Unban Information
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-none">
            <h4 className="font-medium text-yellow-800 mb-2">
              {t("unbanInfo.title")}
            </h4>
            <p className="text-sm text-yellow-700">
              {t("unbanInfo.description")}
            </p>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-10"
          >
            {t("buttons.cancel")}
          </Button>
          {isUserBanned ? (
            <Button
              onClick={handleUnbanUser}
              disabled={isSubmitting}
              className="h-10 bg-green-600 hover:bg-green-700 text-white"
            >
              {isSubmitting ? t("buttons.unbanning") : t("buttons.unbanUser")}
            </Button>
          ) : (
            <Button
              onClick={handleBanUser}
              disabled={!banData.reason.trim() || isSubmitting}
              className="h-10 bg-red-600 hover:bg-red-700 text-white"
            >
              {isSubmitting ? t("buttons.banning") : t("buttons.banUser")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
