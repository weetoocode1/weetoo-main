import type {
  GridLineConfig,
  GridGradientConfig,
  GridBackgroundConfig,
} from "./types";

// ===== GRID CONFIGURATION UTILITIES =====

export const createLineConfig = (
  overrides: Partial<GridLineConfig> = {}
): GridLineConfig => ({
  background: "#ffffff",
  color: "rgba(0, 0, 0, 0.2)",
  height: "5px",
  width: "1px",
  fadeStop: "90%",
  offset: "150px",
  colorDark: "rgba(255, 255, 255, 0.3)",
  ...overrides,
});

export const createGradientConfig = (
  overrides: Partial<GridGradientConfig> = {}
): GridGradientConfig => ({
  from: "transparent",
  via: "neutral-100",
  to: "transparent",
  viaDark: "neutral-800",
  ...overrides,
});

export const createGridConfig = (
  config: Partial<GridBackgroundConfig> = {}
): GridBackgroundConfig => {
  const defaultConfig: GridBackgroundConfig = {
    columns: [
      { hasGradient: false },
      { hasGradient: false },
      { hasGradient: true },
      { hasGradient: false },
    ],
  };

  return { ...defaultConfig, ...config };
};

// ===== THEME CONFIGURATIONS =====

export const createTradingThemeGrid = (): GridBackgroundConfig =>
  createGridConfig({
    columns: [
      {
        hasGradient: false,
        lineConfig: createLineConfig({ color: "rgba(34, 197, 94, 0.3)" }),
      },
      {
        hasGradient: false,
        lineConfig: createLineConfig({ color: "rgba(239, 68, 68, 0.3)" }),
      },
      {
        hasGradient: true,
        gradientConfig: createGradientConfig({
          via: "chart-2",
          viaDark: "chart-3",
        }),
        lineConfig: createLineConfig({ color: "rgba(59, 130, 246, 0.3)" }),
      },
      {
        hasGradient: false,
        lineConfig: createLineConfig({ color: "rgba(168, 85, 247, 0.3)" }),
      },
    ],
  });

export const createMinimalThemeGrid = (): GridBackgroundConfig =>
  createGridConfig({
    columns: [
      { hasGradient: false },
      { hasGradient: false },
      { hasGradient: false },
      { hasGradient: false },
    ],
  });

export const createGradientThemeGrid = (): GridBackgroundConfig =>
  createGridConfig({
    columns: [
      {
        hasGradient: true,
        gradientConfig: createGradientConfig({
          via: "chart-4",
          viaDark: "chart-5",
        }),
      },
      {
        hasGradient: true,
        gradientConfig: createGradientConfig({
          via: "chart-2",
          viaDark: "chart-3",
        }),
      },
      {
        hasGradient: true,
        gradientConfig: createGradientConfig({
          via: "chart-1",
          viaDark: "chart-4",
        }),
      },
      {
        hasGradient: true,
        gradientConfig: createGradientConfig({
          via: "chart-5",
          viaDark: "chart-1",
        }),
      },
    ],
  });

export const createVisibleThemeGrid = (): GridBackgroundConfig =>
  createGridConfig({
    columns: [
      {
        hasGradient: false,
        lineConfig: createLineConfig({ color: "rgba(34, 197, 94, 0.5)" }),
      },
      {
        hasGradient: false,
        lineConfig: createLineConfig({ color: "rgba(239, 68, 68, 0.5)" }),
      },
      {
        hasGradient: true,
        gradientConfig: createGradientConfig({
          via: "chart-2",
          viaDark: "chart-3",
        }),
        lineConfig: createLineConfig({ color: "rgba(59, 130, 246, 0.5)" }),
      },
      {
        hasGradient: false,
        lineConfig: createLineConfig({ color: "rgba(168, 85, 247, 0.5)" }),
      },
    ],
  });

export const createThemeGrid = (): GridBackgroundConfig =>
  createGridConfig({
    columns: [
      {
        hasGradient: false,
        lineConfig: createLineConfig({ color: "hsl(var(--chart-4) / 0.3)" }),
      },
      {
        hasGradient: false,
        lineConfig: createLineConfig({ color: "hsl(var(--chart-5) / 0.3)" }),
      },
      {
        hasGradient: true,
        gradientConfig: createGradientConfig({
          via: "muted",
          viaDark: "accent",
        }),
        lineConfig: createLineConfig({ color: "hsl(var(--chart-2) / 0.3)" }),
      },
      {
        hasGradient: false,
        lineConfig: createLineConfig({ color: "hsl(var(--chart-1) / 0.3)" }),
      },
    ],
  });
