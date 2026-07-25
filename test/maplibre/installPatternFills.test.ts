import { describe, expect, it, vi } from "vitest";
import type { Map as MaplibreMap } from "maplibre-gl";
import { installPatternFills } from "../../src/maplibre/installPatternFills";
import {
  LEGACY_PATTERN_METADATA_KEY,
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

  it("continues to read legacy geometric metadata during migration", async () => {
    const { map } = createMapMock();
    await installPatternFills(map, {
      layers: [{
        metadata: {
          [LEGACY_PATTERN_METADATA_KEY]: {
            type: "dots",
            tile: 16,
            color: "#000000",
            weight: 2,
            angle: 0,
            imageId: "legacy",
          },
        },
      }],
    });
    expect(map.addImage).toHaveBeenCalledWith(
      "legacy",
      expect.objectContaining({ width: 16, height: 16 }),
    );
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
});
