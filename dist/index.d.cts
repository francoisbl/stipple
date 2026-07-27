import { Map } from 'maplibre-gl';

type PatternType = "solid" | "stipple" | "hachures" | "cross" | "grid" | "dots";
/** Tile edge length in px. MapLibre does not require power-of-two fill-pattern images. Larger tiles read as a lower-density pattern. */
type TileSize = number;
type HachureAngle = 0 | 45 | 90 | -45;
/** Raw RGBA pixel buffer ready for `map.addImage` / `map.updateImage`. */
interface TileImage {
    width: number;
    height: number;
    data: Uint8Array;
}
/**
 * The subset of the Canvas 2D API `makeTile` needs. A real
 * `CanvasRenderingContext2D` satisfies this directly in the browser; in Node
 * (or anywhere `document` is unavailable) {@link createMiniContext} provides
 * a small pure-JS implementation so the pattern engine has no DOM dependency.
 */
interface TileContext {
    strokeStyle: string;
    fillStyle: string;
    lineWidth: number;
    lineCap: string;
    clearRect(x: number, y: number, w: number, h: number): void;
    beginPath(): void;
    moveTo(x: number, y: number): void;
    lineTo(x: number, y: number): void;
    stroke(): void;
    arc(x: number, y: number, radius: number, startAngle: number, endAngle: number): void;
    fill(): void;
}

interface MakeTileOptions {
    /** Override how the drawing context is created. Mainly useful for tests. */
    contextFactory?: (size: number) => {
        ctx: TileContext;
        toTileImage: () => TileImage;
    };
    /** Raster pixels per MapLibre layout pixel. Use 2 for high-density displays. Default 1. */
    pixelRatio?: number;
}
/**
 * Renders one seamless pattern tile (any pixel size; MapLibre's
 * `fill-pattern` doesn't require power-of-two images) as a raw RGBA buffer
 * ready for `map.addImage` / `map.updateImage`. Runs unchanged in the browser
 * (native canvas) or in Node (pure-JS {@link createMiniContext} rasterizer).
 * same output shape either way. Larger tiles read as a lower-density pattern
 * (fewer repeats per unit area); use `size` as the density control.
 *
 * The pattern's visual parameters (angle, density, weight) only ever live in
 * this generated image, never in the style.json. Regenerate with the exact
 * same arguments wherever the tile is consumed to get an identical result.
 */
declare function makeTile(pattern: PatternType, size: number, color: string, weight: number, angle: number, options?: MakeTileOptions): TileImage;

/**
 * Minimal software rasterizer implementing just the {@link TileContext}
 * surface `makeTile` relies on (straight strokes with round caps, filled
 * circles). Lets the pattern engine run in Node without a DOM or a native
 * canvas dependency. The browser path uses the real Canvas 2D API instead,
 * this is only exercised server-side (tests, tooling, SSR previews).
 */
declare function createMiniContext(size: number): {
    ctx: TileContext;
    toTileImage: () => TileImage;
};

/** Deterministic PRNG (mulberry32). The same seed always produces the same sequence. */
declare function mulberry32(seed: number): () => number;
/** Turns an arbitrary string (e.g. a layer id) into a stable 32-bit seed. */
declare function hashStringToSeed(str: string): number;

type SvgDistributionMode = "regular" | "offset" | "natural";
interface SvgScatterLayoutOptions {
    tileSize: number;
    stampSize: number;
    density: number;
    seed: number | string;
    rotationJitterDeg: number;
    scaleJitter: number;
    positionJitter: number;
    stagger: boolean;
    /** Placement logic. Defaults to offset when stagger is true, regular otherwise. */
    distribution?: SvgDistributionMode;
    /** Minimum visible gap between stamps in natural mode, in layout px. Default 0. */
    minSpacing?: number;
}
interface SvgStampPlacement {
    /** Stable index shared by a logical stamp and all of its wrapped copies. */
    stampIndex: number;
    x: number;
    y: number;
    rotationRad: number;
    scale: number;
}
/**
 * Builds the pure geometry for a seamless SVG scatter tile.
 *
 * Every placement sharing a `stampIndex` has the exact same rotation and
 * scale. Wrapped copies therefore reproduce the same logical stamp on the
 * opposite edge instead of consuming new random transforms.
 */
declare function createSvgScatterLayout(options: SvgScatterLayoutOptions): SvgStampPlacement[];

/** A closed ring of [x, y] planar coordinates in any consistent unit. */
type Ring = Array<[number, number]>;
interface ScatteredPoint {
    x: number;
    y: number;
    /** Seeded rotation in degrees for icon-rotate variety. 0 unless `rotationJitterDeg` is set. */
    rotation: number;
    /** Seeded scale multiplier for icon-size variety. 1 unless `scaleJitter` is set. */
    scale: number;
}
interface ScatterPointsOptions {
    /** Required clearance from any edge (including holes) for a point to qualify, at scale 1. */
    radius: number;
    /** Approx. points per 100x100 unit area. Default 1. */
    density?: number;
    /** Deterministic variation seed. Default 1. */
    seed?: number | string;
    /** +/- rotation jitter applied to each point, in degrees. Default 0. */
    rotationJitterDeg?: number;
    /** +/- scale jitter applied to each point (as a fraction of `radius`). Default 0. The erosion test uses each point's actual scaled radius, so a bigger icon still never pokes outside the polygon. */
    scaleJitter?: number;
    /** +/- position jitter within each grid cell, as a fraction of the cell. Default 0.15 gives a light irregularity, not a full organic scatter. 0 = exact grid. */
    positionJitter?: number;
    /** Offset alternate rows by half a cell (quincunx), the classic regular cartographic symbol layout. Default true. */
    stagger?: boolean;
    /** Point layout. Defaults to offset for backward compatibility. */
    distribution?: SvgDistributionMode;
    /** Extra minimum gap between natural-layout icon envelopes. Default 0. */
    minSpacing?: number;
}
/**
 * Scatters points inside a (possibly holed) polygon whose complete clearance
 * circle remains inside it. Uses exact point-to-segment distances for every
 * exterior and interior boundary. Deterministic for a given seed.
 *
 * `rings` should include the exterior ring first, followed by any hole
 * rings; coordinates are unit-agnostic (pass pixels for on-screen icon
 * placement (see {@link scatterIconPoints}) or any planar unit
 * consistent with `radius`).
 */
declare function scatterPointsInPolygon(rings: Ring[], options: ScatterPointsOptions): ScatteredPoint[];

type PatternScaleMode = "screen" | "map";
interface PatternScaleOptions {
    mode: PatternScaleMode;
    zoom: number;
    referenceZoom: number;
    visualSize: number;
    spacing: number;
    opticalScale?: number;
    minReadableSize?: number;
    maxVisualSize?: number;
}
interface PatternScaleResult {
    scale: number;
    rawVisualSize: number;
    visualSize: number;
    stampSize: number;
    spacing: number;
    density: number;
    opacity: number;
    capped: boolean;
}
/**
 * Resolves a pattern at a given zoom without using feature dimensions.
 *
 * Screen mode keeps visual size and spacing in pixels. Map mode treats the
 * configured values as the appearance at referenceZoom, then doubles them for
 * every zoom level in. Motifs fade once their optical size is too small to
 * read and stop growing at maxVisualSize.
 */
declare function scalePatternForZoom(options: PatternScaleOptions): PatternScaleResult;

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
    distribution: SvgDistributionMode;
    minSpacing: number;
}
type PatternDefinition = GeometricPatternDefinition | SvgPatternDefinition;
interface PatternVariant {
    zoom: number;
    imageId: string;
    definition: PatternDefinition;
}
interface PatternMetadataV1 {
    imageId: string;
    definition: PatternDefinition;
    variants?: PatternVariant[];
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
    distribution?: SvgDistributionMode;
    minSpacing?: number;
}): SvgPatternDefinition;

interface SyncPatternTextureOptions {
    imageId: string;
    pattern: PatternType;
    size: TileSize;
    color: string;
    weight: number;
    angle: number;
    /** Raster pixels per MapLibre layout pixel. Defaults to the display ratio, capped at 2. */
    pixelRatio?: number;
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

interface SvgPatternOptions {
    imageId: string;
    /** Raw `<svg>...</svg>` markup, used as the repeatable stamp. */
    svg: string;
    /** Size of the generated meta-tile in layout px. Default 288. */
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
    /** Regular grid, offset rows, or seamless blue-noise placement. */
    distribution?: SvgDistributionMode;
    /** Minimum gap between symbols in natural mode, in layout px. Default 0. */
    minSpacing?: number;
    /** Raster pixels per MapLibre layout pixel. Defaults to the display ratio, capped at 2 when installed. */
    pixelRatio?: number;
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

type PolygonGeometry = {
    type: "Polygon";
    coordinates: number[][][];
} | {
    type: "MultiPolygon";
    coordinates: number[][][][];
};
interface PointFeature {
    type: "Feature";
    geometry: {
        type: "Point";
        coordinates: [number, number];
    };
    properties: {
        rotation: number;
        scale: number;
    };
}
interface PointFeatureCollection {
    type: "FeatureCollection";
    features: PointFeature[];
}
interface ScatterIconPointsOptions {
    map: Map;
    /** Polygon in [lng, lat] coordinates (the same geometry the fill is drawn from). */
    polygon: PolygonGeometry;
    /** On-screen icon radius in px. No point whose disc of this radius pokes outside the polygon. */
    iconRadiusPx: number;
    /** Approx. points per 100x100 screen px area. Default 1. */
    density?: number;
    /** Deterministic variation seed. Default 1. */
    seed?: number | string;
    /** +/- rotation jitter per point, in degrees. Default 0. */
    rotationJitterDeg?: number;
    /** +/- scale jitter per point (fraction of `iconRadiusPx`). Default 0. */
    scaleJitter?: number;
    /** +/- position jitter within each grid cell, as a fraction of the cell. Default 0.15. 0 = exact grid. */
    positionJitter?: number;
    /** Offset alternate rows by half a cell (quincunx), the classic regular cartographic symbol layout. Default true. */
    stagger?: boolean;
    /** Regular grid, offset rows, or natural non-overlapping scatter. */
    distribution?: SvgDistributionMode;
    /** Extra minimum gap in screen pixels for natural distribution. */
    minSpacing?: number;
}
/**
 * Computes scatter points inside a polygon, in the map's current screen
 * projection, using exact distance to every polygon boundary around each
 * point. Bound to the current scale: recompute after zoom if the layout
 * should keep a fixed screen size.
 */
declare function scatterIconPoints(options: ScatterIconPointsOptions): PointFeatureCollection;

type IconScaleMode = "screen" | "map";
interface InstallSvgIconScatterOptions {
    /** GeoJSON source id to (re)create with the computed scatter points. */
    sourceId: string;
    /** Symbol layer id. */
    layerId: string;
    /** MapLibre image id used for the rasterized SVG. */
    iconId: string;
    polygon: PolygonGeometry;
    svg: string;
    /** Rendered square icon size in px. Default 32; its circumscribed radius is used for clearance. */
    size?: number;
    density?: number;
    seed?: number | string;
    rotationJitterDeg?: number;
    /** +/- scale jitter per icon (fraction of `size`). Default 0. Driven by the symbol layer's native `icon-size`, not by re-rasterizing. */
    scaleJitter?: number;
    /** +/- position jitter within each grid cell, as a fraction of the cell. Default 0.15. 0 = exact grid. */
    positionJitter?: number;
    /** Offset alternate rows by half a cell (quincunx), the classic regular cartographic symbol layout. Default true. */
    stagger?: boolean;
    /** Regular grid, offset rows, or natural non-overlapping scatter. */
    distribution?: SvgDistributionMode;
    /** Extra minimum gap in screen pixels for natural distribution. */
    minSpacing?: number;
    /** Symbol opacity. Default 1. */
    opacity?: number;
    /** Keep a fixed screen size, or scale with the map from the installation zoom. Default screen. */
    scaleMode?: IconScaleMode;
}
/**
 * @experimental
 *
 * The no-cut alternative to {@link installSvgPatternFill}: instead of a
 * repeating texture (which always clips hard at the polygon edge),
 * places SVG icons where exact point-to-segment distances prove that their
 * circular safety envelope fits inside the polygon. The envelope is
 * conservative because it covers the complete rotated square icon canvas.
 *
 * Points are computed in screen pixels at call time, then frozen as
 * lng/lat, so density (icon count per screen area) drifts out of sync
 * with the current zoom unless you recompute after each pan/zoom, e.g.
 * `map.on('zoomend', () => installSvgIconScatter(map, options))`.
 */
declare function installSvgIconScatter(map: Map, options: InstallSvgIconScatterOptions): Promise<void>;

export { type BackgroundFillConfig, type BuildStyleFragmentOptions, type GeometricPatternDefinition, type GeometricPatternType, type HachureAngle, type IconScaleMode, type InstallSvgIconScatterOptions, LEGACY_PATTERN_METADATA_KEY, type MakeTileOptions, type ObservePatternFillsOptions, type OutlineConfig, PATTERN_METADATA_KEY, type PatternDefinition, type PatternFillConfig, type PatternFillObserver, type PatternMetadataV1, type PatternScaleMode, type PatternScaleOptions, type PatternScaleResult, type PatternType, type PatternVariant, type PointFeature, type PointFeatureCollection, type PolygonGeometry, type Ring, type ScatterIconPointsOptions, type ScatterPointsOptions, type ScatteredPoint, type StyleLike, type SvgDistributionMode, type SvgPatternDefinition, type SvgPatternOptions, type SvgScatterLayoutOptions, type SvgStampPlacement, type SyncPatternTextureOptions, type TileContext, type TileImage, type TileSize, buildStyleFragment, createMiniContext, createSvgPatternDefinition, createSvgScatterLayout, createSvgScatterTile, hashStringToSeed, installPatternFills, installSvgIconScatter, installSvgPatternFill, makeTile, mulberry32, observePatternFills, parsePatternDefinition, parsePatternMetadata, patternDefinitionId, scalePatternForZoom, scatterIconPoints, scatterPointsInPolygon, serializePatternDefinition, syncPatternTexture };
