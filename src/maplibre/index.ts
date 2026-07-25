export type { PatternFillConfig, BackgroundFillConfig, OutlineConfig } from "./types";
export { DASH_PRESETS } from "./types";

export {
  PATTERN_METADATA_KEY,
  LEGACY_PATTERN_METADATA_KEY,
  createSvgPatternDefinition,
  parsePatternDefinition,
  parsePatternMetadata,
  patternDefinitionId,
  serializePatternDefinition,
} from "./patternDefinition";
export type {
  GeometricPatternDefinition,
  GeometricPatternType,
  PatternDefinition,
  PatternMetadataV1,
  SvgPatternDefinition,
} from "./patternDefinition";

export { syncPatternTexture } from "./syncPatternTexture";
export type { SyncPatternTextureOptions } from "./syncPatternTexture";

export { buildStyleFragment } from "./buildStyleFragment";
export type { BuildStyleFragmentOptions } from "./buildStyleFragment";

export { buildLineStyleFragment } from "./buildLineStyleFragment";
export type { BuildLineStyleFragmentOptions } from "./buildLineStyleFragment";

export { buildIconStyleFragment } from "./iconStyleFragment";
export type { IconStyleConfig, BuildIconStyleFragmentOptions } from "./iconStyleFragment";

export { installPatternFills } from "./installPatternFills";
export type { StyleLike } from "./installPatternFills";

export { observePatternFills } from "./observePatternFills";
export type { ObservePatternFillsOptions, PatternFillObserver } from "./observePatternFills";

export { installIconStyles } from "./installIconStyles";
export type { IconStyleLike } from "./installIconStyles";

export { createSvgScatterTile, installSvgPatternFill } from "./svgPattern";
export type { SvgPatternOptions } from "./svgPattern";

export { addSvgIcon } from "./svgIcon";
export type { SvgIconOptions } from "./svgIcon";
