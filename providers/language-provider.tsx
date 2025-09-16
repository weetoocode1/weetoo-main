"use client";

import { NextIntlClientProvider } from "next-intl";
import { createContext, useContext, useEffect, useState } from "react";

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
}: {
  children: React.ReactNode;
  messages: any;
}) {
  const [locale, setLocale] = useState("en");
  const [clientMessages, setClientMessages] = useState(messages);

  useEffect(() => {
    // Detect browser language on mount
    const browserLang = navigator.language.split("-")[0];
    const detectedLocale = browserLang === "ko" ? "ko" : "en";

    // Check if user has a saved preference
    const savedLocale = localStorage.getItem("locale");
    const initialLocale = savedLocale || detectedLocale;

    setLocale(initialLocale);

    // Update HTML lang attribute
    document.documentElement.lang = initialLocale;

    // Load messages for the detected locale
    if (initialLocale !== "en") {
      import(`../locales/${initialLocale}.json`).then((module) => {
        const newMessages = module.default;
        setClientMessages(newMessages);
      });
    }
  }, []);

  // Sync locale changes across tabs via localStorage events only
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

  const handleSetLocale = async (newLocale: string) => {
    setLocale(newLocale);
    localStorage.setItem("locale", newLocale);

    // Update HTML lang attribute
    document.documentElement.lang = newLocale;

    // Load messages for the new locale
    if (newLocale === "en") {
      setClientMessages(messages);
    } else {
      const newMessages = await import(`../locales/${newLocale}.json`).then(
        (m) => m.default
      );
      setClientMessages(newMessages);
    }
  };

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
