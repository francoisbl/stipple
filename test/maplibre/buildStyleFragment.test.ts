import { describe, expect, it } from "vitest";
import { buildStyleFragment } from "../../src/maplibre/buildStyleFragment";
import {
  PATTERN_METADATA_KEY,
  parsePatternMetadata,
} from "../../src/maplibre/patternDefinition";

function fragment(source: string) {
  return buildStyleFragment({
    source,
    sourceLayer: source,
    pattern: {
      pattern: "hachures",
      tile: 16,
      color: "#1f4e79",
      opacity: 1,
      weight: 2,
      angle: 45,
    },
  });
}

describe("buildStyleFragment v1 metadata", () => {
  it("uses one deterministic image id for equivalent definitions", () => {
    const firstLayer = fragment("first").layers[0];
    const secondLayer = fragment("second").layers[0];
    const first = parsePatternMetadata(
      (firstLayer.metadata as Record<string, unknown>)[PATTERN_METADATA_KEY],
    );
    const second = parsePatternMetadata(
      (secondLayer.metadata as Record<string, unknown>)[PATTERN_METADATA_KEY],
    );

    expect(first.imageId).toBe(second.imageId);
    expect((firstLayer.paint as Record<string, unknown>)["fill-pattern"]).toBe(first.imageId);
  });
});
