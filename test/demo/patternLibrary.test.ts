import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const demo = ["index.html", "styles.css", "patterns.js", "app.js"]
  .map((file) => readFileSync(join("demo", file), "utf8"))
  .join("\n");

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
    const objectSource = demo.match(/const SVG_PATTERN_SAMPLES = \{([\s\S]*?)\n\s*\};/)?.[1];
    const metricsSource = demo.match(/const SVG_PATTERN_METRICS = \{([\s\S]*?)\n\s*\};/)?.[1];
    const catalogSource = demo.match(/const SVG_PATTERN_CATALOG = \[([\s\S]*?)\n\s*\];/)?.[1];
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

  it("keeps the bundled motif library monochrome and semantically focused", () => {
    const colours = new Set(
      patternFiles("demo/patterns").flatMap((path) =>
        [...readFileSync(path, "utf8").matchAll(/#[0-9a-f]{6}/gi)].map((match) => match[0].toLowerCase()),
      ),
    );
    expect([...colours]).toEqual(["#2c6a5b"]);
    expect(demo).toMatch(/resolveSvgFillSample\(\{ sample: item\.value \}, state\.patColor\)/);
    expect(demo).toMatch(/value: "broadleaf-outline"[\s\S]*?value: "conifer-outline"/);
    expect(demo).toMatch(/family: "water"[\s\S]*?value: "droplet"[\s\S]*?value: "wave-lines"[\s\S]*?value: "reeds"[\s\S]*?value: "snow-ice"[\s\S]*?value: "fish"/);
    expect(demo).toMatch(/value: "industrial"[\s\S]*?value: "house"/);
    expect(demo).toMatch(/value: "triangle"[\s\S]*?value: "hexagon"[\s\S]*?value: "confetti"[\s\S]*?value: "circle"[\s\S]*?value: "diamond"[\s\S]*?value: "star"/);
    expect(demo).not.toMatch(/value: "(?:wildflower|wet-meadow|hedge|ripple|marsh|water-lily|quarry|built-up|tractor)"/);
    expect(demo).toMatch(/id="motifFamilySelect" class="motif-family-select" aria-label="Motif category"/);
    expect(demo).toMatch(/\$\("motifFamilySelect"\)\.innerHTML = families\.map/);
    expect(demo).toMatch(/\$\("motifFamilySelect"\)\.addEventListener\("change"/);
    expect(demo).toMatch(/\.motif-family-select \{[\s\S]*?width: 100%/);
    expect(demo).not.toMatch(/<label for="motifFamilySelect">/);
    expect(demo).not.toMatch(/\.motif-family-selector/);
    expect(demo).not.toContain('id="motifFamilyTabs"');
    expect(demo).toMatch(/svgFill: \{[\s\S]*?spacing: 20,/);
    expect(demo).toMatch(/id="svgSpacing" min="16" max="140" step="1" value="20"/);
    expect(demo).toMatch(/id="motifGrid"[\s\S]*?id="svgFillCustomPanel"[\s\S]*?id="svgFillFieldset"/);
    expect(demo).toMatch(/\$\("motifGrid"\)\.hidden = customFamilyActive/);
    expect(demo).toMatch(/\.motif-grid\[hidden\] \{ display: none; \}/);
    expect(demo).toMatch(/state\.svgFill\.customSvg = svg;[\s\S]*?selectSvgSample\("custom"\)/);
    expect(demo).toMatch(/function recolorCustomSvg\(svg, color\)/);
    expect(demo).toMatch(/const paintAttributes = \["fill", "stroke", "color", "stop-color"\]/);
    expect(demo).toMatch(/svgFill\.sample === "custom"\) return recolorCustomSvg\(svgFill\.customSvg, color\)/);
    expect(demo).toMatch(/const colourEnabled = state\.svgFill\.on/);
    expect(demo).toMatch(/bindColor\("svgPatColor"[\s\S]*?if \(state\.svgFill\.on\) syncSvgFill\(\)/);

    for (const shape of ["triangle", "hexagon", "circle", "diamond", "star"]) {
      const svg = readFileSync(join("demo", "patterns", "shapes", `${shape}.svg`), "utf8");
      expect(svg).toContain('fill="#2c6a5b"');
      expect(svg).not.toContain('fill="none"');
    }
  });

  it("keeps MapLibre pattern cross-fading enabled in the workshop", () => {
    const mainMapOptions = demo.match(
      /const map = new maplibregl\.Map\(\{([\s\S]*?)\n\}\);/,
    )?.[1];
    expect(mainMapOptions).toBeDefined();
    expect(mainMapOptions).not.toMatch(/fadeDuration:\s*0/);
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

  it("preloads clipped SVG zoom variants for smooth ground scaling", () => {
    expect(demo).toMatch(/await installSvgPatternFill\(map, options\)/);
    expect(demo).toMatch(/function syncSvgGroundScaleForFeature[\s\S]*?Promise\.all\(variants\.map/);
    expect(demo).toMatch(/"fill-pattern": zoomPatternExpression\(variants\)/);
    expect(demo).toMatch(/state\.svgFill\.scaleMode === "map"[\s\S]*?syncSvgGroundScaleForFeature/);
    expect(demo).not.toMatch(/!state\.svgFill\.noCut && state\.svgFill\.scaleMode === "map"\)[\s\S]{0,80}syncSvgTexture/);
    expect(demo).not.toMatch(/screenPatternImageId/);
    expect(demo).not.toMatch(/map\.on\("zoom"/);
    expect(demo).not.toMatch(/__screen_/);
  });

  it("supports ground-scaled variants for every geometric fill", () => {
    expect(demo).toMatch(/id="geometricScaleModeSeg"[\s\S]*?data-geometric-scale-mode="map"/);
    expect(demo).toMatch(/function createGeometricZoomVariants[\s\S]*?geometricZoomStops/);
    expect(demo).toMatch(/state\.geometricScale\.mode === "map"[\s\S]*?zoomPatternExpression\(variants\)/);
    expect(demo).toMatch(/createGeometricZoomVariants\(style\)[\s\S]*?variants,/);
    expect(demo).toMatch(/data-geometric-pixel-ratio="1x"/);
    expect(demo).not.toMatch(/ZACC preset|#ff9900/);
    expect(demo).toMatch(/geometricScale:\s*\{[\s\S]*?mode:\s*"screen"[\s\S]*?pixelRatio:\s*"auto"/);
  });

  it("keeps every patterned fill legible when zoomed out", () => {
    expect(demo).toMatch(/function geometricWeight[\s\S]*?readabilityFloor[\s\S]*?Math\.max\(readableMinimum/);
    expect(demo).toMatch(/const stippleCount = style\.pattern === "stipple"[\s\S]*?style\.tile \/ 6/);
    expect(demo).toMatch(/const minimumTile = Math\.min\(style\.tile, 8\)/);
    expect(demo).toMatch(/function createFontZoomVariants[\s\S]*?effectiveFontFill/);
    expect(demo).toMatch(/id="fontScaleModeSeg"[\s\S]*?data-font-scale-mode="map"/);
    expect(demo).toMatch(/maxSpacingAtReadableFloorRatio:\s*2/);
    expect(demo).toMatch(/fontFill:\s*\{[\s\S]*?scaleMode:\s*"screen"/);
    expect(demo).toMatch(/svgFill:\s*\{[\s\S]*?scaleMode:\s*"screen"/);
  });

  it("keeps opacity visually enabled for solid fills", () => {
    expect(demo).toMatch(/<input type="range" id="patOpacity"(?![^>]*disabled)[^>]*\/?>/);
    expect(demo).not.toMatch(/\$\("textureScaleControl"\)\.classList\.toggle\("is-disabled"/);
  });

  it("uses restrained, pattern-specific defaults across the zoom range", () => {
    expect(demo).toMatch(/GEOMETRIC_DEFAULT_WEIGHTS[\s\S]*?cross:\s*1\.25/);
    expect(demo).toMatch(/horizontalSpacing:\s*26[\s\S]*?verticalSpacing:\s*22/);
    expect(demo).toMatch(/FONT_GROUND_SCALE_MAX\s*=\s*48/);
    expect(demo).toMatch(/SVG_GROUND_SCALE_MAX\s*=\s*56/);
    expect(demo).toMatch(/svgFill:\s*\{[\s\S]*?visualSize:\s*14,[\s\S]*?spacing:\s*20,/);
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

  it("reads Shapefile projection metadata as text", () => {
    expect(demo).toMatch(/for \(const extension of \["prj", "cpg"\]\)[\s\S]*?\.text\(\)/);
    expect(demo).toContain("Select its .prj file together with the .shp and .dbf files");
  });

  it("places Layers, Data and Map on the left and keeps the feature inspector on the right", () => {
    expect(demo).toMatch(/\.workspace \{[\s\S]*?grid-template-columns: 48px minmax\(280px, 1fr\) var\(--panel-width\);/);
    expect(demo).toMatch(/\.icon-rail \{[\s\S]*?grid-column: 1;[\s\S]*?grid-row: 1;/);
    expect(demo).toMatch(/\.map-shell \{[\s\S]*?grid-column: 2;[\s\S]*?grid-row: 1;/);
    expect(demo).toMatch(/\.panel-resizer \{[\s\S]*?right: var\(--panel-width\);[\s\S]*?background: transparent;/);
    expect(demo).toMatch(/\.side-panel \{[\s\S]*?grid-column: 3;[\s\S]*?grid-row: 1;/);
    expect(demo).toContain('id="panelResizer"');
    expect(demo).toContain('role="separator"');
    expect(demo).toMatch(/rail-group-label">Layers<[\s\S]*?id="layersTrigger"[\s\S]*?rail-group-label">Data<[\s\S]*?id="importVectorRail"[\s\S]*?rail-group-label">Map<[\s\S]*?id="basemapTrigger"/);
    expect(demo).toContain('id="layersPopover"');
    expect(demo).not.toContain('id="panelTabs"');
    expect(demo).not.toContain('data-panel-body="table"');
    expect(demo).toContain('id="basemapTrigger"');
    expect(demo).toContain('id="basemapPopover"');
    expect(demo.match(/class="basemap-option" data-basemap=/g)).toHaveLength(6);
    expect(
      demo.match(/<img class="basemap-preview-image" data-basemap-preview=/g),
    ).toHaveLength(6);
    expect(demo).toMatch(/function ensureBasemapPreviews[\s\S]*?preserveDrawingBuffer:\s*true/);
    expect(demo).not.toContain('class="selection-dot"');
    expect(demo).toContain('id="importVectorRail"');
    expect(demo).not.toContain('id="fileMenuButton"');
    expect(demo).toMatch(/href="https:\/\/github\.com\/francoisbl\/stipple"[\s\S]*?<span>Documentation<\/span>/);
    expect(demo).not.toContain('id="helpMenu"');
    expect(demo).toMatch(/id="resourcesMenuPopover"[\s\S]*?maplibre-gl-js\/docs[\s\S]*?maplibre-style-spec[\s\S]*?maputnik\.github\.io/);
    expect(demo).toMatch(/document\.querySelectorAll\("\.menu > \.menu-button"\)/);
    expect(demo).not.toMatch(/document\.querySelectorAll\("\.menu-button"\)/);
  });

  it("keeps scrollbar gutters inside the Font and SVG inspectors", () => {
    expect(demo).not.toMatch(/\.panel-body \{[^}]*scrollbar-gutter/);
    expect(demo).toMatch(/\.panel-body\.inspector-scroll-mode \{[^}]*overflow: hidden;/);
    expect(demo).toMatch(/\.panel-body\.inspector-scroll-mode > \.font-settings\.active\.active-mode,[\s\S]*?\.svg-settings\.active\.active-mode \{[^}]*overflow-y: auto;[^}]*scrollbar-gutter: stable;/);
    expect(demo).toMatch(/activeTool === "fill" && \(state\.fontFill\.on \|\| state\.svgFill\.on\)/);
  });

  it("presents SVG and Font settings as compact tabbed inspectors", () => {
    expect(demo).toMatch(/id="svgInspectorTabs" role="tablist"/);
    expect(demo).toMatch(/id="fontInspectorTabs" role="tablist"/);
    expect(demo).toMatch(/data-font-section-tab="type"[\s\S]*?data-font-section-tab="spacing"[\s\S]*?data-font-section-tab="layout"/);
    expect(demo).toMatch(/\.svg-inspector-tabs,[\s\S]*?\.font-inspector-tabs \{[\s\S]*?grid-template-columns: repeat\(3,/);
    expect(demo).toMatch(/function openFontInspectorSection[\s\S]*?aria-selected/);
    expect(demo).not.toMatch(/\.svg-settings,[\s\S]*?\.font-settings \{[^}]*border-top/);
    expect(demo).toMatch(/\.svg-inspector-tab\.active,[\s\S]*?\.font-inspector-tab\.active \{ color: var\(--accent\); background: var\(--accent-soft\); border-color: var\(--accent\); \}/);
    expect(demo).toMatch(/\.seg button\.active \{ border-color: var\(--accent\); background: var\(--accent-faint\); color: var\(--accent\); \}/);
    expect(demo).toMatch(/\.tool-tab\.active \{ color: #fff; background: var\(--accent\); border-color: var\(--accent\); \}/);
    expect(demo).toMatch(/\.pill\.active \{ border-color: var\(--accent\); background: var\(--accent-soft\); color: var\(--accent\); \}/);
    expect(demo).toMatch(/\.motif-choice\.active \{ color: var\(--accent\); border-color: var\(--accent\); background: var\(--accent-faint\); \}/);
    expect(demo).toMatch(/class="action ghost" id="svgFillCustomApply"/);
    expect(demo).toMatch(/\.export-footer-btn \{[\s\S]*?background: var\(--ink\)/);
  });

  it("places the sample polygons in Karlsruhe", () => {
    expect(demo).toContain("const SAMPLE_CENTER = [8.425, 49.066]");
    expect(demo).toMatch(/center:\s*SAMPLE_CENTER/);
    expect(demo).toMatch(/const SAMPLE_GRID_COLUMNS = 5/);
    expect(demo).toMatch(/points\.push\(\[col, -row\]\);[\s\S]*?return points;/);
    expect(demo).not.toMatch(/return points\.sort/);
  });

  it("keeps map controls compact and unambiguous", () => {
    expect(demo).toMatch(/attributionControl:\s*false/);
    expect(demo).toMatch(/new maplibregl\.ScaleControl[\s\S]*?new maplibregl\.AttributionControl/);
    expect(demo).toMatch(/new maplibregl\.AttributionControl\(\{ compact: true \}\)/);
    expect(demo).toMatch(/function collapseMapAttribution[\s\S]*?classList\.remove\("maplibregl-compact-show"\)[\s\S]*?removeAttribute\("open"\)/);
    expect(demo).toMatch(/id="compassBtn"[^>]*hidden/);
    expect(demo).toMatch(/\.map-ctrl-btn\[hidden\] \{ display: none; \}/);
    expect(demo).toMatch(/map\.on\("rotate", syncCompassControl\)/);
    expect(demo).toMatch(/map\.on\("pitch", syncCompassControl\)/);
    expect(demo).toMatch(/id="locateBtn"[^>]*title="Fit polygons"/);
    expect(demo).toMatch(/\.map-controls-bl \{ left: auto; right: 12px; top: 12px; bottom: auto; \}/);
    expect(demo).toMatch(/\.map-ctrl-zoom,[\s\S]*?\.map-ctrl-compass \{ display: none; \}/);
  });

  it("gates the temporary transparent PNG export behind a debug query", () => {
    expect(demo).toMatch(/app\.type = "module"/);
    expect(demo).toMatch(/id="exportPngDebugBtn" hidden/);
    expect(demo).toMatch(/PNG_EXPORT_DEBUG = new URLSearchParams\(window\.location\.search\)\.get\("debug"\) === "png"/);
    expect(demo).toMatch(/PNG_EXPORT_DEBUG \? \{ canvasContextAttributes: \{ preserveDrawingBuffer: true \} \} : \{\}/);
    expect(demo).toMatch(/async function downloadSelectedPolygonPng\(\)/);
    expect(demo).toMatch(/layer\.id\.startsWith\(selectedPrefix\)[\s\S]*?: "none"/);
    expect(demo).toMatch(/map\.setPixelRatio\(Math\.max\(2, previousPixelRatio\)\)/);
    expect(demo).toMatch(/context\.drawImage\(sourceCanvas, sx, sy, sw, sh, 0, 0, sw, sh\)/);
    expect(demo).toMatch(/if \(PNG_EXPORT_DEBUG\) \$\("exportPngDebugBtn"\)\.hidden = false/);
  });
});
