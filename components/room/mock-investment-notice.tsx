"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import React, { Suspense } from "react";

interface MockInvestmentNoticeProps {
  roomId: string;
}

const STORAGE_KEY_BASE = "mockNoticeHiddenUntil:";

export function MockInvestmentNotice({ roomId }: MockInvestmentNoticeProps) {
  const t = useTranslations("room.mockNotice");
  const [isScreenshot, setIsScreenshot] = React.useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return (
        new URLSearchParams(window.location.search).get("screenshot") === "1"
      );
    }
    return false;
  });

  const ScreenshotFlagReader: React.FC<{ onValue: (v: boolean) => void }> = ({
    onValue,
  }) => {
    const sp = useSearchParams();
    React.useEffect(() => {
      onValue(sp?.get("screenshot") === "1");
    }, [sp, onValue]);
    return null;
  };

  const [open, setOpen] = React.useState(false);
  const [suppress24h, setSuppress24h] = React.useState(false);

  React.useEffect(() => {
    try {
      const key = STORAGE_KEY_BASE + roomId;
      const hiddenUntilStr = localStorage.getItem(key);
      const hiddenUntil = hiddenUntilStr ? parseInt(hiddenUntilStr, 10) : 0;
      const now = Date.now();
      setOpen(!(hiddenUntil && now < hiddenUntil));
    } catch {
      setOpen(true);
    }
  }, [roomId]);

  const handleAcknowledge = () => {
    try {
      const key = STORAGE_KEY_BASE + roomId;
      if (suppress24h) {
        const hiddenUntil = Date.now() + 24 * 60 * 60 * 1000;
        localStorage.setItem(key, String(hiddenUntil));
      } else {
        localStorage.removeItem(key);
      }
    } catch {}
    setOpen(false);
  };

  // After hooks are declared, safely short-circuit rendering during screenshots
  if (isScreenshot) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Prevent closing via built-in close controls; require explicit acknowledge
        if (next) setOpen(true);
      }}
    >
      <DialogContent
        className="max-w-xl w-full rounded-none p-0 border border-border bg-card whitespace-pre-line"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Suspense-safe reader for screenshot flag with empty fallback */}
        <Suspense fallback={<></>}>
          <ScreenshotFlagReader onValue={setIsScreenshot} />
        </Suspense>
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-muted/30">
          <div className="shrink-0">
            <ShieldAlert className="h-5 w-5 text-amber-600" />
          </div>
          <DialogTitle className="text-base font-semibold tracking-tight">
            {t("title")}
          </DialogTitle>
        </div>

        {/* Body */}
        <div className="px-5 py-4 text-sm text-center leading-6 text-muted-foreground space-y-3 whitespace-pre-line">
          <p>{t("line1")}</p>
          <p>{t("line2")}</p>
          <p>{t("line3")}</p>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <Checkbox
              id="suppress24h"
              checked={suppress24h}
              onCheckedChange={(v: boolean) => setSuppress24h(!!v)}
            />
            <span className="text-sm text-muted-foreground">
              {t("suppress24h")}
            </span>
          </label>
          <div className="sm:ml-auto">
            <Button className="rounded-none" onClick={handleAcknowledge}>
              {t("understood")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
