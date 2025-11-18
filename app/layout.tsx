import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { cookies } from "next/headers";
import ClientLayout from "./client-layout";
import "./globals.css";
import { getSeoKeywords } from "./seo-keywords";
import { Metadata } from "next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const getLocale = async () => {
  try {
    const cookieStore = await cookies();
    const locale = cookieStore.get("locale")?.value;
    return locale === "en" ? "en" : "ko";
  } catch {
    return "ko";
  }
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const seo = getSeoKeywords(locale as "en" | "ko");

  return {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL || "https://www.weetoo.net"
    ),
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords.join(", "),
    authors: [{ name: "Weetoo Team" }],
    creator: "Weetoo",
    publisher: "Weetoo",
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    openGraph: {
      title: seo.openGraph.title,
      description: seo.openGraph.description,
      type: seo.openGraph.type,
      url: seo.openGraph.url,
      images: [
        {
          url: "/logo.png",
          width: 1200,
          height: 630,
          alt: "Weetoo Trading Platform",
        },
      ],
      locale: seo.openGraph.locale,
      alternateLocale: seo.openGraph.localeAlternate,
      siteName: seo.openGraph.siteName,
    },
    twitter: {
      card: seo.twitter.card,
      title: seo.twitter.title,
      description: seo.twitter.description,
    },
    alternates: {
      canonical: "/",
    },
    category: "Finance",
    classification: "Trading Platform",
    other: {
      "application-name": "Weetoo",
      "apple-mobile-web-app-title": "Weetoo",
      "apple-mobile-web-app-capable": "yes",
      "apple-mobile-web-app-status-bar-style": "default",
      "format-detection": "telephone=no",
      "mobile-web-app-capable": "yes",
      "msapplication-TileColor": "#000000",
      "msapplication-config": "/browserconfig.xml",
      "theme-color": "#000000",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="naver-site-verification"
          content="988018304a28b32de36b676cdaf2bcf8cc3dbe23"
        />
        <meta charSet="utf-8" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.__INITIAL_LOCALE__ = ${JSON.stringify(locale)};
              if (typeof Storage !== 'undefined' && !localStorage.getItem('locale')) {
                localStorage.setItem('locale', ${JSON.stringify(locale)});
              }
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning className={`bg-background`}>
        <Script
          src="https://cdn.portone.io/v2/browser-sdk.js"
          strategy="afterInteractive"
        />
        <ClientLayout initialLocale={locale}>{children}</ClientLayout>
      </body>
    </html>
  );
}
