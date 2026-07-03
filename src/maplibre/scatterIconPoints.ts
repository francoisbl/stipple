import type { Map as MaplibreMap } from "maplibre-gl";
import type { Ring } from "../engine/scatterPoints";
import { scatterPointsInPolygon } from "../engine/scatterPoints";

export type PolygonGeometry =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] };

export interface PointFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: { rotation: number; scale: number };
}

export interface PointFeatureCollection {
  type: "FeatureCollection";
  features: PointFeature[];
}

export interface ScatterIconPointsOptions {
  map: MaplibreMap;
  /** Polygon in [lng, lat] coordinates (the same geometry the fill is drawn from). */
  polygon: PolygonGeometry;
  /** On-screen icon radius in px — no point whose disc of this radius pokes outside the polygon. */
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

function toRings(polygon: PolygonGeometry): number[][][] {
  return polygon.type === "Polygon" ? polygon.coordinates : polygon.coordinates.flat();
}

/**
 * Computes scatter points inside a polygon, in the map's current screen
 * projection, such that an icon of `iconRadiusPx` placed at any returned
 * point is never cut by the polygon boundary — unlike a repeating
 * `fill-pattern` texture, which always clips hard at the edge. Bound to the
 * current view: recompute after pan/zoom if the layout should track it.
 */
export function scatterIconPoints(options: ScatterIconPointsOptions): PointFeatureCollection {
  const { map, polygon, iconRadiusPx, density, seed, samples, rotationJitterDeg, scaleJitter, positionJitter, stagger } = options;

  const pixelRings: Ring[] = toRings(polygon).map((ring) =>
    ring.map(([lng, lat]) => {
      const p = map.project([lng, lat]);
      return [p.x, p.y] as [number, number];
    }),
  );

  const points = scatterPointsInPolygon(pixelRings, {
    radius: iconRadiusPx,
    density,
    seed,
    samples,
    rotationJitterDeg,
    scaleJitter,
    positionJitter,
    stagger,
  });

  const features: PointFeature[] = points.map(({ x, y, rotation, scale }) => {
    const lngLat = map.unproject([x, y]);
    return {
      type: "Feature",
      geometry: { type: "Point", coordinates: [lngLat.lng, lngLat.lat] },
      properties: { rotation, scale },
    };
  });

  return { type: "FeatureCollection", features };
}
