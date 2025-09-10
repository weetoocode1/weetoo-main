import React from "react";
import { GridLine } from "./grid-line";
import type { GridGradientConfig, GridLineConfig } from "./types";

// ===== GRID COLUMN COMPONENT =====

interface GridColumnProps {
  hasGradient?: boolean;
  gradientConfig?: GridGradientConfig;
  lineConfig?: GridLineConfig;
  className?: string;
}

export const GridColumn: React.FC<GridColumnProps> = ({
  hasGradient = false,
  gradientConfig = {},
  lineConfig = {},
  className = "",
}) => {
  // const gradientStyle = getGradientStyle();
  const gradientClasses = hasGradient
    ? "dark:[background:var(--gradient-dark)]"
    : "";

  return (
    <div className={`relative h-full w-full ${gradientClasses} ${className}`}>
      <GridLine position="left" config={lineConfig} />
      <GridLine position="right" config={lineConfig} />
    </div>
  );
};
