import { Map } from 'maplibre-gl';

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
    /** Erosion-test resolution (see {@link scatterPointsInPolygon}). Default 12. */
    samples?: number;
    /** +/- rotation jitter per point, in degrees. Default 0. */
    rotationJitterDeg?: number;
    /** +/- scale jitter per point (fraction of `iconRadiusPx`). Default 0. */
    scaleJitter?: number;
    /** +/- position jitter within each grid cell, as a fraction of the cell. Default 0.15. 0 = exact grid. */
    positionJitter?: number;
    /** Offset alternate rows by half a cell (quincunx), the classic regular cartographic symbol layout. Default true. */
    stagger?: boolean;
}
/**
 * Computes scatter points inside a polygon, in the map's current screen
 * projection, using a sampled circular-clearance approximation around each
 * point. Bound to the current view: recompute after pan/zoom if the layout
 * should track it.
 */
declare function scatterIconPoints(options: ScatterIconPointsOptions): PointFeatureCollection;

interface InstallSvgIconScatterOptions {
    /** GeoJSON source id to (re)create with the computed scatter points. */
    sourceId: string;
    /** Symbol layer id. */
    layerId: string;
    /** Image id passed to `addSvgIcon` (reused across calls if already installed). */
    iconId: string;
    polygon: PolygonGeometry;
    svg: string;
    /** Rendered square icon size in px. Default 32; its circumscribed radius is used for clearance. */
    size?: number;
    density?: number;
    seed?: number | string;
    /** Clearance-circle samples. Default 12; higher is stricter but slower. */
    samples?: number;
    rotationJitterDeg?: number;
    /** +/- scale jitter per icon (fraction of `size`). Default 0. Driven by the symbol layer's native `icon-size`, not by re-rasterizing. */
    scaleJitter?: number;
    /** +/- position jitter within each grid cell, as a fraction of the cell. Default 0.15. 0 = exact grid. */
    positionJitter?: number;
    /** Offset alternate rows by half a cell (quincunx), the classic regular cartographic symbol layout. Default true. */
    stagger?: boolean;
}
/**
 * @experimental
 *
 * The no-cut alternative to {@link installSvgPatternFill}: instead of a
 * repeating texture (which always clips hard at the polygon edge),
 * places SVG icons where a sampled circular-clearance test says they fit
 * inside the polygon. This is an approximation, not an exact geometry
 * guarantee; very narrow or highly concave boundaries can fall between the
 * configured samples.
 *
 * Points are computed in screen pixels at call time, then frozen as
 * lng/lat, so density (icon count per screen area) drifts out of sync
 * with the current zoom unless you recompute after each pan/zoom, e.g.
 * `map.on('moveend', () => installSvgIconScatter(map, options))`.
 */
declare function installSvgIconScatter(map: Map, options: InstallSvgIconScatterOptions): Promise<void>;

export { type InstallSvgIconScatterOptions, type PointFeature, type PointFeatureCollection, type PolygonGeometry, type ScatterIconPointsOptions, installSvgIconScatter, scatterIconPoints };
