import {
  createMiniContext,
  createSvgScatterLayout,
  makeTile
} from "./chunk-FT2VDGKY.js";
import {
  scatterPointsInPolygon
} from "./chunk-RIGAT72J.js";
import {
  hashStringToSeed,
  mulberry32
} from "./chunk-GBEE6YET.js";

// src/engine/patternScale.ts
function finite(value, name) {
  if (!Number.isFinite(value)) throw new TypeError(`${name} must be finite`);
  return value;
}
function positive(value, name) {
  finite(value, name);
  if (value <= 0) throw new RangeError(`${name} must be greater than 0`);
  return value;
}
function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}
function scalePatternForZoom(options) {
  const zoom = finite(options.zoom, "zoom");
  const referenceZoom = finite(options.referenceZoom, "referenceZoom");
  const visualSize = positive(options.visualSize, "visualSize");
  const spacing = positive(options.spacing, "spacing");
  const opticalScale = positive(options.opticalScale ?? 1, "opticalScale");
  const minReadableSize = positive(
    options.minReadableSize ?? 10,
    "minReadableSize"
  );
  const maxVisualSize = positive(
    options.maxVisualSize ?? 72,
    "maxVisualSize"
  );
  if (maxVisualSize < minReadableSize) {
    throw new RangeError("maxVisualSize must be greater than or equal to minReadableSize");
  }
  const rawScale = options.mode === "map" ? 2 ** (zoom - referenceZoom) : 1;
  const rawVisualSize = visualSize * rawScale;
  const maximumScale = maxVisualSize / visualSize;
  const scale = Math.min(rawScale, maximumScale);
  const renderedVisualSize = visualSize * scale;
  const renderedSpacing = spacing * scale;
  const fadeStart = minReadableSize * 0.5;
  const opacity = options.mode === "map" ? clamp((rawVisualSize - fadeStart) / (minReadableSize - fadeStart), 0, 1) : 1;
  return {
    scale,
    rawVisualSize,
    visualSize: renderedVisualSize,
    stampSize: renderedVisualSize / opticalScale,
    spacing: renderedSpacing,
    density: 1e4 / (renderedSpacing * renderedSpacing),
    opacity,
    capped: rawScale > maximumScale
  };
}
export {
  createMiniContext,
  createSvgScatterLayout,
  hashStringToSeed,
  makeTile,
  mulberry32,
  scalePatternForZoom,
  scatterPointsInPolygon
};
//# sourceMappingURL=core.js.map