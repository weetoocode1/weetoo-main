"use client";

import { AdminRealtimeToasts } from "@/components/realtime/admin-realtime-toasts";
import SchedulerInitializer from "@/components/scheduler-initializer";
import { AuthRealtimeGuard } from "@/components/user/auth-realtime-guard";
import { BanDialog } from "@/components/user/ban-dialog";
import { UserRealtimeToasts } from "@/components/user/user-realtime-toasts";
import { LanguageProvider } from "@/providers/language-provider";
import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import enMessages from "../locales/en.json";
import koMessages from "../locales/ko.json";

declare global {
  interface Window {
    __INITIAL_LOCALE__?: string;
  }
}

interface ClientLayoutProps {
  children: React.ReactNode;
  initialLocale: string;
}

export default function ClientLayout({
  children,
  initialLocale,
}: ClientLayoutProps) {
  const [, setCurrentLang] = useState(initialLocale);

  const setLocaleCookie = (locale: string) => {
    document.cookie = `locale=${locale}; path=/; max-age=31536000; SameSite=Lax`;
  };

  useEffect(() => {
    const savedLocale =
      localStorage.getItem("locale") ||
      (typeof window !== "undefined" && window.__INITIAL_LOCALE__) ||
      initialLocale ||
      "en";
    setCurrentLang(savedLocale);
    document.documentElement.lang = savedLocale;
    setLocaleCookie(savedLocale);

    const handleLanguageChange = () => {
      const newLocale = localStorage.getItem("locale") || "en";
      setCurrentLang(newLocale);
      document.documentElement.lang = newLocale;
      setLocaleCookie(newLocale);
    };

    const handleCustomLanguageChange = (event: CustomEvent) => {
      const newLocale = event.detail?.locale || "en";
      setCurrentLang(newLocale);
      document.documentElement.lang = newLocale;
      setLocaleCookie(newLocale);
    };

    window.addEventListener("storage", handleLanguageChange);
    window.addEventListener(
      "languageChanged",
      handleCustomLanguageChange as EventListener
    );

    return () => {
      window.removeEventListener("storage", handleLanguageChange);
      window.removeEventListener(
        "languageChanged",
        handleCustomLanguageChange as EventListener
      );
    };
  }, [initialLocale]);

  return (
    <>
      <SchedulerInitializer />
      <QueryProvider>
        <LanguageProvider
          messages={initialLocale === "ko" ? koMessages : enMessages}
          initialLocale={initialLocale}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <AuthRealtimeGuard />
            <AdminRealtimeToasts />
            <UserRealtimeToasts />
            <BanDialog />
            <Toaster richColors position="top-center" />
          </ThemeProvider>
        </LanguageProvider>
      </QueryProvider>
      <SpeedInsights />
      <Analytics />
    </>
  );
}
