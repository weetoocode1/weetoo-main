"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export function RightSide() {
  // 4 columns, enough rows to overflow for infinite effect
  const cols = 4;
  const rows = 10; // adjust for your container height

  // Path for the moving card (indices in the grid)
  const path = [
    1 * cols + 1, // row 2, col 2
    2 * cols + 1, // row 3, col 2
    3 * cols + 1, // row 4, col 2
    3 * cols + 2, // row 4, col 3
    2 * cols + 2, // row 3, col 3
    1 * cols + 2, // row 2, col 3
  ];
  const [activeIdx, setActiveIdx] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    function start() {
      if (!intervalRef.current) {
        intervalRef.current = setInterval(() => {
          setActiveIdx((idx) => (idx + 1) % path.length);
        }, 1500);
      }
    }
    function stop() {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        start();
      } else {
        stop();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    // Start interval if visible on mount
    if (document.visibilityState === "visible") {
      start();
    }
    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [path.length]);

  // Calculate the position of the moving card
  // These must match the grid's gap and sizing
  const gridGap = 8; // px, Tailwind gap-2
  // We'll measure the cell size using a ref
  const [cellSize, setCellSize] = useState(0);
  const cellRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (cellRef.current) {
      setCellSize(cellRef.current.offsetWidth);
    }
  }, []);

  // Helper to get row/col and translate for a given path index
  const getPosition = (idx: number) => {
    const gridIdx = path[idx];
    const row = Math.floor(gridIdx / cols);
    const col = gridIdx % cols;
    return {
      x: col * (cellSize + gridGap),
      y: row * (cellSize + gridGap),
    };
  };
  // First card position
  const pos1 = getPosition(activeIdx);
  // Second card position (one step ahead)
  const pos2 = getPosition((activeIdx + 1) % path.length);
  // Third card position (starts at row 3 col 3, which is index 4 in path)
  const pos3 = getPosition((activeIdx + 4) % path.length);
  // Fourth card position (starts at row 4 col 3, which is index 3 in path)
  const pos4 = getPosition((activeIdx + 3) % path.length);

  // Texts for each card
  const cardTexts = [
    "Trade crypto, stocks, and forex risk-free simulation.",
    "Stay updated with the latest market news and analysis.",
    "Share strategies and insights with fellow traders.",
    "Join investment competitions and win prizes.",
  ];

  return (
    <div className="w-full h-full overflow-hidden bg-[color:var(--card)] hidden lg:flex items-center justify-center relative">
      {/* Background image */}
      {/* <img
        src="/abstract.jpg"
        alt="Abstract background"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
        aria-hidden="true"
      /> */}
      <div className="relative grid grid-cols-4 gap-2 w-full h-80 -mt-8 md:h-96 md:-mt-12 lg:h-[28rem] lg:-mt-52 min-h-full">
        {Array.from({ length: cols * rows }).map((_, i) => {
          const row = Math.floor(i / cols);
          const col = i % cols;
          const isGlassy = row >= 1 && row <= 3 && (col === 1 || col === 2);
          return (
            <div
              key={i}
              ref={i === 0 ? cellRef : undefined}
              className={
                "aspect-square rounded-3xl border border-primary/15 " +
                (isGlassy
                  ? "backdrop-blur supports-[backdrop-filter]:bg-background/10"
                  : "")
              }
            />
          );
        })}
        {/* Moving card absolutely positioned and animated */}
        {cellSize > 0 && (
          <>
            {/* First moving card (purple) */}
            <div
              className="absolute transition-all duration-900 z-10 rounded-3xl border border-primary/15 bg-[#ab7bf6] flex flex-col items-center justify-end text-center px-2 pb-4"
              style={{
                width: cellSize,
                height: cellSize,
                left: 0,
                top: 0,
                transform: `translate(${pos1.x}px, ${pos1.y}px)`,
              }}
            >
              <Image
                src="/trading-2.svg"
                alt="Trading platform"
                width={120}
                height={120}
                className="mb-2 w-30 h-30 object-contain"
                priority
                draggable={false}
                aria-hidden="true"
              />
              <span className="text-[0.91rem] font-bold text-white drop-shadow-sm leading-tight mb-2">
                {cardTexts[0]}
              </span>
            </div>
            {/* Second moving card (yellow) */}
            <div
              className="absolute transition-all duration-900 z-10 rounded-3xl border border-primary/15 bg-[#eee59d] flex flex-col items-center justify-end text-center px-2 pb-4"
              style={{
                width: cellSize,
                height: cellSize,
                left: 0,
                top: 0,
                transform: `translate(${pos2.x}px, ${pos2.y}px)`,
              }}
            >
              <Image
                src="/news-2.svg"
                alt="Market news"
                width={120}
                height={120}
                className="mb-2 w-30 h-30 object-contain"
                priority
                draggable={false}
                aria-hidden="true"
              />
              <span className="text-[0.91rem] font-bold text-neutral-800 drop-shadow-sm leading-tight mb-2">
                {cardTexts[1]}
              </span>
            </div>
            {/* Third moving card (purple, starts at row 3 col 3) */}
            <div
              className="absolute transition-all duration-900 z-10 rounded-3xl border border-primary/15 bg-[#ab7bf6] flex flex-col items-center justify-end text-center px-2 pb-4"
              style={{
                width: cellSize,
                height: cellSize,
                left: 0,
                top: 0,
                transform: `translate(${pos3.x}px, ${pos3.y}px)`,
              }}
            >
              <Image
                src="/share.svg"
                alt="Share strategies"
                width={120}
                height={120}
                className="mb-2 w-30 h-30 object-contain"
                priority
                draggable={false}
                aria-hidden={"true"}
              />
              <span className="text-[0.91rem] font-bold text-white drop-shadow-sm leading-tight mb-2">
                {cardTexts[2]}
              </span>
            </div>
            {/* Fourth moving card (yellow, starts at row 4 col 3) */}
            <div
              className="absolute transition-all duration-900 z-10 rounded-3xl border border-primary/15 bg-[#eee59d] flex flex-col items-center justify-end text-center px-2 pb-4"
              style={{
                width: cellSize,
                height: cellSize,
                left: 0,
                top: 0,
                transform: `translate(${pos4.x}px, ${pos4.y}px)`,
              }}
            >
              <Image
                src="/prize.svg"
                alt="Investment competitions prize"
                width={140}
                height={140}
                className="mb-2 w-34 h-34 object-contain"
                priority
                draggable={false}
                aria-hidden={"true"}
              />
              <span className="text-[0.91rem] font-bold text-neutral-800 drop-shadow-sm leading-tight mb-2">
                {cardTexts[3]}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
