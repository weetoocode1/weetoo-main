"use client";

import { useLanguage } from "@/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

export function LanguageToggle() {
  const { locale, setLocale } = useLanguage();

  const toggleLanguage = () => {
    const newLocale = locale === "en" ? "ko" : "en";
    setLocale(newLocale);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="items-center gap-2 hidden sm:flex"
    >
      <Globe className="h-4 w-4" />
      <span className="">{locale === "en" ? "한국어" : "EN"}</span>
    </Button>
  );
}
