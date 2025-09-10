import React from "react";
import type { GridLineConfig } from "./types";

// ===== GRID LINE COMPONENT =====

interface GridLineProps {
  position: "left" | "right";
  config?: GridLineConfig;
  className?: string;
}

const createGridLineStyle = (
  config: GridLineConfig = {}
): React.CSSProperties =>
  ({
    "--background": config.background || "#ffffff",
    "--color": config.color || "rgba(0, 0, 0, 0.2)",
    "--height": config.height || "5px",
    "--width": config.width || "1px",
    "--fade-stop": config.fadeStop || "90%",
    "--offset": config.offset || "150px",
    "--color-dark": config.colorDark || "rgba(255, 255, 255, 0.3)",
    maskComposite: "exclude",
  } as React.CSSProperties);

export const GridLine: React.FC<GridLineProps> = ({
  position,
  config = {},
  className = "",
}) => {
  const gridLineStyle = createGridLineStyle(config);

  const baseClasses =
    "absolute top-[calc(var(--offset)/2*-1)] z-30 h-[calc(100%+var(--offset))] w-[var(--width)] bg-[linear-gradient(to_bottom,var(--color),var(--color)_50%,transparent_0,transparent)] [background-size:var(--width)_var(--height)] [mask:linear-gradient(to_top,var(--background)_var(--fade-stop),transparent),_linear-gradient(to_bottom,var(--background)_var(--fade-stop),transparent),_linear-gradient(black,black)] dark:bg-[linear-gradient(to_bottom,var(--color-dark),var(--color-dark)_50%,transparent_0,transparent)]";

  const positionClasses = position === "left" ? "left-0" : "right-0 left-auto";

  return (
    <div
      style={gridLineStyle}
      className={`${baseClasses} ${positionClasses} ${className}`}
    />
  );
};
