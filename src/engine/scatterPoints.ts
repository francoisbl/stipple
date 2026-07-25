import { hashStringToSeed, mulberry32 } from "./seededRandom";

/** A closed ring of [x, y] planar coordinates in any consistent unit. */
export type Ring = Array<[number, number]>;

export interface ScatteredPoint {
  x: number;
  y: number;
  /** Seeded rotation in degrees for icon-rotate variety. 0 unless `rotationJitterDeg` is set. */
  rotation: number;
  /** Seeded scale multiplier for icon-size variety. 1 unless `scaleJitter` is set. */
  scale: number;
}

export interface ScatterPointsOptions {
  /** Required clearance from any edge (including holes) for a point to qualify, at scale 1. */
  radius: number;
  /** Approx. points per 100x100 unit area. Default 1. */
  density?: number;
  /** Deterministic variation seed. Default 1. */
  seed?: number | string;
  /** Points sampled around the disc boundary for the erosion test. Default 12; higher is stricter but slower. */
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

function isInsideRings(x: number, y: number, rings: Ring[]): boolean {
  let inside = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      const crosses = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (crosses) inside = !inside;
    }
  }
  return inside;
}

// Approximates "a disc of this radius fits entirely inside the polygon" by
// checking the center plus points around the disc's edge. Cheap, no true
// polygon-offset geometry required, good enough to keep icons off the edge.
function discFitsInside(x: number, y: number, radius: number, rings: Ring[], samples: number): boolean {
  if (!isInsideRings(x, y, rings)) return false;
  for (let k = 0; k < samples; k++) {
    const angle = (k / samples) * Math.PI * 2;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (!isInsideRings(px, py, rings)) return false;
  }
  return true;
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
export function scatterPointsInPolygon(rings: Ring[], options: ScatterPointsOptions): ScatteredPoint[] {
  const {
    radius, density = 1, seed = 1, samples = 12,
    rotationJitterDeg = 0, scaleJitter = 0, positionJitter = 0.15, stagger = true,
  } = options;
  if (!Number.isFinite(radius) || radius < 0) {
    throw new RangeError("radius must be a finite number greater than or equal to 0");
  }
  if (!Number.isFinite(density) || density <= 0) {
    throw new RangeError("density must be a finite number greater than 0");
  }
  if (!Number.isInteger(samples) || samples < 3) {
    throw new RangeError("samples must be an integer greater than or equal to 3");
  }
  if (!Number.isFinite(rotationJitterDeg) || rotationJitterDeg < 0) {
    throw new RangeError("rotationJitterDeg must be a finite number greater than or equal to 0");
  }
  if (!Number.isFinite(scaleJitter) || scaleJitter < 0 || scaleJitter >= 1) {
    throw new RangeError("scaleJitter must be a finite number greater than or equal to 0 and less than 1");
  }
  if (!Number.isFinite(positionJitter) || positionJitter < 0) {
    throw new RangeError("positionJitter must be a finite number greater than or equal to 0");
  }
  const exterior = rings[0] ?? [];
  if (exterior.length === 0) return [];

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of exterior) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  const seedNum = typeof seed === "string" ? hashStringToSeed(seed) : seed;
  const rand = mulberry32(seedNum);
  const cell = 100 / Math.sqrt(density);
  const points: ScatteredPoint[] = [];

  let row = 0;
  for (let y = minY; y <= maxY; y += cell, row++) {
    const rowOffset = stagger && row % 2 === 1 ? cell / 2 : 0;
    for (let x = minX; x <= maxX; x += cell) {
      const jx = x + rowOffset + (rand() - 0.5) * cell * positionJitter;
      const jy = y + (rand() - 0.5) * cell * positionJitter;
      const rotation = (rand() * 2 - 1) * rotationJitterDeg;
      const scale = 1 + (rand() * 2 - 1) * scaleJitter;
      // Erosion test uses this point's actual scaled radius, so a
      // bigger-than-average icon still can't poke past the boundary.
      if (discFitsInside(jx, jy, radius * scale, rings, samples)) points.push({ x: jx, y: jy, rotation, scale });
    }
  }
  return points;
}
