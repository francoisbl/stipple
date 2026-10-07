import { hashStringToSeed, mulberry32 } from "./seededRandom";

export type PlacementDistribution = "regular" | "offset" | "natural";

export type PlacementSpacing =
  | { mode: "density"; value: number }
  | { mode: "explicit"; horizontal: number; vertical: number }
  | { mode: "count"; value: number };

export interface PlacementLayoutOptions {
  tileSize: number;
  markSize: number;
  spacing: PlacementSpacing;
  seed: number | string;
  rotationJitterDeg: number;
  scaleJitter: number;
  positionJitter: number;
  distribution: PlacementDistribution;
  minSpacing?: number;
  /** Alternate-row horizontal offset as a fraction of a cell. */
  rowOffset?: number;
  /** Alternate-column vertical offset as a fraction of a cell. */
  columnOffset?: number;
  /** Rotation of the placement lattice, in degrees. */
  gridAngle?: number;
}

export interface MarkPlacement {
  /** Stable index shared by a logical mark and all of its wrapped copies. */
  markIndex: number;
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

function fraction(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError(`${name} must be at least 0 and less than 1`);
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

function targetCount(options: PlacementLayoutOptions): number {
  if (options.spacing.mode === "count") return options.spacing.value;
  if (options.spacing.mode === "density") {
    return Math.max(1, Math.round(
      options.spacing.value * (options.tileSize * options.tileSize) / 10_000,
    ));
  }
  const columns = Math.max(1, Math.round(options.tileSize / options.spacing.horizontal));
  const rows = Math.max(1, Math.round(options.tileSize / options.spacing.vertical));
  return columns * rows;
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

function createLatticePositions(
  options: PlacementLayoutOptions,
  count: number,
  rand: () => number,
): Array<{ x: number; y: number }> {
  if (options.spacing.mode === "count") {
    throw new TypeError("count spacing is only supported for natural placement");
  }
  let columns: number;
  let rows: number;
  if (options.spacing.mode === "density") {
    const targetCell = 100 / Math.sqrt(options.spacing.value);
    columns = Math.max(1, Math.round(options.tileSize / targetCell));
    rows = Math.max(1, Math.round(options.tileSize / targetCell));
    if (options.distribution === "offset" && rows % 2 !== 0) {
      const lower = Math.max(2, rows - 1);
      const upper = rows + 1;
      rows = Math.abs(columns * lower - count) <= Math.abs(columns * upper - count)
        ? lower
        : upper;
    }
  } else {
    columns = Math.max(1, Math.round(options.tileSize / options.spacing.horizontal));
    rows = Math.max(1, Math.round(options.tileSize / options.spacing.vertical));
  }

  const cellWidth = options.tileSize / columns;
  const cellHeight = options.tileSize / rows;
  const rowOffset = options.rowOffset ?? (options.distribution === "offset" ? 0.5 : 0);
  const columnOffset = options.columnOffset ?? 0;
  const jitterAmount = options.positionJitter;
  const angle = (options.gridAngle ?? 0) * Math.PI / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const center = options.tileSize / 2;
  const positions: Array<{ x: number; y: number }> = [];

  for (let row = 0; row < rows; row++) {
    const offsetX = row % 2 === 1 ? cellWidth * rowOffset : 0;
    for (let column = 0; column < columns; column++) {
      const offsetY = column % 2 === 1 ? cellHeight * columnOffset : 0;
      const unrotatedX = modulo(
        column * cellWidth + cellWidth / 2 + offsetX +
          (rand() - 0.5) * cellWidth * jitterAmount,
        options.tileSize,
      );
      const unrotatedY = modulo(
        row * cellHeight + cellHeight / 2 + offsetY +
          (rand() - 0.5) * cellHeight * jitterAmount,
        options.tileSize,
      );
      const dx = unrotatedX - center;
      const dy = unrotatedY - center;
      positions.push(angle === 0
        ? { x: unrotatedX, y: unrotatedY }
        : {
            x: modulo(center + dx * cos - dy * sin, options.tileSize),
            y: modulo(center + dx * sin + dy * cos, options.tileSize),
          });
    }
  }
  return positions;
}

/**
 * Builds pure, renderer-neutral geometry for marks on a seamless repeat tile.
 * Wrapped copies share an index and transforms with their logical mark.
 */
export function createPlacementLayout(options: PlacementLayoutOptions): MarkPlacement[] {
  const minSpacing = options.minSpacing ?? 0;
  const rowOffset = options.rowOffset ?? (options.distribution === "offset" ? 0.5 : 0);
  const columnOffset = options.columnOffset ?? 0;
  const gridAngle = options.gridAngle ?? 0;

  positiveFinite("tileSize", options.tileSize);
  positiveFinite("markSize", options.markSize);
  nonNegativeFinite("rotationJitterDeg", options.rotationJitterDeg);
  nonNegativeFinite("scaleJitter", options.scaleJitter);
  nonNegativeFinite("positionJitter", options.positionJitter);
  nonNegativeFinite("minSpacing", minSpacing);
  fraction("rowOffset", rowOffset);
  fraction("columnOffset", columnOffset);
  if (!Number.isFinite(gridAngle)) throw new TypeError("gridAngle must be a finite number");
  if (!(["regular", "offset", "natural"] as const).includes(options.distribution)) {
    throw new TypeError("distribution must be regular, offset, or natural");
  }
  if (options.scaleJitter >= 1) {
    throw new RangeError("scaleJitter must be less than 1 so every mark has a positive scale");
  }
  if (options.spacing.mode === "density") {
    positiveFinite("density", options.spacing.value);
  } else if (options.spacing.mode === "explicit") {
    positiveFinite("horizontalSpacing", options.spacing.horizontal);
    positiveFinite("verticalSpacing", options.spacing.vertical);
  } else {
    positiveFinite("count", options.spacing.value);
    if (!Number.isInteger(options.spacing.value)) {
      throw new RangeError("count must be a positive integer");
    }
  }

  const seedNumber = typeof options.seed === "string"
    ? hashStringToSeed(options.seed)
    : options.seed;
  if (!Number.isFinite(seedNumber)) {
    throw new RangeError("seed must be a finite number or a string");
  }
  const rand = mulberry32(seedNumber);
  const count = targetCount(options);
  const positions = options.distribution === "natural"
    ? createNaturalPositions(
        count,
        options.tileSize,
        options.markSize * Math.SQRT2 * (1 + options.scaleJitter) + minSpacing,
        rand,
      )
    : createLatticePositions(options, count, rand);

  const placements: MarkPlacement[] = [];
  positions.forEach(({ x, y }, markIndex) => {
    const rotationRad = (rand() * 2 - 1) * options.rotationJitterDeg * (Math.PI / 180);
    const scale = 1 + (rand() * 2 - 1) * options.scaleJitter;
    const extent = (options.markSize * scale * Math.SQRT2) / 2;
    const minShiftX = Math.ceil((-extent - x) / options.tileSize);
    const maxShiftX = Math.floor((options.tileSize + extent - x) / options.tileSize);
    const minShiftY = Math.ceil((-extent - y) / options.tileSize);
    const maxShiftY = Math.floor((options.tileSize + extent - y) / options.tileSize);

    for (let shiftY = minShiftY; shiftY <= maxShiftY; shiftY++) {
      for (let shiftX = minShiftX; shiftX <= maxShiftX; shiftX++) {
        placements.push({
          markIndex,
          x: x + shiftX * options.tileSize,
          y: y + shiftY * options.tileSize,
          rotationRad,
          scale,
        });
      }
    }
  });
  return placements;
}
