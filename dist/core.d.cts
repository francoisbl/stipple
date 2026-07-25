import { T as TileContext, a as TileImage, P as PatternType } from './types-BhMN112m.cjs';
export { H as HachureAngle, b as TileSize } from './types-BhMN112m.cjs';

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
    /** Points sampled around the disc boundary for the erosion test. Default 24; higher is stricter but slower. */
    samples?: number;
    /** +/- rotation jitter applied to each point, in degrees. Default 0. */
    rotationJitterDeg?: number;
    /** +/- scale jitter applied to each point (as a fraction of `radius`). Default 0. The erosion test uses each point's actual scaled radius, so a bigger icon still never pokes outside the polygon. */
    scaleJitter?: number;
    /** +/- position jitter within each grid cell, as a fraction of the cell. Default 0.15 gives a light irregularity, not a full organic scatter. 0 = exact grid. */
    positionJitter?: number;
    /** Offset alternate rows by half a cell (quincunx), the classic regular cartographic symbol layout. Default true. */
    stagger?: boolean;
}
/**
 * Scatters points inside a (possibly holed) polygon whose center and sampled
 * clearance circle remain inside it. This approximates polygon erosion
 * cheaply; boundaries can still pass between samples. Deterministic for a
 * given seed.
 *
 * `rings` should include the exterior ring first, followed by any hole
 * rings; coordinates are unit-agnostic (pass pixels for on-screen icon
 * placement (see {@link scatterIconPoints}) or any planar unit
 * consistent with `radius`).
 */
declare function scatterPointsInPolygon(rings: Ring[], options: ScatterPointsOptions): ScatteredPoint[];

interface SvgScatterLayoutOptions {
    tileSize: number;
    stampSize: number;
    density: number;
    seed: number | string;
    rotationJitterDeg: number;
    scaleJitter: number;
    positionJitter: number;
    stagger: boolean;
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

export { type MakeTileOptions, PatternType, type Ring, type ScatterPointsOptions, type ScatteredPoint, type SvgScatterLayoutOptions, type SvgStampPlacement, TileContext, TileImage, createMiniContext, createSvgScatterLayout, hashStringToSeed, makeTile, mulberry32, scatterPointsInPolygon };
