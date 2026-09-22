import { describe, expect, it, vi } from "vitest";
import type { Map as MaplibreMap } from "maplibre-gl";
import { installPatternFills } from "../../src/maplibre/installPatternFills";
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
});
