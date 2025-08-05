import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./i18n.ts");

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    viewTransition: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "source.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "elraqghnwdysyqskvqgn.supabase.co",
      },
      {
        protocol: "https",
        hostname: "eethmghfrmkfjxeqjngd.supabase.co",
      },
      {
        protocol: "https",
        hostname: "xmsnugwzpxrqzcmyplsd.supabase.co",
      },
      {
        protocol: "https",
        hostname: "f1.tokenpost.kr",
      },
    ],
  },
};

export default withNextIntl(nextConfig);
