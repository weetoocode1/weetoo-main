import enMessages from "../locales/en.json";
import koMessages from "../locales/ko.json";

type Locale = "en" | "ko";

export const getSeoKeywords = (locale: Locale = "en") => {
  const messages = locale === "ko" ? koMessages : enMessages;
  const seo = messages.seo;

  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    openGraph: {
      title: seo.openGraph.title,
      description: seo.openGraph.description,
      type: "website" as const,
      url: "https://www.weetoo.net",
      image: "https://www.weetoo.net/og-image.jpg",
      locale: locale === "ko" ? "ko_KR" : "en_US",
      localeAlternate: locale === "ko" ? "en_US" : "ko_KR",
      siteName: seo.openGraph.siteName,
    },
    twitter: {
      card: "summary_large_image" as const,
      title: seo.twitter.title,
      description: seo.twitter.description,
    },
  };
};
