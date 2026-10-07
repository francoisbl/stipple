import { describe, expect, it, vi } from "vitest";
import type { Map as MaplibreMap } from "maplibre-gl";
import { installPatternFills } from "../../src/maplibre/installPatternFills";
import { CANONICAL_PATTERN_METADATA_KEY } from "../../src/maplibre/patternStyle";
import {
  PATTERN_METADATA_KEY,
  patternDefinitionId,
  type GeometricPatternDefinition,
} from "../../src/maplibre/patternDefinition";

function createMapMock() {
  const images = new Set<string>();
  return {
    images,
    map: {
      hasImage: vi.fn((id: string) => images.has(id)),
      addImage: vi.fn((id: string) => images.add(id)),
      updateImage: vi.fn(),
      removeImage: vi.fn((id: string) => images.delete(id)),
      triggerRepaint: vi.fn(),
    } as unknown as MaplibreMap,
  };
}

const definition: GeometricPatternDefinition = {
  kind: "geometric",
  pattern: "hachures",
  size: 16,
  color: "#1f4e79",
  weight: 2,
  angle: 45,
};

describe("installPatternFills", () => {
  it("validates v1 metadata and installs duplicate definitions only once", async () => {
    const { map } = createMapMock();
    const imageId = patternDefinitionId(definition);
    const metadata = { [PATTERN_METADATA_KEY]: { imageId, definition } };
    const style = { layers: [{ metadata }, { metadata }] };

    await installPatternFills(map, style);
    await installPatternFills(map, style);

    expect(map.addImage).toHaveBeenCalledTimes(1);
    expect(map.updateImage).not.toHaveBeenCalled();
  });

  it("rejects conflicting definitions for one image id", async () => {
    const { map } = createMapMock();
    await expect(installPatternFills(map, {
      layers: [
        { metadata: { [PATTERN_METADATA_KEY]: { imageId: "collision", definition } } },
        {
          metadata: {
            [PATTERN_METADATA_KEY]: {
              imageId: "collision",
              definition: { ...definition, color: "#ff0000" },
            },
          },
        },
      ],
    })).rejects.toThrow(/Conflicting/);
  });

  it("installs every zoom variant", async () => {
    const { map } = createMapMock();
    await installPatternFills(map, {
      layers: [{
        metadata: {
          [PATTERN_METADATA_KEY]: {
            imageId: "z10",
            definition,
            variants: [
              { zoom: 10, imageId: "z10", definition },
              { zoom: 11, imageId: "z11", definition: { ...definition, size: 20 } },
            ],
          },
        },
      }],
    });
    expect(map.addImage).toHaveBeenCalledTimes(2);
  });

  it("installs canonical Pattern metadata alongside legacy v1 metadata", async () => {
    const { map } = createMapMock();
    await installPatternFills(map, {
      layers: [{
        metadata: {
          [CANONICAL_PATTERN_METADATA_KEY]: {
            patterns: [{
              imageId: "canonical-diamond",
              pattern: {
                version: 1,
                kind: "pattern",
                id: "diamond",
                fill: {
                  family: "glyph",
                  glyph: "diamond",
                  color: "#1f4e79",
                  size: 6,
                  rotation: 0,
                  opacity: 1,
                  placement: {
                    kind: "lattice",
                    tileSize: 24,
                    spacing: { mode: "explicit", horizontal: 12, vertical: 12 },
                    rowOffset: 0,
                    columnOffset: 0,
                    gridAngle: 0,
                    positionJitter: 0,
                    rotationJitter: 0,
                    scaleJitter: 0,
                    seed: 1,
                  },
                },
                opacity: 1,
                scale: { mode: "screen" },
                render: { pixelRatio: 1 },
              },
            }],
          },
        },
      }],
    });
    expect(map.addImage).toHaveBeenCalledTimes(1);
    expect(map.addImage).toHaveBeenCalledWith(
      "canonical-diamond",
      expect.objectContaining({ width: 24, height: 24 }),
      { pixelRatio: 1 },
    );
  });
});
