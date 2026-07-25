import { P as PatternType, b as TileSize, a as TileImage } from './types-BhMN112m.cjs';
import { Map } from 'maplibre-gl';

interface PatternFillConfig {
    pattern: PatternType;
    tile: TileSize;
    color: string;
    opacity: number;
    weight: number;
    angle: number;
}
interface BackgroundFillConfig {
    enabled: boolean;
    color: string;
    opacity: number;
}
interface OutlineConfig {
    enabled: boolean;
    color: string;
    width: number;
    dash: number[];
}
/** `line-dasharray` presets using native MapLibre expressions (no canvas involved). */
declare const DASH_PRESETS: Record<"solid" | "dotted" | "dashdot", number[]>;

declare const PATTERN_METADATA_KEY: "maplibre-pattern-fills:v1";
declare const LEGACY_PATTERN_METADATA_KEY: "enhanced:pattern";
type GeometricPatternType = Exclude<PatternType, "solid">;
interface GeometricPatternDefinition {
    kind: "geometric";
    pattern: GeometricPatternType;
    size: number;
    color: string;
    weight: number;
    angle: number;
}
interface SvgPatternDefinition {
    kind: "svg";
    svg: string;
    tileSize: number;
    stampSize: number;
    density: number;
    seed: number | string;
    rotationJitterDeg: number;
    scaleJitter: number;
    positionJitter: number;
    stagger: boolean;
}
type PatternDefinition = GeometricPatternDefinition | SvgPatternDefinition;
interface PatternMetadataV1 {
    imageId: string;
    definition: PatternDefinition;
}
/** Validates untrusted JSON metadata and returns a normalized definition. */
declare function parsePatternDefinition(value: unknown): PatternDefinition;
/** Parses a complete v1 metadata payload from a style layer. */
declare function parsePatternMetadata(value: unknown): PatternMetadataV1;
/** Stable JSON representation used for image IDs and cache keys. */
declare function serializePatternDefinition(definition: PatternDefinition): string;
/** Small deterministic FNV-1a identifier suitable for MapLibre image names. */
declare function patternDefinitionId(definition: PatternDefinition, prefix?: string): string;
declare function createSvgPatternDefinition(options: {
    svg: string;
    tileSize?: number;
    stampSize?: number;
    density?: number;
    seed?: number | string;
    rotationJitterDeg?: number;
    scaleJitter?: number;
    positionJitter?: number;
    stagger?: boolean;
}): SvgPatternDefinition;

interface SyncPatternTextureOptions {
    imageId: string;
    pattern: PatternType;
    size: TileSize;
    color: string;
    weight: number;
    angle: number;
}
/**
 * (Re)generates a fill-pattern texture with {@link makeTile} and pushes it to
 * the map. Uses `updateImage` when the tile dimensions are unchanged (no flash),
 * or `removeImage` + `addImage` when the pattern type or tile size changed.
 * Safe to call on every UI change (colour picker, slider drag, etc).
 */
declare function syncPatternTexture(map: Map, options: SyncPatternTextureOptions): void;

interface BuildStyleFragmentOptions {
    /** Vector source id, e.g. `"urbanisme.plan_de_secteur"`. */
    source: string;
    /** Source-layer name (the table/layer inside the vector source). */
    sourceLayer: string;
    /** Vector tile URL. Defaults to a `<url>/<source>` placeholder to fill in. */
    sourceUrl?: string;
    bg?: BackgroundFillConfig;
    pattern: PatternFillConfig;
    line?: OutlineConfig;
}
/**
 * Builds the sources+layers fragment for the three-layer stack
 * (tinted background / pattern fill / outline). The pattern's visual
 * parameters are not baked into the paint properties. They are carried in
 * versioned `layer.metadata["maplibre-pattern-fills:v1"]` so
 * {@link installPatternFills} can
 * regenerate the exact same texture at runtime via `makeTile`.
 */
declare function buildStyleFragment(options: BuildStyleFragmentOptions): {
    sources: {
        [x: string]: {
            type: string;
            url: string;
        };
    };
    layers: Record<string, unknown>[];
};

interface BuildLineStyleFragmentOptions {
    /** Vector source id, e.g. `"urbanisme.voiries"`. */
    source: string;
    /** Source-layer name (the table/layer inside the vector source). */
    sourceLayer: string;
    /** Vector tile URL. Defaults to a `<url>/<source>` placeholder to fill in. */
    sourceUrl?: string;
    line: OutlineConfig;
}
/**
 * Builds the sources+layers fragment for a single line-style layer.
 * `line-dasharray` is a native declarative expression. Unlike fill
 * patterns there's nothing baked into a canvas image, so no metadata or
 * runtime installer is needed for this one.
 */
declare function buildLineStyleFragment(options: BuildLineStyleFragmentOptions): {
    sources: {
        [x: string]: {
            type: string;
            url: string;
        };
    };
    layers: Record<string, unknown>[];
};

interface IconStyleConfig {
    /** Raw `<svg>...</svg>` markup. */
    svg: string;
    /** Rendered icon size in px. */
    size: number;
    /** Image id referenced by the layer's `icon-image` and passed to `addSvgIcon`. */
    imageId: string;
}
interface BuildIconStyleFragmentOptions {
    /** Vector source id, e.g. `"urbanisme.arbres"`. */
    source: string;
    /** Source-layer name (the table/layer inside the vector source). */
    sourceLayer: string;
    /** Vector tile URL. Defaults to a `<url>/<source>` placeholder to fill in. */
    sourceUrl?: string;
    icon: IconStyleConfig;
    /** Static icon rotation in degrees, if any. */
    rotationDeg?: number;
}
/**
 * Builds the sources+layers fragment for a single SVG point-icon layer.
 * The icon is not baked into the paint properties. It is carried in
 * `layer.metadata["enhanced:icon"]` so {@link installIconStyles} can
 * rasterize the same icon at runtime via `addSvgIcon`.
 */
declare function buildIconStyleFragment(options: BuildIconStyleFragmentOptions): {
    sources: {
        [x: string]: {
            type: string;
            url: string;
        };
    };
    layers: Record<string, unknown>[];
};

interface StyleLike {
    layers: Array<{
        metadata?: Record<string, unknown>;
    }>;
}
/**
 * Scans a style (or `map.getStyle()`) for layers carrying the
 * versioned metadata produced by {@link buildStyleFragment}, validates it,
 * and installs each distinct geometric or SVG texture. Legacy
 * `enhanced:pattern` geometric metadata remains readable during the 0.x
 * migration. This is the production entry point: custom metadata is not
 * interpreted by MapLibre itself.
 */
declare function installPatternFills(map: Map, style: StyleLike): Promise<void>;

interface ObservePatternFillsOptions {
    /** Defaults to `map.getStyle()`. Useful when metadata is stored separately. */
    getStyle?: () => StyleLike;
    /** Receives asynchronous restoration failures triggered by style reloads. */
    onError?: (error: unknown) => void;
}
interface PatternFillObserver {
    /** Installs or restores every registered image in the current style. */
    refresh(): Promise<void>;
    /** Removes the `style.load` listener. Safe to call repeatedly. */
    dispose(): void;
}
/**
 * Restores generated pattern images after every MapLibre style load.
 *
 * The returned observer owns one listener and must be disposed with the map or
 * component that created it. Installation is idempotent, so `refresh` is also
 * safe to call explicitly after changing metadata.
 */
declare function observePatternFills(map: Map, options?: ObservePatternFillsOptions): PatternFillObserver;

interface IconStyleLike {
    layers: Array<{
        metadata?: Record<string, unknown>;
    }>;
}
/**
 * Scans a style (or `map.getStyle()`) for layers carrying the
 * `enhanced:icon` metadata produced by {@link buildIconStyleFragment}, and
 * rasterizes + installs the matching SVG icon for each. Mirrors
 * {@link installPatternFills} for the point/symbol case. Call once after
 * `map.on('load', ...)` (and again if you swap styles).
 */
declare function installIconStyles(map: Map, style: IconStyleLike): Promise<void>;

interface SvgPatternOptions {
    imageId: string;
    /** Raw `<svg>...</svg>` markup, used as the repeatable stamp. */
    svg: string;
    /** Size of the generated meta-tile in px. Default 192. */
    tileSize?: number;
    /** Rendered size of each SVG stamp in px. Default 28. */
    stampSize?: number;
    /** Approximate stamps per 100x100px area. Default 1.4. */
    density?: number;
    /** Deterministic variation seed. The same seed always gives the same tile. */
    seed?: number | string;
    /** +/- rotation jitter per stamp, in degrees. Default 0 (regular grid). */
    rotationJitterDeg?: number;
    /** +/- scale jitter per stamp, as a fraction of stampSize. Default 0 (regular grid). */
    scaleJitter?: number;
    /** +/- position jitter per stamp, as a fraction of the grid cell. Default 0.15 gives a light irregularity, not a full organic scatter. 0 = exact grid. */
    positionJitter?: number;
    /** Offset alternate rows by half a cell (quincunx), the classic regular cartographic symbol layout (orchard/marsh map fills). Default true. */
    stagger?: boolean;
}
/**
 * Rasterizes an SVG into a large seamless "meta-tile" repeated on a grid
 * (seeded jitter, so deterministic). Defaults to a regular, lightly
 * staggered cartographic grid, the classic look of official map symbology
 * used for orchard and marsh fills, rather than a fully organic scatter. Raise
 * `rotationJitterDeg`/`scaleJitter`/`positionJitter` for a more natural,
 * irregular look (grass, foliage...). Stamps near an edge are additionally
 * drawn wrapped on the opposite side so the tile still repeats seamlessly.
 *
 * Uses the browser's native SVG rasterizer (`Image` + canvas). No SVG
 * parsing of our own, per MapLibre's own `addImage` pipeline.
 */
declare function createSvgScatterTile(options: SvgPatternOptions): Promise<TileImage>;
/**
 * Rasterizes an SVG scatter tile and installs it as a `fill-pattern` image.
 * Repeated equivalent calls are no-ops, same-sized changes use `updateImage`,
 * and a stale asynchronous render cannot overwrite a newer call.
 */
declare function installSvgPatternFill(map: Map, options: SvgPatternOptions): Promise<void>;

interface SvgIconOptions {
    id: string;
    /** Raw `<svg>...</svg>` markup. */
    svg: string;
    /** Rendered size (square) in CSS px. Default 32. */
    size?: number;
    /** Oversampling factor for crisp rendering at high zoom / retina. Default 2. */
    pixelRatio?: number;
}
/**
 * Rasterizes an SVG as a point icon and installs it via `map.addImage`, ready
 * to use as `icon-image` on a `symbol` layer. Reuses MapLibre's native image
 * pipeline (canvas raster + addImage) instead of a custom SVG renderer.
 */
declare function addSvgIcon(map: Map, options: SvgIconOptions): Promise<{
    id: string;
    width: number;
    height: number;
}>;

export { type BackgroundFillConfig, type BuildIconStyleFragmentOptions, type BuildLineStyleFragmentOptions, type BuildStyleFragmentOptions, DASH_PRESETS, type GeometricPatternDefinition, type GeometricPatternType, type IconStyleConfig, type IconStyleLike, LEGACY_PATTERN_METADATA_KEY, type ObservePatternFillsOptions, type OutlineConfig, PATTERN_METADATA_KEY, type PatternDefinition, type PatternFillConfig, type PatternFillObserver, type PatternMetadataV1, type StyleLike, type SvgIconOptions, type SvgPatternDefinition, type SvgPatternOptions, type SyncPatternTextureOptions, addSvgIcon, buildIconStyleFragment, buildLineStyleFragment, buildStyleFragment, createSvgPatternDefinition, createSvgScatterTile, installIconStyles, installPatternFills, installSvgPatternFill, observePatternFills, parsePatternDefinition, parsePatternMetadata, patternDefinitionId, serializePatternDefinition, syncPatternTexture };
