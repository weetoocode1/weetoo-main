"use client";

import { LanguageProvider } from "@/providers/language-provider";
import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { AdminRealtimeToasts } from "@/components/realtime/admin-realtime-toasts";
import { UserRealtimeToasts } from "@/components/user/user-realtime-toasts";
import { useEffect, useState } from "react";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import enMessages from "../locales/en.json";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [currentLang, setCurrentLang] = useState("en");

  // Update language when component mounts or language changes
  useEffect(() => {
    const savedLocale = localStorage.getItem("locale") || "en";
    setCurrentLang(savedLocale);

    // Update HTML lang attribute
    document.documentElement.lang = savedLocale;

    // Listen for language changes
    const handleLanguageChange = () => {
      const newLocale = localStorage.getItem("locale") || "en";
      setCurrentLang(newLocale);
      document.documentElement.lang = newLocale;
    };

    window.addEventListener("storage", handleLanguageChange);

    // Also listen for custom events if language changes within the same window
    const handleCustomLanguageChange = (event: CustomEvent) => {
      const newLocale = event.detail?.locale || "en";
      setCurrentLang(newLocale);
      document.documentElement.lang = newLocale;
    };

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
  }, []);

  return (
    <html
      lang={currentLang}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charSet="utf-8" />
      </head>
      <body className={`bg-background`}>
        <Script
          src="https://cdn.portone.io/v2/browser-sdk.js"
          strategy="afterInteractive"
        />
        <QueryProvider>
          <LanguageProvider messages={enMessages}>
            <ThemeProvider
              attribute="class"
              defaultTheme="dark"
              enableSystem
              disableTransitionOnChange
            >
              {children}
              <AdminRealtimeToasts />
              <UserRealtimeToasts />
              <Toaster richColors position="top-center" />
            </ThemeProvider>
          </LanguageProvider>
        </QueryProvider>

        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
