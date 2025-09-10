import React from "react";
import { GridColumn } from "./grid-column";
import type { AnimatedGridBackgroundProps, GridColumnConfig } from "./types";

// ===== ANIMATED GRID BACKGROUND COMPONENT =====

export const AnimatedGridBackground: React.FC<AnimatedGridBackgroundProps> = ({
  columns = 4,
  gap = "gap-10",
  rotation = "-rotate-45",
  gridConfig,
  className = "",
}) => {
  const defaultGridConfig: { columns: GridColumnConfig[] } = {
    columns: [
      { hasGradient: false },
      { hasGradient: false },
      { hasGradient: true },
      { hasGradient: false },
    ],
  };

  const config: { columns: GridColumnConfig[] } =
    gridConfig || defaultGridConfig;
  const gridColsClass = `grid-cols-2 md:grid-cols-${columns}`;

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-0 grid h-full w-full ${rotation} transform ${gridColsClass} ${gap} select-none ${className}`}
    >
      {config.columns.map((column, index) => (
        <GridColumn
          key={index}
          hasGradient={column.hasGradient}
          gradientConfig={column.gradientConfig}
          lineConfig={column.lineConfig}
        />
      ))}
    </div>
  );
};
