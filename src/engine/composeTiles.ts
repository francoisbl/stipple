import type { TileImage } from "./types";

export interface TileCompositeLayer {
  image: TileImage;
  opacity?: number;
}

/** Alpha-composites equal-sized RGBA tiles from bottom to top. */
export function composeTileImages(layers: readonly TileCompositeLayer[]): TileImage {
  if (layers.length === 0) {
    throw new RangeError("layers must contain at least one tile");
  }
  const { width, height } = layers[0].image;
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw new RangeError("tile dimensions must be positive integers");
  }
  const length = width * height * 4;
  const output = new Uint8ClampedArray(length);

  for (const [index, layer] of layers.entries()) {
    const { image } = layer;
    const opacity = layer.opacity ?? 1;
    if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
      throw new RangeError(`layers[${index}].opacity must be between 0 and 1`);
    }
    if (image.width !== width || image.height !== height || image.data.length !== length) {
      throw new RangeError("all tile layers must have equal dimensions and valid RGBA data");
    }
    for (let offset = 0; offset < length; offset += 4) {
      const sourceAlpha = image.data[offset + 3] / 255 * opacity;
      if (sourceAlpha <= 0) continue;
      const destinationAlpha = output[offset + 3] / 255;
      const resultAlpha = sourceAlpha + destinationAlpha * (1 - sourceAlpha);
      output[offset] = (
        image.data[offset] * sourceAlpha + output[offset] * destinationAlpha * (1 - sourceAlpha)
      ) / resultAlpha;
      output[offset + 1] = (
        image.data[offset + 1] * sourceAlpha + output[offset + 1] * destinationAlpha * (1 - sourceAlpha)
      ) / resultAlpha;
      output[offset + 2] = (
        image.data[offset + 2] * sourceAlpha + output[offset + 2] * destinationAlpha * (1 - sourceAlpha)
      ) / resultAlpha;
      output[offset + 3] = resultAlpha * 255;
    }
  }
  return { width, height, data: new Uint8Array(output.buffer) };
}
