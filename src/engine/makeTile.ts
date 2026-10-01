import { createMiniContext } from "./miniContext";
import { hashStringToSeed, mulberry32 } from "./seededRandom";
import type { PatternType, TileContext, TileImage } from "./types";

export interface MakeTileOptions {
  /** Override how the drawing context is created. Mainly useful for tests. */
  contextFactory?: (size: number) => { ctx: TileContext; toTileImage: () => TileImage };
  /** Raster pixels per MapLibre layout pixel. Use 2 for high-density displays. Default 1. */
  pixelRatio?: number;
  /** Fixed dot count for a stipple tile, useful when the tile itself scales with zoom. */
  stippleCount?: number;
}

// Seven dots give the playground's default 33 px stipple tile an irregular,
// open texture. Keeping that count independent of the tile dimensions is
// important: tile size is the density/scale control, so making a tile larger
// must not silently inject more dots and turn it into a solid-looking fill.
const DEFAULT_STIPPLE_COUNT = 7;

/** Shortest distance between two points on a tile that wraps at `period`. */
function toroidalDistance(
  a: { x: number; y: number },
  b: { x: number; y: number },
  period: number,
): number {
  const dx = Math.min(Math.abs(a.x - b.x), period - Math.abs(a.x - b.x));
  const dy = Math.min(Math.abs(a.y - b.y), period - Math.abs(a.y - b.y));
  return Math.hypot(dx, dy);
}

function defaultContextFactory(size: number): { ctx: TileContext; toTileImage: () => TileImage } {
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const canvasCtx = canvas.getContext("2d");
    if (!canvasCtx) throw new Error("2D canvas context unavailable");
    return {
      ctx: canvasCtx as unknown as TileContext,
      toTileImage: (): TileImage => {
        const img = canvasCtx.getImageData(0, 0, size, size);
        return { width: size, height: size, data: new Uint8Array(img.data.buffer) };
      },
    };
  }
  return createMiniContext(size);
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
export function makeTile(
  pattern: PatternType,
  size: number,
  color: string,
  weight: number,
  angle: number,
  options: MakeTileOptions = {},
): TileImage {
  const pixelRatio = options.pixelRatio ?? 1;
  if (!Number.isFinite(pixelRatio) || pixelRatio <= 0) {
    throw new RangeError("pixelRatio must be a finite number greater than 0");
  }
  if (!Number.isFinite(size) || size <= 0) {
    throw new RangeError("size must be a finite number greater than 0");
  }
  if (!Number.isFinite(weight) || weight <= 0) {
    throw new RangeError("weight must be a finite number greater than 0");
  }
  if (!Number.isFinite(angle)) {
    throw new TypeError("angle must be a finite number");
  }
  if (
    options.stippleCount !== undefined &&
    (!Number.isInteger(options.stippleCount) || options.stippleCount <= 0)
  ) {
    throw new RangeError("stippleCount must be a positive integer");
  }
  if (typeof color !== "string" || color.trim().length === 0) {
    throw new TypeError("color must be a non-empty string");
  }
  const physicalSize = Math.max(1, Math.round(size * pixelRatio));
  const renderScale = physicalSize / size;
  const { ctx, toTileImage } = (options.contextFactory ?? defaultContextFactory)(physicalSize);
  ctx.clearRect(0, 0, physicalSize, physicalSize); // transparent: whatever sits below shows through
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = weight * renderScale;
  ctx.lineCap = "round";

  // Parallel lines at the given angle (0 / 45 / 90 / -45), swept from -size to
  // 2*size so the tile edges line up seamlessly with their neighbours.
  const drawHachures = (deg: number) => {
    ctx.beginPath();
    const step = Math.max(physicalSize / 2, 4 * renderScale);
    if (deg === 0) {
      for (let y = 0; y <= physicalSize; y += step) {
        ctx.moveTo(0, y + 0.5 * renderScale);
        ctx.lineTo(physicalSize, y + 0.5 * renderScale);
      }
    } else if (deg === 90) {
      for (let x = 0; x <= physicalSize; x += step) {
        ctx.moveTo(x + 0.5 * renderScale, 0);
        ctx.lineTo(x + 0.5 * renderScale, physicalSize);
      }
    } else if (deg === 45) {
      for (let o = -physicalSize; o <= physicalSize * 2; o += step) {
        ctx.moveTo(o, 0);
        ctx.lineTo(o + physicalSize, physicalSize);
      }
    } else {
      for (let o = -physicalSize; o <= physicalSize * 2; o += step) {
        ctx.moveTo(o + physicalSize, 0);
        ctx.lineTo(o, physicalSize);
      }
    }
    ctx.stroke();
  };

  switch (pattern) {
    case "hachures":
      drawHachures(angle);
      break;
    case "cross":
      drawHachures(angle);
      drawHachures(((angle + 90 + 45) % 180) - 45);
      break;
    case "grid": {
      // Stroke on two edges only so it lines up with the neighbouring tile.
      ctx.beginPath();
      ctx.moveTo(0.5 * renderScale, 0);
      ctx.lineTo(0.5 * renderScale, physicalSize);
      ctx.moveTo(0, 0.5 * renderScale);
      ctx.lineTo(physicalSize, 0.5 * renderScale);
      ctx.stroke();
      break;
    }
    case "stipple": {
      // A true stipple: a seeded, irregular scatter of dots, not a grid.
      // Best-candidate sampling (the same idea as the SVG "natural"
      // distribution in svgScatterLayout.ts) spreads dots out without the
      // look of an evenly spaced lattice. The seed is derived from `size`
      // alone, so the dot layout is deterministic and stable across colour,
      // weight, and angle changes (angle has no effect on a round dot); only
      // resizing the tile preserves the normalized point set. Tile size can
      // therefore control density (or ground scale) without reshuffling the
      // texture or silently adding more dots. Every dot whose disc crosses a
      // tile edge is additionally drawn shifted by whole tiles so the pattern
      // still repeats with no seam or clipping, at any weight.
      const r = weight * renderScale * 0.6;
      const count = options.stippleCount ?? DEFAULT_STIPPLE_COUNT;
      const seedKey = `fixed:${count}`;
      const rand = mulberry32(hashStringToSeed(`stipple:${seedKey}`));
      const candidateCount = 20;
      const positions: Array<{ x: number; y: number }> = [];
      for (let i = 0; i < count; i++) {
        let best = { x: rand() * physicalSize, y: rand() * physicalSize };
        let bestDistance = -1;
        for (let c = 0; c < candidateCount; c++) {
          const candidate = { x: rand() * physicalSize, y: rand() * physicalSize };
          const nearest = positions.length === 0
            ? Infinity
            : Math.min(...positions.map((p) => toroidalDistance(candidate, p, physicalSize)));
          if (nearest > bestDistance) {
            best = candidate;
            bestDistance = nearest;
          }
        }
        positions.push(best);
      }
      for (const { x, y } of positions) {
        const minShiftX = Math.ceil((-r - x) / physicalSize);
        const maxShiftX = Math.floor((physicalSize + r - x) / physicalSize);
        const minShiftY = Math.ceil((-r - y) / physicalSize);
        const maxShiftY = Math.floor((physicalSize + r - y) / physicalSize);
        for (let shiftY = minShiftY; shiftY <= maxShiftY; shiftY++) {
          for (let shiftX = minShiftX; shiftX <= maxShiftX; shiftX++) {
            ctx.beginPath();
            ctx.arc(x + shiftX * physicalSize, y + shiftY * physicalSize, r, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      break;
    }
    case "dots": {
      // Regular single-dot repeat, seamless by construction.
      const r = Math.max(weight * renderScale * 0.5, renderScale);
      ctx.beginPath();
      ctx.arc(physicalSize / 2, physicalSize / 2, r, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "solid":
      break; // no texture: use fill-color directly instead of fill-pattern
  }

  return toTileImage();
}
