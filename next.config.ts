import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./i18n.ts");

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    viewTransition: true,
  },
  images: {
    domains: [
      "source.unsplash.com",
      "images.unsplash.com",
      "picsum.photos",
      "lh3.googleusercontent.com",
      "elraqghnwdysyqskvqgn.supabase.co",
      "eethmghfrmkfjxeqjngd.supabase.co",
      "xmsnugwzpxrqzcmyplsd.supabase.co",
      "f1.tokenpost.kr",
    ],
  },
};

export default withNextIntl(nextConfig);
