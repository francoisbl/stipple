import { Map } from 'maplibre-gl';

type PatternType = "solid" | "stipple" | "hachures" | "cross" | "grid" | "dots";
/** Tile edge length in px. Any size works (MapLibre doesn't require power-of-two fill-pattern images) — larger tiles read as a lower-density pattern. */
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
    /** Override how the drawing context is created — mainly useful for tests. */
    contextFactory?: (size: number) => {
        ctx: TileContext;
        toTileImage: () => TileImage;
    };
}
/**
 * Renders one seamless pattern tile (any pixel size — MapLibre's
 * `fill-pattern` doesn't require power-of-two images) as a raw RGBA buffer
 * ready for `map.addImage` / `map.updateImage`. Runs unchanged in the browser
 * (native canvas) or in Node (pure-JS {@link createMiniContext} rasterizer) —
 * same output shape either way. Larger tiles read as a lower-density pattern
 * (fewer repeats per unit area); use `size` as the density control.
 *
 * The pattern's visual parameters (angle, density, weight) only ever live in
 * this generated image, never in the style.json — regenerate with the exact
 * same arguments wherever the tile is consumed to get an identical result.
 */
declare function makeTile(pattern: PatternType, size: number, color: string, weight: number, angle: number, options?: MakeTileOptions): TileImage;

/**
 * Minimal software rasterizer implementing just the {@link TileContext}
 * surface `makeTile` relies on (straight strokes with round caps, filled
 * circles). Lets the pattern engine run in Node without a DOM or a native
 * canvas dependency — the browser path uses the real Canvas 2D API instead,
 * this is only exercised server-side (tests, tooling, SSR previews).
 */
declare function createMiniContext(size: number): {
    ctx: TileContext;
    toTileImage: () => TileImage;
};

/** Deterministic PRNG (mulberry32) — same seed always produces the same sequence. */
declare function mulberry32(seed: number): () => number;
/** Turns an arbitrary string (e.g. a layer id) into a stable 32-bit seed. */
declare function hashStringToSeed(str: string): number;

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
/** `line-dasharray` presets — declarative, native MapLibre expressions (no canvas involved). */
declare const DASH_PRESETS: Record<"solid" | "dotted" | "dashdot", number[]>;

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
 * the map — `updateImage` when the tile dimensions are unchanged (no flash),
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
 * parameters are NOT baked into the paint properties — they're carried in
 * `layer.metadata["enhanced:pattern"]` so {@link installPatternFills} can
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
 * `enhanced:pattern` metadata produced by {@link buildStyleFragment}, and
 * generates + installs the matching fill-pattern texture for each. This is
 * the production entry point: the style.json only describes *which* pattern
 * to use, this function is what actually bakes the canvas image — call it
 * once after `map.on('load', ...)` (and again if you swap styles).
 */
declare function installPatternFills(map: Map, style: StyleLike): void;

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
    /** Deterministic variation seed — same seed always gives the same tile. */
    seed?: number | string;
    /** +/- rotation jitter per stamp, in degrees. Default 25. */
    rotationJitterDeg?: number;
    /** +/- scale jitter per stamp, as a fraction of stampSize. Default 0.25. */
    scaleJitter?: number;
}
/**
 * Rasterizes an SVG into a large seamless "meta-tile" scattered with many
 * slightly rotated/scaled repetitions (seeded, so deterministic). Spreading
 * many stamps across a tile much bigger than any single stamp pushes the
 * visible repeat period out, avoiding the "wallpaper" look that a single
 * small tiled SVG produces on organic motifs (grass, foliage...). Stamps
 * near an edge are additionally drawn wrapped on the opposite side so the
 * tile still repeats seamlessly.
 *
 * Uses the browser's native SVG rasterizer (`Image` + canvas) — no SVG
 * parsing of our own, per MapLibre's own `addImage` pipeline.
 */
declare function createSvgScatterTile(options: SvgPatternOptions): Promise<TileImage>;
/** Rasterizes an SVG scatter tile and installs it as a `fill-pattern` image. */
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

export { type BackgroundFillConfig, type BuildStyleFragmentOptions, DASH_PRESETS, type HachureAngle, type MakeTileOptions, type OutlineConfig, type PatternFillConfig, type PatternType, type StyleLike, type SvgIconOptions, type SvgPatternOptions, type SyncPatternTextureOptions, type TileContext, type TileImage, type TileSize, addSvgIcon, buildStyleFragment, createMiniContext, createSvgScatterTile, hashStringToSeed, installPatternFills, installSvgPatternFill, makeTile, mulberry32, syncPatternTexture };
