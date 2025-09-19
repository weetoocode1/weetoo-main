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
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface EditUserDialogProps {
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    mobile_number?: string;
    role: string;
    kor_coins: number;
    created_at: string;
    updated_at: string;
    warningCount: number;
    avatar_url?: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated: () => void;
  currentUserRole: string;
}

export function EditUserDialog({
  user,
  open,
  onOpenChange,
  onUserUpdated,
  currentUserRole,
}: EditUserDialogProps) {
  const t = useTranslations("admin.userManagement.editUserDialog");
  const [editFormData, setEditFormData] = useState({
    first_name: user.first_name || "",
    last_name: user.last_name || "",
    email: user.email || "",
    mobile_number: user.mobile_number || "",
    role: user.role || "user",
    kor_coins: user.kor_coins || 0,
  });

  // Reset form data when user changes to prevent stale data
  useEffect(() => {
    setEditFormData({
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      email: user.email || "",
      mobile_number: user.mobile_number || "",
      role: user.role || "user",
      kor_coins: user.kor_coins || 0,
    });
  }, [user]);

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    // Validation
    if (!editFormData.first_name.trim() || !editFormData.last_name.trim()) {
      toast.error(t("toastNameRequired"));
      return;
    }

    if (editFormData.email && !editFormData.email.includes("@")) {
      toast.error(t("toastInvalidEmail"));
      return;
    }

    setIsSaving(true);

    try {
      const supabase = createClient();

      // 1. Update user in public.users table
      const { error: updateError } = await supabase
        .from("users")
        .update({
          first_name: editFormData.first_name.trim(),
          last_name: editFormData.last_name.trim(),
          email: editFormData.email.trim(),
          mobile_number: editFormData.mobile_number || null,
          role: editFormData.role,
          kor_coins: editFormData.kor_coins,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateError) {
        throw updateError;
      }

      // 2. ALSO update auth.users metadata to keep everything in sync
      try {
        const { error: authError } = await supabase.auth.admin.updateUserById(
          user.id,
          {
            user_metadata: {
              first_name: editFormData.first_name.trim(),
              last_name: editFormData.last_name.trim(),
            },
          }
        );

        if (authError) {
          console.warn(
            "Auth metadata update failed, but user data was saved:",
            authError
          );
          // Don't throw error here - user data was saved successfully
        }
      } catch (authError) {
        console.warn(
          "Auth metadata update failed, but user data was saved:",
          authError
        );
        // Continue with success - user data was saved
      }

      toast.success(t("toastSaved"));
      onUserUpdated(); // Refresh the table
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error(t("toastSaveFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full lg:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {t("title")}
          </DialogTitle>
          <DialogDescription>
            {t("description", { first: user.first_name, last: user.last_name })}
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* First Name */}
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-sm font-medium">
                {t("firstName")} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="firstName"
                type="text"
                value={editFormData.first_name || ""}
                onChange={(e) =>
                  setEditFormData((prev) => ({
                    ...prev,
                    first_name: e.target.value,
                  }))
                }
                className="h-10 rounded-none"
                placeholder={t("enterFirstName")}
                required
              />
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-sm font-medium">
                {t("lastName")} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="lastName"
                type="text"
                value={editFormData.last_name || ""}
                onChange={(e) =>
                  setEditFormData((prev) => ({
                    ...prev,
                    last_name: e.target.value,
                  }))
                }
                className="h-10 rounded-none"
                placeholder={t("enterLastName")}
                required
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                {t("emailAddress")}
                {currentUserRole !== "super_admin" && (
                  <span className="text-xs text-muted-foreground ml-2">
                    {t("superAdminOnly")}
                  </span>
                )}
              </Label>
              <Input
                id="email"
                type="email"
                value={editFormData.email || ""}
                onChange={(e) =>
                  setEditFormData((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
                className="h-10 font-mono rounded-none"
                placeholder={t("enterEmail")}
                disabled={currentUserRole !== "super_admin"}
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium">
                {t("phoneNumber")}
              </Label>
              <Input
                id="phone"
                type="tel"
                value={editFormData.mobile_number || ""}
                onChange={(e) =>
                  setEditFormData((prev) => ({
                    ...prev,
                    mobile_number: e.target.value,
                  }))
                }
                className="h-10 rounded-none"
                placeholder={t("enterPhone")}
              />
            </div>

            {/* Role - Only editable by super admins */}
            <div className="space-y-2">
              <Label htmlFor="role" className="text-sm font-medium">
                {t("userRole")}
              </Label>
              <Select
                value={editFormData.role}
                onValueChange={(value) =>
                  setEditFormData((prev) => ({ ...prev, role: value }))
                }
                disabled={currentUserRole !== "super_admin"}
              >
                <SelectTrigger className="h-10 rounded-none">
                  <SelectValue placeholder={t("selectRole")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">{t("role_user")}</SelectItem>
                  <SelectItem value="admin">{t("role_admin")}</SelectItem>
                  <SelectItem value="super_admin">
                    {t("role_super_admin")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* KOR Coins */}
            <div className="space-y-2">
              <Label htmlFor="korCoins" className="text-sm font-medium">
                {t("korCoins")}
              </Label>
              <Input
                id="korCoins"
                type="text"
                value={editFormData.kor_coins?.toString() || "0"}
                // Editing KOR coins is disabled by request
                disabled
                readOnly
                className="h-10 font-mono rounded-none"
                placeholder={t("enterKorCoins")}
                min="0"
              />
            </div>
          </div>

          {/* User Details (Read-only) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* User ID */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t("userId")}</Label>
              <Input
                value={user.id || ""}
                disabled
                className="h-10 font-mono bg-muted/30 rounded-none"
              />
            </div>

            {/* Warnings */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t("warnings")}</Label>
              <Input
                value={user.warningCount?.toString() || "0"}
                disabled
                className="h-10 bg-muted/30 rounded-none"
              />
            </div>

            {/* Created Date */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {t("accountCreated")}
              </Label>
              <Input
                value={
                  user.created_at
                    ? new Date(user.created_at).toLocaleDateString("en-GB")
                    : ""
                }
                disabled
                className="h-10 bg-muted/30 rounded-none"
              />
            </div>

            {/* Last Updated */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t("lastUpdated")}</Label>
              <Input
                value={
                  user.updated_at
                    ? new Date(user.updated_at).toLocaleDateString("en-GB")
                    : ""
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
            disabled={isSaving}
            className="h-10"
          >
            {t("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="h-10">
            {isSaving ? t("saving") : t("saveChanges")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
