"use client";

import { NextIntlClientProvider } from "next-intl";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { getSeoKeywords } from "@/app/seo-keywords";

type LanguageContextType = {
  locale: string;
  setLocale: (locale: string) => void;
};

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

export function LanguageProvider({
  children,
  messages,
  initialLocale,
}: {
  children: React.ReactNode;
  messages: any;
  initialLocale?: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const getInitialLocale = () => {
    if (typeof window !== "undefined") {
      return (
        (window as any).__INITIAL_LOCALE__ ||
        localStorage.getItem("locale") ||
        initialLocale ||
        "en"
      );
    }
    return initialLocale || "en";
  };

  const initialLocaleValue =
    initialLocale ||
    (typeof window !== "undefined" ? getInitialLocale() : "en");
  const [locale, setLocale] = useState(initialLocaleValue);
  const [clientMessages, setClientMessages] = useState(messages);

  const setLocaleCookie = (locale: string) => {
    document.cookie = `locale=${locale}; path=/; max-age=31536000; SameSite=Lax`;
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    document.documentElement.lang = locale;

    const seo = getSeoKeywords(locale as "en" | "ko");
    document.title = seo.title;

    if (!localStorage.getItem("locale")) {
      localStorage.setItem("locale", locale);
    }
  }, [locale]);

  const handleSetLocale = async (newLocale: string) => {
    const newMessages = await import(`../locales/${newLocale}.json`).then(
      (m) => m.default
    );

    const seo = getSeoKeywords(newLocale as "en" | "ko");
    document.title = seo.title;

    setLocale(newLocale);
    setClientMessages(newMessages);
    localStorage.setItem("locale", newLocale);
    setLocaleCookie(newLocale);
    document.documentElement.lang = newLocale;

    window.dispatchEvent(
      new CustomEvent("languageChanged", { detail: { locale: newLocale } })
    );

    startTransition(() => {
      router.refresh();
    });
  };

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "locale" && e.newValue && e.newValue !== locale) {
        handleSetLocale(e.newValue);
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, [locale]);

  return (
    <LanguageContext.Provider value={{ locale, setLocale: handleSetLocale }}>
      <NextIntlClientProvider
        messages={clientMessages}
        locale={locale}
        timeZone="Asia/Seoul"
      >
        {children}
      </NextIntlClientProvider>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
