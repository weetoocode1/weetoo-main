import {
  AreaData,
  AreaSeries,
  AreaSeriesOptions,
  AreaStyleOptions,
  BarData,
  BarSeries,
  BarSeriesOptions,
  BarStyleOptions,
  BaselineData,
  BaselineSeries,
  BaselineSeriesOptions,
  BaselineStyleOptions,
  CandlestickData,
  CandlestickSeries,
  CandlestickSeriesOptions,
  CandlestickStyleOptions,
  createChart,
  DeepPartial,
  IChartApi,
  IPriceLine,
  ISeriesApi,
  LineData,
  LineSeries,
  LineSeriesOptions,
  LineStyleOptions,
  MouseEventParams,
  SeriesOptionsCommon,
  Time,
  WhitespaceData,
} from "lightweight-charts";
import { Crosshair, MousePointer2 } from "lucide-react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import useSWR from "swr";
import { useDrawingSync } from "../../hooks/use-drawing-sync";
import { useFibonacciTools } from "../../hooks/useFibonacciTools";
import { useLineTools } from "../../hooks/useLineTools";
import ChartTopBar from "./ChartTopBar";
import LineTools, {
  DrawPath,
  DrawTool,
  LineDrawing,
  LineTool,
} from "./LineTools";

interface OpenPosition {
  id: string;
  symbol: string;
  side: string;
  quantity: number;
  entry_price: number;
  initial_margin?: number;
  stop_loss?: number;
  take_profit?: number;
  entry_time?: number; // Add entry time for positioning
}

interface LightweightChartProps {
  theme?: "light" | "dark";
  symbol: string;
  openPositions?: OpenPosition[];
  ticker?: {
    lastPrice: string;
    priceChange: string;
    priceChangePercent: string;
  };
  roomId?: string;
  hostId?: string;
  isHost?: boolean;
}

// Cursor type definition
interface CursorType {
  label: string;
  value: string;
  icon: React.ComponentType<{ size?: number }>;
  cursor: string;
}

const CURSOR_TYPES: CursorType[] = [
  {
    label: "Arrow",
    value: "default",
    icon: MousePointer2,
    cursor: "default",
  },
  {
    label: "Cross",
    value: "crosshair",
    icon: Crosshair,
    cursor: "crosshair",
  },
];

// Scalable line tools set - add new tools here
const LINE_TOOLS_SET = new Set([
  "trend",
  "ray",
  "info",
  "extended",
  "angle",
  "horizontal",
  "horizontalRay",
  "vertical",
  "cross",
]);

// Helper function to check if a tool is a line tool
const isLineTool = (tool: string | null): boolean => {
  return tool ? LINE_TOOLS_SET.has(tool) : false;
};

// Helper to map candles to the correct format for each series type
function getSeriesData(chartType: string, candles: CandlestickData[]) {
  if (
    chartType === "line" ||
    chartType === "area" ||
    chartType === "baseline"
  ) {
    const mapped = candles.map((c) => ({
      time: c.time,
      value: Number(c.close),
    }));
    return mapped.filter(
      (c) =>
        (typeof c.time === "number" ||
          (typeof c.time === "string" && c.time !== "")) &&
        typeof c.value === "number" &&
        isFinite(c.value) &&
        !isNaN(c.value)
    );
  }
  // For candlestick, bar, heikin_ashi: use OHLC, but filter for valid numbers
  return candles.filter(
    (c) =>
      (typeof c.time === "number" ||
        (typeof c.time === "string" && c.time !== "")) &&
      typeof c.open === "number" &&
      isFinite(c.open) &&
      !isNaN(c.open) &&
      typeof c.high === "number" &&
      isFinite(c.high) &&
      !isNaN(c.high) &&
      typeof c.low === "number" &&
      isFinite(c.low) &&
      !isNaN(c.low) &&
      typeof c.close === "number" &&
      isFinite(c.close) &&
      !isNaN(c.close)
  );
}

// Type for incoming raw candle data
type RawCandle = {
  time: number | string;
  open: number | string;
  high: number | string;
  low: number | string;
  close: number | string;
};

// Type-safe union for all possible chart series, allowing whitespace data and correct options types
type ChartSeries =
  | ISeriesApi<
      "Candlestick",
      Time,
      CandlestickData | WhitespaceData<Time>,
      CandlestickSeriesOptions,
      DeepPartial<CandlestickStyleOptions & SeriesOptionsCommon>
    >
  | ISeriesApi<
      "Bar",
      Time,
      BarData | WhitespaceData<Time>,
      BarSeriesOptions,
      DeepPartial<BarStyleOptions & SeriesOptionsCommon>
    >
  | ISeriesApi<
      "Line",
      Time,
      LineData | WhitespaceData<Time>,
      LineSeriesOptions,
      DeepPartial<LineStyleOptions & SeriesOptionsCommon>
    >
  | ISeriesApi<
      "Area",
      Time,
      AreaData | WhitespaceData<Time>,
      AreaSeriesOptions,
      DeepPartial<AreaStyleOptions & SeriesOptionsCommon>
    >
  | ISeriesApi<
      "Baseline",
      Time,
      BaselineData | WhitespaceData<Time>,
      BaselineSeriesOptions,
      DeepPartial<BaselineStyleOptions & SeriesOptionsCommon>
    >;

const LightweightChart: React.FC<LightweightChartProps> = ({
  theme = "light",
  symbol,
  openPositions = [],
  ticker,
  roomId,
  hostId,
  isHost = false,
}) => {
  const fetcher = (url: string) => fetch(url).then((res) => res.json());

  // Initialize drawing sync - always call the hook at top level
  const initialState = useMemo(
    () => ({
      selectedCursor: "default",
      drawTool: null as DrawTool,
      pencilColor: theme === "dark" ? "#fff" : "#222",
      highlighterColor: "#fbbf24",
      lineTool: null as LineTool,
      eraserActive: false,
      drawPaths: [] as DrawPath[],
      lineDrawings: [] as LineDrawing[],
      selectedPeriod: "15m",
      chartType: "candlestick",
      fibDrawings: [],
      fibPreview: null,
      emojiDrawings: [], // <-- add this
    }),
    [theme]
  );

  const drawingSync = useDrawingSync({
    roomId: roomId || "",
    hostId: hostId || "",
    isHost: isHost || false,
    initialState,
  });

  // Use the new hook for all line tool state and logic
  const lineTools = useLineTools(theme, drawingSync);

  // Use the Fibonacci tools hook
  const fibonacciTools = useFibonacciTools(theme, drawingSync);

  // Destructure what you need from the hook
  const {
    selectedCursor,
    setSelectedCursor,
    drawTool,
    setDrawTool,
    pencilColor,
    setPencilColor,
    highlighterColor,
    setHighlighterColor,
    lineTool,
    setLineTool,
    eraserActive,
    setEraserActive,
    drawPaths,
    lineDrawings,
    setLineDrawings,
    selectedPeriod,
    setSelectedPeriod,
    chartType,
    setChartType,
    linePreviewRef,
    setDraggedLine,
    draggedLine,
    handleLineStart,
    handleLineMove,
    handleLineEnd,
    handleDrawStart,
    handleDrawMove,
    handleDrawEnd,
    handleUndo,
  } = lineTools;

  // Destructure Fibonacci tools
  const {
    fibTool,
    setFibTool,
    fibDrawings,
    setFibDrawings,
    fibPreview,
    setFibPreview,
    draggedFib,
    setDraggedFib,
    currentFibPathRef,
    fibPreviewRef,
    handleFibStart,
    handleFibMove,
    handleFibEnd,
    drawFibonacciDrawings,
    drawFibPreview,
    handleFibMouseDown,
    handleFibDragMove,
    handleFibMouseUp,
    draggedFibHandle,
  } = fibonacciTools;

  // Add emojiTool state
  const [emojiTool, setEmojiTool] = useState<"emoji" | null>(null);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const emojiDrawings = drawingSync.emojiDrawings;
  const setEmojiDrawings = drawingSync.setEmojiDrawings;

  // 1. Add undo stack for emoji drawings
  const [, setEmojiUndoStack] = useState<Array<typeof emojiDrawings>>([]);

  // 2. Helper to push to undo stack
  const pushEmojiUndo = useCallback(() => {
    setEmojiUndoStack((stack) => [...stack, emojiDrawings]);
  }, [emojiDrawings]);

  // 3. When adding, moving, or resizing an emoji, push previous state to undo stack
  // When adding a new emoji:
  const handleEmojiSelected = (emoji: string) => {
    if (chartContainerRef.current) {
      const rect = chartContainerRef.current.getBoundingClientRect();
      const x = rect.width / 2;
      const y = rect.height / 2;
      const id = `emoji_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      setEmojiDrawings([...emojiDrawings, { id, x, y, emoji, size: 32 }]);
      setSelectedEmoji(null);
      setEmojiTool(null);
      pushEmojiUndo();
    } else {
      setSelectedEmoji(emoji);
      setEmojiTool("emoji");
    }
  };

  // 4. Undo handler
  const handleEmojiUndo = useCallback(() => {
    setEmojiUndoStack((stack) => {
      if (stack.length === 0) return stack;
      const prev = stack[stack.length - 1];
      setEmojiDrawings(prev);
      return stack.slice(0, -1);
    });
  }, [setEmojiDrawings]);

  // 5. Keyboard shortcut (Ctrl+Z) for emoji undo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        handleEmojiUndo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleEmojiUndo]);

  // 6. Optionally, add an Undo button for emoji (host only)
  // In your UI, add:
  // <button onClick={handleEmojiUndo} disabled={emojiUndoStack.length === 0}>Undo Emoji</button>

  // 2. Add state for selected/dragged/resizing emoji
  const [selectedEmojiId, setSelectedEmojiId] = useState<string | null>(null);
  const [draggingEmoji, setDraggingEmoji] = useState<{
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [resizingEmoji, setResizingEmoji] = useState<{
    id: string;
    startX: number;
    startY: number;
    startSize: number;
  } | null>(null);

  // Add this effect to handle global mouseup for emoji drag/resize
  useEffect(() => {
    if (!draggingEmoji && !resizingEmoji) return;
    const handleUp = () => {
      setDraggingEmoji(null);
      setResizingEmoji(null);
    };
    window.addEventListener("mouseup", handleUp);
    return () => window.removeEventListener("mouseup", handleUp);
  }, [draggingEmoji, resizingEmoji]);

  const { data } = useSWR(
    `/api/market-data?symbol=${symbol}&include=candles&interval=${selectedPeriod}`,
    fetcher,
    { refreshInterval: 1000 }
  );
  const candles: CandlestickData[] = (data?.candles || []).map(
    (candle: RawCandle) => ({
      time: candle.time,
      open: Number(candle.open),
      high: Number(candle.high),
      low: Number(candle.low),
      close: Number(candle.close),
    })
  );
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ReturnType<IChartApi["addSeries"]> | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const [hoveredPosition, setHoveredPosition] = useState<OpenPosition | null>(
    null
  );
  const [markerCoords, setMarkerCoords] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [latestPrice, setLatestPrice] = useState<number | null>(null);
  const chartWrapperRef = useRef<HTMLDivElement>(null);
  const isInitialLoadRef = useRef(true);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  // Add state to track if we are currently dragging a Fibonacci retracement
  const [isDrawingFib, setIsDrawingFib] = useState(false);
  // Add a ref to track if a handle/area is being dragged (to avoid infinite loop)
  const draggingFibRef = useRef(false);

  const handleClearAll = useCallback(() => {
    if (!isHost) return;

    lineTools.setDrawPaths([]);
    lineTools.setLineDrawings([]);
    setFibDrawings([]);
    setFibPreview(null);
    setEmojiDrawings([]);
    setEmojiUndoStack([]);

    if (lineTools.currentPathRef.current) {
      lineTools.currentPathRef.current = null;
    }
    if (lineTools.linePreviewRef.current) {
      lineTools.linePreviewRef.current = null;
    }
    if (fibPreviewRef.current) {
      fibPreviewRef.current = null;
    }
    if (currentFibPathRef.current) {
      currentFibPathRef.current = [];
    }

    setDrawTool(null);
    setLineTool(null);
    setFibTool(null);
    setEraserActive(false);
    setEmojiTool(null);
    setSelectedEmoji(null);
    setDraggedLine(null);
    setDraggedFib(null);
    setIsDrawingFib(false);
    setSelectedEmojiId(null);
  }, [
    isHost,
    lineTools,
    setFibDrawings,
    setFibPreview,
    setEmojiDrawings,
    setEmojiUndoStack,
    fibPreviewRef,
    currentFibPathRef,
    setDrawTool,
    setLineTool,
    setFibTool,
    setEraserActive,
    setEmojiTool,
    setSelectedEmoji,
    setDraggedLine,
    setDraggedFib,
    setIsDrawingFib,
    setSelectedEmojiId,
  ]);

  const lineToolsProps = {
    selectedCursor,
    setSelectedCursor,
    drawTool,
    setDrawTool,
    pencilColor,
    setPencilColor,
    highlighterColor,
    setHighlighterColor,
    lineTool,
    setLineTool,
    eraserActive,
    setEraserActive,
    handleUndo,
    isHost,
    fibTool,
    setFibTool,
    fibDrawings,
    setFibDrawings,
    emojiTool,
    setEmojiTool,
    onEmojiSelected: handleEmojiSelected,
    handleClearAll,
  };

  // Find the latest close price for live PNL
  useEffect(() => {
    if (candles && candles.length > 0) {
      setLatestPrice(candles[candles.length - 1].close);
    }
  }, [candles]);

  // Initialize chart (only runs once)
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const container = chartContainerRef.current;
    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      layout: {
        background: { color: theme === "dark" ? "#0a0a0a" : "#fff" },
        textColor: theme === "dark" ? "#fff" : "#0a0a0a",
        attributionLogo: false,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: "#444",
        shiftVisibleRangeOnNewBar: false, // Prevent auto-snap on update
      },
      rightPriceScale: { borderColor: "#444" },
      crosshair: {
        mode: 0, // Normal mode
      },
      // Disable chart interactions when drawing tools are active
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: !(drawTool || lineTool || eraserActive),
        horzTouchDrag: !(drawTool || lineTool || eraserActive),
        vertTouchDrag: !(drawTool || lineTool || eraserActive),
      },
      handleScale: {
        axisPressedMouseMove: !(drawTool || lineTool || eraserActive),
        mouseWheel: true,
        pinch: true,
      },
    });

    // Add initial series based on chartType
    let series: ChartSeries | null = null;
    if (chartType === "candlestick") {
      series = chart.addSeries(CandlestickSeries, {
        upColor: "#16a34a",
        downColor: "#dc2626",
        borderUpColor: "#16a34a",
        borderDownColor: "#dc2626",
        wickUpColor: "#16a34a",
        wickDownColor: "#dc2626",
        borderVisible: false,
      });
      const seriesData = getSeriesData(chartType, candles);
      if (seriesData.length > 0) {
        series.setData(seriesData);
      } else {
        series.setData([]); // or skip calling setData
      }
    } else if (chartType === "bar") {
      series = chart.addSeries(BarSeries, {
        upColor: "#16a34a",
        downColor: "#dc2626",
      });
      const seriesData = getSeriesData(chartType, candles);
      if (seriesData.length > 0) {
        series.setData(seriesData);
      } else {
        series.setData([]); // or skip calling setData
      }
    } else if (chartType === "line") {
      series = chart.addSeries(LineSeries, {
        color: "#16a34a",
        lineWidth: 2,
      });
      const seriesData = getSeriesData(chartType, candles);
      if (seriesData.length > 0) {
        series.setData(seriesData);
      } else {
        series.setData([]); // or skip calling setData
      }
    } else if (chartType === "area") {
      series = chart.addSeries(AreaSeries, {
        topColor: "rgba(22,163,74,0.56)",
        bottomColor: "rgba(22,163,74,0.10)",
        lineColor: "#16a34a",
        lineWidth: 2,
      });
      const seriesData = getSeriesData(chartType, candles);
      if (seriesData.length > 0) {
        series.setData(seriesData);
      } else {
        series.setData([]); // or skip calling setData
      }
    } else if (chartType === "baseline") {
      series = chart.addSeries(BaselineSeries, {
        topLineColor: "#16a34a",
        topFillColor1: "rgba(22,163,74,0.56)",
        topFillColor2: "rgba(22,163,74,0.10)",
        bottomLineColor: "#dc2626",
        bottomFillColor1: "rgba(220,38,38,0.56)",
        bottomFillColor2: "rgba(220,38,38,0.10)",
        lineWidth: 2,
        baseValue: {
          type: "price",
          price: candles.length ? candles[0].close : 0,
        },
      });
      const seriesData = getSeriesData(chartType, candles);
      if (seriesData.length > 0) {
        series.setData(seriesData);
      } else {
        series.setData([]); // or skip calling setData
      }
    } else if (chartType === "heikin_ashi") {
      // Heikin Ashi: transform candles to heikin ashi data
      const haCandles = [];
      let prev: { open: number; close: number } | null = null;
      for (let i = 0; i < candles.length; i++) {
        const c = candles[i];
        const haClose = (c.open + c.high + c.low + c.close) / 4;
        const haOpen: number = prev
          ? (prev.open + prev.close) / 2
          : (c.open + c.close) / 2;
        const haHigh = Math.max(c.high, haOpen, haClose);
        const haLow = Math.min(c.low, haOpen, haClose);
        haCandles.push({
          time: c.time,
          open: haOpen,
          high: haHigh,
          low: haLow,
          close: haClose,
        });
        prev = { open: haOpen, close: haClose };
      }
      series = chart.addSeries(CandlestickSeries, {
        upColor: "#16a34a",
        downColor: "#dc2626",
        borderUpColor: "#16a34a",
        borderDownColor: "#dc2626",
        wickUpColor: "#16a34a",
        wickDownColor: "#dc2626",
        borderVisible: false,
      });
      const seriesData = getSeriesData(chartType, haCandles);
      if (seriesData.length > 0) {
        series.setData(seriesData);
      } else {
        series.setData([]); // or skip calling setData
      }
    }
    chart.timeScale().applyOptions({ barSpacing: 5 });
    seriesRef.current = series || null;

    // Responsive resize
    const handleResize = () => {
      if (container) {
        chart.resize(container.clientWidth, container.clientHeight);
      }
    };
    window.addEventListener("resize", handleResize);

    chartRef.current = chart;

    return () => {
      window.removeEventListener("resize", handleResize);
      // Remove price lines
      if (seriesRef.current) {
        priceLinesRef.current.forEach((line) => {
          try {
            if (seriesRef.current) {
              seriesRef.current.removePriceLine(line);
            }
          } catch (error) {
            console.log("Error removing price line:", error);
          }
        });
      }
      chart.remove();
    };
  }, [theme, chartType]);
  // Update candles data (preserves visible range)
  useEffect(() => {
    if (!chartRef.current || !seriesRef.current) return;
    const chart = chartRef.current;
    const candleSeries = seriesRef.current;
    const timeScale = chart.timeScale();

    // Save current visible range
    const savedRange = timeScale.getVisibleLogicalRange();

    // Update data with filtered data
    const seriesData = getSeriesData(chartType, candles);
    if (seriesData.length > 0) {
      if (isInitialLoadRef.current) {
        // Initial load - use setData and fit content
        candleSeries.setData(seriesData);
        timeScale.fitContent();
        isInitialLoadRef.current = false;
      } else {
        // Real-time updates - use update to preserve scroll position
        candleSeries.setData(seriesData);
        // Restore visible range to prevent snapping
        if (savedRange) {
          timeScale.setVisibleLogicalRange(savedRange);
        }
      }
    } else {
      candleSeries.setData([]);
    }
  }, [candles, chartType]);

  // Only fit content when period changes, not when candles update
  useEffect(() => {
    if (chartRef.current && candles.length > 0) {
      chartRef.current.timeScale().fitContent();
    }
  }, [selectedPeriod]);

  // Update position indicators (preserves visible range)
  useEffect(() => {
    if (!chartRef.current || !seriesRef.current) return;
    const chart = chartRef.current;
    const candleSeries = seriesRef.current;
    const timeScale = chart.timeScale();

    // Debug: Log when openPositions changes
    // console.log(
    //   "Chart: openPositions updated:",
    //   openPositions?.length,
    //   "positions"
    // );

    // Save current visible range
    const savedRange = timeScale.getVisibleLogicalRange();

    // Remove old price lines
    if (seriesRef.current) {
      priceLinesRef.current.forEach((line) => {
        try {
          if (seriesRef.current) {
            seriesRef.current.removePriceLine(line);
          }
        } catch (error) {
          console.log("Error removing price line:", error);
        }
      });
    }

    // Clear the price lines ref
    priceLinesRef.current = [];

    // Create new position indicators
    const newPriceLines: IPriceLine[] = [];
    if (openPositions && openPositions.length > 0) {
      console.log(
        "Creating price lines for",
        openPositions.length,
        "positions"
      );
      openPositions.forEach((pos) => {
        const isLong = (pos.side ?? "").toLowerCase() === "long";
        const color = isLong ? "#16a34a" : "#dc2626";

        // Create a price line at the entry price with a distinctive style
        const pnl = calculatePNL(pos);
        const pnlText = pnl >= 0 ? `+$${pnl.toFixed(2)}` : `$${pnl.toFixed(2)}`;
        const priceLine = candleSeries.createPriceLine({
          price: pos.entry_price,
          color: color,
          lineWidth: 2,
          lineStyle: 1, // Dashed line
          axisLabelVisible: true,
          title: `${isLong ? "LONG" : "SHORT"} ${pos.quantity}\n${pnlText}`,
        });

        newPriceLines.push(priceLine);
      });
    } else {
      // console.log("No open positions, not creating any position price lines");
    }

    // Add current price line if ticker data is available and no open position at that price
    if (
      ticker &&
      ticker.lastPrice &&
      !openPositions.some(
        (pos) => Math.abs(pos.entry_price - parseFloat(ticker.lastPrice)) < 0.01
      )
    ) {
      const currentPrice = parseFloat(ticker.lastPrice);
      // Use the exact same color logic as order-book.tsx
      const priceChange = parseFloat(ticker.priceChange);
      const currentPriceColor = priceChange >= 0 ? "#16a34a" : "#dc2626";

      const currentPriceLine = candleSeries.createPriceLine({
        price: currentPrice,
        color: currentPriceColor,
        lineWidth: 1,
        lineStyle: 0, // Solid line
        axisLabelVisible: false, // Hide the label
        title: "", // No title
      });

      newPriceLines.push(currentPriceLine);
    }

    // Update price lines ref with all lines (positions + current price)
    priceLinesRef.current = newPriceLines;

    // Restore visible range to prevent snapping
    if (savedRange) {
      timeScale.setVisibleLogicalRange(savedRange);
    }
  }, [openPositions, latestPrice, ticker]); // Update when price changes for real-time PNL

  // Handle position hover for tooltips
  useEffect(() => {
    if (!chartRef.current) return;

    const chart = chartRef.current;

    const handleMouseMove = (param: MouseEventParams<Time>) => {
      if (!param.time || !openPositions.length || !param.point) {
        // Clear tooltip if no positions or no time or no point
        setHoveredPosition(null);
        setMarkerCoords(null);
        return;
      }

      // Check if mouse is near any position
      const timeScale = chart.timeScale();

      openPositions.forEach((pos) => {
        const timeCoord = timeScale.timeToCoordinate(param.time!);

        if (timeCoord !== null) {
          const mouseX = param.point!.x;
          const mouseY = param.point!.y;

          // Try to get the price for the hovered series
          let currentPrice: number | undefined = undefined;
          type SeriesPricesMap = Map<
            ReturnType<IChartApi["addSeries"]>,
            number
          >;
          if (
            typeof param === "object" &&
            param !== null &&
            "seriesPrices" in param &&
            (param as { seriesPrices?: unknown }).seriesPrices instanceof Map &&
            seriesRef.current
          ) {
            currentPrice = (
              param as { seriesPrices: SeriesPricesMap }
            ).seriesPrices.get(seriesRef.current);
          } else if (
            "price" in param &&
            typeof (param as { price?: number }).price === "number"
          ) {
            currentPrice = (param as { price: number }).price;
          }
          if (currentPrice && Math.abs(currentPrice - pos.entry_price) < 100) {
            if (Math.abs(mouseX - timeCoord) < 50) {
              setHoveredPosition(pos);
              setMarkerCoords({ x: mouseX, y: mouseY });
              return;
            }
          }
        }
      });

      // If not near any position, hide tooltip
      setHoveredPosition(null);
      setMarkerCoords(null);
    };

    chart.subscribeCrosshairMove(handleMouseMove);

    return () => {
      chart.unsubscribeCrosshairMove(handleMouseMove);
    };
  }, [openPositions]);

  // Clear tooltip when no open positions
  useEffect(() => {
    if (!openPositions || openPositions.length === 0) {
      setHoveredPosition(null);
      setMarkerCoords(null);
    }
  }, [openPositions]);

  // Clear tooltip if hoveredPosition is no longer present in openPositions
  useEffect(() => {
    if (
      hoveredPosition &&
      !openPositions.some((pos) => pos.id === hoveredPosition.id)
    ) {
      setHoveredPosition(null);
      setMarkerCoords(null);
    }
  }, [openPositions, hoveredPosition]);

  // Calculate live PNL
  const calculatePNL = (position: OpenPosition) => {
    if (!latestPrice) return 0;
    const isLong = (position.side ?? "").toLowerCase() === "long";
    const priceDiff = latestPrice - position.entry_price;
    return isLong
      ? priceDiff * position.quantity
      : -priceDiff * position.quantity;
  };

  // Undo handler (Ctrl+Z) and Fibonacci shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        handleUndo();
      }
      // Fibonacci shortcuts
      if (e.altKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setFibTool(fibTool === "fibRetracement" ? null : "fibRetracement");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, fibTool, setFibTool]);

  // Replace the massive useEffect with:
  useEffect(() => {
    let frame: number;
    const draw = () => {
      const canvas = drawCanvasRef.current;
      const container = chartContainerRef.current;
      if (!canvas || !container) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Use the optimized drawing function from the hook
      lineTools.drawCanvas(ctx, canvas, container, {
        drawPaths,
        lineDrawings,
        currentPath: lineTools.currentPathRef.current,
        previewLine: lineTools.linePreviewRef.current,
        candles,
      });

      // Draw Fibonacci drawings
      if (fibDrawings.length > 0 || fibPreview) {
        const chartHeight = container.clientHeight;
        const minPrice =
          candles.length > 0 ? Math.min(...candles.map((c) => c.low)) : 0;
        const maxPrice =
          candles.length > 0 ? Math.max(...candles.map((c) => c.high)) : 0;

        drawFibonacciDrawings(
          ctx,
          fibDrawings,
          chartHeight,
          minPrice,
          maxPrice
        );
        if (fibPreview) {
          drawFibPreview(ctx, fibPreview, chartHeight, minPrice, maxPrice);
        }
      }

      // Render emojis on canvas
      emojiDrawings.forEach(({ id, x, y, emoji, size }) => {
        ctx.font = `${size}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(emoji, x, y);
        if (isHost && selectedEmojiId === id) {
          // Draw border
          ctx.save();
          ctx.strokeStyle = "#fbbf24";
          ctx.lineWidth = 2;
          ctx.strokeRect(x - size / 2, y - size / 2, size, size);
          // Draw resize handle (bottom-right)
          ctx.fillStyle = "#fbbf24";
          ctx.beginPath();
          ctx.arc(x + size / 2, y + size / 2, 6, 0, 2 * Math.PI);
          ctx.fill();
          ctx.restore();
        }
      });

      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [
    drawPaths,
    lineDrawings,
    fibDrawings,
    fibPreview,
    theme,
    lineTool,
    fibTool,
    candles,
    lineTools,
    drawFibonacciDrawings,
    drawFibPreview,
    emojiDrawings,
    isHost,
    selectedEmojiId,
  ]);

  // Update pencil color on theme change (if using default)
  useEffect(() => {
    setPencilColor(theme === "dark" ? "#fff" : "#222");
  }, [theme]);

  // When a drawing tool is selected, set cursor to crosshair for drawing
  useEffect(() => {
    if (
      drawTool === "pencil" ||
      drawTool === "highlighter" ||
      drawTool === "eraser"
    ) {
      setSelectedCursor("crosshair");
    }
  }, [drawTool]);

  // When a line tool is selected, set cursor to crosshair
  useEffect(() => {
    if (lineTool) {
      setSelectedCursor("crosshair");
    }
  }, [lineTool]);

  // When eraser is active, set cursor to crosshair
  useEffect(() => {
    if (eraserActive) {
      setSelectedCursor("crosshair");
    }
  }, [eraserActive]);

  // When a Fibonacci tool is selected, set cursor to crosshair
  useEffect(() => {
    if (fibTool) {
      setSelectedCursor("crosshair");
    }
  }, [fibTool]);

  // Update chart interaction options when drawing tools state changes
  const drawingDependencies = useMemo(
    () => [
      drawTool,
      lineTool,
      fibTool,
      eraserActive,
      !!draggedLine,
      !!draggedFib,
    ],
    [drawTool, lineTool, fibTool, eraserActive, draggedLine, draggedFib]
  );

  useEffect(() => {
    if (!chartRef.current) return;

    const isDrawingActive =
      drawTool ||
      lineTool ||
      fibTool ||
      eraserActive ||
      !!draggedLine ||
      !!draggedFib;

    // Update chart options to disable/enable interactions
    chartRef.current.applyOptions({
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: !isDrawingActive,
        horzTouchDrag: !isDrawingActive,
        vertTouchDrag: !isDrawingActive,
      },
      handleScale: {
        axisPressedMouseMove: !isDrawingActive,
        mouseWheel: true,
        pinch: true,
      },
    });
  }, drawingDependencies);

  // Helper: check if mouse is near a handle
  function isNearHandle(
    x: number,
    y: number,
    hx: number,
    hy: number,
    radius = 8
  ) {
    return Math.hypot(x - hx, y - hy) < radius;
  }

  // Mouse down: check for handle/area drag before starting a new drawing
  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (isHost) {
        // Check for resize handle first
        for (const ed of emojiDrawings) {
          const { id, x: ex, y: ey, size } = ed;
          const handleRadius = 10;
          const handleX = ex + size / 2;
          const handleY = ey + size / 2;
          if (Math.hypot(x - handleX, y - handleY) < handleRadius) {
            setSelectedEmojiId(id);
            setResizingEmoji({ id, startX: x, startY: y, startSize: size });
            return;
          }
        }
        // Check for emoji drag
        for (const ed of emojiDrawings) {
          const { id, x: ex, y: ey, size } = ed;
          if (
            x >= ex - size / 2 &&
            x <= ex + size / 2 &&
            y >= ey - size / 2 &&
            y <= ey + size / 2
          ) {
            setSelectedEmojiId(id);
            setDraggingEmoji({ id, offsetX: x - ex, offsetY: y - ey });
            return;
          }
        }
      }
      // Only check for handle drag if not already dragging
      if (!draggedFibHandle && fibDrawings.length > 0 && handleFibMouseDown) {
        handleFibMouseDown(x, y);
        return;
      }
      // Only handle drawing events if drawing tools are active
      const isDrawingActive = drawTool || lineTool || fibTool || eraserActive;
      if (!isDrawingActive && !draggedLine && !draggedFib) return;
      if (isDrawingActive || draggedLine || draggedFib) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (fibTool) {
        setIsDrawingFib(true);
        handleFibStart(x, y);
        return;
      }
      // Check for handle drag (all line types with handles)
      for (let i = 0; i < lineDrawings.length; ++i) {
        const line = lineDrawings[i];
        if (!line || !line.points || line.points.length === 0) continue;
        const points = line.points;
        if (!points || points.length === 0) continue;
        if (
          line.type === "trend" ||
          line.type === "ray" ||
          line.type === "info" ||
          line.type === "extended" ||
          line.type === "angle"
        ) {
          if (points.length < 2) continue;
          for (let j = 0; j <= 1; ++j) {
            const pt = points[j];
            if (!pt) continue;
            if (isNearHandle(x, y, pt.x, pt.y)) {
              e.preventDefault();
              e.stopPropagation();
              setDraggedLine({ lineIdx: i, pointIdx: j as 0 | 1 });
              return;
            }
          }
        } else if (line.type === "horizontal") {
          if (points.length < 2) continue;
          const centerX = (points[0].x + points[1].x) / 2;
          const centerY = points[0].y;
          if (isNearHandle(x, y, centerX, centerY)) {
            e.preventDefault();
            e.stopPropagation();
            setDraggedLine({ lineIdx: i, pointIdx: 0 });
            return;
          }
        } else if (line.type === "horizontalRay") {
          const pt = points[0];
          if (!pt) continue;
          if (isNearHandle(x, y, pt.x, pt.y)) {
            e.preventDefault();
            e.stopPropagation();
            setDraggedLine({ lineIdx: i, pointIdx: 0 });
            return;
          }
        } else if (line.type === "vertical") {
          const pt = points[0];
          if (!pt) continue;
          const centerY = chartContainerRef.current?.clientHeight
            ? chartContainerRef.current.clientHeight / 2
            : 0;
          if (isNearHandle(x, y, pt.x, centerY)) {
            e.preventDefault();
            e.stopPropagation();
            setDraggedLine({ lineIdx: i, pointIdx: 0 });
            return;
          }
        } else if (line.type === "cross") {
          const pt = points[0];
          if (!pt) continue;
          if (isNearHandle(x, y, pt.x, pt.y)) {
            e.preventDefault();
            e.stopPropagation();
            setDraggedLine({ lineIdx: i, pointIdx: 0 });
            return;
          }
        }
      }
      // Otherwise, pass to drawing/line/eraser logic
      if (eraserActive) return;
      if (drawTool) return handleDrawStart(x, y);
      if (isLineTool(lineTool)) return handleLineStart(x, y);
      if (emojiTool && selectedEmoji) {
        pushEmojiUndo();
        setEmojiDrawings([
          ...emojiDrawings,
          {
            id: `emoji_${Date.now()}_${Math.random()
              .toString(36)
              .substr(2, 9)}`,
            x,
            y,
            emoji: selectedEmoji,
            size: 32,
          },
        ]);
        setSelectedEmoji(null);
        setEmojiTool(null);
        return;
      }
    },
    [
      eraserActive,
      drawTool,
      lineTool,
      fibTool,
      lineDrawings,
      handleDrawStart,
      handleLineStart,
      handleFibStart,
      setDraggedLine,
      setIsDrawingFib,
      fibDrawings,
      handleFibMouseDown,
      draggedFibHandle,
      emojiDrawings,
      isHost,
      selectedEmojiId,
      setSelectedEmojiId,
      setResizingEmoji,
      setDraggingEmoji,
      pushEmojiUndo,
    ]
  );

  // Mouse move: update handle/area drag if draggingFibHandle is set
  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (draggedFibHandle && handleFibDragMove) {
        handleFibDragMove(x, y);
        return;
      }
      if (draggingEmoji) {
        const { id, offsetX, offsetY } = draggingEmoji;
        const newX = x - offsetX;
        const newY = y - offsetY;
        const old = emojiDrawings.find((ed) => ed.id === id);
        if (!old || old.x !== newX || old.y !== newY) {
          pushEmojiUndo();
          setEmojiDrawings(
            emojiDrawings.map((ed) =>
              ed.id === id ? { ...ed, x: newX, y: newY } : ed
            )
          );
        }
        return;
      }
      if (resizingEmoji) {
        const { id, startX, startY, startSize } = resizingEmoji;
        const delta = Math.max(x - startX, y - startY);
        const newSize = Math.max(16, startSize + delta);
        const old = emojiDrawings.find((ed) => ed.id === id);
        if (!old || old.size !== newSize) {
          pushEmojiUndo();
          setEmojiDrawings(
            emojiDrawings.map((ed) =>
              ed.id === id ? { ...ed, size: newSize } : ed
            )
          );
        }
        return;
      }
      const isDrawingActive = drawTool || lineTool || fibTool || eraserActive;
      if (!isDrawingActive && !draggedLine && !draggedFib && !isDrawingFib)
        return;
      if (isDrawingActive || draggedLine || draggedFib || isDrawingFib) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (isDrawingFib && fibTool) {
        handleFibMove(x, y);
        return;
      }
      if (draggedLine) {
        const arr = [...lineDrawings];
        const line = { ...arr[draggedLine.lineIdx] };
        const points = [...line.points];
        if (line.type === "horizontal") {
          points[0] = { x: 0, y };
          points[1] = { x: rect.width, y };
        } else if (line.type === "horizontalRay") {
          points[0] = { x: x, y };
        } else if (line.type === "vertical") {
          points[0] = { x, y: points[0].y };
        } else if (line.type === "cross") {
          points[0] = { x, y };
        } else {
          points[draggedLine.pointIdx] = { x, y };
        }
        line.points = points;
        arr[draggedLine.lineIdx] = line;
        setLineDrawings(arr);
        return;
      }
      if (draggedFib) {
        // (Optional: implement handle for dragging fib handles)
        return;
      }
      if (drawTool) return handleDrawMove(x, y);
      if (isLineTool(lineTool) && linePreviewRef.current)
        return handleLineMove(x, y);
      if (fibTool && fibPreviewRef.current) return handleFibMove(x, y);
      if (draggingEmoji) {
        const { id, offsetX, offsetY } = draggingEmoji;
        setEmojiDrawings(
          emojiDrawings.map((ed) =>
            ed.id === id ? { ...ed, x: x - offsetX, y: y - offsetY } : ed
          )
        );
        return;
      }
      if (resizingEmoji) {
        const { id, startX, startY, startSize } = resizingEmoji;
        const delta = Math.max(x - startX, y - startY);
        setEmojiDrawings(
          emojiDrawings.map((ed) =>
            ed.id === id ? { ...ed, size: Math.max(16, startSize + delta) } : ed
          )
        );
        return;
      }
    },
    [
      draggedLine,
      draggedFib,
      drawTool,
      lineTool,
      fibTool,
      eraserActive,
      isDrawingFib,
      handleDrawMove,
      handleLineMove,
      handleFibMove,
      lineDrawings,
      setLineDrawings,
      linePreviewRef,
      fibPreviewRef,
      handleFibDragMove,
      draggedFibHandle,
      draggingEmoji,
      setDraggingEmoji,
      resizingEmoji,
      setResizingEmoji,
      emojiDrawings,
      setEmojiDrawings,
      pushEmojiUndo,
    ]
  );

  // Mouse up: finalize handle/area drag if draggingFibHandle is set
  const handleCanvasMouseUp = useCallback(
    (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      if (draggedFibHandle && handleFibMouseUp) {
        handleFibMouseUp();
        draggingFibRef.current = false;
        return;
      }
      const isDrawingActive = drawTool || lineTool || fibTool || eraserActive;
      if (!isDrawingActive && !draggedLine && !draggedFib && !isDrawingFib)
        return;
      if (isDrawingActive || draggedLine || draggedFib || isDrawingFib) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (isDrawingFib && fibTool) {
        setIsDrawingFib(false);
        handleFibStart(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
        return;
      }
      if (drawTool) return handleDrawEnd();
      if (isLineTool(lineTool) && linePreviewRef.current)
        return handleLineEnd();
      if (fibTool && fibPreviewRef.current) return handleFibEnd();
      setDraggingEmoji(null);
      setResizingEmoji(null);
    },
    [
      draggedLine,
      draggedFib,
      drawTool,
      lineTool,
      fibTool,
      eraserActive,
      isDrawingFib,
      handleDrawEnd,
      handleLineEnd,
      handleFibStart,
      setDraggedLine,
      setDraggedFib,
      linePreviewRef,
      fibPreviewRef,
      handleFibMouseUp,
      draggedFibHandle,
      setDraggingEmoji,
      setResizingEmoji,
    ]
  );

  // Mouse leave: if dragging, stop; else pass to drawing/line logic
  const handleCanvasMouseLeave = useCallback(
    (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      // Only handle drawing events if drawing tools are active
      const isDrawingActive = drawTool || lineTool || fibTool || eraserActive;
      if (!isDrawingActive && !draggedLine && !draggedFib) {
        return; // Let chart handle the event
      }

      // Prevent chart panning when drawing tools are active
      if (isDrawingActive || draggedLine || draggedFib) {
        e.preventDefault();
        e.stopPropagation();
      }

      if (draggedLine) {
        setDraggedLine(null);
        return;
      }
      if (draggedFib) {
        setDraggedFib(null);
        return;
      }
      if (isDrawingFib && fibTool) {
        setIsDrawingFib(false);
        return;
      }
      if (drawTool) return handleDrawEnd();
      if (isLineTool(lineTool) && linePreviewRef.current) {
        return handleLineEnd();
      }
      if (fibTool && fibPreviewRef.current) {
        return handleFibEnd();
      }
      setDraggingEmoji(null);
      setResizingEmoji(null);
    },
    [
      draggedLine,
      draggedFib,
      drawTool,
      lineTool,
      fibTool,
      eraserActive,
      handleDrawEnd,
      handleLineEnd,
      handleFibEnd,
      isDrawingFib,
      setIsDrawingFib,
      setDraggingEmoji,
      setResizingEmoji,
    ]
  );

  // Only allow drawing when a drawing tool is selected
  return (
    <div ref={chartWrapperRef} className="chart-flex-fill">
      {/* Position Tooltip */}
      {hoveredPosition &&
        markerCoords &&
        openPositions.some((pos) => pos.id === hoveredPosition.id) && (
          <div
            className="absolute z-30 bg-background border border-border shadow-lg rounded-lg p-3 pointer-events-none"
            style={{
              left: markerCoords.x + 10,
              top: markerCoords.y - 60,
              minWidth: "200px",
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  (hoveredPosition.side ?? "").toLowerCase() === "long"
                    ? "bg-green-500"
                    : "bg-red-500"
                }`}
              />
              <span className="font-semibold text-sm">
                {(hoveredPosition.side ?? "").toUpperCase()}
              </span>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Position:</span>
                <span className="font-medium">
                  {(hoveredPosition.side ?? "").toUpperCase()}{" "}
                  {hoveredPosition.quantity}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Entry Price:</span>
                <span className="font-medium">
                  ${hoveredPosition.entry_price.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Price:</span>
                <span className="font-medium">${latestPrice?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Live PNL:</span>
                <span
                  className={`font-medium ${
                    calculatePNL(hoveredPosition) >= 0
                      ? "text-green-500"
                      : "text-red-500"
                  }`}
                >
                  {calculatePNL(hoveredPosition) >= 0 ? "+" : ""}$
                  {calculatePNL(hoveredPosition).toFixed(2)}
                </span>
              </div>
              {hoveredPosition.stop_loss && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stop Loss:</span>
                  <span className="font-medium text-red-500">
                    ${hoveredPosition.stop_loss.toFixed(2)}
                  </span>
                </div>
              )}
              {hoveredPosition.take_profit && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Take Profit:</span>
                  <span className="font-medium text-green-500">
                    ${hoveredPosition.take_profit.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

      <ChartTopBar
        selectedPeriod={selectedPeriod}
        setSelectedPeriod={setSelectedPeriod}
        chartType={chartType}
        setChartType={setChartType}
        isHost={isHost}
      />

      <div className="h-full flex w-full">
        <LineTools
          {...lineToolsProps}
          emojiTool={emojiTool}
          setEmojiTool={setEmojiTool}
          onEmojiSelected={handleEmojiSelected}
        />
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
          <div
            ref={chartContainerRef}
            className="w-full h-full"
            style={{
              height: "100%",
              cursor: CURSOR_TYPES.find(
                (t: CursorType) => t.value === selectedCursor
              )?.cursor,
            }}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseLeave}
          />
          {/* Drawing Canvas Overlay */}
          <canvas
            ref={drawCanvasRef}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none", // Always allow chart interactions
              zIndex: 20,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default LightweightChart;
