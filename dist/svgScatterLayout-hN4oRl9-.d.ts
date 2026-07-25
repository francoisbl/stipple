type SvgDistributionMode = "regular" | "offset" | "natural";
interface SvgScatterLayoutOptions {
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
interface SvgStampPlacement {
    /** Stable index shared by a logical stamp and all of its wrapped copies. */
    stampIndex: number;
    x: number;
    y: number;
    rotationRad: number;
    scale: number;
}
/**
 * Builds the pure geometry for a seamless SVG scatter tile.
 *
 * Every placement sharing a `stampIndex` has the exact same rotation and
 * scale. Wrapped copies therefore reproduce the same logical stamp on the
 * opposite edge instead of consuming new random transforms.
 */
declare function createSvgScatterLayout(options: SvgScatterLayoutOptions): SvgStampPlacement[];

export { type SvgDistributionMode as S, type SvgScatterLayoutOptions as a, type SvgStampPlacement as b, createSvgScatterLayout as c };
