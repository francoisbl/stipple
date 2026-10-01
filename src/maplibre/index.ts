export type { PatternFillConfig, BackgroundFillConfig, OutlineConfig } from "./types";

export {
  PATTERN_METADATA_KEY,
  createFontPatternDefinition,
  createSvgPatternDefinition,
  parsePatternDefinition,
  parsePatternMetadata,
  patternDefinitionId,
  serializePatternDefinition,
} from "./patternDefinition";
export type {
  GeometricPatternDefinition,
  GeometricPatternType,
  FontPatternDefinition,
  PatternDefinition,
  PatternMetadataV1,
  PatternVariant,
  SvgPatternDefinition,
} from "./patternDefinition";

export { syncPatternTexture } from "./syncPatternTexture";
export type { SyncPatternTextureOptions } from "./syncPatternTexture";

export { buildStyleFragment } from "./buildStyleFragment";
export type { BuildStyleFragmentOptions } from "./buildStyleFragment";

export { installPatternFills } from "./installPatternFills";
export type { StyleLike } from "./installPatternFills";

export { addPatternFill } from "./addPatternFill";
export type {
  AddPatternFillOptions,
  AddedPatternFill,
  PatternFillFragment,
  PatternFillLayerTemplate,
} from "./addPatternFill";

export { observePatternFills } from "./observePatternFills";
export type { ObservePatternFillsOptions, PatternFillObserver } from "./observePatternFills";

export { createSvgScatterTile, installSvgPatternFill } from "./svgPattern";
export type { SvgPatternOptions } from "./svgPattern";

export { createFontPatternTile, installFontPatternFill } from "./fontPattern";
export type { FontPatternOptions } from "./fontPattern";
