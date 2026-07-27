import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const demo = readFileSync("demo/index.html", "utf8");

function patternFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? patternFiles(path) : path.endsWith(".svg") ? [path] : [];
  });
}

function compact(svg: string): string {
  return svg.replace(/\s+/g, "");
}

describe("demo pattern library", () => {
  it("keeps the files, inline samples, and selector in sync", () => {
    const objectSource = demo.match(/const SVG_PATTERN_SAMPLES = \{([\s\S]*?)\n  \};/)?.[1];
    const metricsSource = demo.match(/const SVG_PATTERN_METRICS = \{([\s\S]*?)\n  \};/)?.[1];
    expect(objectSource).toBeDefined();
    expect(metricsSource).toBeDefined();

    const inline = new Map<string, string>();
    for (const match of objectSource!.matchAll(/^\s+"([^"]+)": `([\s\S]*?)`,/gm)) {
      inline.set(match[1], match[2]);
    }

    const files = new Map(patternFiles("demo/patterns").map((path) => [
      path.split("/").at(-1)!.replace(/\.svg$/, ""),
      readFileSync(path, "utf8"),
    ]));
    const selected = new Set(
      [...demo.matchAll(/<option value="([^"]+)">/g)]
        .map((match) => match[1])
        .filter((value) => value !== "custom"),
    );
    const metrics = new Set(
      [...metricsSource!.matchAll(/^\s+"([^"]+)": \{/gm)]
        .map((match) => match[1]),
    );

    expect([...inline.keys()].sort()).toEqual([...files.keys()].sort());
    expect([...selected].sort()).toEqual([...files.keys()].sort());
    expect([...metrics].sort()).toEqual([...files.keys()].sort());
    for (const [name, svg] of files) {
      expect(compact(inline.get(name)!)).toBe(compact(svg));
    }
  });

  it("disables MapLibre pattern cross-fading in the workshop", () => {
    expect(demo).toMatch(/new maplibregl\.Map\(\{[\s\S]*?fadeDuration:\s*0,/);
  });

  it("uses continuously scaled symbols for ground-scale SVG fills", () => {
    expect(demo).toMatch(/state\.svgFill\.noCut \|\| state\.svgFill\.scaleMode === "map"/);
    expect(demo).toMatch(/scaleMode:\s*state\.svgFill\.scaleMode/);
    expect(demo).toMatch(/edgeClearance:\s*state\.svgFill\.noCut/);
    expect(demo).not.toMatch(/map\.on\("zoomend"[\s\S]*?scaleMode === "map"[\s\S]*?syncSvgIconScatter\(\)/);
  });
});
