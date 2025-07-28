import { useState, useRef, useCallback, useMemo } from "react";
import {
  DrawTool,
  LineTool,
  DrawPath,
  LineDrawing,
} from "../components/room/LineTools";

// Config-driven approach for line types (example, expand as needed)
const LINE_TYPE_CONFIG: { [key: string]: { color: string } } = {
  trend: { color: "#3b82f6" },
  ray: { color: "#f59e42" },
  info: { color: "#10b981" },
  extended: { color: "#eab308" },
  angle: { color: "#a21caf" },
  horizontal: { color: "#f43f5e" },
  horizontalRay: { color: "#f59e42" },
  vertical: { color: "#38bdf8" },
  cross: { color: "#a21caf" },
};

interface DrawingSync {
  selectedCursor: string;
  drawTool: DrawTool;
  pencilColor: string;
  highlighterColor: string;
  lineTool: LineTool;
  eraserActive: boolean;
  drawPaths: DrawPath[];
  lineDrawings: LineDrawing[];
  selectedPeriod: string;
  chartType: string;
  setSelectedCursor: (value: string) => void;
  setDrawTool: (value: DrawTool) => void;
  setPencilColor: (value: string) => void;
  setHighlighterColor: (value: string) => void;
  setLineTool: (value: LineTool) => void;
  setEraserActive: (value: boolean) => void;
  setDrawPaths: (value: DrawPath[]) => void;
  setLineDrawings: (value: LineDrawing[]) => void;
  setSelectedPeriod: (value: string) => void;
  setChartType: (value: string) => void;
  isHost: boolean;
  roomId: string;
}

export function useLineTools(
  initialTheme: "light" | "dark",
  drawingSync?: DrawingSync
) {
  // Use synced state if available, otherwise use local state
  const isUsingSync =
    !!drawingSync && drawingSync.roomId && drawingSync.roomId !== "";

  // All state and refs for line tools
  const [localSelectedCursor, setLocalSelectedCursor] =
    useState<string>("default");
  const [localDrawTool, setLocalDrawTool] = useState<DrawTool>(null);
  const [localPencilColor, setLocalPencilColor] = useState<string>(
    initialTheme === "dark" ? "#fff" : "#222"
  );
  const [localHighlighterColor, setLocalHighlighterColor] =
    useState<string>("#fbbf24");
  const [localLineTool, setLocalLineTool] = useState<LineTool>(null);
  const [localEraserActive, setLocalEraserActive] = useState(false);
  const [localDrawPaths, setLocalDrawPaths] = useState<DrawPath[]>([]);
  const [localLineDrawings, setLocalLineDrawings] = useState<LineDrawing[]>([]);
  const [localSelectedPeriod, setLocalSelectedPeriod] = useState<string>("15m");
  const [localChartType, setLocalChartType] = useState<string>("candlestick");
  const [undoStack, setUndoStack] = useState<
    { type: "drawPath" | "lineDrawing" }[]
  >([]);
  const [drawing, setDrawing] = useState(false);
  const currentPathRef = useRef<DrawPath | null>(null);
  const linePreviewRef = useRef<LineDrawing | null>(null);
  const [draggedLine, setDraggedLine] = useState<null | {
    lineIdx: number;
    pointIdx: 0 | 1;
  }>(null);

  // Use synced state or local state
  const selectedCursor =
    isUsingSync && drawingSync
      ? drawingSync.selectedCursor
      : localSelectedCursor;
  const drawTool =
    isUsingSync && drawingSync ? drawingSync.drawTool : localDrawTool;
  const pencilColor =
    isUsingSync && drawingSync ? drawingSync.pencilColor : localPencilColor;
  const highlighterColor =
    isUsingSync && drawingSync
      ? drawingSync.highlighterColor
      : localHighlighterColor;
  const lineTool =
    isUsingSync && drawingSync ? drawingSync.lineTool : localLineTool;
  const eraserActive =
    isUsingSync && drawingSync ? drawingSync.eraserActive : localEraserActive;
  const drawPaths =
    isUsingSync && drawingSync ? drawingSync.drawPaths : localDrawPaths;
  const lineDrawings =
    isUsingSync && drawingSync ? drawingSync.lineDrawings : localLineDrawings;
  const selectedPeriod =
    isUsingSync && drawingSync
      ? drawingSync.selectedPeriod
      : localSelectedPeriod;
  const chartType =
    isUsingSync && drawingSync ? drawingSync.chartType : localChartType;

  // Setters that work with sync or local state
  const setSelectedCursor = (value: string) => {
    if (isUsingSync && drawingSync) {
      drawingSync.setSelectedCursor(value);
    } else {
      setLocalSelectedCursor(value);
    }
  };

  const setDrawTool = (value: DrawTool) => {
    if (isUsingSync && drawingSync) {
      drawingSync.setDrawTool(value);
    } else {
      setLocalDrawTool(value);
    }
  };

  const setPencilColor = (value: string) => {
    if (isUsingSync && drawingSync) {
      drawingSync.setPencilColor(value);
    } else {
      setLocalPencilColor(value);
    }
  };

  const setHighlighterColor = (value: string) => {
    if (isUsingSync && drawingSync) {
      drawingSync.setHighlighterColor(value);
    } else {
      setLocalHighlighterColor(value);
    }
  };

  const setLineTool = (value: LineTool) => {
    if (isUsingSync && drawingSync) {
      drawingSync.setLineTool(value);
    } else {
      setLocalLineTool(value);
    }
  };

  const setEraserActive = (value: boolean) => {
    if (isUsingSync && drawingSync) {
      drawingSync.setEraserActive(value);
    } else {
      setLocalEraserActive(value);
    }
  };

  const setDrawPaths = (value: DrawPath[]) => {
    if (isUsingSync && drawingSync) {
      drawingSync.setDrawPaths(value);
    } else {
      setLocalDrawPaths(value);
    }
  };

  const setLineDrawings = (value: LineDrawing[]) => {
    if (isUsingSync && drawingSync) {
      drawingSync.setLineDrawings(value);
    } else {
      setLocalLineDrawings(value);
    }
  };

  const setSelectedPeriod = (value: string) => {
    if (isUsingSync && drawingSync) {
      drawingSync.setSelectedPeriod(value);
    } else {
      setLocalSelectedPeriod(value);
    }
  };

  const setChartType = (value: string) => {
    if (isUsingSync && drawingSync) {
      drawingSync.setChartType(value);
    } else {
      setLocalChartType(value);
    }
  };

  // Drawing logic for pencil/highlighter
  const getDrawStyle = useCallback(
    (tool: DrawTool) => {
      if (tool === "pencil")
        return { color: pencilColor, width: 2, opacity: 1 };
      if (tool === "highlighter")
        return { color: highlighterColor, width: 10, opacity: 0.3 };
      return { color: pencilColor, width: 2, opacity: 1 };
    },
    [pencilColor, highlighterColor]
  );

  const handleDrawStart = useCallback(
    (x: number, y: number) => {
      // Only allow drawing if host or not using sync
      if (isUsingSync && drawingSync && !drawingSync.isHost) return;

      if (drawTool === "pencil" || drawTool === "highlighter") {
        setDrawing(true);
        const style = getDrawStyle(drawTool);
        currentPathRef.current = {
          tool: drawTool,
          color: style.color,
          width: style.width,
          points: [{ x, y }],
          opacity: style.opacity,
        };
      }
    },
    [drawTool, getDrawStyle, isUsingSync, drawingSync]
  );

  const handleDrawMove = useCallback(
    (x: number, y: number) => {
      // Only allow drawing if host or not using sync
      if (isUsingSync && drawingSync && !drawingSync.isHost) return;

      if (!drawing || !currentPathRef.current) return;
      currentPathRef.current = {
        ...currentPathRef.current,
        points: [...currentPathRef.current.points, { x, y }],
      };
    },
    [drawing, isUsingSync, drawingSync]
  );

  const handleDrawEnd = useCallback(() => {
    // Only allow drawing if host or not using sync
    if (isUsingSync && drawingSync && !drawingSync.isHost) return;

    if (drawing && currentPathRef.current) {
      const newDrawPaths = [...drawPaths, currentPathRef.current!];
      setDrawPaths(newDrawPaths);
      setUndoStack((prev) => [...prev, { type: "drawPath" }]);
    }
    setDrawing(false);
    currentPathRef.current = null;
  }, [drawing, isUsingSync, drawingSync, drawPaths, setDrawPaths]);

  // Undo logic
  const handleUndo = useCallback(() => {
    // Only allow undo if host or not using sync
    if (isUsingSync && drawingSync && !drawingSync.isHost) return;

    if (!undoStack.length) return;
    const last = undoStack[undoStack.length - 1];
    if (last.type === "drawPath") {
      const newDrawPaths = drawPaths.slice(0, -1);
      setDrawPaths(newDrawPaths);
    } else if (last.type === "lineDrawing") {
      const newLineDrawings = lineDrawings.slice(0, -1);
      setLineDrawings(newLineDrawings);
    }
    setUndoStack((prev) => prev.slice(0, -1));
  }, [
    undoStack,
    isUsingSync,
    drawingSync,
    drawPaths,
    lineDrawings,
    setDrawPaths,
    setLineDrawings,
  ]);

  // Clear all drawings and reset states
  const handleClearAll = useCallback(() => {
    // Only allow clear all if host or not using sync
    if (isUsingSync && drawingSync && !drawingSync.isHost) return;

    // Clear all drawings
    setDrawPaths([]);
    setLineDrawings([]);

    // Clear undo stack
    setUndoStack([]);

    // Clear current drawing states
    setDrawing(false);
    currentPathRef.current = null;
    linePreviewRef.current = null;

    // Reset drag state
    setDraggedLine(null);
  }, [isUsingSync, drawingSync, setDrawPaths, setLineDrawings, setDraggedLine]);

  // Example: config-driven line start
  const handleLineStart = useCallback(
    (x: number, y: number) => {
      if (!lineTool) return;
      const config = LINE_TYPE_CONFIG[lineTool];
      linePreviewRef.current = {
        type: lineTool,
        points: [{ x, y }],
        color: config?.color || "#000",
      };
    },
    [lineTool]
  );

  // Handle line move (for preview)
  const handleLineMove = useCallback(
    (x: number, y: number) => {
      if (!lineTool || !linePreviewRef.current) return;

      const preview = linePreviewRef.current;

      // Handle different line types during preview
      switch (lineTool) {
        case "trend":
        case "ray":
        case "info":
        case "extended":
        case "angle":
          // Two-point lines
          if (preview.points.length === 1) {
            preview.points.push({ x, y });
          } else {
            preview.points[1] = { x, y };
          }
          break;

        case "horizontal":
          // Full width horizontal line
          preview.points = [
            { x: 0, y },
            { x: 1000, y },
          ]; // Will be adjusted to canvas width
          break;

        case "horizontalRay":
          // Horizontal ray from start point
          if (preview.points.length === 1) {
            preview.points[0] = { x: preview.points[0].x, y };
          } else {
            preview.points = [{ x: preview.points[0].x, y }];
          }
          break;

        case "vertical":
          // Full height vertical line
          preview.points = [
            { x, y: 0 },
            { x, y: 1000 },
          ]; // Will be adjusted to canvas height
          break;

        case "cross":
          // Cross marker at point
          preview.points = [{ x, y }];
          break;
      }
    },
    [lineTool]
  );

  // Handle line end (finalize the line)
  const handleLineEnd = useCallback(() => {
    if (!lineTool || !linePreviewRef.current) return;

    const preview = linePreviewRef.current;
    const config = LINE_TYPE_CONFIG[lineTool];

    // Create the final line drawing
    const newLine: LineDrawing = {
      type: lineTool,
      points: [...preview.points],
      color: config?.color || "#000",
    };

    // Add to line drawings
    const newLineDrawings = [...lineDrawings, newLine];
    setLineDrawings(newLineDrawings);

    // Add to undo stack
    setUndoStack((prev) => [...prev, { type: "lineDrawing" }]);

    // Clear preview
    linePreviewRef.current = null;
  }, [lineTool, setLineDrawings]);

  // ...move all other handlers and state logic here, using config-driven approach...

  // Optimized drawing functions
  const drawFreehandPaths = useCallback(
    (ctx: CanvasRenderingContext2D, paths: DrawPath[]) => {
      paths.forEach((path) => {
        ctx.save();
        ctx.globalAlpha = path.opacity;
        ctx.strokeStyle = path.color;
        ctx.lineWidth = path.width;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.beginPath();
        path.points.forEach((pt, i) => {
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
        ctx.restore();
      });
    },
    []
  );

  const drawCurrentPath = useCallback(
    (ctx: CanvasRenderingContext2D, currentPath: DrawPath | null) => {
      if (!currentPath) return;
      ctx.save();
      ctx.globalAlpha = currentPath.opacity;
      ctx.strokeStyle = currentPath.color;
      ctx.lineWidth = currentPath.width;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      currentPath.points.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
      ctx.restore();
    },
    []
  );

  const drawLineDrawings = useCallback(
    (ctx: CanvasRenderingContext2D, lines: LineDrawing[], candles: any[]) => {
      lines.forEach((line) => {
        if (!line.points || line.points.length === 0) return;

        ctx.save();
        ctx.strokeStyle = line.color;
        ctx.lineWidth = 2;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";

        // Draw different line types with specific logic
        switch (line.type) {
          case "trend":
            // Simple two-point line
            if (line.points.length >= 2) {
              ctx.beginPath();
              ctx.moveTo(line.points[0].x, line.points[0].y);
              ctx.lineTo(line.points[1].x, line.points[1].y);
              ctx.stroke();
            }
            break;

          case "ray":
            // Infinite line from start point
            if (line.points.length >= 2) {
              const dx = line.points[1].x - line.points[0].x;
              const dy = line.points[1].y - line.points[0].y;
              const length = Math.sqrt(dx * dx + dy * dy);
              if (length > 0) {
                const unitX = dx / length;
                const unitY = dy / length;
                const endX = line.points[0].x + unitX * ctx.canvas.width * 2;
                const endY = line.points[0].y + unitY * ctx.canvas.height * 2;

                ctx.beginPath();
                ctx.moveTo(line.points[0].x, line.points[0].y);
                ctx.lineTo(endX, endY);
                ctx.stroke();
              }
            }
            break;

          case "info":
            // Line with text annotation
            if (line.points.length >= 2) {
              ctx.beginPath();
              ctx.moveTo(line.points[0].x, line.points[0].y);
              ctx.lineTo(line.points[1].x, line.points[1].y);
              ctx.stroke();

              // Add chart-specific information annotation
              ctx.fillStyle = line.color;
              ctx.font = "12px Arial";
              const midX = (line.points[0].x + line.points[1].x) / 2;
              const midY = (line.points[0].y + line.points[1].y) / 2;

              // Calculate time and price information for chart context
              const timeDiff = Math.abs(line.points[1].x - line.points[0].x);
              const priceDiff = line.points[1].y - line.points[0].y;

              // Show chart-relevant info
              ctx.fillText(
                `Time: ${timeDiff.toFixed(0)}px`,
                midX + 5,
                midY - 15
              );
              ctx.fillText(
                `Price: ${priceDiff >= 0 ? "+" : ""}${priceDiff.toFixed(2)}`,
                midX + 5,
                midY
              );
              ctx.fillText(
                `Level: ${line.points[1].y.toFixed(2)}`,
                midX + 5,
                midY + 15
              );
            }
            break;

          case "extended":
            // Extended trend line beyond points
            if (line.points.length >= 2) {
              const dx = line.points[1].x - line.points[0].x;
              const dy = line.points[1].y - line.points[0].y;
              const extension = 50; // pixels to extend

              const startX =
                line.points[0].x -
                (dx / Math.sqrt(dx * dx + dy * dy)) * extension;
              const startY =
                line.points[0].y -
                (dy / Math.sqrt(dx * dx + dy * dy)) * extension;
              const endX =
                line.points[1].x +
                (dx / Math.sqrt(dx * dx + dy * dy)) * extension;
              const endY =
                line.points[1].y +
                (dy / Math.sqrt(dx * dx + dy * dy)) * extension;

              ctx.beginPath();
              ctx.moveTo(startX, startY);
              ctx.lineTo(endX, endY);
              ctx.stroke();
            }
            break;

          case "angle":
            // Angle measurement with arc
            if (line.points.length >= 2) {
              ctx.beginPath();
              ctx.moveTo(line.points[0].x, line.points[0].y);
              ctx.lineTo(line.points[1].x, line.points[1].y);
              ctx.stroke();

              // Draw angle arc
              const radius = 30;
              const angle = Math.atan2(
                line.points[1].y - line.points[0].y,
                line.points[1].x - line.points[0].x
              );
              ctx.beginPath();
              ctx.arc(line.points[0].x, line.points[0].y, radius, 0, angle);
              ctx.stroke();

              // Add angle text
              ctx.fillStyle = line.color;
              ctx.font = "10px Arial";
              const textAngle = (angle * 180) / Math.PI;
              ctx.fillText(
                `${Math.abs(textAngle).toFixed(1)}°`,
                line.points[0].x + 10,
                line.points[0].y - 10
              );
            }
            break;

          case "horizontal":
            // Full width horizontal line
            ctx.beginPath();
            ctx.moveTo(0, line.points[0].y);
            ctx.lineTo(ctx.canvas.width, line.points[0].y);
            ctx.stroke();
            break;

          case "horizontalRay":
            // Horizontal ray from start point
            ctx.beginPath();
            ctx.moveTo(line.points[0].x, line.points[0].y);
            ctx.lineTo(ctx.canvas.width, line.points[0].y);
            ctx.stroke();
            break;

          case "vertical":
            // Full height vertical line
            ctx.beginPath();
            ctx.moveTo(line.points[0].x, 0);
            ctx.lineTo(line.points[0].x, ctx.canvas.height);
            ctx.stroke();
            break;

          case "cross":
            // Cross line - full height and width lines intersecting at point
            const pt = line.points[0];

            // Draw full width horizontal line
            ctx.beginPath();
            ctx.moveTo(0, pt.y);
            ctx.lineTo(ctx.canvas.width, pt.y);
            ctx.stroke();

            // Draw full height vertical line
            ctx.beginPath();
            ctx.moveTo(pt.x, 0);
            ctx.lineTo(pt.x, ctx.canvas.height);
            ctx.stroke();
            break;
        }

        ctx.restore();
      });
    },
    []
  );

  const drawPreviewLines = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      preview: LineDrawing | null,
      lineTool: LineTool
    ) => {
      if (!preview || !lineTool) return;

      ctx.save();
      ctx.strokeStyle = preview.color;
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.setLineDash([5, 5]); // Dashed line for preview

      // Draw preview based on line tool type
      switch (lineTool) {
        case "trend":
          if (preview.points.length >= 2) {
            ctx.beginPath();
            ctx.moveTo(preview.points[0].x, preview.points[0].y);
            ctx.lineTo(preview.points[1].x, preview.points[1].y);
            ctx.stroke();
          }
          break;

        case "ray":
          if (preview.points.length >= 2) {
            const dx = preview.points[1].x - preview.points[0].x;
            const dy = preview.points[1].y - preview.points[0].y;
            const length = Math.sqrt(dx * dx + dy * dy);
            if (length > 0) {
              const unitX = dx / length;
              const unitY = dy / length;
              const endX = preview.points[0].x + unitX * ctx.canvas.width * 2;
              const endY = preview.points[0].y + unitY * ctx.canvas.height * 2;

              ctx.beginPath();
              ctx.moveTo(preview.points[0].x, preview.points[0].y);
              ctx.lineTo(endX, endY);
              ctx.stroke();
            }
          }
          break;

        case "info":
          if (preview.points.length >= 2) {
            ctx.beginPath();
            ctx.moveTo(preview.points[0].x, preview.points[0].y);
            ctx.lineTo(preview.points[1].x, preview.points[1].y);
            ctx.stroke();

            // Add preview info text
            ctx.fillStyle = preview.color;
            ctx.font = "12px Arial";
            const midX = (preview.points[0].x + preview.points[1].x) / 2;
            const midY = (preview.points[0].y + preview.points[1].y) / 2;
            ctx.fillText("Chart Info", midX + 5, midY - 5);
          }
          break;

        case "extended":
          if (preview.points.length >= 2) {
            const dx = preview.points[1].x - preview.points[0].x;
            const dy = preview.points[1].y - preview.points[0].y;
            const extension = 50;

            const startX =
              preview.points[0].x -
              (dx / Math.sqrt(dx * dx + dy * dy)) * extension;
            const startY =
              preview.points[0].y -
              (dy / Math.sqrt(dx * dx + dy * dy)) * extension;
            const endX =
              preview.points[1].x +
              (dx / Math.sqrt(dx * dx + dy * dy)) * extension;
            const endY =
              preview.points[1].y +
              (dy / Math.sqrt(dx * dx + dy * dy)) * extension;

            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
          }
          break;

        case "angle":
          if (preview.points.length >= 2) {
            ctx.beginPath();
            ctx.moveTo(preview.points[0].x, preview.points[0].y);
            ctx.lineTo(preview.points[1].x, preview.points[1].y);
            ctx.stroke();
          }
          break;

        case "horizontal":
          ctx.beginPath();
          ctx.moveTo(0, preview.points[0].y);
          ctx.lineTo(ctx.canvas.width, preview.points[0].y);
          ctx.stroke();
          break;

        case "horizontalRay":
          ctx.beginPath();
          ctx.moveTo(preview.points[0].x, preview.points[0].y);
          ctx.lineTo(ctx.canvas.width, preview.points[0].y);
          ctx.stroke();
          break;

        case "vertical":
          ctx.beginPath();
          ctx.moveTo(preview.points[0].x, 0);
          ctx.lineTo(preview.points[0].x, ctx.canvas.height);
          ctx.stroke();
          break;

        case "cross":
          // Full chart cross preview
          const pt = preview.points[0];

          // Draw full width horizontal line preview
          ctx.beginPath();
          ctx.moveTo(0, pt.y);
          ctx.lineTo(ctx.canvas.width, pt.y);
          ctx.stroke();

          // Draw full height vertical line preview
          ctx.beginPath();
          ctx.moveTo(pt.x, 0);
          ctx.lineTo(pt.x, ctx.canvas.height);
          ctx.stroke();
          break;
      }

      ctx.restore();
    },
    []
  );

  const drawHandles = useCallback(
    (ctx: CanvasRenderingContext2D, lines: LineDrawing[]) => {
      lines.forEach((line) => {
        if (!line.points || line.points.length === 0) return;

        ctx.save();
        ctx.fillStyle = "#fff";
        ctx.strokeStyle = line.color;
        ctx.lineWidth = 2;

        // Draw handles for different line types
        if (line.type === "horizontal") {
          const centerX = (line.points[0].x + line.points[1].x) / 2;
          const centerY = line.points[0].y;
          ctx.beginPath();
          ctx.arc(centerX, centerY, 6, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
        } else if (line.type === "horizontalRay") {
          const pt = line.points[0];
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 6, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
        } else if (line.type === "vertical") {
          const pt = line.points[0];
          const centerY = ctx.canvas.height / 2;
          ctx.beginPath();
          ctx.arc(pt.x, centerY, 6, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
        } else if (line.type === "cross") {
          const pt = line.points[0];
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 6, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
        } else if (line.points.length >= 2) {
          // Draw handles for both points of regular lines
          line.points.forEach((pt) => {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 6, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
          });
        }

        ctx.restore();
      });
    },
    []
  );

  // Main optimized draw function
  const drawCanvas = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      canvas: HTMLCanvasElement,
      container: HTMLElement,
      data: {
        drawPaths: DrawPath[];
        lineDrawings: LineDrawing[];
        currentPath: DrawPath | null;
        previewLine: LineDrawing | null;
        candles: any[];
      }
    ) => {
      // Clear and resize
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw in order
      drawFreehandPaths(ctx, data.drawPaths);
      drawLineDrawings(ctx, data.lineDrawings, data.candles);
      drawPreviewLines(ctx, data.previewLine, lineTool);
      drawCurrentPath(ctx, data.currentPath);
      drawHandles(ctx, data.lineDrawings);
    },
    [
      drawFreehandPaths,
      drawCurrentPath,
      drawLineDrawings,
      drawPreviewLines,
      drawHandles,
      lineTool,
    ]
  );

  // Memoize the return object to prevent unnecessary re-renders
  const memoizedReturn = useMemo(
    () => ({
      // State
      selectedCursor,
      drawTool,
      pencilColor,
      highlighterColor,
      lineTool,
      eraserActive,
      drawPaths,
      lineDrawings,
      selectedPeriod,
      chartType,

      // Setters
      setSelectedCursor,
      setDrawTool,
      setPencilColor,
      setHighlighterColor,
      setLineTool,
      setEraserActive,
      setDrawPaths,
      setLineDrawings,
      setSelectedPeriod,
      setChartType,

      // Refs
      currentPathRef,
      linePreviewRef,

      // State
      draggedLine,
      setDraggedLine,

      // Handlers
      handleLineStart,
      handleLineMove,
      handleLineEnd,
      handleDrawStart,
      handleDrawMove,
      handleDrawEnd,
      handleUndo,
      handleClearAll,

      // Drawing functions
      drawCanvas,
    }),
    [
      selectedCursor,
      drawTool,
      pencilColor,
      highlighterColor,
      lineTool,
      eraserActive,
      drawPaths,
      lineDrawings,
      selectedPeriod,
      chartType,
      setSelectedCursor,
      setDrawTool,
      setPencilColor,
      setHighlighterColor,
      setLineTool,
      setEraserActive,
      setDrawPaths,
      setLineDrawings,
      setSelectedPeriod,
      setChartType,
      draggedLine,
      setDraggedLine,
      handleLineStart,
      handleLineMove,
      handleLineEnd,
      handleDrawStart,
      handleDrawMove,
      handleDrawEnd,
      handleUndo,
      handleClearAll,
      drawCanvas,
    ]
  );

  return memoizedReturn;
}
