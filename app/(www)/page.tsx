"use client";

import { FloatingBubble } from "@/components/floating-bubble";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { createClient } from "@/lib/supabase/client";
import Autoplay from "embla-carousel-autoplay";
import { motion } from "motion/react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useEffect } from "react";

export default function Home() {
  const { theme } = useTheme();

  useEffect(() => {
    const colorTheme = theme === "dark" ? "dark" : "light";
    // Remove any previous script if exists
    const prevScript = document.getElementById(
      "tradingview-ticker-tape-script"
    );
    if (prevScript) prevScript.remove();
    // Remove previous widget content
    const widget = document.getElementById("tradingview-ticker-tape");
    if (widget) widget.innerHTML = "";
    // Create script
    const script = document.createElement("script");
    script.id = "tradingview-ticker-tape-script";
    script.type = "text/javascript";
    script.async = true;
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
    script.innerHTML = JSON.stringify({
      symbols: [
        { proName: "FOREXCOM:SPXUSD", title: "S&P 500 Index" },
        { proName: "FOREXCOM:NSXUSD", title: "US 100 Cash CFD" },
        { proName: "FX_IDC:EURUSD", title: "EUR to USD" },
        { proName: "BITSTAMP:BTCUSD", title: "Bitcoin" },
        { proName: "BITSTAMP:ETHUSD", title: "Ethereum" },
      ],
      showSymbolLogo: true,
      isTransparent: false,
      displayMode: "compact",
      colorTheme,
      locale: "en",
    });
    const container = document.getElementById("tradingview-ticker-tape");
    if (container) container.appendChild(script);
    // Cleanup
    return () => {
      const prevScript = document.getElementById(
        "tradingview-ticker-tape-script"
      );
      if (prevScript) prevScript.remove();
      if (container) container.innerHTML = "";
    };
  }, [theme]);

  // Log Supabase user/session on mount
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data, error }) => {
      console.log("[Home] Supabase session:", { data, error });
    });
    supabase.auth.getUser().then(({ data, error }) => {
      console.log("[Home] Supabase user:", { data, error });
    });
  }, []);

  // Free Board Images
  const freeBoardImages = [
    "https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=400&q=80",
  ];
  // Education Board Images
  const educationBoardImages = [
    "https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1503676382389-4809596d5290?auto=format&fit=crop&w=400&q=80",
  ];
  // Profit Board Images
  const profitBoardImages = [
    "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1461344577544-4e5dc9487184?auto=format&fit=crop&w=400&q=80",
  ];

  return (
    <div className="h-full">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-blue-50 via-blue-100 to-blue-50 dark:from-black dark:via-gray-900 dark:to-black md:pt-10">
        {/* Centered Container for Bubbles and Content */}
        <div className="relative w-full max-w-6xl mx-auto">
          {/* Floating Abstract Shapes (background, optional) */}
          <motion.div
            className="absolute top-20 left-20 w-16 sm:w-24 md:w-32 h-16 sm:h-24 md:h-32 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 blur-xl"
            animate={{
              y: [0, -20, 0],
              x: [0, 10, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 8,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
          />

          {/* Floating Bubbles - now positioned relative to this container */}
          <FloatingBubble
            image="https://prod-tethermax.s3.ap-northeast-2.amazonaws.com/exchange/detail/ae5bc2dc-4a5d-48f6-8570-54e1ee6809dc.png"
            color="#00eaff"
            text="Bitget"
            subtext="70% Payback"
            size={90}
            className="absolute top-[30%] left-[-15%] z-30 md:block hidden"
          />
          <FloatingBubble
            image="https://prod-tethermax.s3.ap-northeast-2.amazonaws.com/exchange/icon/bybit.png"
            color="#f3c13a"
            text="Bybit"
            subtext="45% Payback"
            size={80}
            className="absolute top-[40%] right-[-15%] z-30 md:block hidden"
          />
          <FloatingBubble
            image="https://prod-tethermax.s3.ap-northeast-2.amazonaws.com/exchange/detail/69f51d45-f5a4-4134-89e5-d0a4294477fd.png"
            color="#e6007a"
            text="Gate"
            subtext="80% Payback"
            size={75}
            className="absolute bottom-[12%] left-[-20%] z-30 md:block hidden"
          />
          <FloatingBubble
            image="https://prod-tethermax.s3.ap-northeast-2.amazonaws.com/exchange/detail/fb401999-b8d8-4bbf-a5f7-b739f5c9e10d.png"
            color="#1ecb98"
            text="Mexc"
            subtext="50% Payback"
            size={70}
            className="absolute bottom-[12%] right-[-20%] z-30 md:block hidden"
          />
          <FloatingBubble
            image="https://prod-tethermax.s3.ap-northeast-2.amazonaws.com/exchange/icon/bingx.png"
            color="#2d7cff"
            text="BingX"
            subtext="60% Payback"
            size={65}
            className="absolute top-[8%] right-[-20%] z-30 md:block hidden"
          />
          <FloatingBubble
            image="https://prod-tethermax.s3.ap-northeast-2.amazonaws.com/exchange/detail/c340b25d-db6a-42bb-bb4b-bf72a90837b4.png"
            color="#4e9cff"
            text="Blofin"
            subtext="70% Payback"
            size={60}
            className="absolute top-[3%] left-[-20%] z-30 md:block hidden"
          />
          <FloatingBubble
            image="https://prod-tethermax.s3.ap-northeast-2.amazonaws.com/exchange/icon/okx.png"
            color="#222"
            text="OKX"
            subtext="50% Payback"
            size={70}
            className="absolute top-[-6%] left-1/2 -translate-x-1/2 z-30 md:block hidden"
          />

          {/* Animated Curved Lines (can remain as is, or move here if you want them to scale with content) */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 1200 800"
          >
            <defs>
              <linearGradient
                id="animatedGrad"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="rgba(59, 130, 246, 0.2)" />
                <stop offset="50%" stopColor="rgba(147, 51, 234, 0.2)" />
                <stop offset="100%" stopColor="rgba(59, 130, 246, 0.2)" />
              </linearGradient>
            </defs>
            <motion.path
              d="M0,600 Q600,400 1200,600"
              stroke="url(#animatedGrad)"
              strokeWidth="2"
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.6 }}
              transition={{ duration: 2, ease: "easeInOut" }}
            />
            <motion.path
              d="M0,650 Q600,450 1200,650"
              stroke="url(#animatedGrad)"
              strokeWidth="1"
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.4 }}
              transition={{ duration: 2.5, ease: "easeInOut", delay: 0.5 }}
            />
          </svg>

          {/* Animated Gradient Orbs (optional, can remain as is) */}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-r from-blue-500/8 via-purple-500/8 to-blue-500/8 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.8, 1, 0.8],
            }}
            transition={{
              duration: 4,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute top-1/3 left-1/3 w-[400px] h-[200px] bg-gradient-to-r from-purple-500/6 to-blue-500/6 rounded-full blur-2xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.6, 0.9, 0.6],
            }}
            transition={{
              duration: 5,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
              delay: 1,
            }}
          />

          {/* Content */}
          <div className="container mx-auto px-4 relative z-10">
            <div className="">
              <div className="text-center mb-12">
                <div className="container mx-auto">
                  {/* Hero Carousel Banner START */}
                  <Carousel
                    opts={{ loop: true }}
                    plugins={[
                      Autoplay({ delay: 3500, stopOnInteraction: false }),
                    ]}
                    className="w-full max-w-5xl mx-auto mb-8"
                  >
                    <CarouselContent>
                      {/* First banner: Minimal Welcome & Value Prop */}
                      <CarouselItem key={1}>
                        <div className="relative w-full h-[220px] sm:h-[260px] md:h-[320px] lg:h-[380px] flex flex-col md:flex-row justify-center rounded-2xl bg-gradient-to-br from-green-50/60 to-lime-50/40 dark:from-green-900/30 dark:to-lime-900/20 shadow-xl transition-colors duration-300 px-4 md:px-10 py-10 md:py-0 overflow-hidden">
                          <div className="flex flex-col justify-center items-start h-full z-10 max-w-[400px] w-full flex-1">
                            <div className="flex items-center gap-2 mb-4">
                              {/* Minimal trading icon (candlestick chart) */}
                              <svg
                                width="22"
                                height="22"
                                viewBox="0 0 22 22"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <rect
                                  x="2"
                                  y="10"
                                  width="2"
                                  height="7"
                                  rx="1"
                                  fill="#60A5FA"
                                />
                                <rect
                                  x="7"
                                  y="7"
                                  width="2"
                                  height="10"
                                  rx="1"
                                  fill="#6366F1"
                                />
                                <rect
                                  x="12"
                                  y="5"
                                  width="2"
                                  height="12"
                                  rx="1"
                                  fill="#A78BFA"
                                />
                                <rect
                                  x="17"
                                  y="13"
                                  width="2"
                                  height="4"
                                  rx="1"
                                  fill="#60A5FA"
                                />
                              </svg>
                              <span className="uppercase tracking-widest text-xs font-semibold text-gray-400 dark:text-gray-500">
                                TRADE SMARTER, TOGETHER
                              </span>
                            </div>
                            <div className="max-w-[400px] w-full">
                              <h2 className="w-full text-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-4 text-left">
                                Experience Next-Gen Trading with Weetoo
                              </h2>
                              <p className="w-full text-xs sm:text-sm md:text-base lg:text-lg text-gray-500 dark:text-gray-300 mb-4 sm:mb-8 text-left">
                                Join a vibrant community, learn, compete, and
                                grow your trading skills risk-free.
                              </p>
                            </div>
                            <Button
                              asChild
                              size="lg"
                              className="w-full md:w-auto rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold shadow-none h-12"
                            >
                              <Link href="/trading">Get Started</Link>
                            </Button>
                          </div>
                          {/* Right-side image illustration (only on md and up) */}
                          <div className="hidden lg:flex flex-1 items-center justify-end h-full z-10">
                            <img
                              src="/trading.svg"
                              alt="Trading dashboard illustration"
                              className="w-[440px] max-w-[440px] max-h-[500px] h-auto object-contain drop-shadow-xl"
                            />
                          </div>
                        </div>
                      </CarouselItem>
                      {/* Second and third banners: numbers only */}
                      <CarouselItem key={2}>
                        <div className="relative w-full h-[220px] sm:h-[260px] md:h-[320px] lg:h-[380px] flex flex-col md:flex-row justify-center rounded-2xl bg-gradient-to-br from-green-50/60 to-lime-50/40 dark:from-green-900/30 dark:to-lime-900/20 shadow-xl transition-colors duration-300 px-4 md:px-10 py-10 md:py-0 overflow-hidden">
                          <div className="flex flex-col justify-center items-start h-full z-10 max-w-[400px] w-full flex-1">
                            <div className="flex items-center gap-2 mb-4">
                              {/* Minimal icon: news (green theme) */}
                              <svg
                                width="22"
                                height="22"
                                viewBox="0 0 22 22"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <rect
                                  x="3"
                                  y="5"
                                  width="16"
                                  height="12"
                                  rx="2"
                                  fill="#22C55E"
                                />
                                <rect
                                  x="6"
                                  y="8"
                                  width="10"
                                  height="2"
                                  rx="1"
                                  fill="#A3E635"
                                />
                                <rect
                                  x="6"
                                  y="12"
                                  width="7"
                                  height="2"
                                  rx="1"
                                  fill="#4ADE80"
                                />
                              </svg>
                              <span className="uppercase tracking-widest text-xs font-semibold text-green-600 dark:text-green-400">
                                LATEST NEWS
                              </span>
                            </div>
                            <div className="max-w-[400px] w-full">
                              <h2 className="w-full text-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-4 text-left">
                                Stay Ahead with Real-Time Market News
                              </h2>
                              <p className="w-full text-xs sm:text-sm md:text-base lg:text-lg text-gray-500 dark:text-gray-300 mb-4 sm:mb-8 text-left">
                                Get the latest updates, trends, and insights
                                from the world of trading and finance.
                              </p>
                            </div>
                            <Button
                              asChild
                              size="lg"
                              className="w-full md:w-auto rounded-lg bg-green-600 hover:bg-green-700 text-white text-base font-semibold shadow-none h-12"
                            >
                              <Link href="/news">Read News</Link>
                            </Button>
                          </div>
                          {/* Right-side image illustration (only on md and up) */}
                          <div className="hidden lg:flex flex-1 items-center justify-end h-full z-10">
                            <img
                              src="/news.svg"
                              alt="News illustration"
                              className="w-[320px] max-w-[320px] max-h-[320px] h-auto object-contain drop-shadow-xl"
                            />
                          </div>
                        </div>
                      </CarouselItem>
                      <CarouselItem key={3}>
                        <div className="relative w-full h-[220px] sm:h-[260px] md:h-[320px] lg:h-[380px] flex flex-col md:flex-row justify-center rounded-2xl bg-gradient-to-br from-pink-50/60 to-purple-50/40 dark:from-pink-900/30 dark:to-purple-900/20 shadow-xl transition-colors duration-300 px-4 md:px-10 py-10 md:py-0 overflow-hidden">
                          <div className="flex flex-col justify-center items-start h-full z-10 max-w-[400px] w-full flex-1">
                            <div className="flex items-center gap-2 mb-4">
                              {/* Minimal icon: chat bubble */}
                              <svg
                                width="22"
                                height="22"
                                viewBox="0 0 22 22"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <rect
                                  x="3"
                                  y="6"
                                  width="16"
                                  height="10"
                                  rx="4"
                                  fill="#EC4899"
                                />
                                <ellipse
                                  cx="11"
                                  cy="11"
                                  rx="6"
                                  ry="3"
                                  fill="#A78BFA"
                                />
                                <circle cx="8" cy="11" r="1" fill="#F472B6" />
                                <circle cx="11" cy="11" r="1" fill="#F472B6" />
                                <circle cx="14" cy="11" r="1" fill="#F472B6" />
                              </svg>
                              <span className="uppercase tracking-widest text-xs font-semibold text-pink-600 dark:text-pink-400">
                                COMMUNITY POWER
                              </span>
                            </div>
                            <div className="max-w-[400px] w-full">
                              <h2 className="w-full text-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-4 text-left">
                                Connect, Share, and Grow Together
                              </h2>
                              <p className="w-full text-xs sm:text-sm md:text-base lg:text-lg text-gray-500 dark:text-gray-300 mb-4 sm:mb-8 text-left">
                                Join discussions, ask questions, and collaborate
                                with traders from around the world.
                              </p>
                            </div>
                            <Button
                              asChild
                              size="lg"
                              className="w-full md:w-auto rounded-lg bg-pink-600 hover:bg-pink-700 text-white text-base font-semibold shadow-none h-12"
                            >
                              <Link href="/board/free-board">
                                Visit Community
                              </Link>
                            </Button>
                          </div>
                          {/* Right-side image illustration (only on md and up) */}
                          <div className="hidden lg:flex flex-1 items-center justify-end h-full z-10">
                            <img
                              src="/community.svg"
                              alt="Community illustration"
                              className="w-[320px] max-w-[320px] max-h-[320px] h-auto object-contain drop-shadow-xl"
                            />
                          </div>
                        </div>
                      </CarouselItem>
                    </CarouselContent>
                  </Carousel>
                  {/* Hero Carousel Banner END */}

                  {/* Tradingview Ticker Tape */}
                  <motion.div
                    className="pt-4 max-w-5xl mx-auto"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.7 }}
                  >
                    <div
                      className="tradingview-widget-container"
                      style={{ minHeight: 50 }}
                    >
                      <div
                        className="tradingview-widget-container__widget"
                        id="tradingview-ticker-tape"
                      />
                    </div>
                  </motion.div>

                  {/* Trading Rooms Marquee */}
                  <div>
                    <motion.div
                      className="pt-4 w-full flex justify-center"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: 0.8 }}
                    >
                      <div className="w-full max-w-5xl">
                        <div className="relative overflow-hidden">
                          <div className="absolute left-0 top-4 z-10">
                            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                              Live Rooms
                            </Badge>
                          </div>
                          <div
                            className="marquee-track flex items-center gap-6 pl-36"
                            style={{ height: "300px" }}
                          >
                            <div className="marquee-inner flex items-center gap-6">
                              {(() => {
                                const rooms = [
                                  {
                                    name: "BTC Strategy Discussion",
                                    creator: { name: "Alex Thompson" },
                                    symbol: "BTCUSDT",
                                    category: "Chat",
                                    isPublic: true,
                                    participants: 24,
                                  },
                                  {
                                    name: "ETH Technical Analysis",
                                    creator: { name: "Sarah Kim" },
                                    symbol: "ETHUSDT",
                                    category: "Voice",
                                    isPublic: true,
                                    participants: 18,
                                  },
                                  {
                                    name: "Futures Trading Strategies",
                                    creator: { name: "Emma Wilson" },
                                    symbol: "BTCUSDT",
                                    category: "Chat",
                                    isPublic: true,
                                    participants: 15,
                                  },
                                  {
                                    name: "Day Trading Strategies",
                                    creator: { name: "William Taylor" },
                                    symbol: "BNBUSDT",
                                    category: "Voice",
                                    isPublic: true,
                                    participants: 19,
                                  },
                                  {
                                    name: "VIP BTC Room",
                                    creator: { name: "David Lee" },
                                    symbol: "BTCUSDT",
                                    category: "Voice",
                                    isPublic: false,
                                    participants: 9,
                                  },
                                  {
                                    name: "ETH Swing Group",
                                    creator: { name: "Olivia Brown" },
                                    symbol: "ETHUSDT",
                                    category: "Chat",
                                    isPublic: true,
                                    participants: 27,
                                  },
                                  {
                                    name: "BNB Quick Trades",
                                    creator: { name: "Sophia Garcia" },
                                    symbol: "BNBUSDT",
                                    category: "Chat",
                                    isPublic: false,
                                    participants: 12,
                                  },
                                  {
                                    name: "BTCUSDT Morning Brief",
                                    creator: { name: "Grace Hall" },
                                    symbol: "BTCUSDT",
                                    category: "Chat",
                                    isPublic: true,
                                    participants: 21,
                                  },
                                  {
                                    name: "ETHUSDT Pro Signals",
                                    creator: { name: "Ethan Wright" },
                                    symbol: "ETHUSDT",
                                    category: "Chat",
                                    isPublic: false,
                                    participants: 14,
                                  },
                                  {
                                    name: "BNBUSDT Insights",
                                    creator: { name: "Nina Patel" },
                                    symbol: "BNBUSDT",
                                    category: "Voice",
                                    isPublic: true,
                                    participants: 17,
                                  },
                                ];
                                const allRooms = [...rooms, ...rooms];
                                return allRooms.map((room, idx) => (
                                  <motion.div
                                    key={idx}
                                    whileHover={{
                                      scale: 1.035,
                                      boxShadow:
                                        "0 6px 28px 0 rgba(0,0,0,0.15)",
                                    }}
                                    whileTap={{ scale: 0.97 }}
                                    className={`flex flex-col justify-between min-w-[320px] max-w-[320px] h-[190px] rounded-2xl border transition-all duration-200 relative overflow-hidden p-6 shadow-lg 
                                      ${
                                        theme === "light"
                                          ? "bg-gradient-to-b from-white/90 to-blue-50/80 border-gray-200 text-gray-900"
                                          : "bg-gradient-to-b from-gray-900/60 to-gray-800/80 dark:from-gray-900/80 dark:to-gray-900/60 border-gray-700/40 text-white"
                                      }
                                    `}
                                  >
                                    <div className="flex items-center justify-between w-full mb-3">
                                      <span className="text-sm font-bold px-3 py-1.5 rounded-full bg-red-500 text-white">
                                        LIVE
                                      </span>
                                      <span
                                        className={`text-sm font-semibold px-3 py-1.5 rounded-full 
                                        ${
                                          theme === "light"
                                            ? "bg-gray-100 text-gray-700"
                                            : "bg-gray-800/80 text-gray-100 dark:bg-gray-700/80 dark:text-gray-200"
                                        }`}
                                      >
                                        {room.participants} participants
                                      </span>
                                    </div>
                                    <div className="flex flex-col flex-1 justify-start items-start text-left">
                                      <div
                                        className={`text-xl font-bold leading-tight mb-1 truncate w-full 
                                        ${
                                          theme === "light"
                                            ? "text-gray-900"
                                            : "text-white"
                                        }`}
                                      >
                                        {room.name}
                                      </div>
                                      <div
                                        className={`text-sm mb-3 truncate w-full 
                                        ${
                                          theme === "light"
                                            ? "text-gray-500"
                                            : "text-gray-400"
                                        }`}
                                      >
                                        by {room.creator.name}
                                      </div>
                                      <div
                                        className={`flex flex-wrap gap-2 mt-auto pt-2 border-t ${
                                          theme === "light"
                                            ? "border-gray-200"
                                            : "border-gray-700/30"
                                        }`}
                                      >
                                        <span
                                          className={`text-xs font-medium px-3 py-1 rounded-full tracking-wide 
                                          ${
                                            theme === "light"
                                              ? "bg-blue-100 text-blue-700"
                                              : "bg-blue-600/20 text-blue-400"
                                          }`}
                                        >
                                          {room.symbol}
                                        </span>
                                        <span
                                          className={`text-xs font-medium px-3 py-1 rounded-full tracking-wide 
                                          ${
                                            theme === "light"
                                              ? "bg-purple-100 text-purple-700"
                                              : "bg-purple-600/20 text-purple-300"
                                          }`}
                                        >
                                          {room.category}
                                        </span>
                                        <span
                                          className={`text-xs font-medium px-3 py-1 rounded-full tracking-wide 
                                          ${
                                            room.isPublic
                                              ? theme === "light"
                                                ? "bg-green-100 text-green-700"
                                                : "bg-green-600/20 text-green-300"
                                              : theme === "light"
                                              ? "bg-yellow-100 text-yellow-700"
                                              : "bg-yellow-600/20 text-yellow-200"
                                          }`}
                                        >
                                          {room.isPublic ? "Public" : "Private"}
                                        </span>
                                      </div>
                                    </div>
                                  </motion.div>
                                ));
                              })()}
                            </div>
                          </div>
                          {/* Marquee animation overlay for fade effect */}
                          <div className="pointer-events-none absolute top-0 left-0 w-[70%] h-full bg-gradient-to-r from-blue-50/0 to-transparent dark:from-black/0 z-20" />
                          <div className="pointer-events-none absolute top-0 right-0 w-[70%] h-full bg-gradient-to-l from-blue-50/0 to-transparent dark:from-black/0 z-20" />
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Rankings Section */}
      <section className="py-12 sm:py-16 md:py-24 relative overflow-hidden bg-gradient-to-b from-blue-50 to-blue-100 dark:from-black dark:to-gray-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.05),transparent_50%)]"></div>
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <Badge className="mb-4 bg-green-100 text-green-700 border border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20 px-4 py-1.5 text-sm">
              Top Performers
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Community Leaderboards
            </h2>
            <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto px-4 sm:px-0">
              See who&apos;s leading the pack in different categories and get
              inspired to climb the ranks.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm border border-gray-200/50 dark:border-slate-700/50 rounded-2xl overflow-hidden shadow-xl"
          >
            <div className="grid grid-cols-1 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-gray-200 dark:divide-slate-700/50">
              {/* Return Rate */}
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200 dark:border-slate-700/30">
                  <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-gray-900 dark:text-white font-semibold text-lg">
                      Return Rate
                    </h3>
                    <p className="text-gray-500 dark:text-slate-400 text-sm">
                      Weekly Performance
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      rank: 1,
                      name: "Alex Chen",
                      value: "+95.0%",
                      change: "(+2.1%)",
                      color: "text-emerald-600 dark:text-emerald-400",
                    },
                    {
                      rank: 2,
                      name: "Sarah Kim",
                      value: "+90.0%",
                      change: "(+1.8%)",
                      color: "text-emerald-600 dark:text-emerald-400",
                    },
                    {
                      rank: 3,
                      name: "Mike Ross",
                      value: "+85.0%",
                      change: "(+1.5%)",
                      color: "text-emerald-600 dark:text-emerald-400",
                    },
                    {
                      rank: 4,
                      name: "Emma Liu",
                      value: "+80.0%",
                      change: "(+1.2%)",
                      color: "text-emerald-600 dark:text-emerald-400",
                    },
                    {
                      rank: 5,
                      name: "John Doe",
                      value: "+75.0%",
                      change: "(+0.9%)",
                      color: "text-emerald-600 dark:text-emerald-400",
                    },
                  ].map((trader) => (
                    <div key={trader.rank} className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          trader.rank === 1
                            ? "bg-yellow-500 text-black"
                            : trader.rank === 2
                            ? "bg-gray-400 text-black"
                            : trader.rank === 3
                            ? "bg-orange-500 text-black"
                            : "bg-gray-300 dark:bg-slate-600 text-gray-700 dark:text-white"
                        }`}
                      >
                        {trader.rank}
                      </div>
                      <div className="w-8 h-8 bg-gray-300 dark:bg-slate-600 rounded-full"></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 dark:text-white font-medium text-sm truncate">
                          {trader.name}
                        </p>
                        <div className="flex items-center gap-1">
                          <span
                            className={`font-semibold text-sm ${trader.color}`}
                          >
                            {trader.value}
                          </span>
                          <span className="text-gray-500 dark:text-slate-400 text-xs">
                            {trader.change}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Virtual Money */}
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200 dark:border-slate-700/30">
                  <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-gray-900 dark:text-white font-semibold text-lg">
                      Virtual Money
                    </h3>
                    <p className="text-gray-500 dark:text-slate-400 text-sm">
                      Total Holdings
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      rank: 1,
                      name: "David Park",
                      value: "$900K",
                      change: "(+$50K)",
                      color: "text-blue-600 dark:text-blue-400",
                    },
                    {
                      rank: 2,
                      name: "Lisa Wang",
                      value: "$800K",
                      change: "(+$40K)",
                      color: "text-blue-600 dark:text-blue-400",
                    },
                    {
                      rank: 3,
                      name: "Tom Smith",
                      value: "$700K",
                      change: "(+$35K)",
                      color: "text-blue-600 dark:text-blue-400",
                    },
                    {
                      rank: 4,
                      name: "Anna Lee",
                      value: "$600K",
                      change: "(+$30K)",
                      color: "text-blue-600 dark:text-blue-400",
                    },
                    {
                      rank: 5,
                      name: "Chris Wu",
                      value: "$500K",
                      change: "(+$25K)",
                      color: "text-blue-600 dark:text-blue-400",
                    },
                  ].map((trader) => (
                    <div key={trader.rank} className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          trader.rank === 1
                            ? "bg-yellow-500 text-black"
                            : trader.rank === 2
                            ? "bg-gray-400 text-black"
                            : trader.rank === 3
                            ? "bg-orange-500 text-black"
                            : "bg-gray-300 dark:bg-slate-600 text-gray-700 dark:text-white"
                        }`}
                      >
                        {trader.rank}
                      </div>
                      <div className="w-8 h-8 bg-gray-300 dark:bg-slate-600 rounded-full"></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 dark:text-white font-medium text-sm truncate">
                          {trader.name}
                        </p>
                        <div className="flex items-center gap-1">
                          <span
                            className={`font-semibold text-sm ${trader.color}`}
                          >
                            {trader.value}
                          </span>
                          <span className="text-gray-500 dark:text-slate-400 text-xs">
                            {trader.change}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activity XP */}
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200 dark:border-slate-700/30">
                  <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-gray-900 dark:text-white font-semibold text-lg">
                      Activity (XP)
                    </h3>
                    <p className="text-gray-500 dark:text-slate-400 text-sm">
                      Monthly Points
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      rank: 1,
                      name: "Ryan Kim",
                      value: "9000 XP",
                      change: "(+500 XP)",
                      color: "text-purple-600 dark:text-purple-400",
                    },
                    {
                      rank: 2,
                      name: "Maya Patel",
                      value: "8000 XP",
                      change: "(+450 XP)",
                      color: "text-purple-600 dark:text-purple-400",
                    },
                    {
                      rank: 3,
                      name: "Jake Wilson",
                      value: "7000 XP",
                      change: "(+400 XP)",
                      color: "text-purple-600 dark:text-purple-400",
                    },
                    {
                      rank: 4,
                      name: "Zoe Chen",
                      value: "6000 XP",
                      change: "(+350 XP)",
                      color: "text-purple-600 dark:text-purple-400",
                    },
                    {
                      rank: 5,
                      name: "Alex Brown",
                      value: "5000 XP",
                      change: "(+300 XP)",
                      color: "text-purple-600 dark:text-purple-400",
                    },
                  ].map((trader) => (
                    <div key={trader.rank} className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          trader.rank === 1
                            ? "bg-yellow-500 text-black"
                            : trader.rank === 2
                            ? "bg-gray-400 text-black"
                            : trader.rank === 3
                            ? "bg-orange-500 text-black"
                            : "bg-gray-300 dark:bg-slate-600 text-gray-700 dark:text-white"
                        }`}
                      >
                        {trader.rank}
                      </div>
                      <div className="w-8 h-8 bg-gray-300 dark:bg-slate-600 rounded-full"></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 dark:text-white font-medium text-sm truncate">
                          {trader.name}
                        </p>
                        <div className="flex items-center gap-1">
                          <span
                            className={`font-semibold text-sm ${trader.color}`}
                          >
                            {trader.value}
                          </span>
                          <span className="text-gray-500 dark:text-slate-400 text-xs">
                            {trader.change}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sponsored */}
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200 dark:border-slate-700/30">
                  <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-gray-900 dark:text-white font-semibold text-lg">
                      Sponsored
                    </h3>
                    <p className="text-gray-500 dark:text-slate-400 text-sm">
                      Kor Coins
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      rank: 1,
                      name: "Kevin Lee",
                      value: "4500 coins",
                      change: "(++250)",
                      color: "text-orange-600 dark:text-orange-400",
                    },
                    {
                      rank: 2,
                      name: "Sophie Zhang",
                      value: "4000 coins",
                      change: "(++200)",
                      color: "text-orange-600 dark:text-orange-400",
                    },
                    {
                      rank: 3,
                      name: "Marcus Johnson",
                      value: "3500 coins",
                      change: "(++175)",
                      color: "text-orange-600 dark:text-orange-400",
                    },
                    {
                      rank: 4,
                      name: "Nina Rodriguez",
                      value: "3000 coins",
                      change: "(++150)",
                      color: "text-orange-600 dark:text-orange-400",
                    },
                    {
                      rank: 5,
                      name: "Oliver Kim",
                      value: "2500 coins",
                      change: "(++125)",
                      color: "text-orange-600 dark:text-orange-400",
                    },
                  ].map((trader) => (
                    <div key={trader.rank} className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          trader.rank === 1
                            ? "bg-yellow-500 text-black"
                            : trader.rank === 2
                            ? "bg-gray-400 text-black"
                            : trader.rank === 3
                            ? "bg-orange-500 text-black"
                            : "bg-gray-300 dark:bg-slate-600 text-gray-700 dark:text-white"
                        }`}
                      >
                        {trader.rank}
                      </div>
                      <div className="w-8 h-8 bg-gray-300 dark:bg-slate-600 rounded-full"></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 dark:text-white font-medium text-sm truncate">
                          {trader.name}
                        </p>
                        <div className="flex items-center gap-1">
                          <span
                            className={`font-semibold text-sm ${trader.color}`}
                          >
                            {trader.value}
                          </span>
                          <span className="text-gray-500 dark:text-slate-400 text-xs">
                            {trader.change}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Most Followed */}
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200 dark:border-slate-700/30">
                  <div className="w-10 h-10 bg-pink-500 rounded-xl flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-gray-900 dark:text-white font-semibold text-lg">
                      Most Followed
                    </h3>
                    <p className="text-gray-500 dark:text-slate-400 text-sm">
                      Social Ranking
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      rank: 1,
                      name: "Isabella Garcia",
                      value: "9K followers",
                      change: "(++500)",
                      color: "text-pink-600 dark:text-pink-400",
                    },
                    {
                      rank: 2,
                      name: "James Wilson",
                      value: "8K followers",
                      change: "(++450)",
                      color: "text-pink-600 dark:text-pink-400",
                    },
                    {
                      rank: 3,
                      name: "Aria Patel",
                      value: "7K followers",
                      change: "(++400)",
                      color: "text-pink-600 dark:text-pink-400",
                    },
                    {
                      rank: 4,
                      name: "Lucas Chen",
                      value: "6K followers",
                      change: "(++350)",
                      color: "text-pink-600 dark:text-pink-400",
                    },
                    {
                      rank: 5,
                      name: "Mia Thompson",
                      value: "5K followers",
                      change: "(++300)",
                      color: "text-pink-600 dark:text-pink-400",
                    },
                  ].map((trader) => (
                    <div key={trader.rank} className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          trader.rank === 1
                            ? "bg-yellow-500 text-black"
                            : trader.rank === 2
                            ? "bg-gray-400 text-black"
                            : trader.rank === 3
                            ? "bg-orange-500 text-black"
                            : "bg-gray-300 dark:bg-slate-600 text-gray-700 dark:text-white"
                        }`}
                      >
                        {trader.rank}
                      </div>
                      <div className="w-8 h-8 bg-gray-300 dark:bg-slate-600 rounded-full"></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 dark:text-white font-medium text-sm truncate">
                          {trader.name}
                        </p>
                        <div className="flex items-center gap-1">
                          <span
                            className={`font-semibold text-sm ${trader.color}`}
                          >
                            {trader.value}
                          </span>
                          <span className="text-gray-500 dark:text-slate-400 text-xs">
                            {trader.change}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Boards Section */}
      <section className="py-16 sm:py-24 md:py-32 relative bg-gradient-to-b from-blue-50 to-blue-100 dark:from-gray-900 dark:to-black">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.05),transparent_50%)]"></div>
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <Badge className="mb-4 bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20 px-4 py-1.5 text-sm">
              Community Boards
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Trading Community
            </h2>
            <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto px-4 sm:px-0">
              Join our vibrant community of traders and share your insights.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-2">
            {/* Free Board */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="bg-white/60 border-gray-200 p-6 shadow-lg hover:shadow-green-300/50 transition-shadow duration-300 dark:bg-gray-800/60 dark:border-gray-700 dark:hover:shadow-green-500/20">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Free Board
                  </h3>
                  <Badge
                    variant="secondary"
                    className="bg-green-200 text-green-800 border border-green-300 dark:bg-green-500/15 dark:text-green-400 dark:border-green-500/25"
                  >
                    Public
                  </Badge>
                </div>
                <div className="space-y-4">
                  {[1, 2, 3].map((post, idx) => (
                    <div
                      key={post}
                      className="relative bg-white dark:bg-gray-900/70 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-2xl transition-all duration-300 flex flex-col overflow-hidden group"
                    >
                      <div className="relative w-full h-40 overflow-hidden">
                        <img
                          src={freeBoardImages[idx]}
                          alt={`Free Board Post ${post}`}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                        <span className="absolute top-3 left-3 bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-md z-10">
                          Free Board
                        </span>
                      </div>
                      <div className="flex-1 flex flex-col px-5 pt-4 pb-4">
                        <span className="bg-transparent px-0 py-0 rounded text-base font-bold text-gray-900 dark:text-white shadow-none mb-1 line-clamp-1">
                          Post Title {post}
                        </span>
                        <p className="text-gray-700 dark:text-gray-300 text-sm mb-2 line-clamp-2">
                          This is a small description for post {post} on the
                          Free Board.
                        </p>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border-2 border-white dark:border-gray-800 shadow -ml-1" />
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900 dark:text-white text-sm leading-tight">
                              Trader {post}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
                              2 hours ago
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>

            {/* Education Board */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <Card className="bg-white/60 border-gray-200 p-6 shadow-lg hover:shadow-blue-300/50 transition-shadow duration-300 dark:bg-gray-800/60 dark:border-gray-700 dark:hover:shadow-blue-500/20">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Education Board
                  </h3>
                  <Badge
                    variant="secondary"
                    className="bg-blue-200 text-blue-800 border border-blue-300 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/25"
                  >
                    Learning
                  </Badge>
                </div>
                <div className="space-y-4">
                  {[1, 2, 3].map((post, idx) => (
                    <div
                      key={post}
                      className="relative bg-white dark:bg-gray-900/70 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-2xl transition-all duration-300 flex flex-col overflow-hidden group"
                    >
                      <div className="relative w-full h-40 overflow-hidden">
                        <img
                          src={educationBoardImages[idx]}
                          alt={`Education Board Post ${post}`}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-blue-900/60 via-blue-900/10 to-transparent" />
                        <span className="absolute top-3 left-3 bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-md z-10">
                          Education Board
                        </span>
                      </div>
                      <div className="flex-1 flex flex-col px-5 pt-4 pb-4">
                        <span className="bg-transparent px-0 py-0 rounded text-base font-bold text-gray-900 dark:text-white shadow-none mb-1 line-clamp-1">
                          Post Title {post}
                        </span>
                        <p className="text-gray-700 dark:text-gray-300 text-sm mb-2 line-clamp-2">
                          This is a small description for post {post} on the
                          Education Board.
                        </p>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border-2 border-white dark:border-gray-800 shadow -ml-1" />
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900 dark:text-white text-sm leading-tight">
                              Expert {post}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
                              1 day ago
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>

            {/* Profit Board */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
            >
              <Card className="bg-white/60 border-gray-200 p-6 shadow-lg hover:shadow-purple-300/50 transition-shadow duration-300 dark:bg-gray-800/60 dark:border-gray-700 dark:hover:shadow-purple-500/20">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Profit Board
                  </h3>
                  <Badge
                    variant="secondary"
                    className="bg-purple-200 text-purple-800 border border-purple-300 dark:bg-purple-500/15 dark:text-purple-400 dark:border-purple-500/25"
                  >
                    Success
                  </Badge>
                </div>
                <div className="space-y-4">
                  {[1, 2, 3].map((post, idx) => (
                    <div
                      key={post}
                      className="relative bg-white dark:bg-gray-900/70 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-2xl transition-all duration-300 flex flex-col overflow-hidden group"
                    >
                      <div className="relative w-full h-40 overflow-hidden">
                        <img
                          src={profitBoardImages[idx]}
                          alt={`Profit Board Post ${post}`}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-purple-900/60 via-purple-900/10 to-transparent" />
                        <span className="absolute top-3 left-3 bg-purple-600 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-md z-10">
                          Profit Board
                        </span>
                      </div>
                      <div className="flex-1 flex flex-col px-5 pt-4 pb-4">
                        <span className="bg-transparent px-0 py-0 rounded text-base font-bold text-gray-900 dark:text-white shadow-none mb-1 line-clamp-1">
                          Post Title {post}
                        </span>
                        <p className="text-gray-700 dark:text-gray-300 text-sm mb-2 line-clamp-2">
                          This is a small description for post {post} on the
                          Profit Board.
                        </p>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border-2 border-white dark:border-gray-800 shadow -ml-1" />
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900 dark:text-white text-sm leading-tight">
                              Pro Trader {post}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
                              3 hours ago
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24 md:py-32 relative bg-gradient-to-b from-blue-50 to-blue-100 dark:from-black dark:to-gray-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.05),transparent_50%)]"></div>
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            className="max-w-4xl mx-auto text-center"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <Badge className="mb-4 bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20 px-4 py-1.5 text-sm">
              Start Your Journey
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-6">
              Ready to Master Trading?
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto px-4 sm:px-0">
              Join thousands of traders who are already learning and earning
              through our simulation platform.
            </p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-gradient-to-r dark:from-blue-600 dark:to-purple-600 dark:hover:from-blue-700 dark:hover:to-purple-700 dark:text-white px-8 py-6 text-lg rounded-xl"
                asChild
              >
                <Link href="/trading">Get Started Now</Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
