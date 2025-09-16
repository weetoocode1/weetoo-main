"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslations } from "next-intl";

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  nickname?: string;
  mobile_number?: string;
  birth_date?: string | null;
  gender?: string | null;
  identity_verification_name?: string | null;
  role: string;
  kor_coins: number;
  created_at: string;
  updated_at: string;
  warningCount: number;
  avatar_url?: string;
  banned?: boolean;
  ban_reason?: string;
  identity_verified?: boolean;
  identity_verified_at?: string;
  identity_verification_id?: string;
}

interface UserDetailsDialogProps {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AdminInfo {
  first_name: string;
  last_name: string;
  role: string;
}

export function UserDetailsDialog({
  user,
  open,
  onOpenChange,
}: UserDetailsDialogProps) {
  const t = useTranslations("admin.userManagement.detailsDialog");
  const [adminInfo, setAdminInfo] = useState<AdminInfo | null>(null);

  const humanizeRole = (role: string) => {
    return role === "super_admin"
      ? "Super Admin"
      : role.charAt(0).toUpperCase() + role.slice(1);
  };

  useEffect(() => {
    if (
      open &&
      user.identity_verified &&
      user.identity_verification_id?.startsWith("admin_verified_")
    ) {
      const fetchAdminInfo = async () => {
        const supabase = createClient();
        const adminId = user.identity_verification_id?.replace(
          "admin_verified_",
          ""
        );
        const { data, error } = await supabase
          .from("users")
          .select("first_name, last_name, role")
          .eq("id", adminId)
          .single();

        if (!error && data) {
          setAdminInfo(data);
        }
      };
      fetchAdminInfo();
    } else {
      setAdminInfo(null);
    }
  }, [user.identity_verified, user.identity_verification_id, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-6xl !w-full rounded-none">
        <DialogHeader className="gap-0">
          <DialogTitle className="text-xl font-semibold">
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="flex gap-4">
          {/* Left: ID Card */}
          <div className="w-96 shrink-0">
            <div className="bg-gradient-to-br from-background via-muted/5 to-background border border-border p-6 h-full">
              <div className="text-center">
                {/* Enhanced avatar with subtle styling */}
                <div className="relative inline-block mb-6">
                  <Avatar className="h-24 w-24 mx-auto ring-2 ring-border shadow-sm">
                    <AvatarImage
                      src={user.avatar_url}
                      alt={`${user.first_name} ${user.last_name}`}
                    />
                    <AvatarFallback className="bg-gradient-to-br from-muted to-muted/80 text-foreground text-2xl font-semibold">
                      {(user.first_name?.[0] || "U").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {/* Subtle status indicator */}
                  <div
                    className={`absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2.5 h-2.5 rounded-full border border-background ${
                      user.identity_verified ? "bg-success" : "bg-destructive"
                    }`}
                  ></div>
                </div>

                {/* User Name with better typography */}
                <h3 className="text-xl font-bold text-foreground mb-3">
                  {user.first_name} {user.last_name}
                </h3>

                {/* User ID with enhanced styling */}
                <div className="text-xs font-mono text-muted-foreground bg-muted/50 px-4 py-2.5 mb-6 w-full text-center border border-border/50">
                  {user.id}
                </div>

                {/* Enhanced detail list */}
                <div className="space-y-3 text-left">
                  <div className="flex justify-between items-center py-2.5 px-3 bg-muted/20 border border-border/30 rounded-sm">
                    <span className="text-xs text-muted-foreground font-medium">
                      {t("labels.role")}
                    </span>
                    <span className="text-xs font-semibold text-foreground bg-background px-2 py-1 rounded-sm">
                      {humanizeRole(user.role)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2.5 px-3 bg-muted/20 border border-border/30 rounded-sm">
                    <span className="text-xs text-muted-foreground font-medium">
                      {t("labels.status")}
                    </span>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-sm ${
                        user.identity_verified
                          ? "bg-success/20 text-success border border-success/30"
                          : "bg-destructive/20 text-destructive border border-destructive/30"
                      }`}
                    >
                      {user.identity_verified
                        ? t("badges.verified")
                        : t("badges.unverified")}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2.5 px-3 bg-muted/20 border border-border/30 rounded-sm">
                    <span className="text-xs text-muted-foreground font-medium">
                      {t("labels.korCoins")}
                    </span>
                    <span className="text-xs font-semibold text-foreground font-mono">
                      {user.kor_coins?.toLocaleString() || 0}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2.5 px-3 bg-muted/20 border border-border/30 rounded-sm">
                    <span className="text-xs text-muted-foreground font-medium">
                      {t("labels.joined")}
                    </span>
                    <span className="text-xs font-semibold text-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Enhanced Admin Verification */}
                  {user.identity_verified &&
                    user.identity_verification_id?.startsWith(
                      "admin_verified_"
                    ) && (
                      <div className="pt-3 border-t border-border/40">
                        <div className="flex justify-between items-center py-2.5 px-3 bg-primary/5 border border-primary/20 rounded-sm">
                          <span className="text-xs text-primary font-medium">
                            {t("labels.verifiedBy")}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-foreground">
                              {adminInfo
                                ? `${adminInfo.first_name} ${adminInfo.last_name}`
                                : "Loading..."}
                            </span>
                            {adminInfo && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Shield className="h-3.5 w-3.5 text-primary cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{humanizeRole(adminInfo.role)}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Details Card */}
          <div className="flex-1">
            <div className="bg-muted/10 border border-border p-6 h-full">
              <div className="space-y-6">
                {/* Personal Info Section */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    Personal Information
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-background border border-border p-3">
                      <div className="text-xs text-muted-foreground mb-1">
                        Email
                      </div>
                      <div className="text-sm font-medium font-mono">
                        {user.email}
                      </div>
                    </div>

                    <div className="bg-background border border-border p-3">
                      <div className="text-xs text-muted-foreground mb-1">
                        Phone
                      </div>
                      <div className="text-sm font-medium">
                        {user.mobile_number || "-"}
                      </div>
                    </div>

                    <div className="bg-background border border-border p-3">
                      <div className="text-xs text-muted-foreground mb-1">
                        Nickname
                      </div>
                      <div className="text-sm font-medium">
                        {user.nickname || "-"}
                      </div>
                    </div>

                    <div className="bg-background border border-border p-3">
                      <div className="text-xs text-muted-foreground mb-1">
                        Gender
                      </div>
                      <div className="text-sm font-medium">
                        {user.gender
                          ? user.gender.charAt(0).toUpperCase() +
                            user.gender.slice(1)
                          : "-"}
                      </div>
                    </div>

                    <div className="bg-background border border-border p-3">
                      <div className="text-xs text-muted-foreground mb-1">
                        Birth Date
                      </div>
                      <div className="text-sm font-medium">
                        {user.birth_date
                          ? new Date(user.birth_date).toLocaleDateString()
                          : "-"}
                      </div>
                    </div>

                    <div className="bg-background border border-border p-3">
                      <div className="text-xs text-muted-foreground mb-1">
                        Identity Name
                      </div>
                      <div className="text-sm font-medium">
                        {user.identity_verification_name || "-"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Account Info Section */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide flex items-center gap-2">
                    <div className="w-2 h-2 bg-success rounded-full"></div>
                    Account Information
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-background border border-border p-3">
                      <div className="text-xs text-muted-foreground mb-1">
                        Warnings
                      </div>
                      <div className="text-sm font-medium">
                        {user.warningCount}
                      </div>
                    </div>

                    <div className="bg-background border border-border p-3">
                      <div className="text-xs text-muted-foreground mb-1">
                        Last Updated
                      </div>
                      <div className="text-sm font-medium">
                        {new Date(user.updated_at).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="bg-background border border-border p-3">
                      <div className="text-xs text-muted-foreground mb-1">
                        Identity ID
                      </div>
                      <div className="text-sm font-medium font-mono text-xs">
                        {user.identity_verification_id || "-"}
                      </div>
                    </div>

                    {user.identity_verified && user.identity_verified_at && (
                      <div className="bg-background border border-border p-3">
                        <div className="text-xs text-muted-foreground mb-1">
                          Verified On
                        </div>
                        <div className="text-sm font-medium">
                          {new Date(
                            user.identity_verified_at
                          ).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
