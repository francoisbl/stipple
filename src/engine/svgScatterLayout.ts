import { hashStringToSeed, mulberry32 } from "./seededRandom";

export type SvgDistributionMode = "regular" | "offset" | "natural";

export interface SvgScatterLayoutOptions {
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

export interface SvgStampPlacement {
  /** Stable index shared by a logical stamp and all of its wrapped copies. */
  stampIndex: number;
  x: number;
  y: number;
  rotationRad: number;
  scale: number;
}

function positiveFinite(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a finite number greater than 0`);
  }
}

function nonNegativeFinite(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a finite number greater than or equal to 0`);
  }
}

function modulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function toroidalDistance(
  first: { x: number; y: number },
  second: { x: number; y: number },
  tileSize: number,
): number {
  const dx = Math.min(Math.abs(first.x - second.x), tileSize - Math.abs(first.x - second.x));
  const dy = Math.min(Math.abs(first.y - second.y), tileSize - Math.abs(first.y - second.y));
  return Math.hypot(dx, dy);
}

function createNaturalPositions(
  count: number,
  tileSize: number,
  minimumDistance: number,
  rand: () => number,
): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = [];
  const candidateCount = 24;

  while (positions.length < count) {
    let best: { x: number; y: number } | undefined;
    let bestDistance = -1;

    for (let candidateIndex = 0; candidateIndex < candidateCount; candidateIndex++) {
      const candidate = { x: rand() * tileSize, y: rand() * tileSize };
      const nearest = positions.length === 0
        ? Infinity
        : Math.min(...positions.map((position) => toroidalDistance(candidate, position, tileSize)));
      if (nearest > bestDistance) {
        best = candidate;
        bestDistance = nearest;
      }
    }

    if (!best || (positions.length > 0 && bestDistance < minimumDistance)) break;
    positions.push(best);
  }

  return positions;
}

/**
 * Builds the pure geometry for a seamless SVG scatter tile.
 *
 * Every placement sharing a `stampIndex` has the exact same rotation and
 * scale. Wrapped copies therefore reproduce the same logical stamp on the
 * opposite edge instead of consuming new random transforms.
 */
export function createSvgScatterLayout(options: SvgScatterLayoutOptions): SvgStampPlacement[] {
  const {
    tileSize,
    stampSize,
    density,
    seed,
    rotationJitterDeg,
    scaleJitter,
    positionJitter,
    stagger,
  } = options;
  const distribution = options.distribution ?? (stagger ? "offset" : "regular");
  const minSpacing = options.minSpacing ?? 0;

  positiveFinite("tileSize", tileSize);
  positiveFinite("stampSize", stampSize);
  positiveFinite("density", density);
  nonNegativeFinite("rotationJitterDeg", rotationJitterDeg);
  nonNegativeFinite("scaleJitter", scaleJitter);
  nonNegativeFinite("positionJitter", positionJitter);
  nonNegativeFinite("minSpacing", minSpacing);
  if (!["regular", "offset", "natural"].includes(distribution)) {
    throw new TypeError("distribution must be regular, offset, or natural");
  }
  if (scaleJitter >= 1) {
    throw new RangeError("scaleJitter must be less than 1 so every stamp has a positive scale");
  }

  const seedNum = typeof seed === "string" ? hashStringToSeed(seed) : seed;
  if (!Number.isFinite(seedNum)) throw new RangeError("seed must be a finite number or a string");
  const rand = mulberry32(seedNum);
  const targetCount = Math.max(1, Math.round(density * (tileSize * tileSize) / 10_000));
  let positions: Array<{ x: number; y: number }>;

  if (distribution === "natural") {
    // Use the diameter of each stamp canvas's circumscribed circle. This
    // remains safe at any seeded rotation and scale.
    const minimumDistance = stampSize * Math.SQRT2 * (1 + scaleJitter) + minSpacing;
    positions = createNaturalPositions(targetCount, tileSize, minimumDistance, rand);
  } else {
    const targetCell = 100 / Math.sqrt(density);
    const cols = Math.max(1, Math.round(tileSize / targetCell));
    let rows = Math.max(1, Math.round(tileSize / targetCell));
    const isOffset = distribution === "offset";
    if (isOffset && rows % 2 !== 0) {
      const lower = Math.max(2, rows - 1);
      const upper = rows + 1;
      rows = Math.abs(cols * lower - targetCount) <= Math.abs(cols * upper - targetCount)
        ? lower
        : upper;
    }
    const cellWidth = tileSize / cols;
    const cellHeight = tileSize / rows;
    const jitterAmount = distribution === "regular" ? 0 : positionJitter;
    positions = [];

    for (let row = 0; row < rows; row++) {
      const rowOffset = isOffset && row % 2 === 1 ? cellWidth / 2 : 0;
      for (let col = 0; col < cols; col++) {
        const jitterX = (rand() - 0.5) * cellWidth * jitterAmount;
        const jitterY = (rand() - 0.5) * cellHeight * jitterAmount;
        positions.push({
          x: modulo(col * cellWidth + cellWidth / 2 + rowOffset + jitterX, tileSize),
          y: modulo(row * cellHeight + cellHeight / 2 + jitterY, tileSize),
        });
      }
    }
  }

  const placements: SvgStampPlacement[] = [];
  positions.forEach(({ x, y }, stampIndex) => {
    const rotationRad = (rand() * 2 - 1) * rotationJitterDeg * (Math.PI / 180);
    const scale = 1 + (rand() * 2 - 1) * scaleJitter;

    // A rotated square is contained by a disc with this radius. Computing
    // every intersecting periodic copy also supports stamps larger than the
    // tile without special cases.
    const extent = (stampSize * scale * Math.SQRT2) / 2;
    const minShiftX = Math.ceil((-extent - x) / tileSize);
    const maxShiftX = Math.floor((tileSize + extent - x) / tileSize);
    const minShiftY = Math.ceil((-extent - y) / tileSize);
    const maxShiftY = Math.floor((tileSize + extent - y) / tileSize);

    for (let shiftY = minShiftY; shiftY <= maxShiftY; shiftY++) {
      for (let shiftX = minShiftX; shiftX <= maxShiftX; shiftX++) {
        placements.push({
          stampIndex,
          x: x + shiftX * tileSize,
          y: y + shiftY * tileSize,
          rotationRad,
          scale,
        });
      }
    }
  });

  return placements;
}
