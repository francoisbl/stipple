import { createMiniContext } from "./miniContext";
import type { PatternType, TileContext, TileImage } from "./types";

export interface MakeTileOptions {
  /** Override how the drawing context is created — mainly useful for tests. */
  contextFactory?: (size: number) => { ctx: TileContext; toTileImage: () => TileImage };
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
 * Renders one seamless, power-of-two pattern tile as a raw RGBA buffer ready
 * for `map.addImage` / `map.updateImage`. Runs unchanged in the browser
 * (native canvas) or in Node (pure-JS {@link createMiniContext} rasterizer) —
 * same output shape either way.
 *
 * The pattern's visual parameters (angle, density, weight) only ever live in
 * this generated image, never in the style.json — regenerate with the exact
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
  const { ctx, toTileImage } = (options.contextFactory ?? defaultContextFactory)(size);
  ctx.clearRect(0, 0, size, size); // transparent: whatever sits below shows through
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = weight;
  ctx.lineCap = "round";

  // Parallel lines at the given angle (0 / 45 / 90 / -45), swept from -size to
  // 2*size so the tile edges line up seamlessly with their neighbours.
  const drawHachures = (deg: number) => {
    ctx.beginPath();
    const step = Math.max(size / 2, 4);
    if (deg === 0) {
      for (let y = 0; y <= size; y += step) {
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(size, y + 0.5);
      }
    } else if (deg === 90) {
      for (let x = 0; x <= size; x += step) {
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, size);
      }
    } else if (deg === 45) {
      for (let o = -size; o <= size * 2; o += step) {
        ctx.moveTo(o, 0);
        ctx.lineTo(o + size, size);
      }
    } else {
      for (let o = -size; o <= size * 2; o += step) {
        ctx.moveTo(o + size, 0);
        ctx.lineTo(o, size);
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
      ctx.moveTo(0.5, 0);
      ctx.lineTo(0.5, size);
      ctx.moveTo(0, 0.5);
      ctx.lineTo(size, 0.5);
      ctx.stroke();
      break;
    }
    case "stipple": {
      // Offset grid of dots ("scatter" look) — deterministic, so seamless.
      const r = weight * 0.6;
      const cells = size <= 8 ? 2 : size <= 16 ? 3 : 4;
      const s = size / cells;
      for (let i = 0; i < cells; i++) {
        for (let j = 0; j < cells; j++) {
          const cx = (i + (j % 2 ? 0.75 : 0.25)) * s;
          const cy = (j + 0.5) * s;
          ctx.beginPath();
          ctx.arc(cx % size, cy % size, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
    case "dots": {
      // Regular single-dot repeat — seamless by construction.
      const r = Math.max(weight * 0.5, 1);
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, r, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "solid":
      break; // no texture: use fill-color directly instead of fill-pattern
  }

  return toTileImage();
}
