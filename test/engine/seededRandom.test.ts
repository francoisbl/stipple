import { describe, expect, it } from "vitest";
import { hashStringToSeed, mulberry32 } from "../../src/engine/seededRandom";

describe("seeded random helpers", () => {
  it("replays the same sequence for the same numeric seed", () => {
    const first = mulberry32(42);
    const second = mulberry32(42);
    expect(Array.from({ length: 8 }, first)).toEqual(Array.from({ length: 8 }, second));
  });

  it("produces stable and distinguishable string seeds", () => {
    expect(hashStringToSeed("parcel-42")).toBe(hashStringToSeed("parcel-42"));
    expect(hashStringToSeed("parcel-42")).not.toBe(hashStringToSeed("parcel-43"));
  });
});
