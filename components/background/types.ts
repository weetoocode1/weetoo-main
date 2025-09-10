// ===== GRID BACKGROUND TYPES =====

export interface GridLineConfig {
  background?: string;
  color?: string;
  height?: string;
  width?: string;
  fadeStop?: string;
  offset?: string;
  colorDark?: string;
}

export interface GridGradientConfig {
  from?: string;
  via?: string;
  to?: string;
  viaDark?: string;
}

export interface GridColumnConfig {
  hasGradient?: boolean;
  gradientConfig?: GridGradientConfig;
  lineConfig?: GridLineConfig;
}

export interface GridBackgroundConfig {
  columns: GridColumnConfig[];
}

export interface AnimatedGridBackgroundProps {
  columns?: number;
  gap?: string;
  rotation?: string;
  gridConfig?: GridBackgroundConfig;
  className?: string;
}
