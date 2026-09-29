import type { PatternType, TileSize } from "../engine/types";

export interface PatternFillConfig {
  pattern: PatternType;
  tile: TileSize;
  color: string;
  opacity: number;
  weight: number;
  angle: number;
  /** Raster pixels per MapLibre layout pixel. Omit for the display ratio. */
  pixelRatio?: number;
  /** Optional fixed dot count for stipple zoom variants. */
  stippleCount?: number;
}

export interface BackgroundFillConfig {
  enabled: boolean;
  color: string;
  opacity: number;
}

export interface OutlineConfig {
  enabled: boolean;
  color: string;
  width: number;
  dash: number[];
}

/** `line-dasharray` presets using native MapLibre expressions (no canvas involved). */
