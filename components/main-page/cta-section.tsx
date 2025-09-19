"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import { useEffect, useState, useRef, useCallback, memo } from "react";

interface BarData {
  id: number;
  height: number;
  isActive: boolean;
}

// Memoized Bar Component for performance optimization
const BarComponent = memo(({ bar, index }: { bar: BarData; index: number }) => {
  const palette = [
    "from-blue-500 to-blue-400",
    "from-violet-500 to-violet-400",
    "from-emerald-500 to-emerald-400",
    "from-amber-500 to-amber-400",
    "from-rose-500 to-rose-400",
    "from-cyan-500 to-cyan-400",
  ];

  return (
    <motion.div
      key={bar.id}
      className="flex items-end rounded bg-background/30 will-change-transform"
      style={{ width: "60px", height: "250px" }}
      initial={{ opacity: 0, x: 30, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -30, scale: 0.9 }}
      transition={{
        duration: 0.6,
        ease: [0.23, 1, 0.32, 1],
        type: "spring",
        stiffness: 100,
        damping: 15,
      }}
      layout
    >
      <div
        className="relative w-full rounded-t-md overflow-hidden"
        style={{
          height: `${bar.height}%`,
          minHeight: "30px",
        }}
      >
        {/* Base gray bar */}
        <div className="absolute inset-0 bg-gray-300 dark:bg-gray-600" />

        {/* Animated colored bar - always full height */}
        <motion.div
          className={`absolute inset-0 bg-gradient-to-t will-change-transform ${
            palette[index % palette.length]
          }`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{
            opacity: bar.isActive ? 1 : 0,
            scale: bar.isActive ? 1 : 0.95,
          }}
          transition={{
            duration: 0.4,
            ease: [0.23, 1, 0.32, 1],
            type: "spring",
            stiffness: 200,
            damping: 20,
          }}
        />

        {/* Glossy cap - only visible when active */}
        <motion.div
          className="absolute inset-x-0 top-0 h-1 bg-white/20 dark:bg-white/10 will-change-transform"
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{
            opacity: bar.isActive ? 1 : 0,
            scaleX: bar.isActive ? 1 : 0,
          }}
          transition={{
            duration: 0.3,
            ease: [0.23, 1, 0.32, 1],
            delay: bar.isActive ? 0.1 : 0,
          }}
        />
      </div>
    </motion.div>
  );
});

BarComponent.displayName = "BarComponent";

export function CTASection() {
  const t = useTranslations("cta");
  const [bars, setBars] = useState<BarData[]>([]);
  const [isClient, setIsClient] = useState(false);

  // Performance optimization refs
  const animationRef = useRef<number | null>(null);
  const addBarTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Animation configuration
  const maxVisibleBars = 12;
  const addBarInterval = 4000; // Add new bar every 4 seconds (smoother)

  // Initialize bars on client side
  useEffect(() => {
    // Create initial bars with random heights
    const initialBars: BarData[] = [];
    for (let i = 0; i < maxVisibleBars; i++) {
      // Ensure more bars start with colors for better visual impact
      const shouldBeActive = i < 4 ? true : Math.random() < 0.3; // First 4 bars active, others 30% chance
      initialBars.push({
        id: i,
        height: 40 + ((i * 37 + 17) % 50), // Increased height range: 40-90%
        isActive: shouldBeActive,
      });
    }
    setBars(initialBars);
    setIsClient(true);
  }, []);

  // Optimized add new bar function with useCallback
  const addNewBar = useCallback(() => {
    setBars((prev) => {
      // Generate random height for new bar (40-90 range for bigger bars)
      const newHeight = 40 + Math.floor(Math.random() * 50);

      // Add new bar to the right
      const newBar: BarData = {
        id: Date.now(),
        height: newHeight,
        isActive: true, // New bar starts active
      };

      // Shift all bars left and add new one to the right
      const updatedBars = [...prev.slice(1), newBar];

      return updatedBars;
    });
  }, []);

  // Add new bars and shift existing ones
  useEffect(() => {
    if (!isClient) return;

    // Use requestAnimationFrame for better performance
    const scheduleAddBar = () => {
      addBarTimeoutRef.current = setTimeout(() => {
        addNewBar();
        if (isClient) {
          animationRef.current = requestAnimationFrame(scheduleAddBar);
        }
      }, addBarInterval);
    };

    animationRef.current = requestAnimationFrame(scheduleAddBar);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (addBarTimeoutRef.current) {
        clearTimeout(addBarTimeoutRef.current);
      }
    };
  }, [isClient, addNewBar]);

  // Optimized bar state animation with useCallback
  const animateBarStates = useCallback(() => {
    setBars((prev) => {
      const updatedBars = prev.map((bar, index) => {
        // Ensure at least 2-3 bars are always active for better visibility
        const shouldBeActive = Math.random() < 0.25; // Increased to 25% chance
        return {
          ...bar,
          isActive: shouldBeActive,
        };
      });

      // Ensure at least 2 bars are always active
      const activeCount = updatedBars.filter((bar) => bar.isActive).length;
      if (activeCount < 2) {
        // Find 2 random bars to activate
        const inactiveBars = updatedBars.filter((bar) => !bar.isActive);
        const barsToActivate = inactiveBars.slice(0, 2 - activeCount);
        barsToActivate.forEach((bar) => {
          bar.isActive = true;
        });
      }

      return updatedBars;
    });
  }, []);

  // Animate bar states - optimized for performance
  useEffect(() => {
    if (!isClient) return;

    // Use requestAnimationFrame for better performance
    const scheduleStateAnimation = () => {
      stateTimeoutRef.current = setTimeout(() => {
        animateBarStates();
        if (isClient) {
          animationRef.current = requestAnimationFrame(scheduleStateAnimation);
        }
      }, 4000 + Math.random() * 2000); // Increased interval for more stable colors
    };

    animationRef.current = requestAnimationFrame(scheduleStateAnimation);

    return () => {
      if (stateTimeoutRef.current) {
        clearTimeout(stateTimeoutRef.current);
      }
    };
  }, [isClient, animateBarStates]);

  return (
    <section className="relative bg-background py-24 md:py-32">
      {/* Spotlight + grain */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-[1600px] px-4 md:px-0">
        <div className="grid grid-cols-1 overflow-hidden rounded-2xl border border-border bg-card shadow-xl md:grid-cols-12">
          {/* Copy */}
          <div className="p-6 sm:p-8 md:p-12 md:col-span-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-2.5 py-1 text-[10px] sm:text-[11px] font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" /> {t("badge")}
            </span>
            <h2 className="mt-3 text-2xl sm:text-3xl md:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
              {t("readyToJoin")}
            </h2>
            <p className="mt-3 max-w-xl text-sm sm:text-base md:text-lg leading-relaxed text-muted-foreground">
              {t("joinDescription")}
            </p>

            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Button
                className="group inline-flex items-center justify-center gap-2 w-full sm:w-auto"
                size="lg"
                asChild
              >
                <Link href="/login">
                  {t("joinNow")}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
            </div>

            {/* intentionally no metrics or counts */}
            <div
              className="mt-4 sm:mt-6 text-[11px] sm:text-xs text-muted-foreground"
              aria-hidden
            >
              {t("mantra")}
            </div>
          </div>

          {/* Visual */}
          <div className="relative border-t border-border p-6 sm:p-8 md:col-span-5 md:border-l md:border-t-0 md:p-10">
            <div className="relative h-48 sm:h-64 md:h-72 w-full overflow-hidden rounded-xl border border-border bg-gradient-to-b from-muted/40 to-muted/10">
              {/* subtle horizontal grid lines */}
              <div
                className="pointer-events-none absolute inset-0 opacity-30"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(to top, var(--border) 0px, var(--border) 1px, transparent 1px, transparent 22px)",
                }}
              />
              {/* base axis */}
              <div className="absolute left-4 right-4 bottom-4 h-px bg-border/70" />

              <div
                className="flex h-full items-end gap-0.5 sm:gap-1 p-2 sm:p-4"
                style={{ minHeight: "250px" }}
              >
                {!isClient || bars.length === 0
                  ? // Loading state for SSR or when bars are empty
                    Array.from({ length: 12 }).map((_, index) => (
                      <div
                        key={`loading-${index}`}
                        className="flex items-end rounded bg-background/30"
                        style={{ width: "60px", height: "250px" }}
                      >
                        <div
                          className="relative w-full rounded-t-md overflow-hidden bg-gray-300 dark:bg-gray-600"
                          style={{
                            height: `${40 + ((index * 37 + 17) % 50)}%`,
                            minHeight: "30px",
                          }}
                        />
                      </div>
                    ))
                  : bars.map((bar, index) => (
                      <BarComponent key={bar.id} bar={bar} index={index} />
                    ))}
              </div>
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent" />
              <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-background/70 px-2 py-1 text-[10px] font-medium text-muted-foreground ring-1 ring-border">
                {t("focusMode")}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs text-muted-foreground">
              <div className="rounded-lg border border-border bg-background/60 p-3">
                {t("focusedSessions")}
              </div>
              <div className="rounded-lg border border-border bg-background/60 p-3">
                {t("peerReviews")}
              </div>
              <div className="rounded-lg border border-border bg-background/60 p-3">
                {t("alwaysOnCommunity")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
