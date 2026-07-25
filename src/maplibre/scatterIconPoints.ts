import type { Map as MaplibreMap } from "maplibre-gl";
import type { Ring } from "../engine/scatterPoints";
import { scatterPointsInPolygon } from "../engine/scatterPoints";
import type { SvgDistributionMode } from "../engine/svgScatterLayout";

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

function toPolygons(polygon: PolygonGeometry): number[][][][] {
  return polygon.type === "Polygon" ? [polygon.coordinates] : polygon.coordinates;
}

function componentSeed(seed: number | string | undefined, index: number): number | string {
  const base = seed ?? 1;
  return typeof base === "string" ? `${base}:${index}` : base + Math.imul(index, 0x9e3779b1);
}

/**
 * Computes scatter points inside a polygon, in the map's current screen
 * projection, using exact distance to every polygon boundary around each
 * point. Bound to the current scale: recompute after zoom if the layout
 * should keep a fixed screen size.
 */
export function scatterIconPoints(options: ScatterIconPointsOptions): PointFeatureCollection {
  const {
    map, polygon, iconRadiusPx, density, seed, rotationJitterDeg, scaleJitter,
    positionJitter, stagger, distribution, minSpacing,
  } = options;

  const points = toPolygons(polygon).flatMap((polygonRings, polygonIndex) => {
    const pixelRings: Ring[] = polygonRings.map((ring) =>
      ring.map(([lng, lat]) => {
        const p = map.project([lng, lat]);
        return [p.x, p.y] as [number, number];
      }),
    );

    return scatterPointsInPolygon(pixelRings, {
      radius: iconRadiusPx,
      density,
      seed: componentSeed(seed, polygonIndex),
      rotationJitterDeg,
      scaleJitter,
      positionJitter,
      stagger,
      distribution,
      minSpacing,
    });
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
