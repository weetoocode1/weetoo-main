"use client";

import { FloatingBubble } from "@/components/floating-bubble";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { motion } from "motion/react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useEffect } from "react";

export function HeroSection() {
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

  return (
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
          image="/broker/bitget.png"
          color="#00eaff"
          text="Bitget"
          subtext="70% Payback"
          size={90}
          className="absolute top-[30%] left-[-15%] z-30 md:block hidden"
        />
        <FloatingBubble
          image="/broker/bybit.png"
          color="#f3c13a"
          text="Bybit"
          subtext="45% Payback"
          size={80}
          className="absolute top-[40%] right-[-15%] z-30 md:block hidden"
        />
        <FloatingBubble
          image="/broker/gate.png"
          color="#e6007a"
          text="Gate"
          subtext="80% Payback"
          size={75}
          className="absolute bottom-[12%] left-[-20%] z-30 md:block hidden"
        />
        <FloatingBubble
          image="/broker/mexc.png"
          color="#1ecb98"
          text="Mexc"
          subtext="50% Payback"
          size={70}
          className="absolute bottom-[12%] right-[-20%] z-30 md:block hidden"
        />
        <FloatingBubble
          image="/broker/bingx.png"
          color="#2d7cff"
          text="BingX"
          subtext="60% Payback"
          size={65}
          className="absolute top-[8%] right-[-20%] z-30 md:block hidden"
        />
        <FloatingBubble
          image="/broker/blofin.png"
          color="#4e9cff"
          text="Blofin"
          subtext="70% Payback"
          size={60}
          className="absolute top-[3%] left-[-20%] z-30 md:block hidden"
        />
        <FloatingBubble
          image="/broker/okx.png"
          color="#222"
          text="OKX"
          subtext="50% Payback"
          size={70}
          className="absolute top-[-6%] left-1/2 -translate-x-1/2 z-30 md:block hidden"
        />

        {/* Animated Curved Lines (can remain as is, or move here if you want them to scale with content) */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1200 800">
          <defs>
            <linearGradient id="animatedGrad" x1="0%" y1="0%" x2="100%" y2="0%">
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
                              Join a vibrant community, learn, compete, and grow
                              your trading skills risk-free.
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
                              Get the latest updates, trends, and insights from
                              the world of trading and finance.
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
                                    boxShadow: "0 6px 28px 0 rgba(0,0,0,0.15)",
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
  );
}
