import type { Map as MaplibreMap } from "maplibre-gl";
import { loadSvgImage } from "./loadSvgImage";

export interface SvgIconOptions {
  id: string;
  /** Raw `<svg>...</svg>` markup. */
  svg: string;
  /** Rendered size (square) in CSS px. Default 32. */
  size?: number;
  /** Oversampling factor for crisp rendering at high zoom / retina. Default 2. */
  pixelRatio?: number;
}

/**
 * Rasterizes an SVG as a point icon and installs it via `map.addImage`, ready
 * to use as `icon-image` on a `symbol` layer. Reuses MapLibre's native image
 * pipeline (canvas raster + addImage) instead of a custom SVG renderer.
 */
export async function addSvgIcon(
  map: MaplibreMap,
  options: SvgIconOptions,
): Promise<{ id: string; width: number; height: number }> {
  const { id, svg, size = 32, pixelRatio = 2 } = options;
  const image = await loadSvgImage(svg);
  const px = Math.round(size * pixelRatio);

  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = px;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");
  ctx.clearRect(0, 0, px, px);
  ctx.drawImage(image, 0, 0, px, px);

  const imageData = ctx.getImageData(0, 0, px, px);
  const tile = { width: px, height: px, data: new Uint8Array(imageData.data.buffer) };

  if (map.hasImage(id)) map.removeImage(id);
  map.addImage(id, tile, { pixelRatio });
  return { id, width: px, height: px };
}
