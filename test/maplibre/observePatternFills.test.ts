import { describe, expect, it, vi } from "vitest";
import type { Map as MaplibreMap } from "maplibre-gl";
import { observePatternFills } from "../../src/maplibre/observePatternFills";
import {
  PATTERN_METADATA_KEY,
  type GeometricPatternDefinition,
} from "../../src/maplibre/patternDefinition";

describe("observePatternFills", () => {
  it("restores missing images after style.load and disposes its listener", async () => {
    const definition: GeometricPatternDefinition = {
      kind: "geometric",
      pattern: "dots",
      size: 16,
      color: "#000000",
      weight: 2,
      angle: 0,
    };
    const style = {
      layers: [{
        metadata: {
          [PATTERN_METADATA_KEY]: { imageId: "restored", definition },
        },
      }],
    };
    const images = new Set<string>();
    let styleLoad: (() => void) | undefined;
    const map = {
      getStyle: () => style,
      hasImage: (id: string) => images.has(id),
      addImage: vi.fn((id: string) => images.add(id)),
      updateImage: vi.fn(),
      removeImage: vi.fn((id: string) => images.delete(id)),
      triggerRepaint: vi.fn(),
      on: vi.fn((_event: string, listener: () => void) => {
        styleLoad = listener;
      }),
      off: vi.fn(),
    } as unknown as MaplibreMap;

    const observer = observePatternFills(map);
    await observer.refresh();
    expect(map.addImage).toHaveBeenCalledTimes(1);

    images.clear();
    styleLoad?.();
    await vi.waitFor(() => expect(map.addImage).toHaveBeenCalledTimes(2));

    observer.dispose();
    observer.dispose();
    expect(map.off).toHaveBeenCalledTimes(1);
  });
});
