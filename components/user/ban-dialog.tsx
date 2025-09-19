"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useBanStore } from "@/lib/store/ban-store";
import { useMemo, useEffect, useRef } from "react";
import { ShieldAlert, AlertTriangle, MessageCircle, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

// Types for ban data from Supabase
interface BanData {
  active?: boolean;
  reason?: string;
  banned_at?: string;
}

interface SupabasePayload {
  new: BanData;
  old?: BanData;
  eventType: "INSERT" | "UPDATE" | "DELETE";
}

export const BanDialog = () => {
  const t = useTranslations("banDialog");
  const { isBanned, info, closeBan, openBan } = useBanStore();
  const subscribedRef = useRef(false);

  const formattedDate = useMemo(() => {
    if (!info?.bannedAt) return "-";
    try {
      return new Date(info.bannedAt).toLocaleString();
    } catch {
      return info.bannedAt;
    }
  }, [info?.bannedAt]);

  // Realtime subscription to user_bans to enforce immediate ban UX
  useEffect(() => {
    if (subscribedRef.current) return;
    subscribedRef.current = true;

    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setup = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userId = user?.id;
      if (!userId) return;

      channel = supabase
        .channel(`ban-dialog-user-bans-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "user_bans",
            filter: `user_id=eq.${userId}`,
          },
          (payload: SupabasePayload) => {
            const row = payload.new;
            if (row?.active) {
              try {
                openBan({
                  reason: row.reason || "",
                  bannedAt: row.banned_at || new Date().toISOString(),
                });
              } catch {}
              try {
                supabase.auth.signOut();
              } catch {}
              try {
                if (window.location.pathname !== "/") {
                  window.location.href = "/";
                }
              } catch {}
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "user_bans",
            filter: `user_id=eq.${userId}`,
          },
          (payload: SupabasePayload) => {
            const row = payload.new;
            if (row?.active) {
              try {
                openBan({
                  reason: row.reason || "",
                  bannedAt: row.banned_at || new Date().toISOString(),
                });
              } catch {}
              try {
                supabase.auth.signOut();
              } catch {}
              try {
                if (window.location.pathname !== "/") {
                  window.location.href = "/";
                }
              } catch {}
            }
          }
        )
        .subscribe();
    };

    setup();

    return () => {
      try {
        if (channel) channel.unsubscribe();
      } catch {}
    };
  }, [openBan]);

  return (
    <Dialog
      open={isBanned}
      onOpenChange={(open) => {
        if (!open) closeBan();
      }}
    >
      <DialogContent className="max-w-lg rounded-none p-0 overflow-hidden border border-red-500/30 shadow-xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-700 via-red-600 to-rose-600 text-white px-6 py-5">
          <div className="flex items-start gap-4">
            <div className="shrink-0 rounded-full bg-white/15 p-2 ring-1 ring-white/30">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold tracking-wide">
                  {t("title")}
                </DialogTitle>
              </DialogHeader>
              <p className="mt-1 text-xs/5 opacity-90">{t("subtitle")}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 bg-background">
          {/* Status + Timestamp */}
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200 border border-red-300/60">
              <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
              {t("banned")}
            </span>
            <span className="text-muted-foreground text-xs">
              {formattedDate}
            </span>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              {t("reason")}
            </div>
            <div className="rounded-none border border-border bg-muted/40 p-3 text-[13px] leading-relaxed whitespace-pre-wrap break-words">
              {info?.reason || t("noReasonProvided")}
            </div>
          </div>

          {/* Callout */}
          <div className="flex items-start gap-2 rounded-none border border-yellow-500/30 bg-yellow-50 text-yellow-900 dark:bg-yellow-900/15 dark:text-yellow-100 p-3 text-[13px]">
            <Info className="h-4 w-4 mt-0.5" />
            <p>{t("callout")}</p>
          </div>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="px-6 py-4 bg-background gap-2">
          <a
            href="https://t.me/weetoo_kor"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex"
            aria-label="Contact support via Telegram"
          >
            <Button
              type="button"
              variant="destructive"
              className="rounded-none inline-flex items-center gap-2"
            >
              <MessageCircle className="h-4 w-4" /> {t("contactSupport")}
            </Button>
          </a>
          <Button
            type="button"
            variant="outline"
            className="rounded-none"
            onClick={closeBan}
          >
            {t("close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
