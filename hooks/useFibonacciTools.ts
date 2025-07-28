import { useCallback, useRef, useState } from "react";

// --- Fibonacci constants and types ---
export const FIBONACCI_TOOLS = [
  {
    label: "Fib Retracement",
    value: "fibRetracement",
    icon: undefined,
    shortcut: "Alt + F",
    description: "Draw Fibonacci retracement levels",
  },
  {
    label: "Trend-Based Fib Extension",
    value: "fibExtension",
    icon: undefined,
    description: "Draw Fibonacci extension levels based on trend",
  },
  {
    label: "Fib Channel",
    value: "fibChannel",
    icon: undefined,
    description: "Draw Fibonacci channel with parallel lines",
  },
  {
    label: "Fib Time Zone",
    value: "fibTimeZone",
    icon: undefined,
    description: "Draw Fibonacci time zones",
  },
  {
    label: "Fib Speed Resistance Fan",
    value: "fibFan",
    icon: undefined,
    description: "Draw Fibonacci speed resistance fan",
  },
  {
    label: "Trend-Based Fib Time",
    value: "fibTime",
    icon: undefined,
    description: "Draw trend-based Fibonacci time levels",
  },
  {
    label: "Fib Circles",
    value: "fibCircles",
    icon: undefined,
    description: "Draw Fibonacci circles",
  },
  {
    label: "Fib Spiral",
    value: "fibSpiral",
    icon: undefined,
    description: "Draw Fibonacci spiral",
  },
  {
    label: "Fib Speed Resistance Arcs",
    value: "fibArcs",
    icon: undefined,
    description: "Draw Fibonacci speed resistance arcs",
  },
  {
    label: "Fib Wedge",
    value: "fibWedge",
    icon: undefined,
    description: "Draw Fibonacci wedge pattern",
  },
];

export const FIBONACCI_LEVELS = {
  retracement: [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1],
  extension: [
    0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.272, 1.618, 2.618, 3.618,
  ],
  time: [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.272, 1.618, 2.618, 3.618],
};

export type FibonacciTool = (typeof FIBONACCI_TOOLS)[number]["value"] | null;
export interface FibonacciDrawing {
  type: FibonacciTool;
  points: { x: number; y: number }[];
  color: string;
  levels: number[];
  visible: boolean;
  id: string;
}

// --- Hook implementation (rest of the file unchanged) ---
interface DrawingSync {
  selectedCursor: string;
  drawTool: any;
  pencilColor: string;
  highlighterColor: string;
  lineTool: any;
  eraserActive: boolean;
  drawPaths: any[];
  lineDrawings: any[];
  selectedPeriod: string;
  chartType: string;
  setSelectedCursor: (value: string) => void;
  setDrawTool: (value: any) => void;
  setPencilColor: (value: string) => void;
  setHighlighterColor: (value: string) => void;
  setLineTool: (value: any) => void;
  setEraserActive: (value: boolean) => void;
  setDrawPaths: (value: any[]) => void;
  setLineDrawings: (value: any[]) => void;
  setSelectedPeriod: (value: string) => void;
  setChartType: (value: string) => void;
  isHost: boolean;
  roomId: string;
}

export function useFibonacciTools(
  initialTheme: "light" | "dark",
  drawingSync?: DrawingSync
) {
  // Fibonacci tool state
  const [fibTool, setFibTool] = useState<FibonacciTool>(null);
  const [fibDrawings, setFibDrawings] = useState<FibonacciDrawing[]>([]);
  const [fibPreview, setFibPreview] = useState<FibonacciDrawing | null>(null);
  const [draggedFib, setDraggedFib] = useState<{
    drawingIdx: number;
    pointIdx: number;
  } | null>(null);

  // Refs for drawing
  const currentFibPathRef = useRef<{ x: number; y: number }[]>([]);
  const fibPreviewRef = useRef<FibonacciDrawing | null>(null);

  // Generate unique ID for Fibonacci drawings
  const generateFibId = useCallback(() => {
    return `fib_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Helper function to calculate Fibonacci levels
  const calculateFibLevels = useCallback(
    (startPrice: number, endPrice: number, levels: number[]) => {
      const priceDiff = endPrice - startPrice;
      return levels.map((level) => startPrice + priceDiff * level);
    },
    []
  );

  // Helper function to convert screen coordinates to price coordinates
  const screenToPrice = useCallback(
    (y: number, chartHeight: number, minPrice: number, maxPrice: number) => {
      const priceRange = maxPrice - minPrice;
      return maxPrice - (y / chartHeight) * priceRange;
    },
    []
  );

  // Helper function to convert price coordinates to screen coordinates
  const priceToScreen = useCallback(
    (
      price: number,
      chartHeight: number,
      minPrice: number,
      maxPrice: number
    ) => {
      const priceRange = maxPrice - minPrice;
      return ((maxPrice - price) / priceRange) * chartHeight;
    },
    []
  );

  // Track drawing state for two-click logic
  const [fibDrawingInProgress, setFibDrawingInProgress] = useState<{
    start: { x: number; y: number } | null;
  } | null>(null);

  // Add state for dragging handles or area
  const [draggedFibHandle, setDraggedFibHandle] = useState<
    null | "anchor" | "drag" | "area"
  >(null);
  const [dragOffset, setDragOffset] = useState<{
    dx: number;
    dy: number;
  } | null>(null);

  // Hit-test for handles and area
  function hitTestFibHandle(x: number, y: number, drawing: FibonacciDrawing) {
    const [anchor, drag] = drawing.points;
    if (Math.hypot(x - anchor.x, y - anchor.y) < 10) return "anchor";
    if (Math.hypot(x - drag.x, y - drag.y) < 10) return "drag";
    // Area: check if y is between anchor.y and drag.y, and x is between anchor.x and drag.x
    const minX = Math.min(anchor.x, drag.x),
      maxX = Math.max(anchor.x, drag.x);
    const minY = Math.min(anchor.y, drag.y),
      maxY = Math.max(anchor.y, drag.y);
    if (x >= minX && x <= maxX && y >= minY && y <= maxY) return "area";
    return null;
  }

  // Mouse down: check for handle/area drag
  const handleFibMouseDown = useCallback(
    (x: number, y: number) => {
      // Only allow dragging if a fib drawing exists
      if (!fibDrawings.length) return;
      const drawing = fibDrawings[fibDrawings.length - 1]; // Only allow dragging the last one for now
      const hit = hitTestFibHandle(x, y, drawing);
      if (hit) {
        setDraggedFibHandle(hit);
        if (hit === "area") {
          // Store offset between mouse and anchor
          setDragOffset({
            dx: x - drawing.points[0].x,
            dy: y - drawing.points[0].y,
          });
        }
      }
    },
    [fibDrawings]
  );

  // Mouse move: update handle/area drag
  const handleFibDragMove = useCallback(
    (x: number, y: number) => {
      if (!draggedFibHandle || !fibDrawings.length) return;
      const drawing = fibDrawings[fibDrawings.length - 1];
      let newPoints = [...drawing.points];
      if (draggedFibHandle === "anchor") {
        newPoints[0] = { x, y };
      } else if (draggedFibHandle === "drag") {
        newPoints[1] = { x, y };
      } else if (draggedFibHandle === "area" && dragOffset) {
        const dx = x - newPoints[0].x - dragOffset.dx;
        const dy = y - newPoints[0].y - dragOffset.dy;
        newPoints = [
          { x: newPoints[0].x + dx, y: newPoints[0].y + dy },
          { x: newPoints[1].x + dx, y: newPoints[1].y + dy },
        ];
      }
      // Update preview for smooth dragging
      setFibPreview({ ...drawing, points: newPoints });
    },
    [draggedFibHandle, fibDrawings, dragOffset]
  );

  // Mouse up: finalize drag
  const handleFibMouseUp = useCallback(() => {
    if (!draggedFibHandle || !fibDrawings.length || !fibPreview) {
      setDraggedFibHandle(null);
      setDragOffset(null);
      return;
    }
    // Finalize the drag
    const updated = {
      ...fibDrawings[fibDrawings.length - 1],
      points: fibPreview.points,
    };
    setFibDrawings((prev) => [...prev.slice(0, -1), updated]);
    setFibPreview(null);
    setDraggedFibHandle(null);
    setDragOffset(null);
  }, [draggedFibHandle, fibDrawings, fibPreview]);

  // Start Fibonacci drawing (first click)
  const handleFibStart = useCallback(
    (x: number, y: number) => {
      if (!fibTool || !drawingSync?.isHost) return;
      if (!fibDrawingInProgress) {
        // First click: set start point
        setFibDrawingInProgress({ start: { x, y } });
        setFibPreview({
          type: fibTool,
          points: [
            { x, y },
            { x, y },
          ],
          color: "#3b82f6",
          levels: FIBONACCI_LEVELS.retracement,
          visible: true,
          id: generateFibId(),
        });
      } else if (fibDrawingInProgress.start) {
        // Second click: finalize
        const start = fibDrawingInProgress.start;
        const end = { x, y };
        const newFibDrawing: FibonacciDrawing = {
          type: fibTool,
          points: [start, end],
          color: "#3b82f6",
          levels: FIBONACCI_LEVELS.retracement,
          visible: true,
          id: generateFibId(),
        };
        setFibDrawings((prev) => [...prev, newFibDrawing]);
        setFibPreview(null);
        setFibDrawingInProgress(null);
        setFibTool(null); // Deactivate tool after drawing
      }
    },
    [
      fibTool,
      drawingSync?.isHost,
      fibDrawingInProgress,
      generateFibId,
      setFibTool,
    ]
  );

  // Update preview on mouse move (always show preview after first click)
  const handleFibMove = useCallback(
    (x: number, y: number) => {
      if (
        !fibTool ||
        !drawingSync?.isHost ||
        !fibDrawingInProgress ||
        !fibDrawingInProgress.start
      )
        return;
      const start = fibDrawingInProgress.start;
      setFibPreview({
        type: fibTool,
        points: [start, { x, y }],
        color: "#3b82f6",
        levels: FIBONACCI_LEVELS.retracement,
        visible: true,
        id: generateFibId(),
      });
    },
    [fibTool, drawingSync?.isHost, fibDrawingInProgress, generateFibId]
  );

  // End drawing (not used for two-click logic, but keep for API compatibility)
  const handleFibEnd = useCallback(() => {
    // No-op for two-click logic
  }, []);

  // Color bands for each level (distinct, TradingView style)
  const FIB_COLORS = [
    "rgba(255, 99, 132, 0.18)", // 0.0 - 0.236 (red)
    "rgba(255, 159, 64, 0.18)", // 0.236 - 0.382 (orange)
    "rgba(255, 205, 86, 0.18)", // 0.382 - 0.5 (yellow)
    "rgba(75, 192, 192, 0.18)", // 0.5 - 0.618 (teal)
    "rgba(54, 162, 235, 0.18)", // 0.618 - 0.786 (blue)
    "rgba(153, 102, 255, 0.18)", // 0.786 - 1.0 (purple)
    "rgba(91, 192, 222, 0.18)", // 1.0 - 1.618 (light blue)
  ];
  const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.618];

  // Undo last Fibonacci drawing
  const handleFibUndo = useCallback(() => {
    setFibDrawings((prev) => prev.slice(0, -1));
  }, []);

  // Clear all Fibonacci drawings
  const handleFibClear = useCallback(() => {
    if (!drawingSync?.isHost) return;
    setFibDrawings([]);
  }, [drawingSync?.isHost]);

  // --- Replace drawFibRetracement ---
  // Update drawFibRetracement to use anchor.x and drag.x for all lines/bands
  const drawFibRetracement = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      drawing: FibonacciDrawing,
      chartHeight: number,
      minPrice: number,
      maxPrice: number
    ) => {
      if (drawing.points.length < 2) return;
      const [anchor, drag] = drawing.points;
      // Always use anchor and drag for both X and Y
      const minX = Math.min(anchor.x, drag.x),
        maxX = Math.max(anchor.x, drag.x);
      const anchorPrice = screenToPrice(
        anchor.y,
        chartHeight,
        minPrice,
        maxPrice
      );
      const dragPrice = screenToPrice(drag.y, chartHeight, minPrice, maxPrice);
      const isUp = dragPrice > anchorPrice;
      const fibMin = isUp ? anchorPrice : dragPrice;
      const fibMax = isUp ? dragPrice : anchorPrice;
      const levelYs = FIB_LEVELS.map((level) => {
        const price = fibMin + (fibMax - fibMin) * level;
        return priceToScreen(price, chartHeight, minPrice, maxPrice);
      });
      // Draw color bands between levels
      for (let i = 0; i < FIB_LEVELS.length - 1; ++i) {
        ctx.save();
        ctx.fillStyle = FIB_COLORS[i % FIB_COLORS.length];
        const y1 = levelYs[i];
        const y2 = levelYs[i + 1];
        ctx.beginPath();
        ctx.rect(minX, Math.min(y1, y2), maxX - minX, Math.abs(y2 - y1));
        ctx.fill();
        ctx.restore();
      }
      // Draw horizontal lines and labels
      for (let i = 0; i < FIB_LEVELS.length; ++i) {
        const level = FIB_LEVELS[i];
        const y = levelYs[i];
        ctx.save();
        ctx.strokeStyle =
          i === 0 || i === FIB_LEVELS.length - 2
            ? "#dc2626"
            : i === 3
            ? "#10b981"
            : i === 4
            ? "#2563eb"
            : "#888";
        ctx.lineWidth = i === 0 || i === FIB_LEVELS.length - 2 ? 2 : 1;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(minX, y);
        ctx.lineTo(maxX, y);
        ctx.stroke();
        ctx.restore();
        // Label
        ctx.save();
        ctx.font = "13px Arial";
        ctx.fillStyle = "#fff";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        const price = fibMin + (fibMax - fibMin) * level;
        ctx.fillText(
          `${(level * 100).toFixed(1)}%  ${price.toFixed(2)}`,
          minX + 8,
          y
        );
        ctx.restore();
      }
      // Draw main trend line (dashed)
      ctx.save();
      ctx.strokeStyle = "#aaa";
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(anchor.x, anchor.y);
      ctx.lineTo(drag.x, drag.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      // Draw handles
      ctx.save();
      ctx.fillStyle = draggedFibHandle === "anchor" ? "#fbbf24" : "#fff";
      ctx.strokeStyle = "#222";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(anchor.x, anchor.y, 7, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.fillStyle = draggedFibHandle === "drag" ? "#fbbf24" : "#fff";
      ctx.arc(drag.x, drag.y, 7, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    },
    [screenToPrice, priceToScreen, draggedFibHandle]
  );

  // Draw Fibonacci extension
  const drawFibExtension = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      drawing: FibonacciDrawing,
      chartHeight: number,
      minPrice: number,
      maxPrice: number
    ) => {
      if (drawing.points.length < 2) return;

      const [start, end] = drawing.points;
      const startPrice = screenToPrice(
        start.y,
        chartHeight,
        minPrice,
        maxPrice
      );
      const endPrice = screenToPrice(end.y, chartHeight, minPrice, maxPrice);

      ctx.strokeStyle = drawing.color;
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);

      // Draw main trend line
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();

      // Draw extension levels
      FIBONACCI_LEVELS.extension.forEach((level) => {
        if (level <= 1) return; // Skip retracement levels

        const levelPrice = startPrice + (endPrice - startPrice) * level;
        const levelY = priceToScreen(
          levelPrice,
          chartHeight,
          minPrice,
          maxPrice
        );

        ctx.strokeStyle = drawing.color;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);

        // Draw horizontal line
        ctx.beginPath();
        ctx.moveTo(0, levelY);
        ctx.lineTo(ctx.canvas.width, levelY);
        ctx.stroke();

        // Draw level label
        ctx.fillStyle = drawing.color;
        ctx.font = "12px Arial";
        ctx.textAlign = "left";
        ctx.fillText(`${(level * 100).toFixed(1)}%`, 10, levelY - 5);
      });

      ctx.setLineDash([]);
    },
    [screenToPrice, priceToScreen]
  );

  // Draw Fibonacci channel
  const drawFibChannel = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      drawing: FibonacciDrawing,
      chartHeight: number,
      minPrice: number,
      maxPrice: number
    ) => {
      if (drawing.points.length < 2) return;

      const [start, end] = drawing.points;
      const startPrice = screenToPrice(
        start.y,
        chartHeight,
        minPrice,
        maxPrice
      );
      const endPrice = screenToPrice(end.y, chartHeight, minPrice, maxPrice);

      ctx.strokeStyle = drawing.color;
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);

      // Draw main trend line
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();

      // Draw parallel Fibonacci levels
      drawing.levels.forEach((level) => {
        const levelPrice = startPrice + (endPrice - startPrice) * level;
        const levelY = priceToScreen(
          levelPrice,
          chartHeight,
          minPrice,
          maxPrice
        );

        ctx.strokeStyle = drawing.color;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);

        // Draw parallel line
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const unitX = dx / length;
        const unitY = dy / length;

        ctx.beginPath();
        ctx.moveTo(start.x, levelY);
        ctx.lineTo(start.x + unitX * length, levelY + unitY * length);
        ctx.stroke();
      });

      ctx.setLineDash([]);
    },
    [screenToPrice, priceToScreen]
  );

  // Draw Fibonacci time zones
  const drawFibTimeZone = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      drawing: FibonacciDrawing,
      chartHeight: number,
      minPrice: number,
      maxPrice: number
    ) => {
      if (drawing.points.length < 2) return;

      const [start, end] = drawing.points;
      const timeDiff = end.x - start.x;

      ctx.strokeStyle = drawing.color;
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);

      // Draw vertical time lines
      drawing.levels.forEach((level) => {
        const timeX = start.x + timeDiff * level;

        ctx.strokeStyle = drawing.color;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);

        // Draw vertical line
        ctx.beginPath();
        ctx.moveTo(timeX, 0);
        ctx.lineTo(timeX, chartHeight);
        ctx.stroke();

        // Draw level label
        ctx.fillStyle = drawing.color;
        ctx.font = "12px Arial";
        ctx.textAlign = "center";
        ctx.fillText(`${(level * 100).toFixed(1)}%`, timeX, 15);
      });

      ctx.setLineDash([]);
    },
    []
  );

  // Draw Fibonacci fan
  const drawFibFan = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      drawing: FibonacciDrawing,
      chartHeight: number,
      minPrice: number,
      maxPrice: number
    ) => {
      if (drawing.points.length < 2) return;

      const [start, end] = drawing.points;
      const startPrice = screenToPrice(
        start.y,
        chartHeight,
        minPrice,
        maxPrice
      );
      const endPrice = screenToPrice(end.y, chartHeight, minPrice, maxPrice);

      ctx.strokeStyle = drawing.color;
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);

      // Draw fan lines from start point
      drawing.levels.forEach((level) => {
        const levelPrice = startPrice + (endPrice - startPrice) * level;
        const levelY = priceToScreen(
          levelPrice,
          chartHeight,
          minPrice,
          maxPrice
        );

        ctx.strokeStyle = drawing.color;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);

        // Draw fan line
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(ctx.canvas.width, levelY);
        ctx.stroke();

        // Draw level label
        ctx.fillStyle = drawing.color;
        ctx.font = "12px Arial";
        ctx.textAlign = "left";
        ctx.fillText(`${(level * 100).toFixed(1)}%`, start.x + 10, levelY - 5);
      });

      ctx.setLineDash([]);
    },
    [screenToPrice, priceToScreen]
  );

  // Draw Fibonacci circles
  const drawFibCircles = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      drawing: FibonacciDrawing,
      chartHeight: number,
      minPrice: number,
      maxPrice: number
    ) => {
      if (drawing.points.length < 2) return;

      const [start, end] = drawing.points;
      const radius = Math.sqrt(
        Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
      );

      ctx.strokeStyle = drawing.color;
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);

      // Draw concentric circles
      drawing.levels.forEach((level) => {
        const circleRadius = radius * level;

        ctx.strokeStyle = drawing.color;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);

        // Draw circle
        ctx.beginPath();
        ctx.arc(start.x, start.y, circleRadius, 0, 2 * Math.PI);
        ctx.stroke();

        // Draw level label
        ctx.fillStyle = drawing.color;
        ctx.font = "12px Arial";
        ctx.textAlign = "center";
        ctx.fillText(
          `${(level * 100).toFixed(1)}%`,
          start.x,
          start.y - circleRadius - 5
        );
      });

      ctx.setLineDash([]);
    },
    []
  );

  // Draw Fibonacci spiral
  const drawFibSpiral = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      drawing: FibonacciDrawing,
      chartHeight: number,
      minPrice: number,
      maxPrice: number
    ) => {
      if (drawing.points.length < 2) return;

      const [start, end] = drawing.points;
      const radius = Math.sqrt(
        Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
      );

      ctx.strokeStyle = drawing.color;
      ctx.lineWidth = 2;
      ctx.setLineDash([]);

      // Draw Fibonacci spiral
      ctx.beginPath();
      let x = start.x;
      let y = start.y;
      let angle = 0;
      let currentRadius = radius * 0.1;

      for (let i = 0; i < 100; i++) {
        const newX = start.x + Math.cos(angle) * currentRadius;
        const newY = start.y + Math.sin(angle) * currentRadius;

        if (i === 0) {
          ctx.moveTo(newX, newY);
        } else {
          ctx.lineTo(newX, newY);
        }

        x = newX;
        y = newY;
        angle += 0.1;
        currentRadius += radius * 0.01;
      }

      ctx.stroke();
    },
    []
  );

  // Draw Fibonacci arcs
  const drawFibArcs = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      drawing: FibonacciDrawing,
      chartHeight: number,
      minPrice: number,
      maxPrice: number
    ) => {
      if (drawing.points.length < 2) return;

      const [start, end] = drawing.points;
      const radius = Math.sqrt(
        Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
      );

      ctx.strokeStyle = drawing.color;
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);

      // Draw Fibonacci arcs
      drawing.levels.forEach((level) => {
        const arcRadius = radius * level;

        ctx.strokeStyle = drawing.color;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);

        // Draw arc
        ctx.beginPath();
        ctx.arc(start.x, start.y, arcRadius, 0, Math.PI);
        ctx.stroke();

        // Draw level label
        ctx.fillStyle = drawing.color;
        ctx.font = "12px Arial";
        ctx.textAlign = "center";
        ctx.fillText(
          `${(level * 100).toFixed(1)}%`,
          start.x,
          start.y - arcRadius - 5
        );
      });

      ctx.setLineDash([]);
    },
    []
  );

  // Draw Fibonacci wedge
  const drawFibWedge = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      drawing: FibonacciDrawing,
      chartHeight: number,
      minPrice: number,
      maxPrice: number
    ) => {
      if (drawing.points.length < 3) return;

      const [start, middle, end] = drawing.points;

      ctx.strokeStyle = drawing.color;
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);

      // Draw wedge lines
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(middle.x, middle.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();

      // Draw Fibonacci levels within the wedge
      drawing.levels.forEach((level) => {
        const levelY = start.y + (end.y - start.y) * level;

        ctx.strokeStyle = drawing.color;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);

        // Draw level line
        ctx.beginPath();
        ctx.moveTo(start.x, levelY);
        ctx.lineTo(end.x, levelY);
        ctx.stroke();

        // Draw level label
        ctx.fillStyle = drawing.color;
        ctx.font = "12px Arial";
        ctx.textAlign = "left";
        ctx.fillText(`${(level * 100).toFixed(1)}%`, start.x + 10, levelY - 5);
      });

      ctx.setLineDash([]);
    },
    []
  );

  // Main drawing function for all Fibonacci tools
  const drawFibonacciDrawings = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      drawings: FibonacciDrawing[],
      chartHeight: number,
      minPrice: number,
      maxPrice: number
    ) => {
      drawings.forEach((drawing) => {
        if (!drawing.visible) return;

        switch (drawing.type) {
          case "fibRetracement":
            drawFibRetracement(ctx, drawing, chartHeight, minPrice, maxPrice);
            break;
          case "fibExtension":
            drawFibExtension(ctx, drawing, chartHeight, minPrice, maxPrice);
            break;
          case "fibChannel":
            drawFibChannel(ctx, drawing, chartHeight, minPrice, maxPrice);
            break;
          case "fibTimeZone":
            drawFibTimeZone(ctx, drawing, chartHeight, minPrice, maxPrice);
            break;
          case "fibFan":
            drawFibFan(ctx, drawing, chartHeight, minPrice, maxPrice);
            break;
          case "fibTime":
            drawFibTimeZone(ctx, drawing, chartHeight, minPrice, maxPrice);
            break;
          case "fibCircles":
            drawFibCircles(ctx, drawing, chartHeight, minPrice, maxPrice);
            break;
          case "fibSpiral":
            drawFibSpiral(ctx, drawing, chartHeight, minPrice, maxPrice);
            break;
          case "fibArcs":
            drawFibArcs(ctx, drawing, chartHeight, minPrice, maxPrice);
            break;
          case "fibWedge":
            drawFibWedge(ctx, drawing, chartHeight, minPrice, maxPrice);
            break;
        }
      });
    },
    [
      drawFibRetracement,
      drawFibExtension,
      drawFibChannel,
      drawFibTimeZone,
      drawFibFan,
      drawFibCircles,
      drawFibSpiral,
      drawFibArcs,
      drawFibWedge,
    ]
  );

  // Draw preview
  const drawFibPreview = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      preview: FibonacciDrawing | null,
      chartHeight: number,
      minPrice: number,
      maxPrice: number
    ) => {
      if (!preview) return;

      ctx.globalAlpha = 0.7;
      drawFibonacciDrawings(ctx, [preview], chartHeight, minPrice, maxPrice);
      ctx.globalAlpha = 1;
    },
    [drawFibonacciDrawings]
  );

  return {
    // State
    fibTool,
    setFibTool,
    fibDrawings,
    setFibDrawings,
    fibPreview,
    setFibPreview,
    draggedFib,
    setDraggedFib,
    draggedFibHandle,

    // Refs
    currentFibPathRef,
    fibPreviewRef,

    // Handlers
    handleFibStart,
    handleFibMove,
    handleFibEnd,
    handleFibUndo,
    handleFibClear,
    handleFibMouseDown,
    handleFibDragMove,
    handleFibMouseUp,

    // Drawing functions
    drawFibonacciDrawings,
    drawFibPreview,
  };
}
