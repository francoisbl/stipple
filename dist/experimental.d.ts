import { Map } from 'maplibre-gl';
import { S as SvgDistributionMode } from './svgScatterLayout-hN4oRl9-.js';

type PolygonGeometry = {
    type: "Polygon";
    coordinates: number[][][];
} | {
    type: "MultiPolygon";
    coordinates: number[][][][];
};
interface PointFeature {
    type: "Feature";
    id: number;
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
    /** Only generate points inside the visible canvas plus this pixel margin. Omit to process the complete polygon. */
    viewportPaddingPx?: number;
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
    /** Keep the complete icon inside the polygon. Default true. */
    edgeClearance?: boolean;
    /** Extra off-screen area retained for fixed-pixel symbols. Computed from icon size and spacing by default. */
    viewportPaddingPx?: number;
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
 * with the current zoom unless you recompute after each completed movement,
 * e.g. `map.on('moveend', () => installSvgIconScatter(map, options))`.
 */
declare function installSvgIconScatter(map: Map, options: InstallSvgIconScatterOptions): Promise<void>;

export { type IconScaleMode, type InstallSvgIconScatterOptions, type PointFeature, type PointFeatureCollection, type PolygonGeometry, type ScatterIconPointsOptions, installSvgIconScatter, scatterIconPoints };
