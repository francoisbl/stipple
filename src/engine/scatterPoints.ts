import { hashStringToSeed, mulberry32 } from "./seededRandom";
import type { PlacementDistribution } from "./placementLayout";

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
  /** +/- rotation jitter applied to each point, in degrees. Default 0. */
  rotationJitterDeg?: number;
  /** +/- scale jitter applied to each point (as a fraction of `radius`). Default 0. The erosion test uses each point's actual scaled radius, so a bigger icon still never pokes outside the polygon. */
  scaleJitter?: number;
  /** +/- position jitter within each grid cell, as a fraction of the cell. Default 0.15 gives a light irregularity, not a full organic scatter. 0 = exact grid. */
  positionJitter?: number;
  /** Offset alternate rows by half a cell (quincunx), the classic regular cartographic symbol layout. Default true. */
  stagger?: boolean;
  /** Point layout. Defaults to offset for backward compatibility. */
  distribution?: PlacementDistribution;
  /** Extra minimum gap between natural-layout icon envelopes. Default 0. */
  minSpacing?: number;
  /** Optional planar bounds limiting generated point centres. Polygon containment and edge clearance still use every ring. */
  clipBounds?: { minX: number; minY: number; maxX: number; maxY: number };
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

function squaredDistanceToSegment(
  x: number,
  y: number,
  start: [number, number],
  end: [number, number],
): number {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  if (dx === 0 && dy === 0) return (x - start[0]) ** 2 + (y - start[1]) ** 2;
  const projection = Math.max(
    0,
    Math.min(1, ((x - start[0]) * dx + (y - start[1]) * dy) / (dx * dx + dy * dy)),
  );
  const nearestX = start[0] + projection * dx;
  const nearestY = start[1] + projection * dy;
  return (x - nearestX) ** 2 + (y - nearestY) ** 2;
}

// A point inside the polygon whose exact distance from every exterior and
// interior boundary is at least the radius contains the complete disc.
function discFitsInside(x: number, y: number, radius: number, rings: Ring[]): boolean {
  if (!isInsideRings(x, y, rings)) return false;
  const squaredRadius = radius * radius;
  for (const ring of rings) {
    for (let index = 0; index < ring.length; index++) {
      const start = ring[index];
      const end = ring[(index + 1) % ring.length];
      if (squaredDistanceToSegment(x, y, start, end) < squaredRadius) return false;
    }
  }
  return true;
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
export function scatterPointsInPolygon(rings: Ring[], options: ScatterPointsOptions): ScatteredPoint[] {
  const {
    radius, density = 1, seed = 1,
    rotationJitterDeg = 0, scaleJitter = 0, positionJitter = 0.15, stagger = true,
    distribution = stagger ? "offset" : "regular", minSpacing = 0, clipBounds,
  } = options;
  if (!Number.isFinite(radius) || radius < 0) {
    throw new RangeError("radius must be a finite number greater than or equal to 0");
  }
  if (!Number.isFinite(density) || density <= 0) {
    throw new RangeError("density must be a finite number greater than 0");
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
  if (!["regular", "offset", "natural"].includes(distribution)) {
    throw new TypeError("distribution must be regular, offset, or natural");
  }
  if (!Number.isFinite(minSpacing) || minSpacing < 0) {
    throw new RangeError("minSpacing must be a finite number greater than or equal to 0");
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
  const width = maxX - minX;
  const height = maxY - minY;
  const clipMinX = Math.max(minX, clipBounds?.minX ?? minX);
  const clipMinY = Math.max(minY, clipBounds?.minY ?? minY);
  const clipMaxX = Math.min(maxX, clipBounds?.maxX ?? maxX);
  const clipMaxY = Math.min(maxY, clipBounds?.maxY ?? maxY);
  if (clipMaxX <= clipMinX || clipMaxY <= clipMinY) return [];

  if (distribution === "natural") {
    const clippedWidth = clipMaxX - clipMinX;
    const clippedHeight = clipMaxY - clipMinY;
    const targetCount = Math.max(1, Math.round((density * clippedWidth * clippedHeight) / 10_000));
    // The density-derived distance makes the Poisson process cover the whole
    // polygon instead of producing a dense cluster that merely stops at the
    // requested count. Icon clearance can only increase that spacing.
    const minimumDistance = Math.max(
      cell * 0.76,
      radius * 2 * (1 + scaleJitter) + minSpacing,
    );
    const conservativeRadius = radius * (1 + scaleJitter);
    const minimumDistanceSquared = minimumDistance ** 2;
    const gridCell = Math.max(minimumDistance / Math.SQRT2, 1);
    const grid = new Map<string, number>();
    const active: number[] = [];

    const gridCoordinate = (value: number, origin: number) =>
      Math.floor((value - origin) / gridCell);
    const gridKey = (column: number, row: number) => `${column}:${row}`;
    const isFarEnough = (x: number, y: number) => {
      if (minimumDistanceSquared === 0) return true;
      const column = gridCoordinate(x, clipMinX);
      const row = gridCoordinate(y, clipMinY);
      for (let offsetY = -2; offsetY <= 2; offsetY++) {
        for (let offsetX = -2; offsetX <= 2; offsetX++) {
          const pointIndex = grid.get(gridKey(column + offsetX, row + offsetY));
          if (pointIndex === undefined) continue;
          const point = points[pointIndex];
          if ((x - point.x) ** 2 + (y - point.y) ** 2 < minimumDistanceSquared) return false;
        }
      }
      return true;
    };
    const addPoint = (x: number, y: number) => {
      const pointIndex = points.length;
      points.push({
        x,
        y,
        rotation: (rand() * 2 - 1) * rotationJitterDeg,
        scale: 1 + (rand() * 2 - 1) * scaleJitter,
      });
      active.push(pointIndex);
      grid.set(gridKey(
        gridCoordinate(x, clipMinX),
        gridCoordinate(y, clipMinY),
      ), pointIndex);
    };

    for (let attempt = 0; attempt < 128 && points.length === 0; attempt++) {
      const x = clipMinX + rand() * clippedWidth;
      const y = clipMinY + rand() * clippedHeight;
      if (discFitsInside(x, y, conservativeRadius, rings)) addPoint(x, y);
    }

    while (active.length > 0 && points.length < targetCount) {
      const activeSlot = Math.floor(rand() * active.length);
      const origin = points[active[activeSlot]];
      let accepted = false;
      for (let attempt = 0; attempt < 30; attempt++) {
        const angle = rand() * Math.PI * 2;
        const distance = minimumDistance * (1 + rand());
        const x = origin.x + Math.cos(angle) * distance;
        const y = origin.y + Math.sin(angle) * distance;
        if (
          x < clipMinX || x > clipMaxX || y < clipMinY || y > clipMaxY ||
          !discFitsInside(x, y, conservativeRadius, rings) ||
          !isFarEnough(x, y)
        ) continue;
        addPoint(x, y);
        accepted = true;
        break;
      }
      if (!accepted) active.splice(activeSlot, 1);
    }
    return points;
  }

  const columns = Math.max(1, Math.floor(width / cell));
  const rows = Math.max(1, Math.floor(height / cell));
  const startX = minX + (width - (columns - 1) * cell) / 2;
  const startY = minY + (height - (rows - 1) * cell) / 2;

  const jitterMargin = cell * positionJitter / 2;
  const firstRow = Math.max(0, Math.ceil((clipMinY - jitterMargin - startY) / cell));
  const lastRow = Math.min(rows - 1, Math.floor((clipMaxY + jitterMargin - startY) / cell));

  for (let row = firstRow; row <= lastRow; row++) {
    const rowOffset = distribution === "offset" && columns > 1
      ? (row % 2 === 0 ? -cell / 4 : cell / 4)
      : 0;
    const firstColumn = Math.max(
      0,
      Math.ceil((clipMinX - jitterMargin - startX - rowOffset) / cell),
    );
    const lastColumn = Math.min(
      columns - 1,
      Math.floor((clipMaxX + jitterMargin - startX - rowOffset) / cell),
    );
    for (let column = firstColumn; column <= lastColumn; column++) {
      const jitter = distribution === "offset" ? positionJitter : 0;
      const jx = startX + column * cell + rowOffset + (rand() - 0.5) * cell * jitter;
      const jy = startY + row * cell + (rand() - 0.5) * cell * jitter;
      if (jx < clipMinX || jx > clipMaxX || jy < clipMinY || jy > clipMaxY) continue;
      const rotation = (rand() * 2 - 1) * rotationJitterDeg;
      const scale = 1 + (rand() * 2 - 1) * scaleJitter;
      // Erosion test uses this point's actual scaled radius, so a
      // bigger-than-average icon still can't poke past the boundary.
      if (discFitsInside(jx, jy, radius * scale, rings)) points.push({ x: jx, y: jy, rotation, scale });
    }
  }
  return points;
}
