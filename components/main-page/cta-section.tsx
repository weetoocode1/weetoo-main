"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export function CTASection() {
  const t = useTranslations("cta");

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
              <Sparkles className="h-3.5 w-3.5" /> Process first. Noise free.
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
              Consistency over hype • Peer review culture • Process over guesses
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

              <div className="grid h-full grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-0.5 sm:gap-1 p-2 sm:p-4">
                {(() => {
                  // Deterministic, SSR-safe bar heights (no Math.random()).
                  const heights = Array.from(
                    { length: 12 },
                    (_, i) => 25 + ((i * 37 + 17) % 65)
                  );
                  return Array.from({ length: 12 }).map((_, i) => {
                    const palette = [
                      "from-blue-500 to-blue-400",
                      "from-violet-500 to-violet-400",
                      "from-emerald-500 to-emerald-400",
                      "from-amber-500 to-amber-400",
                    ];
                    const colored = i % 3 === 1; // color some bars, not all
                    const grad = palette[i % palette.length];
                    const h = heights[i];
                    return (
                      <div
                        key={i}
                        className="flex items-end rounded bg-background/30"
                      >
                        <div
                          className="relative w-full rounded-t-md overflow-hidden"
                          style={{ height: `${h}%` }}
                        >
                          {/* bar fill */}
                          <div
                            className={
                              colored
                                ? `absolute inset-0 bg-gradient-to-t ${grad}`
                                : "absolute inset-0 bg-primary/60"
                            }
                          />
                          {/* glossy cap */}
                          <div className="absolute inset-x-0 top-0 h-1 bg-white/20 dark:bg-white/10" />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent" />
              <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-background/70 px-2 py-1 text-[10px] font-medium text-muted-foreground ring-1 ring-border">
                Focus Mode
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs text-muted-foreground">
              <div className="rounded-lg border border-border bg-background/60 p-3">
                Focused sessions
              </div>
              <div className="rounded-lg border border-border bg-background/60 p-3">
                Peer reviews
              </div>
              <div className="rounded-lg border border-border bg-background/60 p-3">
                Always‑on community
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
