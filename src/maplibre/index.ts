export type { PatternFillConfig, BackgroundFillConfig, OutlineConfig } from "./types";
export { DASH_PRESETS } from "./types";

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

export { installIconStyles } from "./installIconStyles";
export type { IconStyleLike } from "./installIconStyles";

export { createSvgScatterTile, installSvgPatternFill } from "./svgPattern";
export type { SvgPatternOptions } from "./svgPattern";

export { addSvgIcon } from "./svgIcon";
export type { SvgIconOptions } from "./svgIcon";

export { scatterIconPoints } from "./scatterIconPoints";
export type { PolygonGeometry, PointFeature, PointFeatureCollection, ScatterIconPointsOptions } from "./scatterIconPoints";

export { installSvgIconScatter } from "./svgIconScatter";
export type { InstallSvgIconScatterOptions } from "./svgIconScatter";
