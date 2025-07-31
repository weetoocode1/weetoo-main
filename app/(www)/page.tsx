import { Metadata } from "next";
import { HomeClient } from "./page-client";
import { seoKeywords } from "./seo-keywords";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.weetoo.net"
  ),
  title: seoKeywords.title,
  description: seoKeywords.description,
  keywords: seoKeywords.keywords.join(", "),
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
    ...seoKeywords.openGraph,
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "Weetoo Trading Platform",
      },
    ],
  },
  twitter: seoKeywords.twitter,
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

export default function Home() {
  return <HomeClient />;
}
