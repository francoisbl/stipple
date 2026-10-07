import { describe, expect, it } from "vitest";
import {
  createPlacementLayout,
  type PlacementLayoutOptions,
} from "../../src/engine/placementLayout";
import { createSvgScatterLayout } from "../../src/engine/svgScatterLayout";

const options: PlacementLayoutOptions = {
  tileSize: 96,
  markSize: 18,
  spacing: { mode: "density", value: 6 },
  seed: "shared-layout",
  rotationJitterDeg: 25,
  scaleJitter: 0.2,
  positionJitter: 0.3,
  distribution: "offset",
  minSpacing: 2,
};

describe("createPlacementLayout", () => {
  it("is the renderer-neutral source of the legacy SVG layout", () => {
    const generic = createPlacementLayout(options).map(({ markIndex, ...placement }) => ({
      stampIndex: markIndex,
      ...placement,
    }));
    const svg = createSvgScatterLayout({
      tileSize: options.tileSize,
      stampSize: options.markSize,
      density: 6,
      seed: options.seed,
      rotationJitterDeg: options.rotationJitterDeg,
      scaleJitter: options.scaleJitter,
      positionJitter: options.positionJitter,
      stagger: true,
      distribution: "offset",
      minSpacing: options.minSpacing,
    });
    expect(generic).toEqual(svg);
  });

  it("supports explicit horizontal and vertical spacing with lattice transforms", () => {
    const explicit: PlacementLayoutOptions = {
      ...options,
      tileSize: 120,
      markSize: 10,
      spacing: { mode: "explicit", horizontal: 30, vertical: 40 },
      positionJitter: 0,
      rotationJitterDeg: 0,
      scaleJitter: 0,
      rowOffset: 0.5,
      columnOffset: 0.25,
      gridAngle: 30,
    };
    const placements = createPlacementLayout(explicit);
    expect(placements).toEqual(createPlacementLayout(explicit));
    expect(new Set(placements.map(({ markIndex }) => markIndex)).size).toBe(12);
    expect(placements.every(({ rotationRad, scale }) => rotationRad === 0 && scale === 1)).toBe(true);
  });

  it("supports a fixed natural mark count", () => {
    const placements = createPlacementLayout({
      ...options,
      tileSize: 100,
      markSize: 2,
      spacing: { mode: "count", value: 5 },
      distribution: "natural",
      minSpacing: 0,
      scaleJitter: 0,
    });
    expect(new Set(placements.map(({ markIndex }) => markIndex)).size).toBe(5);
  });

  it("rejects count-based lattices and invalid offsets", () => {
    expect(() => createPlacementLayout({
      ...options,
      spacing: { mode: "count", value: 4 },
      distribution: "regular",
    })).toThrow(/natural/);
    expect(() => createPlacementLayout({ ...options, rowOffset: 1 })).toThrow(/rowOffset/);
  });
});
