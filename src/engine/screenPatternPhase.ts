export interface ScreenPatternPhase {
  index: number;
  pixelRatioScale: number;
}

/**
 * Chooses a preloaded image scale that counters MapLibre's fractional-zoom
 * scaling of fill patterns. The image changes only a few times per zoom level,
 * while the SVG tile itself stays cached.
 */
export function screenPatternPhase(
  zoom: number,
  steps = 8,
): ScreenPatternPhase {
  if (!Number.isFinite(zoom)) {
    throw new TypeError("zoom must be a finite number");
  }
  if (!Number.isInteger(steps) || steps < 1) {
    throw new RangeError("steps must be a positive integer");
  }
  const fraction = zoom - Math.floor(zoom);
  const index = Math.min(steps, Math.round(fraction * steps));
  return {
    index,
    pixelRatioScale: 2 ** (index / steps),
  };
}
