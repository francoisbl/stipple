import { describe, expect, it, vi } from "vitest";
import type { Map as MaplibreMap } from "maplibre-gl";
import { syncPatternTexture } from "../../src/maplibre/syncPatternTexture";

describe("syncPatternTexture", () => {
  it("updates an installed image when only the stipple layout changes", () => {
    let installed = false;
    const map = {
      hasImage: vi.fn(() => installed),
      addImage: vi.fn(() => { installed = true; }),
      updateImage: vi.fn(),
      removeImage: vi.fn(() => { installed = false; }),
      triggerRepaint: vi.fn(),
    } as unknown as MaplibreMap;
    const options = {
      imageId: "stipple",
      pattern: "stipple" as const,
      size: 16,
      color: "#1f4e79",
      weight: 2,
      angle: 0,
      pixelRatio: 1,
    };

    syncPatternTexture(map, { ...options, stippleLayout: "seeded" });
    syncPatternTexture(map, { ...options, stippleLayout: "seeded" });
    syncPatternTexture(map, { ...options, stippleLayout: "staggered" });

    expect(map.addImage).toHaveBeenCalledTimes(1);
    expect(map.updateImage).toHaveBeenCalledTimes(1);
    expect(map.triggerRepaint).toHaveBeenCalledTimes(2);
  });
});
