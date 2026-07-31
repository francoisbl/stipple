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
    const catalogSource = demo.match(/const SVG_PATTERN_CATALOG = \[([\s\S]*?)\n  \];/)?.[1];
    expect(objectSource).toBeDefined();
    expect(metricsSource).toBeDefined();
    expect(catalogSource).toBeDefined();

    const inline = new Map<string, string>();
    for (const match of objectSource!.matchAll(/^\s+"([^"]+)": `([\s\S]*?)`,/gm)) {
      inline.set(match[1], match[2]);
    }

    const files = new Map(patternFiles("demo/patterns").map((path) => [
      path.split("/").at(-1)!.replace(/\.svg$/, ""),
      readFileSync(path, "utf8"),
    ]));
    const selected = new Set(
      [...catalogSource!.matchAll(/value: "([^"]+)"/g)]
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

  it("clips SVG motifs at polygon boundaries by default", () => {
    expect(demo).toMatch(/state\.svgFill\.on && state\.svgFill\.noCut[\s\S]*?syncSvgIconScatterForFeature/);
    expect(demo).toMatch(/else if \(state\.svgFill\.on\)[\s\S]*?"fill-pattern": svgImageId\(id\)/);
    expect(demo).toMatch(/if \(state\.svgFill\.noCut\) syncSvgIconScatter\(\);[\s\S]*?else syncSvgTexture\(\);/);
    expect(demo).toMatch(/scaleMode:\s*style\.svgFill\.scaleMode/);
    expect(demo).toMatch(/edgeClearance:\s*true/);
    expect(demo).toContain("Symbols continue to the edge and are clipped by the boundary.");
    expect(demo).toMatch(/map\.on\("moveend"/);
  });

  it("opens common vector formats without loading every reader at startup", () => {
    expect(demo).toMatch(/id="vectorFile"[^>]*accept="[^"]*\.gpkg[^"]*\.shp[^"]*\.parquet[^"]*"[^>]*multiple/);
    expect(demo).toContain("shpjs@6.2.0");
    expect(demo).toContain("hyparquet@1.27.1");
    expect(demo).toContain("gdal3.js@2.8.1");
    expect(demo).toMatch(/await import\(SHPJS_URL\)/);
    expect(demo).toMatch(/parquetReadObjects/);
    expect(demo).toMatch(/Gdal\.ogr2ogr/);
  });

  it("places the style editor left of the map and the data panel on the right", () => {
    expect(demo).toMatch(/\.workspace \{[\s\S]*?grid-template-columns: 430px minmax\(0, 1fr\) 230px;/);
    expect(demo).toMatch(/\.layer-panel \{[\s\S]*?grid-column: 3;[\s\S]*?grid-row: 1;/);
    expect(demo).toMatch(/#panel\.control-dock \{[\s\S]*?grid-column: 1;[\s\S]*?grid-row: 1;/);
    expect(demo).toMatch(/\.map-shell \{[\s\S]*?grid-column: 2;[\s\S]*?grid-row: 1;/);
  });
});
