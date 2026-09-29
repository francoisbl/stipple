export type PatternScaleMode = "screen" | "map";

export interface PatternScaleOptions {
  mode: PatternScaleMode;
  zoom: number;
  referenceZoom: number;
  visualSize: number;
  spacing: number;
  opticalScale?: number;
  minReadableSize?: number;
  maxVisualSize?: number;
  /**
   * When a map-scaled motif reaches its readable-size floor, cap the spacing
   * to this multiple of the visible motif size. This keeps small polygons
   * from becoming empty while preserving the configured spacing at normal
   * and close zooms.
   */
  maxSpacingAtReadableFloorRatio?: number;
}

export interface PatternScaleResult {
  scale: number;
  rawVisualSize: number;
  visualSize: number;
  stampSize: number;
  spacing: number;
  density: number;
  opacity: number;
  floored: boolean;
  capped: boolean;
}

function finite(value: number, name: string): number {
  if (!Number.isFinite(value)) throw new TypeError(`${name} must be finite`);
  return value;
}

function positive(value: number, name: string): number {
  finite(value, name);
  if (value <= 0) throw new RangeError(`${name} must be greater than 0`);
  return value;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

/**
 * Resolves a pattern at a given zoom without using feature dimensions.
 *
 * Screen mode keeps visual size and spacing in pixels. Map mode treats the
 * configured values as the appearance at referenceZoom, then doubles them for
 * every zoom level in. Map-scaled motifs stop shrinking at their minimum
 * readable size and stop growing at maxVisualSize.
 */
export function scalePatternForZoom(
  options: PatternScaleOptions,
): PatternScaleResult {
  const zoom = finite(options.zoom, "zoom");
  const referenceZoom = finite(options.referenceZoom, "referenceZoom");
  const visualSize = positive(options.visualSize, "visualSize");
  const spacing = positive(options.spacing, "spacing");
  const opticalScale = positive(options.opticalScale ?? 1, "opticalScale");
  const minReadableSize = positive(
    options.minReadableSize ?? 10,
    "minReadableSize",
  );
  const maxVisualSize = positive(
    options.maxVisualSize ?? 72,
    "maxVisualSize",
  );
  const maxSpacingAtReadableFloorRatio = options.maxSpacingAtReadableFloorRatio === undefined
    ? undefined
    : positive(
      options.maxSpacingAtReadableFloorRatio,
      "maxSpacingAtReadableFloorRatio",
    );
  if (maxVisualSize < minReadableSize) {
    throw new RangeError("maxVisualSize must be greater than or equal to minReadableSize");
  }

  const rawScale = options.mode === "map"
    ? 2 ** (zoom - referenceZoom)
    : 1;
  const rawVisualSize = visualSize * rawScale;
  const minimumVisualSize = Math.min(visualSize, minReadableSize);
  const minimumScale = minimumVisualSize / visualSize;
  const maximumScale = maxVisualSize / visualSize;
  const scale = clamp(rawScale, minimumScale, maximumScale);
  const renderedVisualSize = visualSize * scale;
  let renderedSpacing = spacing * scale;
  if (
    maxSpacingAtReadableFloorRatio !== undefined &&
    rawScale <= minimumScale
  ) {
    renderedSpacing = Math.min(
      renderedSpacing,
      renderedVisualSize * maxSpacingAtReadableFloorRatio,
    );
  }

  return {
    scale,
    rawVisualSize,
    visualSize: renderedVisualSize,
    stampSize: renderedVisualSize / opticalScale,
    spacing: renderedSpacing,
    density: 10_000 / (renderedSpacing * renderedSpacing),
    opacity: 1,
    floored: rawScale < minimumScale,
    capped: rawScale > maximumScale,
  };
}
