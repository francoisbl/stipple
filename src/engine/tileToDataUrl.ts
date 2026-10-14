import type { TileImage } from "./types";

/** Converts a rendered tile to a browser-generated data URL (PNG by default). */
export function tileToDataUrl(tile: TileImage, type?: string): string {
  if (typeof document === "undefined" || typeof ImageData === "undefined") {
    throw new Error("tileToDataUrl needs a browser canvas");
  }

  const canvas = document.createElement("canvas");
  canvas.width = tile.width;
  canvas.height = tile.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("tileToDataUrl needs a browser canvas");

  const image = new ImageData(new Uint8ClampedArray(tile.data), tile.width, tile.height);
  context.putImageData(image, 0, 0);
  return type === undefined ? canvas.toDataURL() : canvas.toDataURL(type);
}
