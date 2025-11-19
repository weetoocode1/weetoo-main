import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n.ts");

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    viewTransition: true,
  },

  webpack: (config, { isServer }) => {
    // Exclude Node.js-only packages from client-side bundling
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        undici: false,
        "https-proxy-agent": false,
        crypto: false,
        fs: false,
        net: false,
        tls: false,
        assert: false,
        async_hooks: false,
        buffer: false,
        console: false,
      };
    }
    return config;
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
      {
        protocol: "https",
        hostname: "image.mux.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
