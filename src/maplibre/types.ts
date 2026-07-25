import type { PatternType, TileSize } from "../engine/types";

export interface PatternFillConfig {
  pattern: PatternType;
  tile: TileSize;
  color: string;
  opacity: number;
  weight: number;
  angle: number;
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
