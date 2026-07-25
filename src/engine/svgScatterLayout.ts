import { hashStringToSeed, mulberry32 } from "./seededRandom";

export interface SvgScatterLayoutOptions {
  tileSize: number;
  stampSize: number;
  density: number;
  seed: number | string;
  rotationJitterDeg: number;
  scaleJitter: number;
  positionJitter: number;
  stagger: boolean;
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

  positiveFinite("tileSize", tileSize);
  positiveFinite("stampSize", stampSize);
  positiveFinite("density", density);
  nonNegativeFinite("rotationJitterDeg", rotationJitterDeg);
  nonNegativeFinite("scaleJitter", scaleJitter);
  nonNegativeFinite("positionJitter", positionJitter);
  if (scaleJitter >= 1) {
    throw new RangeError("scaleJitter must be less than 1 so every stamp has a positive scale");
  }

  const seedNum = typeof seed === "string" ? hashStringToSeed(seed) : seed;
  if (!Number.isFinite(seedNum)) throw new RangeError("seed must be a finite number or a string");
  const rand = mulberry32(seedNum);
  const cell = 100 / Math.sqrt(density);
  const cols = Math.max(1, Math.ceil(tileSize / cell));
  let rows = Math.max(1, Math.ceil(tileSize / cell));
  if (stagger && rows % 2 !== 0) rows += 1;

  const placements: SvgStampPlacement[] = [];
  let stampIndex = 0;

  for (let row = 0; row < rows; row++) {
    const rowOffset = stagger && row % 2 === 1 ? cell / 2 : 0;
    for (let col = 0; col < cols; col++, stampIndex++) {
      const jitterX = (rand() - 0.5) * cell * positionJitter;
      const jitterY = (rand() - 0.5) * cell * positionJitter;
      const x = modulo(col * cell + cell / 2 + rowOffset + jitterX, tileSize);
      const y = modulo(row * cell + cell / 2 + jitterY, tileSize);
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
    }
  }

  return placements;
}
