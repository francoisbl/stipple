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

export { createPatternSetExpression } from "./patternSetExpression";
export type {
  CreatePatternSetExpressionOptions,
  PatternSetMatchExpression,
} from "./patternSetExpression";

export { createPatternSequenceExpression } from "./patternSequenceExpression";
export type {
  CreatePatternSequenceExpressionOptions,
  PatternSequenceMatchExpression,
} from "./patternSequenceExpression";

export { createPatternTile } from "./patternTile";
export type { CreatePatternTileOptions } from "./patternTile";

export { installPatternTexture } from "./installPatternTexture";
export type { InstallPatternTextureOptions } from "./installPatternTexture";

export {
  CANONICAL_PATTERN_METADATA_KEY,
  createPatternSequenceStyleFragment,
  createPatternSetStyleFragment,
  createPatternStyleFragment,
  parseCanonicalPatternMetadata,
  patternImageId,
} from "./patternStyle";
export type {
  CanonicalPatternMetadataV1,
  CanonicalPatternRegistration,
  CreatePatternCollectionStyleOptions,
  CreatePatternStyleOptions,
  PatternStyleFragment,
} from "./patternStyle";

export { createSvgScatterTile, installSvgPatternFill } from "./svgPattern";
export type { SvgPatternOptions } from "./svgPattern";

export { createFontPatternTile, installFontPatternFill } from "./fontPattern";
export type { FontPatternOptions } from "./fontPattern";
