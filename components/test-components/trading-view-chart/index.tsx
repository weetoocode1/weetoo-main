"use client";

import { useTickerData } from "@/hooks/websocket/use-market-data";
import type {
  ChartingLibraryWidgetOptions,
  LanguageCode,
  ResolutionString,
  widget,
} from "@/public/static/charting_library";
import type { Symbol } from "@/types/market";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useRef, useState } from "react";
import { BybitUdfDatafeed } from "./datafeed/bybit-udf-datafeed";
import { QuickTradePanel } from "./quick-trade-panel";
import { TradingViewToolbar } from "./toolbar";
import { resolveAppBackground, resolveCssVarToColor } from "./utils/color";
import { useLocale, useTranslations } from "next-intl";

// ===== TYPES =====
// types moved to dedicated files

// Minimal type definitions for TradingView objects used below
interface TvOrderLine {
  setPrice: (price: number) => void;
  setText: (text: string) => void;
  setQuantity: (qty: number) => void;
  setLineLength: (len: number) => void;
  setLineStyle: (style: number) => void;
  setLineWidth: (w: number) => void;
  setLineColor: (color: string) => void;
  setBodyTextColor: (color: string) => void;
  setBodyBackgroundColor: (color: string) => void;
  remove: () => void;
  // Optional methods that may not exist on all TradingView versions
  setExtendLeft?: (extend: boolean) => void;
  setExtendRight?: (extend: boolean) => void;
  setShowPriceLine?: (show: boolean) => void;
}

interface TvPositionLine {
  setPrice: (price: number) => void;
  setText: (text: string) => void;
  setQuantity: (qty: number) => void;
  setLineLength: (len: number) => void;
  setLineStyle: (style: number) => void;
  setLineWidth: (w: number) => void;
  setLineColor: (color: string) => void;
  setBodyTextColor: (color: string) => void;
  setBodyBackgroundColor: (color: string) => void;
  onClose?: (callback: () => void) => void;
  remove: () => void;
}

interface TvShape {
  remove?: () => void;
  delete?: () => void;
  close?: () => void;
  destroy?: () => void;
  hide?: () => void;
  // TradingView shape objects have these methods
}

// TradingView createShape returns a Promise<EntityId>
interface EntityId {
  id: string;
}

interface TradingViewShapePromise {
  then: (
    onFulfilled?: (value: EntityId) => void,
    onRejected?: (reason: unknown) => void
  ) => Promise<EntityId>;
}

interface TradingViewShape {
  remove?: () => void;
  delete?: () => void;
  close?: () => void;
  destroy?: () => void;
  hide?: () => void;
  [key: string]: unknown;
}

interface TvRemovableWithId {
  id: string | number; // The ID returned by createShape/createOrderLine
  entityId?: EntityId; // The actual TradingView EntityId for removal
  remove: () => void; // A function to encapsulate the removal logic
}

type TvRemovable = TvOrderLine | TvPositionLine | TvShape;

interface TvChart {
  createOrderLine?: () => TvOrderLine;
  createPositionLine?: () => TvPositionLine;
  createShape?: (
    point: { price: number },
    options: {
      shape: string;
      text?: string;
      lock?: boolean;
      disableSelection?: boolean;
      disableSave?: boolean;
    }
  ) => TradingViewShapePromise;
  removeEntity?: (entityId: EntityId) => void;
}

interface PositionData {
  id: string;
  price: number;
  side: "LONG" | "SHORT";
  size: number;
  entryPrice: number;
}

interface TradingViewChartTestProps {
  symbol?: string;
  roomId?: string;
}

export function TradingViewChartTest({
  symbol,
  roomId,
}: TradingViewChartTestProps) {
  const t = useTranslations("chart.tv");
  const locale = useLocale();
  const { theme, resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Get synchronized ticker data for price consistency
  const tickerData = useTickerData((symbol as Symbol) || "BTCUSDT");
  const widgetRef = useRef<InstanceType<typeof widget> | null>(null);

  // Persist ticker values to prevent flickering
  const tickerValuesRef = useRef<{ lastPrice: string; markPrice: string }>({
    lastPrice: "0",
    markPrice: "0",
  });

  useEffect(() => {
    if (tickerData) {
      // Only update if we have valid data (not "0" or empty)
      if (
        tickerData.lastPrice &&
        tickerData.lastPrice !== "0" &&
        tickerData.lastPrice !== ""
      ) {
        tickerValuesRef.current.lastPrice = tickerData.lastPrice;
      }
      if (
        tickerData.markPrice &&
        tickerData.markPrice !== "0" &&
        tickerData.markPrice !== ""
      ) {
        tickerValuesRef.current.markPrice = tickerData.markPrice;
      }
    }
  }, [tickerData]);

  const tickerCallbackRef = useRef<
    (symbol: string) => { lastPrice: string; markPrice: string }
  >((symbol) => ({
    lastPrice: tickerValuesRef.current.lastPrice,
    markPrice: tickerValuesRef.current.markPrice,
  }));
  const datafeedRef = useRef<BybitUdfDatafeed | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeRes, setActiveRes] = useState<ResolutionString>(
    "30" as ResolutionString
  );
  const [selectedChartType, setSelectedChartType] =
    useState<TvChartTypeAction>("chartTypeCandles");
  const [priceType, setPriceType] = useState<"lastPrice" | "markPrice">(
    "lastPrice"
  );
  const [isChangingPriceType, setIsChangingPriceType] = useState(false);
  const STORAGE_KEY = "tv_active_resolution";
  const VISIBLE_KEY = "tv_visible_intervals";

  const currentTheme = resolvedTheme || theme;
  const key = useMemo(
    () => `${symbol}-${currentTheme}-${locale}`,
    [symbol, currentTheme, locale]
  );

  const allIntervals: ResolutionString[] = [
    "1",
    "3",
    "5",
    "15",
    "30",
    "60",
    "120",
    "240",
    "360",
    "720",
    "1D",
    "1W",
    "1M",
  ] as unknown as ResolutionString[];

  const labelFor = (res: ResolutionString) => {
    const map: Record<string, string> = {
      "1": "1m",
      "3": "3m",
      "5": "5m",
      "15": "15m",
      "30": "30m",
      "60": "1h",
      "120": "2h",
      "240": "4h",
      "360": "6h",
      "720": "12h",
      "1D": "1D",
      "1W": "1W",
      "1M": "1M",
    };
    return (map as Record<string, string>)[res] ?? String(res);
  };

  const [visibleRes, setVisibleRes] = useState<ResolutionString[]>([
    "1",
    "3",
    "5",
    "15",
    "30",
    "60",
    "240",
    "1D",
    "1W",
    "1M",
  ] as unknown as ResolutionString[]);

  // Load persisted interval on first mount
  useEffect(() => {
    try {
      const savedActive = localStorage.getItem(STORAGE_KEY) || "";
      if (savedActive && (allIntervals as string[]).includes(savedActive)) {
        setActiveRes(savedActive as unknown as ResolutionString);
      }
      const savedVisible = localStorage.getItem(VISIBLE_KEY) || "";
      if (savedVisible) {
        const parsed = JSON.parse(savedVisible) as string[];
        const filtered = parsed.filter((r) =>
          (allIntervals as string[]).includes(r)
        ) as unknown as ResolutionString[];
        if (filtered.length) setVisibleRes(filtered);
      }
    } catch {}
  }, []);

  const persistVisible = (next: ResolutionString[]) => {
    setVisibleRes(next);
    try {
      localStorage.setItem(
        VISIBLE_KEY,
        JSON.stringify(next as unknown as string[])
      );
    } catch {}
  };

  const tv = useMemo(() => {
    if (typeof window === "undefined") return null;
    // Dynamic import for TradingView library
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require("@/public/static/charting_library");
    } catch {
      return null;
    }
  }, []);

  // Keep references to created entry lines so we can manage/cleanup them
  const entryLinesRef = useRef<
    Array<{ id?: string | number; line: TvRemovable }>
  >([]);
  const entryLineByIdRef = useRef<Map<string | number, TvRemovableWithId>>(
    new Map()
  );
  const domOverlaysRef = useRef<Map<string | number, HTMLElement>>(new Map());
  const positionDataRef = useRef<Map<string | number, PositionData>>(new Map());

  // Calculate unrealized P&L using the same logic as positions-tabs
  const calculateUnrealizedPnL = (
    position: PositionData,
    currentPrice: number
  ): { unrealized: number; unrealizedPct: string } => {
    const { size, entryPrice, side } = position;
    const direction = side === "SHORT" ? -1 : 1;
    const unrealized = (currentPrice - entryPrice) * size * direction;
    const basis = entryPrice * size || 0;
    const unrealizedPct = basis
      ? ((unrealized / basis) * 100).toFixed(2) + "%"
      : "0%";

    return { unrealized, unrealizedPct };
  };

  // Update P&L text on all position lines
  const updatePositionLinesPnL = (currentPrice: number) => {
    positionDataRef.current.forEach((position, positionId) => {
      const { unrealized, unrealizedPct } = calculateUnrealizedPnL(
        position,
        currentPrice
      );

      // Update TradingView shape text if it exists
      const line = entryLineByIdRef.current.get(positionId);
      if (line && line.entityId) {
        try {
          const tvw = widgetRef.current;
          if (tvw && typeof tvw.chart === "function") {
            const chart = tvw.chart() as unknown as TvChart | null;
            if (chart && chart.removeEntity && chart.createShape) {
              // Remove old shape and create new one with updated text
              chart.removeEntity(line.entityId!);

              const newShapePromise = chart.createShape(
                { price: position.price },
                {
                  shape: "horizontal_line",
                  text: `${
                    position.side
                  } | P&L: ${unrealizedPct} ($${unrealized.toFixed(2)})`,
                  lock: true,
                  disableSelection: true,
                  disableSave: true,
                }
              );

              if (
                newShapePromise &&
                typeof newShapePromise.then === "function"
              ) {
                newShapePromise.then((entityId: EntityId) => {
                  const updatedLine = {
                    id: positionId,
                    entityId: entityId,
                    remove: () => {
                      try {
                        if (chart.removeEntity) {
                          chart.removeEntity(entityId);
                        }
                      } catch (e) {
                        console.error("Error removing TradingView entity:", e);
                      }
                    },
                  };
                  entryLineByIdRef.current.set(positionId, updatedLine);
                });
              }
            }
          }
        } catch (error) {
          console.warn("Failed to update TradingView shape:", error);
        }
      }

      // Update DOM overlay text and line color
      const overlay = domOverlaysRef.current.get(positionId);
      if (overlay) {
        const label = overlay.querySelector("div");
        if (label) {
          const isProfit = unrealized > 0;
          const isLoss = unrealized < 0;
          const textColor = isProfit
            ? "#22c55e"
            : isLoss
            ? "#ef4444"
            : "#ffffff";

          // Dynamic line color based on profit/loss
          const lineColor = isProfit
            ? "#22c55e"
            : isLoss
            ? "#ef4444"
            : position.side === "LONG"
            ? "#16a34a"
            : "#dc2626";

          label.textContent = `${
            position.side
          } | P&L: ${unrealizedPct} ($${unrealized.toFixed(2)})`;
          label.style.color = textColor;
          label.style.backgroundColor = isProfit
            ? "rgba(34, 197, 94, 0.1)"
            : isLoss
            ? "rgba(239, 68, 68, 0.1)"
            : "rgba(15, 23, 42, 0.9)";
          label.style.border = `2px solid ${
            isProfit ? "#22c55e" : isLoss ? "#ef4444" : "#ffffff"
          }`;
          label.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.3)";

          // Update overlay line color
          overlay.style.backgroundColor = lineColor;
          overlay.style.borderColor = lineColor;
          overlay.style.boxShadow = `0 0 8px ${lineColor}40`;
        }
      }
    });
  };

  const createEntryLine = (
    price: number,
    side: "LONG" | "SHORT",
    positionId: string, // Pass the position ID for linking
    size: number = 1, // Default size if not provided
    entryPrice: number = price // Default to current price if not provided
  ): TvRemovableWithId | undefined => {
    try {
      const tvw = widgetRef.current;
      if (!tvw || typeof tvw.chart !== "function") {
        console.log("TradingView widget not ready");
        return;
      }
      const chart = tvw.chart() as unknown as TvChart | null;
      if (!chart) {
        console.log("Chart not available");
        return;
      }

      console.log(
        `Attempting to create entry line for ${side} at price ${price} (Position ID: ${positionId})`
      );

      // Store position data for P&L calculations
      const positionData: PositionData = {
        id: positionId,
        price,
        side,
        size,
        entryPrice,
      };
      positionDataRef.current.set(positionId, positionData);

      // Calculate initial P&L
      const { unrealized, unrealizedPct } = calculateUnrealizedPnL(
        positionData,
        price
      );

      // Determine profit/loss status for styling
      const isProfit = unrealized > 0;
      const isLoss = unrealized < 0;

      let lineToRemove: TvRemovable | undefined;
      let lineId: string | number | undefined;

      // --- Skip TradingView's position line API (only available on Trading Platform) ---
      console.log(
        "Skipping createPositionLine - only available on Trading Platform"
      );

      // --- Primary method: createShape for horizontal line (returns Promise<EntityId>) ---
      if (typeof chart.createShape === "function") {
        try {
          console.log("Using createShape for horizontal line");
          const shapePromise = (chart as TvChart).createShape!(
            { price },
            {
              shape: "horizontal_line",
              text: `${side} | P&L: ${unrealizedPct} ($${unrealized.toFixed(
                2
              )})`,
              lock: true,
              disableSelection: true,
              disableSave: true,
            }
          );

          console.log("createShape returned Promise:", shapePromise);

          // createShape returns Promise<EntityId> - handle it properly
          if (shapePromise && typeof shapePromise.then === "function") {
            console.log("Handling createShape Promise<EntityId>");

            // Return a line object that will handle the Promise resolution
            lineId = positionId;
            lineToRemove = {
              remove: () => {
                console.log(
                  "Attempting to remove TradingView entity for ID:",
                  positionId
                );
                try {
                  // Try to remove using the stored entity ID
                  const storedEntity = entryLineByIdRef.current.get(positionId);
                  if (
                    storedEntity &&
                    storedEntity.entityId &&
                    chart.removeEntity
                  ) {
                    chart.removeEntity(storedEntity.entityId);
                    console.log(
                      "Successfully removed TradingView entity:",
                      storedEntity.entityId
                    );
                    entryLineByIdRef.current.delete(positionId);
                  } else {
                    console.log("No entity ID found for removal:", positionId);
                  }
                } catch (e) {
                  console.error("Error removing TradingView entity:", e);
                }
              },
            } as TvShape;

            // Handle the Promise resolution
            (shapePromise as Promise<EntityId>)
              .then((entityId: EntityId) => {
                console.log(
                  "createShape Promise resolved with EntityId:",
                  entityId
                );

                // Store the entity ID for later removal
                const entityLine = {
                  id: positionId,
                  entityId: entityId,
                  remove: () => {
                    try {
                      if (chart.removeEntity) {
                        chart.removeEntity(entityId);
                        console.log("Removed TradingView entity:", entityId);
                      } else {
                        console.log("removeEntity method not available");
                      }
                    } catch (e) {
                      console.error("Error removing TradingView entity:", e);
                    }
                  },
                };

                entryLineByIdRef.current.set(positionId, entityLine);
                console.log(
                  "Stored entity with ID:",
                  positionId,
                  "EntityId:",
                  entityId
                );
              })
              .catch((error: unknown) => {
                console.error("createShape Promise rejected:", error);
              });

            console.log("Created TradingView shape with Promise handling");
          } else {
            console.log("createShape did not return a Promise:", shapePromise);
          }
        } catch (error) {
          console.warn("createShape failed:", error);
        }
      } else {
        console.log("createShape function not available");
      }

      // --- Fallback to createOrderLine if createShape failed or is not available ---
      if (!lineToRemove && typeof chart.createOrderLine === "function") {
        try {
          console.log("Using createOrderLine as fallback");
          const ol = (chart as TvChart).createOrderLine!();
          ol.setPrice(price);
          ol.setText(
            `${side} | P&L: ${unrealizedPct} ($${unrealized.toFixed(2)})`
          );
          ol.setQuantity(0);
          ol.setLineLength(25);
          ol.setLineStyle(1);
          ol.setLineWidth(2);
          // Dynamic line color based on profit/loss
          const lineColor = isProfit
            ? "#22c55e"
            : isLoss
            ? "#ef4444"
            : side === "LONG"
            ? "#16a34a"
            : "#dc2626";
          ol.setLineColor(lineColor);
          // Enhanced styling for order line
          ol.setBodyTextColor(
            isProfit ? "#22c55e" : isLoss ? "#ef4444" : "#ffffff"
          );
          ol.setBodyBackgroundColor(
            isProfit
              ? "rgba(34, 197, 94, 0.1)"
              : isLoss
              ? "rgba(239, 68, 68, 0.1)"
              : "rgba(15, 23, 42, 0.9)"
          );

          lineId = positionId; // Use the position ID as the tracking ID
          lineToRemove = ol;
        } catch (error) {
          console.warn("createOrderLine failed:", error);
        }
      }

      if (lineToRemove && lineId) {
        console.log(
          `Successfully created TradingView line for Position ID: ${lineId}`
        );
        return {
          id: lineId,
          remove: () => {
            try {
              console.log("Attempting to remove TradingView line:", lineId);
              console.log("Line object:", lineToRemove);
              console.log(
                "Available methods:",
                Object.getOwnPropertyNames(lineToRemove || {})
              );

              let removed = false;

              // Try all possible removal methods
              const methods = ["remove", "delete", "close", "destroy", "hide"];
              for (const method of methods) {
                if (
                  lineToRemove &&
                  typeof (lineToRemove as TradingViewShape)[method] ===
                    "function"
                ) {
                  try {
                    const methodFn = (lineToRemove as TradingViewShape)[method];
                    if (methodFn && typeof methodFn === "function") {
                      methodFn();
                    }
                    console.log(
                      `Successfully removed TradingView line using ${method}() with ID:`,
                      lineId
                    );
                    removed = true;
                    break;
                  } catch (methodError) {
                    console.log(`Method ${method}() failed:`, methodError);
                  }
                }
              }

              if (!removed) {
                console.log(
                  "No working removal method found for TradingView line:",
                  lineId
                );
                console.log("Line object type:", typeof lineToRemove);
                console.log(
                  "Line object constructor:",
                  lineToRemove?.constructor?.name
                );
              }
            } catch (e) {
              console.error("Error removing TradingView line:", e);
            }
          },
        };
      }

      // --- Always create DOM overlay as guaranteed fallback ---
      try {
        console.log("Creating DOM overlay as guaranteed fallback");

        // Create a simple DOM overlay for the entry line with dynamic colors
        const overlay = document.createElement("div");
        overlay.id = `position-line-${positionId}`; // Unique ID for direct access
        overlay.style.position = "absolute";
        overlay.style.left = "0";
        overlay.style.right = "0";
        overlay.style.height = "3px";

        overlay.setAttribute("data-position-id", positionId);
        overlay.setAttribute("data-price", price.toString());
        overlay.setAttribute("data-side", side);

        // Add text label with P&L - Enhanced styling with borders
        const label = document.createElement("div");
        const isProfit = unrealized > 0;
        const isLoss = unrealized < 0;
        const textColor = isProfit ? "#22c55e" : isLoss ? "#ef4444" : "#ffffff";

        // Dynamic line color based on profit/loss
        const lineColor = isProfit
          ? "#22c55e"
          : isLoss
          ? "#ef4444"
          : side === "LONG"
          ? "#16a34a"
          : "#dc2626";

        overlay.style.backgroundColor = lineColor;
        overlay.style.borderStyle = "solid";
        overlay.style.borderWidth = "1px";
        overlay.style.borderColor = lineColor;
        overlay.style.zIndex = "1000";
        overlay.style.pointerEvents = "none";
        overlay.style.top = "50%"; // Center vertically for now
        overlay.style.boxShadow = `0 0 8px ${lineColor}40`; // Subtle glow effect

        label.textContent = `${side} | P&L: ${unrealizedPct} ($${unrealized.toFixed(
          2
        )})`;
        label.style.position = "absolute";
        label.style.right = "10px";
        label.style.top = "-20px";
        label.style.color = textColor;
        label.style.backgroundColor = isProfit
          ? "rgba(34, 197, 94, 0.1)"
          : isLoss
          ? "rgba(239, 68, 68, 0.1)"
          : "rgba(15, 23, 42, 0.9)";
        label.style.padding = "4px 8px";
        label.style.borderRadius = "6px";
        label.style.fontSize = "12px";
        label.style.fontWeight = "bold";
        label.style.border = `2px solid ${
          isProfit ? "#22c55e" : isLoss ? "#ef4444" : "#ffffff"
        }`;
        label.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.3)";
        label.style.whiteSpace = "nowrap";
        label.style.userSelect = "none";
        label.style.pointerEvents = "none";
        label.style.zIndex = "1001";
        label.style.fontFamily =
          "ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace";

        overlay.appendChild(label);

        // Add to chart container
        const chartContainer = containerRef.current;
        if (chartContainer) {
          chartContainer.appendChild(overlay);
          domOverlaysRef.current.set(positionId, overlay);
          console.log(
            "Successfully created DOM overlay for position:",
            positionId
          );

          return {
            id: positionId,
            remove: () => {
              try {
                console.log(
                  "Attempting to remove DOM overlay for ID:",
                  positionId
                );

                // Try multiple removal methods
                const elementById = document.getElementById(
                  `position-line-${positionId}`
                );
                const elementFromRef = domOverlaysRef.current.get(positionId);

                console.log("Element by ID:", elementById);
                console.log("Element from ref:", elementFromRef);

                let removed = false;

                // Method 1: Remove by ID
                if (elementById) {
                  elementById.remove();
                  console.log(
                    "Successfully removed DOM overlay by ID:",
                    positionId
                  );
                  removed = true;
                }

                // Method 2: Remove from ref
                if (elementFromRef && elementFromRef.parentNode) {
                  elementFromRef.parentNode.removeChild(elementFromRef);
                  console.log(
                    "Successfully removed DOM overlay from ref:",
                    positionId
                  );
                  removed = true;
                }

                // Method 3: Remove from ref using remove()
                if (elementFromRef && !removed) {
                  elementFromRef.remove();
                  console.log(
                    "Successfully removed DOM overlay using remove():",
                    positionId
                  );
                  removed = true;
                }

                // Clean up tracking
                domOverlaysRef.current.delete(positionId);
                positionDataRef.current.delete(positionId);

                if (!removed) {
                  console.log(
                    "Could not remove DOM overlay for ID:",
                    positionId
                  );
                }
              } catch (e) {
                console.error("Error removing DOM overlay:", e);
                // Try alternative removal
                try {
                  const elementById = document.getElementById(
                    `position-line-${positionId}`
                  );
                  if (elementById) {
                    elementById.style.display = "none";
                    console.log(
                      "Hidden DOM overlay as fallback for ID:",
                      positionId
                    );
                  }
                } catch (e2) {
                  console.error("Failed to hide DOM overlay:", e2);
                }
              }
            },
          };
        }
      } catch (error) {
        console.error("DOM overlay creation failed:", error);
      }

      console.log(
        "No entry line created via any method for Position ID:",
        positionId
      );
      return undefined;
    } catch (error) {
      console.error("createEntryLine failed with unexpected error:", error);
      return undefined;
    }
  };

  // Update ticker callback ref when ticker data changes (without recreating chart)
  useEffect(() => {
    // Update ref values if we have valid data
    if (tickerData) {
      if (
        tickerData.lastPrice &&
        tickerData.lastPrice !== "0" &&
        tickerData.lastPrice !== ""
      ) {
        tickerValuesRef.current.lastPrice = tickerData.lastPrice;
      }
      if (
        tickerData.markPrice &&
        tickerData.markPrice !== "0" &&
        tickerData.markPrice !== ""
      ) {
        tickerValuesRef.current.markPrice = tickerData.markPrice;
      }
    }

    tickerCallbackRef.current = (symbol: string) => ({
      lastPrice: tickerValuesRef.current.lastPrice,
      markPrice: tickerValuesRef.current.markPrice,
    });

    // Update the datafeed's ticker callback if it exists
    if (datafeedRef.current) {
      datafeedRef.current.updateTickerCallback(tickerCallbackRef.current);
    }

    // Force-refresh the current price on every ticker update to keep chart in
    // perfect sync with order book and market widget (same source-of-truth)
    try {
      if (datafeedRef.current && symbol) {
        datafeedRef.current.refreshCurrentPrice(symbol);
      }
    } catch {}

    // Update P&L on all position lines when ticker data changes
    const priceToUse =
      tickerValuesRef.current.lastPrice || tickerData?.lastPrice || "0";
    if (priceToUse && priceToUse !== "0") {
      const currentPrice = parseFloat(String(priceToUse).replace(/,/g, ""));
      if (!isNaN(currentPrice) && currentPrice > 0) {
        updatePositionLinesPnL(currentPrice);
      }
    }
  }, [tickerData, symbol]);

  useEffect(() => {
    if (!containerRef.current || !tv) return;

    const datafeed = new BybitUdfDatafeed(priceType, tickerCallbackRef.current);
    datafeedRef.current = datafeed;
    const datafeedRefForWidget = { current: datafeed };
    const appBg = resolveAppBackground(currentTheme);
    const options: ChartingLibraryWidgetOptions = {
      symbol,
      interval: activeRes,
      container: containerRef.current,
      library_path: "/static/charting_library/",
      datafeed: datafeed,
      locale: (locale as LanguageCode) || ("en" as LanguageCode),
      fullscreen: false,
      autosize: true,
      // Avoid study templates requests; also provide valid storage config
      charts_storage_url: "https://saveload.tradingview.com",
      charts_storage_api_version: "1.1",
      client_id: "tv",
      user_id: "public",
      // Add loading screen for instant feedback
      loading_screen: {
        backgroundColor: currentTheme === "light" ? "#ffffff" : "#0a0a0a",
        foregroundColor: currentTheme === "light" ? "#000000" : "#ffffff",
      },
      // Force initial theme to match app theme to avoid white flash
      theme: (currentTheme === "dark" ? "dark" : "light") as "dark" | "light",
      // Enable screenshot functionality
      snapshot_url: "https://www.tradingview.com/x/",
      // Aggressive performance optimizations for instant loading and live streaming
      debug: false,
      auto_save_delay: 0,
      // Enable instant rendering features for live trading
      enabled_features: [
        "side_toolbar_in_fullscreen_mode",
        "header_in_fullscreen_mode",
        "timezone_menu",
      ],
      // Disable features that slow down loading
      disabled_features: [
        "use_localstorage_for_settings",
        "header_widget",
        "header_compare",
        "header_symbol_search",
        "header_resolutions",
        "header_undo_redo",
        "header_fullscreen_button",
        "header_settings",
        "header_indicators",
        // removed timeframes_toolbar from disabled so we can show it
        "volume_force_overlay",
        "create_volume_indicator_by_default",
        "study_templates",
        "save_chart_properties_to_local_storage",
        "use_localstorage_for_settings",
      ],
      // Show bottom timeframe buttons and UTC/log/auto controls
      time_frames: [
        { text: "1D", resolution: "1D" as ResolutionString },
        { text: "5D", resolution: "30" as ResolutionString },
        { text: "1M", resolution: "240" as ResolutionString },
        { text: "3M", resolution: "1D" as ResolutionString },
        { text: "6M", resolution: "1D" as ResolutionString },
        { text: "1Y", resolution: "1W" as ResolutionString },
      ],
      timezone: "Asia/Seoul" as const,
      // Disable default volume indicator from the start
      studies_overrides: {
        "volume.show": false, // Disable default volume indicator
      },
      // Try to disable volume in main chart
      overrides: {
        // Pane/bg colors matched to globals.css background
        "paneProperties.background": appBg,
        "scalesProperties.backgroundColor": appBg,

        "scalesProperties.showVolume": false,
        // Use colors from globals.css
        // "paneProperties.crossHairProperties.color":
        //   theme === "light" ? "#000000" : "#ffffff",
        // "paneProperties.crossHairProperties.width": 1,
        // "paneProperties.crossHairProperties.style": 2, // Dashed line
        // "scalesProperties.lineColor": theme === "light" ? "#000000" : "#ffffff",
        // "scalesProperties.textColor": theme === "light" ? "#000000" : "#ffffff",
        // Additional grid line properties for red color
        // "paneProperties.vertGridProperties.color": "#ef4444",
        // "paneProperties.horzGridProperties.color": "#ef4444",
        // Chart colors using globals.css variables
        "mainSeriesProperties.candleStyle.upColor":
          theme === "light" ? "#22c55e" : "#22c55e",
        "mainSeriesProperties.candleStyle.downColor":
          theme === "light" ? "#ef4444" : "#ef4444",
        "mainSeriesProperties.candleStyle.borderUpColor":
          theme === "light" ? "#16a34a" : "#16a34a",
        "mainSeriesProperties.candleStyle.borderDownColor":
          theme === "light" ? "#dc2626" : "#dc2626",
        "mainSeriesProperties.candleStyle.wickUpColor":
          theme === "light" ? "#16a34a" : "#16a34a",
        "mainSeriesProperties.candleStyle.wickDownColor":
          theme === "light" ? "#dc2626" : "#dc2626",
        // Volume colors and height
        volumePaneSize: "tiny",
        "paneProperties.volumePaneSize": "tiny",
        "scalesProperties.volumePaneSize": "tiny",
        // Force smaller volume pane
        "volume.volume.scale": 0.2,
        "volume.volume.transparency": 0,
      },
    };

    if (widgetRef.current) {
      try {
        widgetRef.current.remove();
      } catch {}
      widgetRef.current = null;
    }

    const tvWidget = new tv.widget(options);
    widgetRef.current = tvWidget;

    // Set background colors immediately to prevent white flash
    try {
      const bgColor = appBg;
      const textColor = currentTheme === "light" ? "#000000" : "#ffffff";

      tvWidget.setCSSCustomProperty("--tv-color-platform-background", bgColor);
      tvWidget.setCSSCustomProperty("--tv-color-pane-background", bgColor);
      tvWidget.setCSSCustomProperty("--themed-color-chart-page-bg", bgColor);
      tvWidget.setCSSCustomProperty("--themed-color-body-bg", bgColor);
      tvWidget.setCSSCustomProperty("--tv-color-text-primary", textColor);
      tvWidget.setCSSCustomProperty("--tv-color-text-secondary", textColor);
    } catch {}

    tvWidget.onChartReady(() => {
      const paneBg =
        resolveCssVarToColor("--background") ||
        (theme === "light" ? "#ffffff" : "#171717");
      const platformBg = paneBg;
      const foregroundColor =
        resolveCssVarToColor("--foreground") ||
        (theme === "light" ? "#000000" : "#ffffff");
      const borderColor =
        resolveCssVarToColor("--border") ||
        (theme === "light" ? "#e5e7eb" : "#374151");

      try {
        // Set background colors
        tvWidget.setCSSCustomProperty(
          "--tv-color-platform-background",
          platformBg
        );
        tvWidget.setCSSCustomProperty("--tv-color-pane-background", paneBg);
        tvWidget.setCSSCustomProperty(
          "--themed-color-chart-page-bg",
          platformBg
        );
        tvWidget.setCSSCustomProperty("--themed-color-body-bg", platformBg);

        // Set text and line colors from globals.css
        tvWidget.setCSSCustomProperty(
          "--tv-color-text-primary",
          foregroundColor
        );
        tvWidget.setCSSCustomProperty(
          "--tv-color-text-secondary",
          foregroundColor
        );
        tvWidget.setCSSCustomProperty("--tv-color-border", borderColor);
        tvWidget.setCSSCustomProperty("--tv-color-grid", "#ef4444"); // Red grid lines

        // Set profit/loss colors from globals.css
        const profitColor = resolveCssVarToColor("--profit") || "#22c55e";
        const lossColor = resolveCssVarToColor("--loss") || "#ef4444";
        tvWidget.setCSSCustomProperty("--tv-color-profit", profitColor);
        tvWidget.setCSSCustomProperty("--tv-color-loss", lossColor);
      } catch {}

      // Mark as loaded
      setIsLoading(false);

      // Crosshair styling is handled via overrides; remove invalid direct API calls
      // (Older/newer library builds may not expose setCrosshairMode/Style.)
      // If needed, adjust via overrides: paneProperties.crossHairProperties

      // Add volume chart below the main chart
      try {
        const chart = tvWidget.chart();

        // Create volume study instantly (no delays at all)
        try {
          // Create volume study immediately without any delays
          chart.createStudy(
            "Volume",
            false,
            false,
            [],
            { heightRatio: 0.15 }, // Set volume pane to 15% of chart height
            (studyId: string) => {
              console.log("Created volume study:", studyId);
              // Configure volume study appearance
              chart.setStudyInputs(studyId, {
                "plot.color": theme === "light" ? "#22c55e" : "#22c55e",
                "plot.transparency": 0,
                "plot.display": "histogram",
                "plot.scale": 0.3, // Reduce volume height to 30%
              });

              // Add Volume SMA overlay on the SAME pane (not separate)
              chart.createStudy(
                "Volume SMA",
                false,
                false,
                [studyId], // This makes it an overlay on the volume study
                null,
                (smaId: string) => {
                  chart.setStudyInputs(smaId, {
                    length: 9,
                    "plot.color": theme === "light" ? "#2196f3" : "#2196f3",
                    "plot.linewidth": 1,
                  });
                }
              );
            }
          );
        } catch (error) {
          console.warn("Failed to create volume study:", error);
        }
      } catch (error) {
        console.warn("Failed to add volume chart:", error);
      }

      // Keep our custom toolbar in sync if user changes resolution elsewhere
      try {
        const chart = tvWidget.chart();
        // Some builds expose onIntervalChanged; guard in case not available
        if (
          chart &&
          typeof (
            chart as {
              onIntervalChanged?: () => {
                subscribe: (callback: (res: string) => void) => void;
              };
            }
          ).onIntervalChanged === "function"
        ) {
          (
            chart as {
              onIntervalChanged: () => {
                subscribe: (callback: (res: string) => void) => void;
              };
            }
          )
            .onIntervalChanged()
            .subscribe((res: string) => {
              const r = res as unknown as ResolutionString;
              setActiveRes(r);
              try {
                localStorage.setItem(STORAGE_KEY, r as unknown as string);
              } catch {}
            });
        }
      } catch {}

      // Force refresh current price to ensure chart shows latest data
      setTimeout(() => {
        if (datafeedRef.current && symbol) {
          datafeedRef.current.refreshCurrentPrice(symbol);
        }
      }, 1000); // Small delay to ensure chart is fully ready

      // Set up periodic refresh to keep chart synchronized
      const refreshInterval = setInterval(() => {
        if (datafeedRef.current && symbol) {
          datafeedRef.current.refreshCurrentPrice(symbol);
        }
      }, 5000); // Refresh every 5 seconds

      // Store interval for cleanup
      (datafeedRef as { refreshInterval?: NodeJS.Timeout }).refreshInterval =
        refreshInterval;

      // Clear any existing entry lines when chart initializes
      try {
        entryLineByIdRef.current.forEach((line) => {
          try {
            if (line && typeof (line as TvShape).remove === "function")
              (line as TvShape).remove!();
            else if (line && typeof (line as TvShape).delete === "function")
              (line as TvShape).delete!();
          } catch {}
        });
        entryLineByIdRef.current.clear();
        entryLinesRef.current = [];
        positionDataRef.current.clear();
      } catch {}

      // Listen for position open/close events from the app to draw/remove lines
      const handlePositionOpened = (e: Event) => {
        const detail = (e as CustomEvent).detail as
          | {
              price?: number;
              side?: "LONG" | "SHORT";
              id?: string | number;
              size?: number;
              entryPrice?: number;
            }
          | undefined;
        const price = Number(detail?.price);
        const side = (detail?.side || "LONG") as "LONG" | "SHORT";
        const size = Number(detail?.size) || 1;
        const entryPrice = Number(detail?.entryPrice) || price;

        console.log("Position opened event received:", {
          detail,
          price,
          side,
          size,
          entryPrice,
        });

        if (!Number.isFinite(price) || price <= 0) {
          console.log("Invalid price, skipping:", price);
          return;
        }
        // If a line already exists for this id, update it instead of creating a new one
        if (detail?.id !== undefined) {
          const existing = entryLineByIdRef.current.get(detail.id);
          if (existing) {
            console.log(
              "Line already exists for ID:",
              detail.id,
              "- skipping creation"
            );
            return;
          }
        }
        console.log("Creating new entry line...");
        const line = createEntryLine(
          price,
          side,
          detail?.id as string,
          size,
          entryPrice
        );
        console.log("Entry line created:", line);
        if (line && detail?.id !== undefined) {
          entryLineByIdRef.current.set(detail.id, line);
          console.log("Entry line stored with ID:", detail.id);
          console.log(
            "Current map contents:",
            Array.from(entryLineByIdRef.current.keys())
          );
        } else {
          console.log("Failed to create or store entry line");
          console.log("Line object:", line);
          console.log("Detail ID:", detail?.id);
        }
      };
      const handlePositionClosed = (e: Event) => {
        const detail = (e as CustomEvent).detail as
          | { id?: string | number }
          | undefined;
        const id = detail?.id;
        console.log("Position closed event received for ID:", id);

        if (id === undefined) {
          console.log("No ID provided for position-closed event");
          return;
        }

        const line = entryLineByIdRef.current.get(id);
        console.log("Found line to remove:", line);
        console.log(
          "Current map contents:",
          Array.from(entryLineByIdRef.current.keys())
        );
        console.log("Looking for ID:", id);

        if (line) {
          try {
            // Use our custom remove method
            line.remove();
            console.log("Successfully removed line for ID:", id);
          } catch (error) {
            console.error("Error removing line:", error);
          }
          entryLineByIdRef.current.delete(id);
          positionDataRef.current.delete(id);
          console.log("Removed line from tracking map for ID:", id);
        } else {
          console.log("No line found for ID:", id);
          // Try to remove DOM overlay directly
          console.log("Attempting to remove DOM overlay directly");
          try {
            const domOverlay = domOverlaysRef.current.get(id);
            if (domOverlay) {
              console.log("Found DOM overlay for ID:", id);
              if (domOverlay.parentNode) {
                domOverlay.parentNode.removeChild(domOverlay);
                console.log("Successfully removed DOM overlay for ID:", id);
              } else {
                domOverlay.remove();
                console.log(
                  "Successfully removed DOM overlay using remove() for ID:",
                  id
                );
              }
              domOverlaysRef.current.delete(id);
            } else {
              console.log("No DOM overlay found for ID:", id);
            }
          } catch (error) {
            console.error("Error removing DOM overlay:", error);
          }

          // Try to remove all lines as a fallback
          console.log("Attempting to remove all tracked lines as fallback");
          try {
            entryLineByIdRef.current.forEach((line, lineId) => {
              try {
                console.log("Removing fallback line with ID:", lineId);
                line.remove();
              } catch (error) {
                console.error("Error removing fallback line:", error);
              }
            });
            entryLineByIdRef.current.clear();
            positionDataRef.current.clear();
            console.log("Cleared all tracked lines");
          } catch (error) {
            console.error("Error in fallback line removal:", error);
          }
        }
      };
      window.addEventListener(
        "position-opened",
        handlePositionOpened as EventListener
      );
      window.addEventListener(
        "position-closed",
        handlePositionClosed as EventListener
      );

      // Cleanup listeners when chart is destroyed
      (
        tvWidget as unknown as { _cleanupHandlers?: Array<() => void> }
      )._cleanupHandlers ||= [];
      (
        tvWidget as unknown as { _cleanupHandlers: Array<() => void> }
      )._cleanupHandlers.push(() => {
        window.removeEventListener(
          "position-opened",
          handlePositionOpened as EventListener
        );
        window.removeEventListener(
          "position-closed",
          handlePositionClosed as EventListener
        );
      });
    });

    return () => {
      try {
        // Clear refresh interval
        if (
          (datafeedRefForWidget as { refreshInterval?: NodeJS.Timeout })
            .refreshInterval
        ) {
          clearInterval(
            (datafeedRefForWidget as { refreshInterval?: NodeJS.Timeout })
              .refreshInterval
          );
        }
        // Remove any lingering entry lines
        try {
          entryLinesRef.current.forEach((ref) => {
            const l = ref?.line as TvRemovable | undefined;
            if (!l) return;
            if (typeof (l as TvShape).remove === "function")
              (l as TvShape).remove!();
            else if (typeof (l as TvShape).delete === "function")
              (l as TvShape).delete!();
          });
          entryLinesRef.current = [];
          entryLineByIdRef.current.clear();
          positionDataRef.current.clear();
        } catch {}
        // Run any chart cleanup handlers we registered
        const tvw = widgetRef.current as unknown as {
          _cleanupHandlers?: Array<() => void>;
        } | null;
        if (tvw?._cleanupHandlers?.length) {
          tvw._cleanupHandlers.forEach((fn) => {
            try {
              fn();
            } catch {}
          });
          tvw._cleanupHandlers = [];
        }
        tvWidget.remove();
      } catch {}
      widgetRef.current = null;
      datafeedRef.current = null;
    };
  }, [key, theme, symbol, priceType]);

  // Handle price type change with loading state to prevent white flash
  useEffect(() => {
    setIsChangingPriceType(true);
    // Hide loading after widget recreation completes
    const timer = setTimeout(() => {
      setIsChangingPriceType(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [priceType]);

  // Refresh current price when price type changes
  useEffect(() => {
    if (widgetRef.current && symbol) {
      const datafeed = (
        widgetRef.current as {
          datafeed?: { refreshCurrentPrice?: (symbol: string) => void };
        }
      ).datafeed;
      if (datafeed && typeof datafeed.refreshCurrentPrice === "function") {
        datafeed.refreshCurrentPrice(symbol);
      }
    }
  }, [priceType, symbol]);

  const intervals: { label: string; res: ResolutionString }[] = visibleRes.map(
    (r) => ({
      label: labelFor(r),
      res: r,
    })
  );

  const handleIntervalClick = (res: ResolutionString) => {
    setActiveRes(res);
    try {
      localStorage.setItem(STORAGE_KEY, res as unknown as string);
    } catch {}
    try {
      const tvw = widgetRef.current as {
        chart?: () => {
          setResolution?: (res: ResolutionString, callback: () => void) => void;
        };
      } | null;
      const chart = tvw?.chart?.() ?? null;
      if (chart && typeof chart.setResolution === "function") {
        chart.setResolution(res, () => {});
      }
    } catch {}
  };

  // const handleSelectInterval = (e: React.ChangeEvent<HTMLSelectElement>) => {
  //   const value = e.target.value as unknown as ResolutionString;
  //   if (!value) return;
  //   handleIntervalClick(value);
  // };

  const extraIntervals: { label: string; res: ResolutionString }[] = [
    { label: "3m", res: "3" as ResolutionString },
    { label: "2h", res: "120" as ResolutionString },
    { label: "6h", res: "360" as ResolutionString },
    { label: "12h", res: "720" as ResolutionString },
  ];
  // const [extrasOpen, setExtrasOpen] = useState(false);

  // const extraActive = extraIntervals.find((x) => x.res === activeRes);

  const toggleCustom = (res: ResolutionString) => {
    const exists = (visibleRes as string[]).includes(res as unknown as string);
    if (exists) {
      const next = visibleRes.filter((r) => r !== res);
      persistVisible(next);
    } else {
      const next = [...visibleRes, res];
      // keep a stable ordering based on allIntervals ordering
      const order = (a: ResolutionString, b: ResolutionString) =>
        (allIntervals as string[]).indexOf(a as unknown as string) -
        (allIntervals as string[]).indexOf(b as unknown as string);
      persistVisible(next.sort(order));
    }
  };

  const openIndicators = () => {
    try {
      const tvw = widgetRef.current as {
        executeActionById?: (action: string) => void;
        chart?: () => { executeActionById?: (action: string) => void };
      } | null;
      if (!tvw) return;
      // Try on widget first, then on chart instance
      if (typeof tvw.executeActionById === "function") {
        tvw.executeActionById("insertIndicator");
        return;
      }
      const chart = tvw.chart?.();
      if (chart && typeof chart.executeActionById === "function") {
        chart.executeActionById("insertIndicator");
      }
    } catch {}
  };

  const openSettings = () => {
    try {
      const tvw = widgetRef.current as {
        executeActionById?: (action: string) => void;
        chart?: () => { executeActionById?: (action: string) => void };
      } | null;
      if (!tvw) return;
      // Try on widget first, then on chart instance
      if (typeof tvw.executeActionById === "function") {
        tvw.executeActionById("chartProperties");
        return;
      }
      const chart = tvw.chart?.();
      if (chart && typeof chart.executeActionById === "function") {
        chart.executeActionById("chartProperties");
      }
    } catch {}
  };

  const openCompareSymbols = () => {
    try {
      const tvw = widgetRef.current as {
        executeActionById?: (action: string) => void;
        chart?: () => { executeActionById?: (action: string) => void };
      } | null;
      if (!tvw) return;
      // Try on widget first, then on chart instance
      if (typeof tvw.executeActionById === "function") {
        tvw.executeActionById("compareOrAdd");
        return;
      }
      const chart = tvw.chart?.();
      if (chart && typeof chart.executeActionById === "function") {
        chart.executeActionById("compareOrAdd");
      }
    } catch {}
  };

  const captureScreenshot = () => {
    try {
      const tvw = widgetRef.current as {
        takeScreenshot?: () => void;
        chart?: () => { takeScreenshot?: () => void };
      } | null;
      if (!tvw) return;

      // Use TradingView's built-in screenshot method (not deprecated action)
      if (typeof tvw.takeScreenshot === "function") {
        tvw.takeScreenshot();
        return;
      }

      // Fallback: Try on chart instance
      const chart = tvw.chart?.();
      if (chart && typeof chart.takeScreenshot === "function") {
        chart.takeScreenshot();
      }
    } catch {}
  };

  const toggleFullscreen = () => {
    try {
      const chartContainer = wrapperRef.current || containerRef.current;
      if (!chartContainer) return;

      // Use browser's native fullscreen API for chart container only
      if (!document.fullscreenElement) {
        // Enter fullscreen for chart container
        if (chartContainer.requestFullscreen) {
          chartContainer.requestFullscreen();
        } else if (
          (
            chartContainer as unknown as HTMLElement & {
              mozRequestFullScreen?: () => void;
            }
          ).mozRequestFullScreen
        ) {
          (
            chartContainer as unknown as HTMLElement & {
              mozRequestFullScreen: () => void;
            }
          ).mozRequestFullScreen();
        } else if (
          (
            chartContainer as unknown as HTMLElement & {
              webkitRequestFullscreen?: () => void;
            }
          ).webkitRequestFullscreen
        ) {
          (
            chartContainer as unknown as HTMLElement & {
              webkitRequestFullscreen: () => void;
            }
          ).webkitRequestFullscreen();
        } else if (
          (
            chartContainer as unknown as HTMLElement & {
              msRequestFullscreen?: () => void;
            }
          ).msRequestFullscreen
        ) {
          (
            chartContainer as unknown as HTMLElement & {
              msRequestFullscreen: () => void;
            }
          ).msRequestFullscreen();
        }
      } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (
          (document as Document & { mozCancelFullScreen?: () => void })
            .mozCancelFullScreen
        ) {
          (
            document as Document & { mozCancelFullScreen: () => void }
          ).mozCancelFullScreen();
        } else if (
          (document as Document & { webkitExitFullscreen?: () => void })
            .webkitExitFullscreen
        ) {
          (
            document as Document & { webkitExitFullscreen: () => void }
          ).webkitExitFullscreen();
        } else if (
          (document as Document & { msExitFullscreen?: () => void })
            .msExitFullscreen
        ) {
          (
            document as Document & { msExitFullscreen: () => void }
          ).msExitFullscreen();
        }
      }
    } catch (error) {
      console.error("Fullscreen error:", error);
    }
  };

  // ===== Chart Type Selector =====
  type TvChartTypeAction =
    | "chartTypeBars"
    | "chartTypeCandles"
    | "chartTypeHollowCandle"
    | "chartTypeHeikinAshi"
    | "chartTypeLine"
    | "chartTypeArea"
    | "chartTypeBaseline";

  const chartTypeOptions: { id: TvChartTypeAction; label: string }[] = [
    { id: "chartTypeBars", label: t("chartTypes.bars") },
    { id: "chartTypeCandles", label: t("chartTypes.candles") },
    { id: "chartTypeHollowCandle", label: t("chartTypes.hollowCandles") },
    { id: "chartTypeHeikinAshi", label: t("chartTypes.heikinAshi") },
    { id: "chartTypeLine", label: t("chartTypes.line") },
    { id: "chartTypeArea", label: t("chartTypes.area") },
    { id: "chartTypeBaseline", label: t("chartTypes.baseline") },
  ];

  const applyChartType = (action: TvChartTypeAction) => {
    try {
      setSelectedChartType(action); // Track selected chart type
      const tvw = widgetRef.current as {
        executeActionById?: (action: string) => void;
        activeChart?: () => { executeActionById?: (action: string) => void };
        chart?: () => {
          executeActionById?: (action: string) => void;
          setChartType?: (id: number) => void;
        };
        applyOverrides?: (overrides: Record<string, unknown>) => void;
      } | null;
      if (!tvw) return;

      // Preferred path
      if (typeof tvw.executeActionById === "function") {
        try {
          tvw.executeActionById(action);
        } catch {}
      }

      const chart =
        typeof tvw.activeChart === "function"
          ? tvw.activeChart()
          : typeof tvw.chart === "function"
          ? tvw.chart()
          : null;
      if (!chart) return;

      // Try action on chart as well
      if (typeof chart.executeActionById === "function") {
        try {
          chart.executeActionById(action);
        } catch {}
      }

      // Always apply a concrete chart type via setChartType as a reliable fallback
      const numericMap: Record<TvChartTypeAction, number> = {
        chartTypeBars: 0, // Bars
        chartTypeCandles: 1, // Candles
        chartTypeHollowCandle: 9, // Hollow Candles
        chartTypeHeikinAshi: 8, // Heikin Ashi
        chartTypeLine: 2, // Line
        chartTypeArea: 3, // Area
        chartTypeBaseline: 8, // Baseline
      };
      const id = numericMap[action];
      if (
        typeof (chart as { setChartType?: (id: number) => void })
          .setChartType === "function" &&
        typeof id === "number"
      ) {
        (chart as { setChartType: (id: number) => void }).setChartType(id);
      }

      // Apply specific overrides for baseline chart type
      if (
        action === "chartTypeBaseline" &&
        typeof tvw.applyOverrides === "function"
      ) {
        const foreground = resolvedTheme === "dark" ? "#ffffff" : "#000000";
        const up = "#22c55e";
        const down = "#ef4444";

        tvw.applyOverrides({
          "mainSeriesProperties.style": 8, // Corrected to 8
          "mainSeriesProperties.baselineStyle.baseLevelPercentage": 50, // Corrected property path
          "mainSeriesProperties.baselineStyle.topFillColor1": up,
          "mainSeriesProperties.baselineStyle.topFillColor2": up,
          "mainSeriesProperties.baselineStyle.topLineColor": up,
          "mainSeriesProperties.baselineStyle.bottomFillColor1": down,
          "mainSeriesProperties.baselineStyle.bottomFillColor2": down,
          "mainSeriesProperties.baselineStyle.bottomLineColor": down,
          "mainSeriesProperties.baselineStyle.topLineWidth": 1,
          "mainSeriesProperties.baselineStyle.bottomLineWidth": 1,
          "mainSeriesProperties.baselineStyle.topLineStyle": 0,
          "mainSeriesProperties.baselineStyle.bottomLineStyle": 0,
          "mainSeriesProperties.priceLineColor": foreground,
        });
      } else if (typeof tvw.applyOverrides === "function") {
        // Last resort: change main series style via overrides for other chart types
        const overrideMap: Record<TvChartTypeAction, number> = {
          chartTypeBars: 0,
          chartTypeCandles: 1,
          chartTypeHollowCandle: 9,
          chartTypeHeikinAshi: 8,
          chartTypeLine: 2,
          chartTypeArea: 3,
          chartTypeBaseline: 8, // Corrected to 8
        };
        const style = overrideMap[action];
        if (typeof style === "number") {
          tvw.applyOverrides({ "mainSeriesProperties.style": style });
        }
      }
    } catch {}
  };

  return (
    <div
      ref={wrapperRef}
      className="border border-border bg-background rounded-none text-sm p-0 h-full w-full tv-no-drag relative"
      style={{
        backgroundColor: currentTheme === "light" ? "#ffffff" : "#0a0a0a",
      }}
    >
      {/* Custom interval toolbar */}
      <TradingViewToolbar
        intervals={intervals}
        activeRes={activeRes}
        handleIntervalClick={handleIntervalClick}
        extraIntervals={extraIntervals}
        allIntervals={allIntervals}
        visibleRes={visibleRes}
        toggleCustom={toggleCustom}
        labelFor={labelFor}
        openIndicators={openIndicators}
        openSettings={openSettings}
        openCompareSymbols={openCompareSymbols}
        priceType={priceType}
        setPriceType={setPriceType}
        captureScreenshot={captureScreenshot}
        toggleFullscreen={toggleFullscreen}
        chartTypeOptions={chartTypeOptions}
        selectedChartType={selectedChartType}
        applyChartType={applyChartType}
      />
      <div
        ref={containerRef}
        className="h-[calc(100%-4rem)] lg:h-[calc(100%-2.25rem)] w-full"
        style={{
          backgroundColor: currentTheme === "light" ? "#ffffff" : "#0a0a0a",
        }}
      />
      <QuickTradePanel parentRef={wrapperRef} symbol={symbol} roomId={roomId} />
      {(isLoading || isChangingPriceType) && (
        <div className="absolute inset-0 flex items-center justify-center bg-background">
          <div className="text-muted-foreground">
            {isChangingPriceType
              ? t("loading.updatingPriceType")
              : t("loading.loadingChart")}
          </div>
        </div>
      )}
    </div>
  );
}
