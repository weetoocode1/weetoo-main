import {
  EmojiPicker,
  EmojiPickerContent,
  EmojiPickerFooter,
  EmojiPickerSearch,
} from "@/components/ui/emoji-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Crosshair,
  Eraser,
  Highlighter,
  Info,
  Minus,
  MousePointer2,
  Pencil,
  Plus,
  Ruler,
  Slash,
  Smile,
  Trash,
  TrendingUp,
  Undo2,
} from "lucide-react";
import React from "react";

// Types and constants
const LINE_TOOLS = [
  { label: "Trend Line", value: "trend", icon: TrendingUp },
  { label: "Ray", value: "ray", icon: ArrowUpRight },
  { label: "Info Line", value: "info", icon: Info },
  { label: "Extended Line", value: "extended", icon: Slash },
  { label: "Trend Angle", value: "angle", icon: Ruler },
  { label: "Horizontal Line", value: "horizontal", icon: Minus },
  { label: "Horizontal Ray", value: "horizontalRay", icon: ArrowRight },
  { label: "Vertical Line", value: "vertical", icon: ArrowDown },
  { label: "Cross Line", value: "cross", icon: Plus },
];
const DRAW_TOOLS = [
  { label: "Pencil", value: "pencil", icon: Pencil },
  { label: "Highlighter", value: "highlighter", icon: Highlighter },
];
const CURSOR_TYPES = [
  { label: "Arrow", value: "default", icon: MousePointer2, cursor: "default" },
  { label: "Cross", value: "crosshair", icon: Crosshair, cursor: "crosshair" },
];
const PENCIL_COLORS = [
  "#222",
  "#fff",
  "#2563eb",
  "#16a34a",
  "#dc2626",
  "#fbbf24",
  "#a21caf",
];
const HIGHLIGHTER_COLORS = [
  "#fbbf24",
  "#f472b6",
  "#38bdf8",
  "#a3e635",
  "#f87171",
  "#facc15",
  "#818cf8",
];

// Types
export type DrawTool = "pencil" | "highlighter" | "eraser" | null;
export type LineTool = (typeof LINE_TOOLS)[number]["value"] | null;

export interface DrawPath {
  tool: DrawTool;
  color: string;
  width: number;
  points: { x: number; y: number }[];
  opacity: number;
}
export interface LineDrawing {
  type: LineTool;
  points: { x: number; y: number }[];
  color: string;
}

interface LineToolsProps {
  selectedCursor: string;
  setSelectedCursor: (v: string) => void;
  drawTool: DrawTool;
  setDrawTool: (v: DrawTool) => void;
  pencilColor: string;
  setPencilColor: (v: string) => void;
  highlighterColor: string;
  setHighlighterColor: (v: string) => void;
  lineTool: LineTool;
  setLineTool: (v: LineTool) => void;
  eraserActive: boolean;
  setEraserActive: (v: boolean) => void;
  handleUndo: () => void;
  isHost: boolean;

  emojiTool: "emoji" | null;
  setEmojiTool: (tool: "emoji" | null) => void;
  onEmojiSelected: (emoji: string) => void;
  handleClearAll: () => void;
}

const LineTools: React.FC<LineToolsProps> = ({
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

  emojiTool,
  setEmojiTool,
  onEmojiSelected,
  handleClearAll,
}) => {
  // Disable all interactions if not host
  const handleCursorChange = (value: string) => {
    if (!isHost) return;

    if (value !== "crosshair") {
      setDrawTool(null);
      setLineTool(null);
      setEraserActive(false);
      setEmojiTool(null);
    }

    setSelectedCursor(value);
  };

  const handleDrawToolChange = (value: DrawTool | null) => {
    if (!isHost) return;

    if (value) {
      setLineTool(null);
      setEraserActive(false);
      setEmojiTool(null);
    }

    setDrawTool(value);
  };
  const handlePencilColorChange = (value: string) => {
    if (!isHost) return;
    setPencilColor(value);
  };

  const handleHighlighterColorChange = (value: string) => {
    if (!isHost) return;
    setHighlighterColor(value);
  };

  const handleLineToolChange = (value: LineTool) => {
    if (!isHost) return;

    if (value) {
      setDrawTool(null);
      setEraserActive(false);
      setEmojiTool(null);
    }

    setLineTool(value);
  };
  const handleEraserToggle = () => {
    if (!isHost) return;

    const newEraserState = !eraserActive;

    if (newEraserState) {
      setDrawTool(null);
      setLineTool(null);
      setEmojiTool(null);
    }

    setEraserActive(newEraserState);
  };

  const handleUndoClick = () => {
    if (!isHost) return;
    handleUndo();
  };

  // Emoji picker state
  const [emojiPopoverOpen, setEmojiPopoverOpen] = React.useState(false);

  return (
    <div className="flex flex-col gap-2 p-2 border-r border-border bg-background">
      {/* Cursor Tools */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            className={`p-2 text-muted-foreground flex items-center ${
              isHost
                ? "hover:bg-accent cursor-pointer"
                : "cursor-not-allowed opacity-50"
            }`}
            aria-label="Cursor tools"
            title="Cursor tools"
            type="button"
          >
            {(() => {
              const cursorType = CURSOR_TYPES.find(
                (t) => t.value === selectedCursor
              );
              const IconComponent = cursorType?.icon || MousePointer2;
              return <IconComponent size={18} />;
            })()}
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="p-2 w-40 rounded-none"
          side="right"
          align="start"
        >
          <div className="space-y-1">
            {CURSOR_TYPES.map((cursor) => (
              <button
                key={cursor.value}
                className={`w-full p-2 text-left rounded flex items-center gap-2 ${
                  isHost ? "hover:bg-accent" : "cursor-not-allowed opacity-50"
                }`}
                onClick={() => {
                  handleCursorChange(cursor.value);
                }}
                disabled={!isHost}
              >
                <cursor.icon size={16} />
                <span className="text-sm">{cursor.label}</span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Drawing Tools */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            className={`p-2 flex items-center ${
              drawTool
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground"
            } ${
              isHost
                ? "hover:bg-accent cursor-pointer"
                : "cursor-not-allowed opacity-50"
            }`}
            aria-label="Drawing tools"
            title="Drawing tools"
            type="button"
          >
            {(() => {
              if (drawTool) {
                const toolType = DRAW_TOOLS.find((t) => t.value === drawTool);
                const IconComponent = toolType?.icon || Pencil;
                return <IconComponent size={18} />;
              }
              return <Pencil size={18} />;
            })()}
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="p-2 w-40 rounded-none"
          side="right"
          align="start"
        >
          <div className="space-y-2">
            <div className="space-y-1">
              {DRAW_TOOLS.map((tool) => (
                <button
                  key={tool.value}
                  className={`w-full p-2 text-left rounded flex items-center gap-2 ${
                    drawTool === tool.value
                      ? "bg-accent text-accent-foreground"
                      : ""
                  } ${
                    isHost ? "hover:bg-accent" : "cursor-not-allowed opacity-50"
                  }`}
                  onClick={() => {
                    const newValue =
                      drawTool === tool.value ? null : (tool.value as DrawTool);
                    handleDrawToolChange(newValue);
                  }}
                  disabled={!isHost}
                >
                  <tool.icon size={16} />
                  <span className="text-sm">{tool.label}</span>
                </button>
              ))}
            </div>
            {drawTool && (
              <div className="space-y-2">
                <div className="text-xs font-medium">Pencil Color</div>
                <div className="grid grid-cols-5 gap-1">
                  {PENCIL_COLORS.map((color) => (
                    <button
                      key={color}
                      className={`w-6 h-6 rounded border-2 transition-transform ${
                        isHost
                          ? "hover:scale-110"
                          : "cursor-not-allowed opacity-50"
                      }`}
                      style={{
                        backgroundColor: color,
                        borderColor:
                          pencilColor === color
                            ? "currentColor"
                            : "transparent",
                      }}
                      onClick={() => {
                        handlePencilColorChange(color);
                      }}
                      disabled={!isHost}
                    />
                  ))}
                </div>
                <div className="text-xs font-medium">Highlighter Color</div>
                <div className="grid grid-cols-5 gap-1">
                  {HIGHLIGHTER_COLORS.map((color) => (
                    <button
                      key={color}
                      className={`w-6 h-6 rounded border-2 transition-transform ${
                        isHost
                          ? "hover:scale-110"
                          : "cursor-not-allowed opacity-50"
                      }`}
                      style={{
                        backgroundColor: color,
                        borderColor:
                          highlighterColor === color
                            ? "currentColor"
                            : "transparent",
                      }}
                      onClick={() => {
                        handleHighlighterColorChange(color);
                      }}
                      disabled={!isHost}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Line Tools */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            className={`p-2 flex items-center ${
              lineTool
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground"
            } ${
              isHost
                ? "hover:bg-accent cursor-pointer"
                : "cursor-not-allowed opacity-50"
            }`}
            aria-label="Line tools"
            title="Line tools"
            type="button"
          >
            {(() => {
              if (lineTool) {
                const toolType = LINE_TOOLS.find((t) => t.value === lineTool);
                const IconComponent = toolType?.icon || TrendingUp;
                return <IconComponent size={18} />;
              }
              return <TrendingUp size={18} />;
            })()}
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-48 p-2 rounded-none"
          side="right"
          align="start"
        >
          <div className="space-y-1">
            {LINE_TOOLS.map((tool) => (
              <button
                key={tool.value}
                className={`w-full p-2 text-left rounded flex items-center gap-2 ${
                  lineTool === tool.value
                    ? "bg-accent text-accent-foreground"
                    : ""
                } ${
                  isHost ? "hover:bg-accent" : "cursor-not-allowed opacity-50"
                }`}
                onClick={() => {
                  const newValue =
                    lineTool === tool.value ? null : (tool.value as LineTool);
                  handleLineToolChange(newValue);
                }}
                disabled={!isHost}
              >
                <tool.icon size={16} />
                <span className="text-sm">{tool.label}</span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Fibonacci Tools */}
      {/* <Popover>
        <PopoverTrigger asChild>
          <button
            className={`p-2 text-muted-foreground flex items-center ${
              isHost
                ? "hover:bg-accent cursor-pointer"
                : "cursor-not-allowed opacity-50"
            } ${fibTool ? "bg-accent text-accent-foreground" : ""}`}
            aria-label="Fibonacci tools"
            title="Fibonacci tools"
            type="button"
          >
            {(() => {
              if (fibTool) {
                const toolType = FIBONACCI_TOOLS.find(
                  (t) => t.value === fibTool
                );
                const IconComponent = toolType?.icon || TrendingUp;
                return <IconComponent size={18} />;
              }
              return <TrendingUp size={18} />;
            })()}
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-64 p-2 rounded-none"
          side="right"
          align="start"
        >
          <div className="space-y-1">
            {FIBONACCI_TOOLS.map((tool) => (
              <button
                key={tool.value}
                className={`w-full p-2 text-left rounded flex items-center justify-between ${
                  isHost ? "hover:bg-accent" : "cursor-not-allowed opacity-50"
                } ${
                  fibTool === tool.value
                    ? "bg-accent text-accent-foreground"
                    : ""
                }`}
                onClick={() => handleFibToolChange(tool.value as FibonacciTool)}
                disabled={!isHost}
                title={tool.description}
              >
                <div className="flex items-center gap-2">
                  <tool.icon size={16} />
                  <span className="text-sm">{tool.label}</span>
                </div>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover> */}

      {/* Add emoji tool button below Fibonacci tool */}
      <Popover open={emojiPopoverOpen} onOpenChange={setEmojiPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            className={`p-2 text-muted-foreground flex items-center ${
              isHost
                ? "hover:bg-accent cursor-pointer"
                : "cursor-not-allowed opacity-50"
            } ${emojiTool ? "bg-accent text-accent-foreground" : ""}`}
            aria-label="Emoji tool"
            title="Emoji tool"
            type="button"
            onClick={() => {
              if (!isHost) return;

              const newEmojiTool = emojiTool ? null : "emoji";

              if (newEmojiTool) {
                setDrawTool(null);
                setLineTool(null);
                setEraserActive(false);
              }

              setEmojiTool(newEmojiTool);
              setEmojiPopoverOpen((open) => !open);
            }}
            disabled={!isHost}
          >
            <Smile size={18} />
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="right"
          align="start"
          className="p-0 w-64 rounded-none"
        >
          <EmojiPicker
            className="h-[342px]"
            onEmojiSelect={({ emoji }) => {
              onEmojiSelected(emoji);
              setEmojiPopoverOpen(false);
            }}
          >
            <EmojiPickerSearch />
            <EmojiPickerContent />
            <EmojiPickerFooter />
          </EmojiPicker>
        </PopoverContent>
      </Popover>

      {/* Eraser */}
      <button
        className={`p-2 text-muted-foreground flex items-center ${
          eraserActive
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground"
        } ${
          isHost
            ? "hover:bg-accent cursor-pointer"
            : "cursor-not-allowed opacity-50"
        }`}
        aria-label="Eraser"
        title="Eraser"
        type="button"
        onClick={() => {
          handleEraserToggle();
        }}
        disabled={!isHost}
      >
        <Eraser size={18} />
      </button>

      {/* Undo */}
      <button
        className={`p-2 text-muted-foreground flex items-center  ${
          isHost
            ? "hover:bg-accent cursor-pointer"
            : "cursor-not-allowed opacity-50"
        }`}
        aria-label="Undo"
        title="Undo (Ctrl+Z)"
        type="button"
        onClick={() => {
          handleUndoClick();
        }}
        disabled={!isHost}
      >
        <Undo2 size={18} />
      </button>
      {/* Trash Can (Clear All) */}
      <button
        className={`p-2 text-muted-foreground flex items-center  ${
          isHost
            ? "hover:bg-accent cursor-pointer"
            : "cursor-not-allowed opacity-50"
        }`}
        aria-label="Clear All"
        title="Clear All Drawings"
        type="button"
        onClick={() => {
          if (!isHost) return;
          handleClearAll();
        }}
        disabled={!isHost}
      >
        <Trash size={18} />
      </button>
    </div>
  );
};

export default LineTools;
