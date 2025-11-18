import { notFound } from "next/navigation";
import { getRequestConfig } from "next-intl/server";

export const locales = ["en", "ko"] as const;
export const defaultLocale = "ko" as const;

export type Locale = (typeof locales)[number];

export default getRequestConfig(async ({ locale }) => {
  if (!locales.includes(locale as any)) notFound();

  return {
    messages: (await import(`./locales/${locale}.json`)).default,
    locale: locale as string,
    timeZone: "Asia/Seoul",
    now: new Date(),
  };
});
