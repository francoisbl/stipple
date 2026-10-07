import {
  createPlacementLayout,
  type MarkPlacement,
  type PlacementSpacing,
} from "../engine/placementLayout";
import type { PatternPlacement } from "./pattern";

/** Resolves canonical placement configuration into renderer-neutral marks. */
export function materializePatternPlacement(
  placement: PatternPlacement,
  markSize: number,
): MarkPlacement[] {
  if (placement.kind === "natural") {
    let spacing: PlacementSpacing;
    if (placement.count !== undefined && placement.density === undefined) {
      spacing = { mode: "count", value: placement.count };
    } else if (placement.density !== undefined && placement.count === undefined) {
      spacing = { mode: "density", value: placement.density };
    } else {
      throw new TypeError("natural placement must specify exactly one of density or count");
    }
    return createPlacementLayout({
      tileSize: placement.tileSize,
      markSize,
      spacing,
      seed: placement.seed,
      rotationJitterDeg: placement.rotationJitter,
      scaleJitter: placement.scaleJitter,
      positionJitter: placement.positionJitter,
      distribution: "natural",
      minSpacing: placement.minSpacing,
    });
  }

  const distribution = placement.rowOffset !== 0 || placement.columnOffset !== 0
    ? "offset"
    : "regular";
  return createPlacementLayout({
    tileSize: placement.tileSize,
    markSize,
    spacing: placement.spacing.mode === "density"
      ? { mode: "density", value: placement.spacing.value }
      : {
          mode: "explicit",
          horizontal: placement.spacing.horizontal,
          vertical: placement.spacing.vertical,
        },
    seed: placement.seed,
    rotationJitterDeg: placement.rotationJitter,
    scaleJitter: placement.scaleJitter,
    positionJitter: placement.positionJitter,
    distribution,
    rowOffset: placement.rowOffset,
    columnOffset: placement.columnOffset,
    gridAngle: placement.gridAngle,
  });
}
