export { PATTERN_VERSION, parsePattern, serializePattern } from "./pattern";
export { materializePatternPlacement } from "./materializePlacement";
export { createGeometricPatternTile } from "./geometricPatternTile";
export type { CreateGeometricPatternTileOptions } from "./geometricPatternTile";
export {
  PATTERN_SET_VERSION,
  parsePatternSet,
  patternForSetKey,
  serializePatternSet,
} from "./patternSet";
export type { PatternSet, PatternSetEntry, PatternSetKey } from "./patternSet";
export {
  PATTERN_SEQUENCE_VERSION,
  interpolateSequenceValue,
  materializePatternSequence,
  parsePatternSequence,
  sequenceProgress,
  serializePatternSequence,
} from "./patternSequence";
export type {
  MaterializedPatternStep,
  PatternSequence,
  PatternSequenceOverride,
  PatternSequenceParameter,
  PatternSequenceProgression,
  PatternSequenceVariation,
  PatternSequenceVisualOrder,
} from "./patternSequence";
export type {
  CompositeFill,
  DensityLatticeSpacing,
  ExplicitLatticeSpacing,
  GlyphFill,
  GlyphShape,
  LatticePlacement,
  LatticeSpacing,
  LineFill,
  LineShape,
  NaturalPlacement,
  Pattern,
  PatternBackground,
  PatternFill,
  PatternOutline,
  PatternPlacement,
  PatternPrimitiveFill,
  PatternRenderOptions,
  PatternScale,
  SolidFill,
  SvgFill,
  TextFill,
  TextLatticePlacement,
} from "./pattern";

export {
  patternFromLegacyDefinition,
  patternToLegacyDefinition,
} from "./legacyPatternDefinition";
export type { PatternFromLegacyDefinitionOptions } from "./legacyPatternDefinition";
