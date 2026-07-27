export type SmallScaleFallback = "automatic" | "solid" | "stipple" | "hide";

export interface PatternVisibilityOptions {
  mode: "screen" | "map";
  motifOpacity: number;
  featureArea?: number;
  featureMinimumSpan?: number;
  visualSize: number;
  spacing: number;
}

export interface PatternVisibilityResult {
  motif: number;
  fallback: number;
  estimatedMotifs: number | null;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function smoothstep(start: number, end: number, value: number): number {
  const position = clamp((value - start) / (end - start));
  return position * position * (3 - 2 * position);
}

/**
 * Crossfades a sparse motif into a simpler fill when the motif is no longer
 * readable or when a screen-sized feature is unlikely to contain a full mark.
 */
export function resolvePatternVisibility(
  options: PatternVisibilityOptions,
): PatternVisibilityResult {
  const motifOpacity = clamp(options.motifOpacity);
  if (options.mode === "map") {
    return {
      motif: motifOpacity,
      fallback: 1 - motifOpacity,
      estimatedMotifs: null,
    };
  }

  const area = Math.max(0, options.featureArea ?? Number.POSITIVE_INFINITY);
  const minimumSpan = Math.max(
    0,
    options.featureMinimumSpan ?? Number.POSITIVE_INFINITY,
  );
  const spacing = Math.max(1, options.spacing);
  const visualSize = Math.max(1, options.visualSize);
  const areaCapacity = area / (spacing * spacing);
  const spanCapacity = minimumSpan / visualSize;
  const estimatedMotifs = Math.min(areaCapacity, spanCapacity);
  const motif = smoothstep(0.35, 2, estimatedMotifs);

  return {
    motif,
    fallback: 1 - motif,
    estimatedMotifs,
  };
}

export function fallbackOpacity(
  fallback: SmallScaleFallback,
  visibility: number,
): number {
  const strength = fallback === "automatic"
    ? 0.28
    : fallback === "solid"
      ? 0.55
      : fallback === "stipple"
        ? 0.65
        : 0;
  return clamp(visibility) * strength;
}
