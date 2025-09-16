"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { useNotificationStats } from "@/hooks/use-notifications";
import { useSidebarStore } from "@/lib/store/sidebar-store";
import { useUserCache } from "@/lib/store/user-cache";
import { cn } from "@/lib/utils";
import { ShieldCheck, TrendingUpIcon, Users2, Globe } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { ADMIN_SECTIONS } from "@/lib/admin-navigation";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useTranslations } from "next-intl";
import { useLanguage } from "@/providers/language-provider";

interface LeftSidebarProps {
  isMobile?: boolean;
  mobileSheetOpen?: boolean;
  setMobileSheetOpen?: (open: boolean) => void;
}

export function LeftSidebar({
  isMobile = false,
  mobileSheetOpen: controlledOpen,
  setMobileSheetOpen: setControlledOpen,
}: LeftSidebarProps) {
  const t = useTranslations("admin.leftSidebar");
  const { locale, setLocale } = useLanguage();
  const toggleLanguage = () => {
    const newLocale = locale === "en" ? "ko" : "en";
    setLocale(newLocale);
  };
  const { computed } = useAuth();
  const pathname = usePathname();
  const isCollapsed = useSidebarStore((state) => state.isCollapsed);
  const { data: notificationStats } = useNotificationStats();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const mobileSheetOpen = controlledOpen ?? uncontrolledOpen;
  const setMobileSheetOpen = setControlledOpen ?? setUncontrolledOpen;

  // User cache for instant loading
  const { cachedUser, setCachedUser } = useUserCache();

  // Update cache when computed data is available
  useEffect(() => {
    if (computed) {
      const roleLabel =
        computed.role === "super_admin"
          ? "Super Admin"
          : computed.role === "admin"
          ? "Admin"
          : "User";

      // Always update cache when computed data is available to ensure real-time updates
      setCachedUser({
        fullName: computed.fullName,
        avatarUrl: computed.avatarUrl,
        role: computed.role,
        roleLabel,
        lastUpdated: Date.now(),
      });
    }
  }, [computed, setCachedUser]);

  // Use cached data for instant display, fallback to computed data
  const displayName = cachedUser?.fullName ?? computed?.fullName ?? "User";
  const displayAvatarUrl = cachedUser?.avatarUrl ?? computed?.avatarUrl;
  const displayRole = cachedUser?.role ?? computed?.role ?? "user";
  const displayRoleLabel =
    cachedUser?.roleLabel ??
    (displayRole === "super_admin"
      ? t("roles.super_admin")
      : displayRole === "admin"
      ? t("roles.admin")
      : t("roles.user"));
  const RoleIcon =
    displayRole === "super_admin" || displayRole === "admin"
      ? ShieldCheck
      : Users2;

  // Format notification count (max 99, then 99+)
  const formatNotificationCount = (count: number) => {
    if (count > 99) return "99+";
    return count.toString();
  };

  // Filter navigation items based on user role
  const filteredSections = ADMIN_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      // If no roles specified, show to all admin users
      if (!item.roles) return true;
      // If roles specified, check if current user has access
      return item.roles.includes(displayRole);
    }),
  })).filter((section) => section.items.length > 0); // Remove empty sections

  // Sidebar content component
  const SidebarContent = () => (
    <>
      <div className="h-14 border-b flex items-center px-4">
        <span
          className={cn(
            "font-medium text-foreground transition-opacity duration-200",
            isCollapsed && !isMobile ? "opacity-0" : "opacity-100"
          )}
        >
          {t("header")}
        </span>
      </div>
      <ScrollArea className="flex-1">
        <nav className="p-3" aria-label="Admin Navigation">
          <div className="space-y-4">
            {filteredSections.map((section, idx) => (
              <div key={section.title}>
                <div
                  className={cn(
                    "px-3 pb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide transition-opacity duration-200",
                    isCollapsed && !isMobile ? "opacity-0" : "opacity-100"
                  )}
                >
                  {t(`sections.${section.title}`)}
                </div>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    // Check if this is the notifications item to show count
                    const isNotifications = item.href === "/admin/notification";
                    const unreadCount = notificationStats?.unreadCount || 0;

                    return (
                      <Link
                        key={`${section.title}-${item.label}`}
                        href={item.href}
                        aria-current={isActive ? "page" : undefined}
                        aria-label={item.label}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 text-sm transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring relative border border-transparent",
                          isActive && "text-foreground border-border"
                        )}
                        onClick={() => isMobile && setMobileSheetOpen(false)}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="activeCorners"
                            className="absolute inset-0 pointer-events-none"
                            initial={false}
                            transition={{
                              type: "spring",
                              stiffness: 400,
                              damping: 35,
                              mass: 0.8,
                            }}
                          >
                            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-primary" />
                            <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-primary" />
                            <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-primary" />
                            <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-primary" />
                          </motion.div>
                        )}
                        <Icon className="h-4 w-4 shrink-0" />
                        <span
                          className={cn(
                            "truncate transition-opacity duration-200 flex-1",
                            isCollapsed && !isMobile
                              ? "opacity-0"
                              : "opacity-100"
                          )}
                        >
                          {t(`items.${item.label}`)}
                        </span>
                        {/* Notification count badge */}
                        {isNotifications &&
                          unreadCount > 0 &&
                          (!isCollapsed || isMobile) && (
                            <div className="flex-shrink-0">
                              <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium border bg-red-500 text-white rounded-none min-w-[20px] h-5">
                                {formatNotificationCount(unreadCount)}
                              </span>
                            </div>
                          )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>
      </ScrollArea>
      <div className="border-t p-3 flex flex-col gap-3">
        {/* Trading route */}
        <div className="flex items-center gap-3">
          <Link
            href="/trading"
            className="flex items-center gap-3 text-sm transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-muted/80 w-full p-3"
            onClick={() => isMobile && setMobileSheetOpen(false)}
          >
            <TrendingUpIcon className="h-4 w-4 shrink-0" />
            <span className="truncate transition-opacity duration-200 flex-1">
              {t("goBackToTrading")}
            </span>
          </Link>
        </div>
        <div className="flex items-center">
          <button
            type="button"
            onClick={toggleLanguage}
            className="flex items-center gap-3 text-sm transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-muted/80 w-full p-3 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer rounded-none"
          >
            <Globe className="h-4 w-4" />
            <span className="truncate transition-opacity duration-200">
              {locale === "en" ? "한국어" : "English"}
            </span>
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative h-8 w-8 bg-muted overflow-hidden">
            {displayAvatarUrl ? (
              <Image
                src={displayAvatarUrl}
                alt={displayName}
                fill
                className="object-cover"
              />
            ) : (
              <div className="h-full w-full bg-muted" />
            )}
          </div>
          <div
            className={cn(
              "flex min-w-0 flex-1 flex-col transition-opacity duration-200",
              isCollapsed && !isMobile ? "opacity-0" : "opacity-100"
            )}
          >
            <span className="truncate text-sm font-medium text-foreground">
              {displayName}
            </span>
            <span className="truncate text-xs text-muted-foreground flex items-center gap-1">
              <RoleIcon className="h-3 w-3" /> {displayRoleLabel}
            </span>
          </div>
        </div>
      </div>
    </>
  );

  // Mobile/Tablet: Return sheet with trigger
  if (isMobile) {
    return (
      <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
        {/* Trigger moved to SidebarHeading for mobile */}
        <SheetContent side="left" className="w-64 p-0">
          <VisuallyHidden>
            <SheetHeader>
              <SheetTitle>{t("adminMenu")}</SheetTitle>
            </SheetHeader>
          </VisuallyHidden>
          <div className="h-full bg-background flex flex-col">
            <SidebarContent />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Return regular sidebar
  return (
    <aside
      className={cn(
        "h-full border-r bg-background flex flex-col transition-all duration-300 ease-in-out overflow-hidden min-w-0",
        isCollapsed ? "w-0" : "w-64"
      )}
    >
      <SidebarContent />
    </aside>
  );
}
