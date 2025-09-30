import { useCallback, useRef, useEffect } from "react";

// Feature switch: temporarily disable drawing entry lines/labels on chart
const DRAW_ENTRY_LINES = false;

// TradingView API types
interface TradingViewWidget {
  activeChart: () => TradingViewChart | null;
  getWidget?: () => TradingViewWidget;
}

interface TradingViewChart {
  createShape: (
    point: { time: number; price: number },
    options: ShapeOptions
  ) => Promise<string>;
  createHorizontalLine?: (options: HorizontalLineOptions) => string;
  removeEntity: (entityId: string) => void;
  getSeries: () => TradingViewSeries;
}

interface TradingViewSeries {
  // Series object from TradingView
}

interface ShapeOptions {
  shape: "horizontal_line";
  text: string;
  overrides: {
    linecolor: string;
    linewidth: number;
    linestyle: number;
    axisLabelVisible: boolean;
  };
  disableSelection: boolean;
  disableSave: boolean;
  disableUndo: boolean;
  disableDrag: boolean;
  disableContextMenu: boolean;
}

interface HorizontalLineOptions {
  price: number;
  color: string;
  lineWidth: number;
  lineStyle: number;
  axisLabelVisible: boolean;
  title: string;
}

interface PriceLineObject {
  id?: string;
  remove?: () => void;
  delete?: () => void;
  setVisible?: (visible: boolean) => void;
  hide?: () => void;
}

interface EntryLine {
  id: string;
  price: number;
  side: "long" | "short";
  timestamp: string;
  priceLine: string | PriceLineObject; // Shape ID or price line object
}

interface Position {
  id: string;
  entry_price: number;
  side: string;
  created_at?: string;
  pnl_percentage?: number;
}

interface UseTradingViewLinesProps {
  widgetRef: React.RefObject<{ getWidget?: () => any } | null>;
  isReady: boolean;
}

interface UseTradingViewLinesReturn {
  addEntryLine: (position: Position) => Promise<void>;
  removeEntryLine: (positionId: string) => void;
  clearAllEntryLines: () => void;
  updateEntryLines: (positions: Position[]) => Promise<void>;
}

export const useTradingViewLines = ({
  widgetRef,
  isReady,
}: UseTradingViewLinesProps): UseTradingViewLinesReturn => {
  const entryLinesRef = useRef<Map<string, EntryLine>>(new Map());
  const isInitializedRef = useRef(false);

  const addEntryLine = useCallback(
    async (position: Position): Promise<void> => {
      if (!DRAW_ENTRY_LINES) {
        // Ensure any previously drawn line for this position is removed
        const existing = entryLinesRef.current.get(position.id);
        if (existing) {
          try {
            const widget: TradingViewWidget | undefined =
              widgetRef.current?.getWidget?.();
            const chart: TradingViewChart | null | undefined =
              widget?.activeChart?.();
            if (chart && typeof chart.removeEntity === "function") {
              if (typeof existing.priceLine === "string") {
                chart.removeEntity(existing.priceLine);
              } else if (existing.priceLine && (existing.priceLine as any).id) {
                chart.removeEntity((existing.priceLine as any).id);
              }
            }
          } catch (_) {}
          entryLinesRef.current.delete(position.id);
        }
        return;
      }
      if (!widgetRef.current) {
        return;
      }

      // Add retry mechanism for activeChart method
      const attemptAddLine = async (retryCount: number = 0): Promise<void> => {
        const maxRetries = 15; // Increase max retries
        const delay = 300; // Increase delay

        if (retryCount >= maxRetries) {
          return;
        }

        try {
          // Wait for the widget to be fully initialized
          const widget: TradingViewWidget | undefined =
            widgetRef.current?.getWidget?.();

          if (!widget || typeof widget.activeChart !== "function") {
            setTimeout(async () => await attemptAddLine(retryCount + 1), delay);
            return;
          }

          const chart: TradingViewChart | null = widget.activeChart();
          if (!chart) {
            setTimeout(async () => await attemptAddLine(retryCount + 1), delay);
            return;
          }

          // Check for createShape method on chart (the correct way to create horizontal lines)
          const hasCreateShape: boolean =
            typeof chart.createShape === "function";
          const hasCreateHorizontalLine: boolean =
            typeof chart.createHorizontalLine === "function";

          if (!hasCreateShape && !hasCreateHorizontalLine) {
            setTimeout(async () => await attemptAddLine(retryCount + 1), delay);
            return;
          }

          // Chart is ready, proceed with line creation

          // Remove existing line for this position if it exists
          const existingLine: EntryLine | undefined = entryLinesRef.current.get(
            position.id
          );
          if (
            existingLine?.priceLine &&
            typeof existingLine.priceLine === "object" &&
            "remove" in existingLine.priceLine
          ) {
            try {
              (existingLine.priceLine as PriceLineObject).remove?.();
            } catch (error) {
              // Ignore error when removing existing line
            }
          }

          const entryPrice: number = Number(position.entry_price);
          const side: "long" | "short" = position.side.toLowerCase() as
            | "long"
            | "short";
          const timestamp: string =
            position.created_at || new Date().toISOString();

          // UI label temporarily disabled; keep logic-only line

          // Create horizontal line using createShape (the correct TradingView API)
          let entryLine: string | PriceLineObject;

          if (hasCreateShape) {
            // Get current time for the line
            const currentTime: number = Math.floor(Date.now() / 1000);

            try {
              // createShape returns a Promise, so we need to await it
              // Create a horizontal line without label (UI on hold)
              const shapeId: string = await chart.createShape(
                { time: currentTime, price: entryPrice },
                {
                  shape: "horizontal_line",
                  text: "",
                  overrides: {
                    linecolor: side === "long" ? "#00D092" : "#FF5656",
                    linewidth: 2,
                    linestyle: 0, // Solid line
                    axisLabelVisible: true,
                  },
                  disableSelection: true,
                  disableSave: true,
                  disableUndo: true,
                  disableDrag: true,
                  disableContextMenu: true,
                }
              );

              entryLine = shapeId; // Store the resolved shape ID, not the Promise
            } catch (error) {
              console.error("Failed to create shape:", error);
              throw error;
            }
          } else if (hasCreateHorizontalLine && chart.createHorizontalLine) {
            entryLine = chart.createHorizontalLine({
              price: entryPrice,
              color: side === "long" ? "#00D092" : "#FF5656",
              lineWidth: 2,
              lineStyle: 0,
              axisLabelVisible: true,
              title: "",
            });
          } else {
            throw new Error("No valid shape creation method available");
          }

          entryLinesRef.current.set(position.id, {
            id: position.id,
            price: entryPrice,
            side,
            timestamp,
            priceLine: entryLine,
          });
        } catch (error) {
          console.error(
            `Failed to add entry line (attempt ${
              retryCount + 1
            }/${maxRetries}):`,
            error
          );
          setTimeout(() => attemptAddLine(retryCount + 1), 200);
        }
      };

      // Start the retry mechanism
      await attemptAddLine();
    },
    [widgetRef, isReady]
  );

  const removeEntryLine = useCallback(
    (positionId: string): void => {
      const entryLine: EntryLine | undefined =
        entryLinesRef.current.get(positionId);
      if (entryLine?.priceLine) {
        try {
          // Try to get the chart to use removeEntity method
          const widget: TradingViewWidget | undefined =
            widgetRef.current?.getWidget?.();
          const chart: TradingViewChart | null | undefined =
            widget?.activeChart?.();

          if (chart && typeof chart.removeEntity === "function") {
            // If priceLine is a string (shape ID), use it directly
            if (typeof entryLine.priceLine === "string") {
              chart.removeEntity(entryLine.priceLine);
            } else {
              // If it's an object, try to get the ID
              const priceLineObj = entryLine.priceLine as PriceLineObject;
              if (priceLineObj.id) {
                chart.removeEntity(priceLineObj.id);
              }
            }
          } else if (typeof entryLine.priceLine === "object") {
            const priceLineObj = entryLine.priceLine as PriceLineObject;
            if (priceLineObj.remove) {
              priceLineObj.remove();
            } else if (priceLineObj.delete) {
              priceLineObj.delete();
            } else if (priceLineObj.setVisible) {
              priceLineObj.setVisible(false);
            } else if (priceLineObj.hide) {
              priceLineObj.hide();
            }
          }
          entryLinesRef.current.delete(positionId);
        } catch (error) {
          console.error("Failed to remove entry line:", error);
          // Still remove from our tracking even if the API call fails
          entryLinesRef.current.delete(positionId);
        }
      }
    },
    [widgetRef]
  );

  const clearAllEntryLines = useCallback((): void => {
    entryLinesRef.current.forEach(
      (entryLine: EntryLine, positionId: string) => {
        try {
          if (entryLine.priceLine) {
            // Handle different TradingView API methods
            if (typeof entryLine.priceLine === "object") {
              const priceLineObj = entryLine.priceLine as PriceLineObject;
              if (priceLineObj.remove) {
                priceLineObj.remove();
              } else if (priceLineObj.delete) {
                priceLineObj.delete();
              } else if (priceLineObj.setVisible) {
                // For shapes, try to hide them instead
                priceLineObj.setVisible(false);
              }
            }
          }
        } catch (error) {
          // Ignore error when clearing entry lines
        }
      }
    );
    entryLinesRef.current.clear();
  }, []);

  const updateEntryLines = useCallback(
    async (positions: Position[]): Promise<void> => {
      if (!DRAW_ENTRY_LINES) {
        // Temporarily disabled: clear any existing lines and exit
        clearAllEntryLines();
        return;
      }
      if (!widgetRef.current || !isReady) {
        return;
      }

      try {
        const widget: TradingViewWidget | undefined =
          widgetRef.current?.getWidget?.();
        const chart: TradingViewChart | null | undefined =
          widget?.activeChart?.();

        if (!chart || typeof chart.getSeries !== "function") {
          return;
        }

        const series: TradingViewSeries = chart.getSeries();

        // Check if chart has createShape method (the correct API for horizontal lines)
        const hasCreateShape: boolean = typeof chart.createShape === "function";
        const hasCreateHorizontalLine: boolean =
          typeof chart.createHorizontalLine === "function";

        if (!hasCreateShape && !hasCreateHorizontalLine) {
          return;
        }

        // Get current position IDs
        const currentPositionIds: Set<string> = new Set(
          positions.map((p) => p.id)
        );

        // Remove lines for positions that no longer exist
        entryLinesRef.current.forEach(
          (entryLine: EntryLine, positionId: string) => {
            if (!currentPositionIds.has(positionId)) {
              removeEntryLine(positionId);
            }
          }
        );

        // Add or update lines for current positions
        for (const position of positions) {
          const existingLine: EntryLine | undefined = entryLinesRef.current.get(
            position.id
          );
          const currentPrice: number = Number(position.entry_price);

          // Only add/update if price changed or line doesn't exist
          if (!existingLine || existingLine.price !== currentPrice) {
            await addEntryLine(position);
          }
        }
      } catch (error) {
        console.error("Error updating entry lines:", error);
      }
    },
    [widgetRef, isReady, addEntryLine, removeEntryLine]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllEntryLines();
    };
  }, [clearAllEntryLines]);

  return {
    addEntryLine,
    removeEntryLine,
    clearAllEntryLines,
    updateEntryLines,
  };
};
