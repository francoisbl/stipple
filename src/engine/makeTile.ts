import { createMiniContext } from "./miniContext";
import type { PatternType, TileContext, TileImage } from "./types";

export interface MakeTileOptions {
  /** Override how the drawing context is created. Mainly useful for tests. */
  contextFactory?: (size: number) => { ctx: TileContext; toTileImage: () => TileImage };
  /** Raster pixels per MapLibre layout pixel. Use 2 for high-density displays. Default 1. */
  pixelRatio?: number;
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
      // Offset grid of dots ("scatter" look). Deterministic, so seamless.
      // Cell count scales with tile size so density stays smooth across the
      // whole size range, rather than jumping only at a few breakpoints.
      const r = weight * renderScale * 0.6;
      const cells = Math.max(2, Math.round(size / 6));
      const s = physicalSize / cells;
      for (let i = 0; i < cells; i++) {
        for (let j = 0; j < cells; j++) {
          const cx = (i + (j % 2 ? 0.75 : 0.25)) * s;
          const cy = (j + 0.5) * s;
          ctx.beginPath();
          ctx.arc(cx % physicalSize, cy % physicalSize, r, 0, Math.PI * 2);
          ctx.fill();
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
