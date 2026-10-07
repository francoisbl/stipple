import {
  createPlacementLayout,
  type PlacementDistribution,
} from "./placementLayout";

/** @deprecated Prefer the renderer-neutral PlacementDistribution name. */
export type SvgDistributionMode = PlacementDistribution;

export interface SvgScatterLayoutOptions {
  tileSize: number;
  stampSize: number;
  density: number;
  seed: number | string;
  rotationJitterDeg: number;
  scaleJitter: number;
  positionJitter: number;
  stagger: boolean;
  /** Placement logic. Defaults to offset when stagger is true, regular otherwise. */
  distribution?: SvgDistributionMode;
  /** Minimum visible gap between stamps in natural mode, in layout px. Default 0. */
  minSpacing?: number;
}

export interface SvgStampPlacement {
  /** Stable index shared by a logical stamp and all of its wrapped copies. */
  stampIndex: number;
  x: number;
  y: number;
  rotationRad: number;
  scale: number;
}

/**
 * Compatibility wrapper around the renderer-neutral placement engine.
 * Existing SVG callers retain their names and exact deterministic layout.
 */
export function createSvgScatterLayout(options: SvgScatterLayoutOptions): SvgStampPlacement[] {
  const distribution = options.distribution ?? (options.stagger ? "offset" : "regular");
  return createPlacementLayout({
    tileSize: options.tileSize,
    markSize: options.stampSize,
    spacing: { mode: "density", value: options.density },
    seed: options.seed,
    rotationJitterDeg: options.rotationJitterDeg,
    scaleJitter: options.scaleJitter,
    // Legacy regular SVG layouts ignored position jitter.
    positionJitter: distribution === "regular" ? 0 : options.positionJitter,
    distribution,
    minSpacing: options.minSpacing,
  }).map(({ markIndex, ...placement }) => ({
    stampIndex: markIndex,
    ...placement,
  }));
}
