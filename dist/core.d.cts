import { T as TileContext, a as TileImage, P as PatternType } from './types-BhMN112m.cjs';
export { H as HachureAngle, b as TileSize } from './types-BhMN112m.cjs';
import { S as SvgDistributionMode } from './svgScatterLayout-hN4oRl9-.cjs';
export { a as SvgScatterLayoutOptions, b as SvgStampPlacement, c as createSvgScatterLayout } from './svgScatterLayout-hN4oRl9-.cjs';

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
    floored: boolean;
    capped: boolean;
}
/**
 * Resolves a pattern at a given zoom without using feature dimensions.
 *
 * Screen mode keeps visual size and spacing in pixels. Map mode treats the
 * configured values as the appearance at referenceZoom, then doubles them for
 * every zoom level in. Map-scaled motifs stop shrinking at their minimum
 * readable size and stop growing at maxVisualSize.
 */
declare function scalePatternForZoom(options: PatternScaleOptions): PatternScaleResult;

interface ImportedPolygonFeature {
    type: "Feature";
    id?: string | number;
    properties: Record<string, unknown>;
    geometry: {
        type: "Polygon";
        coordinates: number[][][];
    };
}
interface GeoJsonPolygonImport {
    features: ImportedPolygonFeature[];
    ignoredFeatures: number;
}
/**
 * Extracts editable Polygon features from GeoJSON. MultiPolygons are split
 * into one feature per polygon so every part can receive its own fill.
 */
declare function importGeoJsonPolygons(input: unknown, maximumFeatures?: number): GeoJsonPolygonImport;

export { type GeoJsonPolygonImport, type ImportedPolygonFeature, type MakeTileOptions, type PatternScaleMode, type PatternScaleOptions, type PatternScaleResult, PatternType, type Ring, type ScatterPointsOptions, type ScatteredPoint, SvgDistributionMode, TileContext, TileImage, createMiniContext, hashStringToSeed, importGeoJsonPolygons, makeTile, mulberry32, scalePatternForZoom, scatterPointsInPolygon };
