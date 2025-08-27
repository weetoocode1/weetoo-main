"use client";

import { FloatingBubble } from "@/components/floating-bubble";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { tradingRooms } from "./rooms-data";

export function HeroSection() {
  const { theme } = useTheme();
  const t = useTranslations("hero");
  const b = useTranslations("brokers");
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const marqueeRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleRoomClick = () => {
    router.push("/trading");
  };

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
      // Clear timeout on unmount
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [theme]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.pageX - (marqueeRef.current?.offsetLeft || 0));
    setScrollLeft(marqueeRef.current?.scrollLeft || 0);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    // Add a small delay before allowing scroll reset
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      // Allow scroll reset after a brief delay
    }, 100);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - (marqueeRef.current?.offsetLeft || 0);
    const walk = (x - startX) * 2; // Multiply by 2 for faster scrolling
    if (marqueeRef.current) {
      marqueeRef.current.scrollLeft = scrollLeft - walk;
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartX(e.touches[0].pageX - (marqueeRef.current?.offsetLeft || 0));
    setScrollLeft(marqueeRef.current?.scrollLeft || 0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const x = e.touches[0].pageX - (marqueeRef.current?.offsetLeft || 0);
    const walk = (x - startX) * 2;
    if (marqueeRef.current) {
      marqueeRef.current.scrollLeft = scrollLeft - walk;
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    // Add a small delay before allowing scroll reset
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      // Allow scroll reset after a brief delay
    }, 100);
  };

  // Create multiple sets to ensure seamless looping
  const allRooms = [
    ...tradingRooms,
    ...tradingRooms,
    ...tradingRooms,
    ...tradingRooms,
  ];

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
          subtext={`70% ${b("payback")}`}
          size={90}
          className="absolute top-[30%] left-[-15%] z-30 md:block hidden"
        />
        <FloatingBubble
          image="/broker/bybit.png"
          color="#f3c13a"
          text="Bybit"
          subtext={`45% ${b("payback")}`}
          size={80}
          className="absolute top-[40%] right-[-15%] z-30 md:block hidden"
        />
        <FloatingBubble
          image="/broker/gate.png"
          color="#e6007a"
          text="Gate"
          subtext={`80% ${b("payback")}`}
          size={75}
          className="absolute bottom-[12%] left-[-20%] z-30 md:block hidden"
        />
        <FloatingBubble
          image="/broker/mexc.png"
          color="#1ecb98"
          text="Mexc"
          subtext={`50% ${b("payback")}`}
          size={70}
          className="absolute bottom-[12%] right-[-20%] z-30 md:block hidden"
        />
        <FloatingBubble
          image="/broker/bingx.png"
          color="#2d7cff"
          text="BingX"
          subtext={`60% ${b("payback")}`}
          size={65}
          className="absolute top-[8%] right-[-20%] z-30 md:block hidden"
        />
        <FloatingBubble
          image="/broker/blofin.png"
          color="#4e9cff"
          text="Blofin"
          subtext={`70% ${b("payback")}`}
          size={60}
          className="absolute top-[3%] left-[-20%] z-30 md:block hidden"
        />
        <FloatingBubble
          image="/broker/okx.png"
          color="#222"
          text="OKX"
          subtext={`50% ${b("payback")}`}
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
                              {t("tradeSmarter")}
                            </span>
                          </div>
                          <div className="max-w-[400px] w-full">
                            <h2 className="w-full text-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-4 text-left">
                              {t("experienceNextGen")}
                            </h2>
                            <p className="w-full text-xs sm:text-sm md:text-base lg:text-lg text-gray-500 dark:text-gray-300 mb-4 sm:mb-8 text-left">
                              {t("joinCommunity")}
                            </p>
                          </div>
                          <Button
                            asChild
                            size="lg"
                            className="w-full md:w-auto rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold shadow-none h-12"
                          >
                            <Link href="/trading">{t("getStarted")}</Link>
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
                              {t("latestNews")}
                            </span>
                          </div>
                          <div className="max-w-[400px] w-full">
                            <h2 className="w-full text-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-4 text-left">
                              {t("stayAhead")}
                            </h2>
                            <p className="w-full text-xs sm:text-sm md:text-base lg:text-lg text-gray-500 dark:text-gray-300 mb-4 sm:mb-8 text-left">
                              {t("getLatestUpdates")}
                            </p>
                          </div>
                          <Button
                            asChild
                            size="lg"
                            className="w-full md:w-auto rounded-lg bg-green-600 hover:bg-green-700 text-white text-base font-semibold shadow-none h-12"
                          >
                            <Link href="/news">{t("readNews")}</Link>
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
                              {t("communityPower")}
                            </span>
                          </div>
                          <div className="max-w-[400px] w-full">
                            <h2 className="w-full text-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-4 text-left">
                              {t("connectShare")}
                            </h2>
                            <p className="w-full text-xs sm:text-sm md:text-base lg:text-lg text-gray-500 dark:text-gray-300 mb-4 sm:mb-8 text-left">
                              {t("joinDiscussions")}
                            </p>
                          </div>
                          <Button
                            asChild
                            size="lg"
                            className="w-full md:w-auto rounded-lg bg-pink-600 hover:bg-pink-700 text-white text-base font-semibold shadow-none h-12"
                          >
                            <Link href="/board/free-board">
                              {t("visitCommunity")}
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
                  className=" max-w-5xl mx-auto"
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
                            {t("liveRooms")}
                          </Badge>
                        </div>

                        <div
                          ref={marqueeRef}
                          className={`marquee-track flex items-center gap-4 pl-36 overflow-hidden ${
                            isDragging ? "paused" : ""
                          }`}
                          style={{
                            height: "320px",
                            cursor: isDragging ? "grabbing" : "grab",
                            userSelect: "none",
                          }}
                          onMouseDown={handleMouseDown}
                          onMouseLeave={handleMouseLeave}
                          onMouseUp={handleMouseUp}
                          onMouseMove={handleMouseMove}
                          onTouchStart={handleTouchStart}
                          onTouchMove={handleTouchMove}
                          onTouchEnd={handleTouchEnd}
                        >
                          <div className="marquee-inner flex items-center gap-4">
                            {allRooms.map((room, idx) => (
                              <motion.div
                                key={idx}
                                whileHover={{
                                  scale: 1.02,
                                  boxShadow: "0 6px 28px 0 rgba(0,0,0,0.15)",
                                }}
                                whileTap={{ scale: 0.97 }}
                                className="group relative bg-background rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-all duration-300 cursor-pointer transform hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/10 min-w-[360px] max-w-[360px] h-[280px]"
                                onClick={handleRoomClick}
                              >
                                {/* Thumbnail Container */}
                                <div className="relative aspect-video rounded-t-lg overflow-hidden bg-muted group-hover:bg-muted/80 transition-colors duration-300">
                                  {/* Room image from public/room folder */}
                                  <img
                                    src={`/room/room-${(idx % 7) + 1}.png`}
                                    alt={room.name}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                  />

                                  {/* Live indicator */}
                                  {room.participants > 0 && (
                                    <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                                      LIVE
                                    </div>
                                  )}

                                  {/* Private room indicator */}
                                  {!room.isPublic && (
                                    <div className="absolute top-2 right-2 bg-orange-500/90 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                                      <svg
                                        width="12"
                                        height="12"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                      >
                                        <rect
                                          x="3"
                                          y="11"
                                          width="18"
                                          height="11"
                                          rx="2"
                                          ry="2"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                        />
                                        <circle
                                          cx="12"
                                          cy="16"
                                          r="1"
                                          fill="currentColor"
                                        />
                                        <path
                                          d="M7 11V7a5 5 0 0110 0v4"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                        />
                                      </svg>
                                      PRIVATE
                                    </div>
                                  )}

                                  {/* Participants count */}
                                  {room.participants > 0 && (
                                    <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                                      {room.participants}{" "}
                                      {room.participants === 1
                                        ? "participant"
                                        : "participants"}
                                    </div>
                                  )}

                                  {/* Subtle hover overlay */}
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
                                </div>

                                {/* Video Info */}
                                <div className="relative p-4 border border-border border-t-0 bg-gradient-to-br from-card/80 via-card/60 to-card/40 backdrop-blur-sm rounded-b-lg overflow-hidden group">
                                  {/* Animated background gradient */}
                                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                  {/* Glow effect on hover */}
                                  <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-primary/20 opacity-0 group-hover:opacity-100 transition-all duration-300 blur-xl" />

                                  {/* Main content */}
                                  <div className="relative z-10">
                                    {/* Top section with avatar and title */}
                                    <div className="flex items-start justify-between mb-4">
                                      <div className="flex items-center gap-3">
                                        {/* Glowing avatar */}
                                        <div className="relative">
                                          <div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-primary/10 rounded-full blur-sm group-hover:blur-md transition-all duration-300" />
                                          <Avatar className="h-10 w-10 flex-shrink-0 relative z-10 ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all duration-300">
                                            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary-foreground text-sm font-bold">
                                              {room.creator.name.charAt(0)}
                                            </AvatarFallback>
                                          </Avatar>
                                        </div>

                                        <div className="min-w-0 flex flex-col items-start">
                                          <h3 className="font-bold text-base leading-tight line-clamp-1 group-hover:text-primary transition-all duration-300 group-hover:scale-105 transform text-left">
                                            {room.name}
                                          </h3>
                                          <p className="text-sm text-muted-foreground font-medium text-left">
                                            {room.creator.name}
                                          </p>
                                        </div>
                                      </div>

                                      {/* Floating status badge */}
                                      <div className="relative">
                                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-full blur-sm group-hover:blur-md transition-all duration-300" />
                                        <div
                                          className={`relative z-10 px-3 py-1 rounded-full text-xs font-bold text-white backdrop-blur-sm border border-white/20 ${
                                            room.category === "voice"
                                              ? "bg-gradient-to-r from-blue-500 to-blue-600"
                                              : "bg-gradient-to-br from-emerald-500 to-emerald-600"
                                          }`}
                                        >
                                          {room.category === "voice"
                                            ? "Voice"
                                            : "Chat"}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Bottom section with stats and indicators */}
                                    <div className="space-y-3">
                                      {/* Access and Host - Clean badges */}
                                      <div className="flex items-center justify-between pt-2">
                                        <div className="flex items-center gap-2">
                                          {/* Symbol badge */}
                                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-800/50 border border-slate-700/50">
                                            <span className="text-xs text-slate-300 font-medium">
                                              {room.symbol}
                                            </span>
                                          </div>

                                          {/* Access indicator */}
                                          <div
                                            className={`flex items-center gap-1.5 px-2 py-1 rounded-md border ${
                                              room.isPublic
                                                ? "bg-slate-800/50 border-slate-700/50"
                                                : "bg-orange-900/30 border-orange-700/50"
                                            }`}
                                          >
                                            {room.isPublic ? (
                                              <svg
                                                width="12"
                                                height="12"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="text-slate-300"
                                              >
                                                <circle
                                                  cx="12"
                                                  cy="12"
                                                  r="10"
                                                  stroke="currentColor"
                                                  strokeWidth="2"
                                                />
                                                <path
                                                  d="M2 12s3-7 10-7 10 7 10 7"
                                                  stroke="currentColor"
                                                  strokeWidth="2"
                                                />
                                              </svg>
                                            ) : (
                                              <svg
                                                width="12"
                                                height="12"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="text-orange-400"
                                              >
                                                <rect
                                                  x="3"
                                                  y="11"
                                                  width="18"
                                                  height="11"
                                                  rx="2"
                                                  ry="2"
                                                  stroke="currentColor"
                                                  strokeWidth="2"
                                                />
                                                <circle
                                                  cx="12"
                                                  cy="16"
                                                  r="1"
                                                  fill="currentColor"
                                                />
                                                <path
                                                  d="M7 11V7a5 5 0 0110 0v4"
                                                  stroke="currentColor"
                                                  strokeWidth="2"
                                                />
                                              </svg>
                                            )}
                                            <span
                                              className={`text-xs font-medium ${
                                                room.isPublic
                                                  ? "text-slate-300"
                                                  : "text-orange-200"
                                              }`}
                                            >
                                              {room.isPublic
                                                ? "Public"
                                                : "Private"}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                        {/* Marquee animation overlay for fade effect */}
                        <div className="pointer-events-none absolute top-0 left-0 w-[15%] h-full bg-gradient-to-r from-blue-50/20 to-transparent dark:from-gray-900/10 z-20" />
                        <div className="pointer-events-none absolute top-0 right-0 w-[15%] h-full bg-gradient-to-l from-blue-50/20 to-transparent dark:from-gray-900/10 z-20" />
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
