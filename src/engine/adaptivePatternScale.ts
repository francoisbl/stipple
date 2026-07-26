export interface AdaptivePatternScaleOptions {
  polygonSize: number;
  stampSize: number;
  density: number;
  minSpacing?: number;
  minimumStampSize?: number;
  targetSymbolsAcross?: number;
  maxDensity?: number;
}

export interface AdaptivePatternScaleResult {
  scale: number;
  stampSize: number;
  density: number;
  minSpacing: number;
  opacity: number;
}

function positive(value: number, name: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be greater than 0`);
  }
  return value;
}

export function adaptivePatternScale(
  options: AdaptivePatternScaleOptions,
): AdaptivePatternScaleResult {
  const polygonSize = Math.max(0, Number(options.polygonSize) || 0);
  const stampSize = positive(options.stampSize, "stampSize");
  const density = positive(options.density, "density");
  const minSpacing = Math.max(0, Number(options.minSpacing) || 0);
  const minimumStampSize = positive(
    options.minimumStampSize ?? 6,
    "minimumStampSize",
  );
  const targetSymbolsAcross = positive(
    options.targetSymbolsAcross ?? 5,
    "targetSymbolsAcross",
  );
  const maxDensity = positive(options.maxDensity ?? 16, "maxDensity");

  const minimumScale = Math.min(1, minimumStampSize / stampSize);
  const targetScale = Math.min(
    1,
    polygonSize / (stampSize * targetSymbolsAcross),
  );
  const scale = Math.max(minimumScale, targetScale);
  const fittedMinimumStamp = stampSize * minimumScale;
  const fadeStart = fittedMinimumStamp * 1.5;
  const fadeEnd = fittedMinimumStamp * 5;
  const opacity = Math.max(
    0,
    Math.min(1, (polygonSize - fadeStart) / (fadeEnd - fadeStart)),
  );

  return {
    scale,
    stampSize: stampSize * scale,
    density: Math.min(maxDensity, density / (scale * scale)),
    minSpacing: minSpacing * scale,
    opacity,
  };
}
