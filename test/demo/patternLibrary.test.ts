import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const demo = ["index.html", "styles.css", "patterns.js", "app.js"]
  .map((file) => readFileSync(join("demo", file), "utf8"))
  .join("\n");
const worldDemoSource = readFileSync(join("demo", "data", "world-countries.geojson"), "utf8");
const worldDemo = JSON.parse(worldDemoSource);
const worldDemoReadme = readFileSync(join("demo", "data", "README.md"), "utf8");

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
  it("links to the public npm package from the top bar", () => {
    expect(demo).toContain('href="https://www.npmjs.com/package/stipple-maplibre"');
    expect(demo).toContain('class="npm-mark"');
    expect(demo).toMatch(/class="npm-mark"[\s\S]*?fill="currentColor"/);
    expect(demo).toContain("stipple-maplibre package on npm");
    expect(demo).toContain(">Package</span>");
  });

  it("uses complete 1:50m real-country geometry for both thematic previews", () => {
    expect(worldDemo.type).toBe("FeatureCollection");
    expect(worldDemo.features.length).toBeGreaterThan(200);
    expect(worldDemoSource.length).toBeGreaterThan(2_000_000);
    expect(worldDemo.features.some((feature: { properties: { ADMIN: string } }) =>
      feature.properties.ADMIN === "France",
    )).toBe(true);
    expect(worldDemo.features.every((feature: { geometry: { type: string } }) =>
      feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon",
    )).toBe(true);
    expect(worldDemoReadme).toMatch(/Natural Earth[\s\S]*1:50m[\s\S]*public domain/);
    expect(worldDemoReadme).toMatch(/categorized and graduated[\s\S]*MultiPolygon/);
  });

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
    expect(demo).toMatch(/createPatternStyleFragment\([\s\S]*?styleToCanonicalPattern\("playground-pattern"/);
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
    expect(demo).toMatch(/GEOMETRIC_DEFAULT_TILE_SIZE\s*=\s*33/);
    expect(demo).toMatch(/tile:\s*GEOMETRIC_DEFAULT_TILE_SIZE/);
    expect(demo).toMatch(/id="tileVal">33 px/);
    expect(demo).toMatch(/id="tile"[^>]*value="33"/);
    expect(demo).toMatch(/id="geometricScaleReadout">33 px tile at every zoom/);
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
    expect(demo).toMatch(/rail-group-label" id="layersRailLabel">Layers<[\s\S]*?id="layersTrigger"[\s\S]*?rail-group-label">Data<[\s\S]*?id="importVectorRail"[\s\S]*?rail-group-label">Map<[\s\S]*?id="basemapTrigger"/);
    expect(demo).toContain('id="layersPopover"');
    expect(demo).not.toContain('id="panelTabs"');
    expect(demo).not.toContain('data-panel-body="table"');
    expect(demo).toContain('id="basemapTrigger"');
    expect(demo).toContain('id="basemapPopover"');
    expect(demo.match(/class="basemap-option" data-basemap=/g)).toHaveLength(7);
    expect(
      demo.match(/<img class="basemap-preview-image" data-basemap-preview=/g),
    ).toHaveLength(7);
    expect(demo).toMatch(/function ensureBasemapPreviews[\s\S]*?preserveDrawingBuffer:\s*true/);
    expect(demo).toContain('{ id: "basemap-positron", type: "raster", source: "positron", layout: { visibility: "none" } }');
    expect(demo).toContain('data-basemap="softblue"');
    expect(demo).toContain("Pale water, no labels");
    expect(demo).toMatch(/name === "liberty"[\s\S]*?name === "softblue" && layer\.type !== "symbol"/);
    expect(demo).toMatch(/name === "softblue" \? "#d5edf5" : libertyWaterColor/);
    expect(demo).toMatch(/name === "softblue" \? "#f8f4f0" : "#d8dfdc"/);
    expect(demo).toContain('setBasemap("softblue")');
    expect(demo).not.toContain('class="selection-dot"');
    expect(demo).toContain('id="importVectorRail"');
    expect(demo).not.toContain('id="fileMenuButton"');
    expect(demo).toMatch(/href="https:\/\/github\.com\/francoisbl\/stipple"[\s\S]*?<span>Documentation<\/span>/);
    expect(demo).not.toContain('id="helpMenu"');
    expect(demo).toMatch(/id="resourcesMenuPopover"[\s\S]*?maplibre-gl-js\/docs[\s\S]*?maplibre-style-spec[\s\S]*?maputnik\.github\.io[\s\S]*?colorbrewer2\.org[\s\S]*?arxiv\.org\/abs\/2508\.02639/);
    expect(demo).toMatch(/document\.querySelectorAll\("\.menu > \.menu-button"\)/);
    expect(demo).not.toMatch(/document\.querySelectorAll\("\.menu-button"\)/);
  });

  it("uses one predictable panel scroll instead of nested technical scrollers", () => {
    expect(demo).toContain('styles.css?v=0.8.0-categorized-randomization');
    expect(demo).toMatch(/\.panel-body \{[^}]*scrollbar-gutter: stable both-edges;/);
    expect(demo).toMatch(/\.panel-body\.inspector-scroll-mode \{[^}]*overflow-y: auto;/);
    expect(demo).toMatch(/\.panel-body\.inspector-scroll-mode > \.font-settings\.active\.active-mode \{[^}]*overflow: visible;/);
    expect(demo).toMatch(/\.panel-body\.inspector-scroll-mode > \.svg-settings\.active\.active-mode \{[^}]*overflow: visible;/);
    expect(demo).toMatch(/\.svg-settings\.active\.active-mode \.svg-layout \{[^}]*overflow: visible;/);
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
    expect(demo).toMatch(/\.tool-tab\.active \{ color: var\(--accent\); border-bottom-color: var\(--accent\); \}/);
    expect(demo).toMatch(/\.pill\.active \{ border-color: var\(--accent\); background: var\(--accent-soft\); color: var\(--accent\); \}/);
    expect(demo).toMatch(/\.motif-choice\.active \{ color: var\(--accent\); border-color: var\(--accent\); background: var\(--accent-faint\); \}/);
    expect(demo).toMatch(/class="action ghost" id="svgFillCustomApply"/);
    expect(demo).toMatch(/\.export-footer-btn \{[\s\S]*?background: var\(--ink\)/);
  });

  it("places the sample polygons in Karlsruhe", () => {
    expect(demo).toContain("const SAMPLE_CENTER = [8.425, 49.066]");
    expect(demo).toMatch(/center:\s*SAMPLE_CENTER/);
    expect(demo).toMatch(/function generateFeatures\(\)[\s\S]*?featureOrigin = \{ lng: SAMPLE_CENTER\[0\], lat: SAMPLE_CENTER\[1\] \}/);
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

  it("does not ship the temporary polygon PNG debug export", () => {
    expect(demo).not.toMatch(/exportPngDebugBtn|PNG_EXPORT_DEBUG|downloadSelectedPolygonPng/);
  });

  it("adds Pattern Set as a shared-workspace design context", () => {
    expect(demo).toMatch(/id="designContextTabs"[\s\S]*?data-design-context="pattern"[\s\S]*?data-design-context="set"[\s\S]*?data-design-context="sequence"/);
    expect(demo).toMatch(/data-design-context="pattern"[\s\S]*?Single pattern[\s\S]*?data-design-context="set"[\s\S]*?Categorized[\s\S]*?data-design-context="sequence"[\s\S]*?Graduated/);
    expect(demo).not.toContain('id="workflowQuestion"');
    expect(demo).not.toContain('id="workflowStageLabel"');
    expect(demo).toContain('id="activePatternSwatch"');
    expect(demo).toContain("const MAX_CATEGORIES = 24");
    expect(demo).toMatch(/const SET_SAMPLE_LABELS = Array\.from\(\{ length: MAX_CATEGORIES \}/);
    expect(demo).toContain('fetch("./data/world-countries.geojson", { cache: "no-store" })');
    expect(demo).toMatch(/function groupedWorldMapFeatures[\s\S]*?type: "MultiPolygon"/);
    expect(demo).toMatch(/function categorizedMapFeatures[\s\S]*?groupedWorldMapFeatures/);
    expect(demo).toMatch(/function graduatedMapFeatures\(count\)[\s\S]*?groupedWorldMapFeatures/);
    expect(demo).toMatch(/function setThematicModeAvailability[\s\S]*?button\.disabled = !available/);
    expect(demo).toMatch(/function loadDemoGeography[\s\S]*?setThematicModeAvailability\(true\)/);
    expect(demo).toMatch(/function setDesignContext[\s\S]*?worldDemoFeatures\.length < 180[\s\S]*?World map is still loading/);
    expect(demo).toMatch(/const THEMATIC_DEMO_VIEW = Object\.freeze\(\{ center: \[13, 42\], zoom: 2\.8 \}\)/);
    expect(demo).toMatch(/function fitThematicDemo\(\)[\s\S]*?map\.easeTo\([\s\S]*?THEMATIC_DEMO_VIEW\.center[\s\S]*?THEMATIC_DEMO_VIEW\.zoom/);
    expect(demo).toMatch(/function fitWorkspaceFeatures\(\)[\s\S]*?usesWorldDemo[\s\S]*?fitThematicDemo/);
    expect(demo).toMatch(/function ensurePatternSample\(\)[\s\S]*?sourceMode !== "sample"[\s\S]*?generateFeatures\(\)/);
    expect(demo).toMatch(/function setDesignContext[\s\S]*?if \(context === "pattern"\) ensurePatternSample\(\)/);
    expect(demo).toMatch(/function setDesignContext[\s\S]*?if \(context === "set"\) ensureSetSamples\(\)/);
    expect(demo).toMatch(/function updateLayersRailAvailability[\s\S]*?designContext === "pattern"[\s\S]*?layersPicker[\s\S]*?closeLayersPicker/);
    expect(demo).not.toContain('id="reloadCatalog"');
    expect(demo).toMatch(/enteringThematicDemo[\s\S]*?sourceMode === "sample"[\s\S]*?setBasemap\("softblue"\)/);
    expect(demo).toMatch(/const visibility = designContext !== "pattern" \|\| featureId === id \? "none" : "visible"/);
    expect(demo).toMatch(/const selected = designContext === "pattern" && featureId === id/);
    expect(demo).toContain('id: `${id}__selection`');
    expect(demo).toContain('id="designLegendItems"');
    expect(demo).toContain('id="designLegendRemove"');
    expect(demo).toContain('id="designLegendAdd"');
    expect(demo).toMatch(/function renderDesignLegend\(\)[\s\S]*?selectLayer\(id\)/);
    expect(demo).toMatch(/function renderDesignLegend\(\)[\s\S]*?designLegendCategoryCount[\s\S]*?designLegendSequenceCount[\s\S]*?randomizeCategoriesButton/);
    expect(demo).toMatch(/function renderDesignLegend\(\)[\s\S]*?actionsLabel\.textContent = "Single pattern"[\s\S]*?"Remove selected sample"[\s\S]*?"Add sample"[\s\S]*?actionsLabel\.textContent = "Categorized"[\s\S]*?"Remove one category"[\s\S]*?"Add category"[\s\S]*?actionsLabel\.textContent = "Graduated"[\s\S]*?"Remove one class"[\s\S]*?"Add class"/);
    expect(demo).toMatch(/function removeSelectedSample\(\)[\s\S]*?removeFeatureCompletely\(targetId\)[\s\S]*?delete FEATURES\[targetId\][\s\S]*?selectLayer\(remainingIds/);
    expect(demo).toMatch(/\$\("designLegendRemove"\)\.addEventListener\("click"[\s\S]*?removeSelectedSample\(\)[\s\S]*?setCategorizedCount\(Object\.keys\(FEATURES\)\.length - 1\)[\s\S]*?setSequenceSteps\(sequenceState\.steps - 1\)/);
    expect(demo).toMatch(/\$\("designLegendAdd"\)\.addEventListener\("click"[\s\S]*?addFeature\(\)[\s\S]*?setCategorizedCount\(Object\.keys\(FEATURES\)\.length \+ 1\)[\s\S]*?setSequenceSteps\(sequenceState\.steps \+ 1\)/);
    expect(demo).toMatch(/\.design-legend-actions \{[\s\S]*?justify-content: space-between;[\s\S]*?border-bottom: 1px solid var\(--line\);/);
    expect(demo).toMatch(/\.design-legend-tools \{[\s\S]*?display: flex;[\s\S]*?gap: 8px;/);
    expect(demo).toMatch(/\.design-legend-count \{[\s\S]*?height: 27px;[\s\S]*?margin: 0;/);
    expect(demo).toMatch(/\.design-legend-stepper \{[\s\S]*?grid-template-columns: repeat\(2, 27px\);/);
    expect(demo).toMatch(/class="design-legend-actions"[\s\S]*?id="categoryCountInput"[\s\S]*?id="sequenceSteps"[\s\S]*?class="design-legend-stepper"[\s\S]*?id="designLegendItems"/);
    expect(demo).toMatch(/\$\("activeContextLabel"\)\.textContent = designContext === "set"[\s\S]*?\? "Editing:"[\s\S]*?: designContext === "sequence"[\s\S]*?\? "Editing step:"[\s\S]*?: "Pattern:"/);
    expect(demo).toMatch(/function currentPatternSet\(\)[\s\S]*?kind: "pattern-set"[\s\S]*?styleToCanonicalPattern/);
    expect(demo).toMatch(/designContext === "set"[\s\S]*?\? currentPatternSet\(\)[\s\S]*?designContext === "sequence"[\s\S]*?\? currentGraduatedConfig\(\)[\s\S]*?: styleToCanonicalPattern\(/);
    expect(demo).not.toMatch(/designContext === "set"[\s\S]{0,80}(?:quantile|jenks|equal interval)/i);
    expect(demo).toMatch(/const FEATURE_PRESETS = \[[\s\S]*?sample: "wave-lines"[\s\S]*?sample: "grass-tuft"[\s\S]*?pattern: "solid"[\s\S]*?fontFill: \{ on: true/);
    expect(demo).toMatch(/const FEATURE_PRESETS = \[[\s\S]*?patColor: "#0b7f73"[\s\S]*?color: "#a8ddd2", opacity: 0\.98[\s\S]*?patColor: "#d96548", patOpacity: 0\.9/);
    expect(demo).toMatch(/function featureStyleFor\(index\)[\s\S]*?index >= FEATURE_PRESETS\.length[\s\S]*?FEATURE_PRESETS\[index\][\s\S]*?fontFill[\s\S]*?svgFill[\s\S]*?color: "#535b58"/);
    expect(demo).toMatch(/const CATEGORIZED_BACKGROUND_OPACITIES = \[[\s\S]*?0\.96[\s\S]*?0,[\s\S]*?0\.58/);
    expect(demo).toMatch(/function featureStyleFor\(index\)[\s\S]*?CATEGORIZED_BACKGROUND_OPACITIES\[index\][\s\S]*?style\.bg\.on = style\.bg\.opacity > 0/);
    expect(demo).not.toMatch(/FEATURE_PRESETS\[index % FEATURE_PRESETS\.length\]/);
    expect(demo).toContain('id="categoryCountInput" min="2" max="24"');
    expect(demo).not.toContain('id="decreaseCategoryCount"');
    expect(demo).not.toContain('id="increaseCategoryCount"');
    expect(demo).not.toContain('id="addCategoryButton"');
    expect(demo).not.toContain('id="removeCategoryButton"');
    expect(demo).toContain('id="randomizeCategoriesButton"');
    expect(demo).not.toContain('id="categoryControls"');
    expect(demo).toMatch(/function rebuildCategorizedSamples\(count, selectedIndex = 0, suppliedStyles = null\)[\s\S]*?categorizedMapFeatures\(count\)/);
    expect(demo).toMatch(/function setCategorizedCount\(value\)[\s\S]*?Math\.min\([\s\S]*?MAX_CATEGORIES[\s\S]*?Math\.max\(MIN_CATEGORIES[\s\S]*?rebuildCategorizedSamples\(/);
    expect(demo).toMatch(/\$\("categoryCountInput"\)\.addEventListener\("change"[\s\S]*?setCategorizedCount/);
    expect(demo).toMatch(/\$\("categoryCountInput"\)\.addEventListener\("input"[\s\S]*?Number\.isInteger[\s\S]*?setCategorizedCount/);
    expect(demo).toMatch(/const CATEGORIZED_RANDOM_FAMILIES = \[[\s\S]*?"svg"[\s\S]*?"mark"[\s\S]*?"geometric"[\s\S]*?"line"[\s\S]*?"text"/);
    expect(demo).toMatch(/const CATEGORIZED_RANDOM_SVG_SAMPLES = \[[\s\S]*?"grass-tuft"[\s\S]*?"fern"[\s\S]*?"broadleaf-outline"[\s\S]*?"conifer-outline"[\s\S]*?"forest-mixed"[\s\S]*?"palm"[\s\S]*?"pasture"[\s\S]*?"wave-lines"[\s\S]*?"droplet"[\s\S]*?"snow-ice"[\s\S]*?"fish"[\s\S]*?"gravel"[\s\S]*?"rocks"[\s\S]*?"industrial"/);
    expect(demo).toContain('const CATEGORIZED_RANDOM_TEXT_SAMPLES = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");');
    expect(demo).toMatch(/const CATEGORIZED_QUALITATIVE_COLOUR_PAIRS = \[[\s\S]*?foreground: "#216f9b"[\s\S]*?foreground: "#aa6808"[\s\S]*?foreground: "#2f854a"[\s\S]*?foreground: "#ad2d5d"/);
    expect(demo).toMatch(/function randomizedQualitativeColours\(\)[\s\S]*?shuffled\(CATEGORIZED_QUALITATIVE_COLOUR_PAIRS\)[\s\S]*?flatMap/);
    expect(demo).toMatch(/function randomizedCategorizedStyleSet\(\)[\s\S]*?CARTOGRAPHIC_PRESETS[\s\S]*?SVG_PATTERN_CATALOG[\s\S]*?visualSize: 14,[\s\S]*?spacing: 24/);
    expect(demo).toMatch(/style\.tile = CATEGORIZED_RANDOM_TILE[\s\S]*?style\.weight = CATEGORIZED_RANDOM_LINE_WEIGHT/);
    expect(demo).toMatch(/function randomizeCategorizedSamples\(\)[\s\S]*?randomizedCategorizedStyleSet\(\)[\s\S]*?categorizedCountryOrder = shuffled\(worldDemoFeatures\)[\s\S]*?rebuildCategorizedSamples\(/);
    expect(demo).toMatch(/\$\("randomizeCategoriesButton"\)\.addEventListener\("click"[\s\S]*?randomizeCategorizedSamples\(\)/);
    expect(demo).toMatch(/categoryCountInput[\s\S]*?MAX_CATEGORIES/);
  });

  it("copies complete styles between Single pattern and Categorized targets", () => {
    expect(demo).not.toContain('id="copyStyleButton"');
    expect(demo).not.toContain('id="pasteStyleButton"');
    expect(demo).not.toContain('class="style-transfer-bar"');
    expect(demo).toMatch(/let copiedStyle = null;[\s\S]*?let copiedStyleSource = "";/);
    expect(demo).toMatch(/function copySelectedStyle\(\)[\s\S]*?copiedStyle = clone\(currentStyle\(\)\)[\s\S]*?updateStyleTransferControls\(\)/);
    expect(demo).toMatch(/function pasteSelectedStyle\(\)[\s\S]*?loadStyle\(clone\(copiedStyle\)\)[\s\S]*?FEATURE_STYLES\[targetId\] = currentStyle\(\)[\s\S]*?rebuildLayers\(\)[\s\S]*?applyStateToUI\(\)/);
    expect(demo).toMatch(/function createStyleTransferControl\(label\)[\s\S]*?legend-style-transfer-trigger[\s\S]*?Copy style[\s\S]*?Paste style/);
    expect(demo).toMatch(/legend-style-transfer-trigger[\s\S]*?<rect x=\\?"2\.5\\?"[\s\S]*?<rect x=\\?"7\\?"/);
    expect(demo).not.toMatch(/legend-style-transfer-trigger[\s\S]{0,500}<path d=\\?"m11\.2 4\.8/);
    expect(demo).toMatch(/function renderDesignLegend\(\)[\s\S]*?const visible = Boolean\(state\.layer\)[\s\S]*?designContext === "pattern"[\s\S]*?createStyleTransferControl\(label\)/);
    expect(demo).toMatch(/const entries = designContext === "pattern"[\s\S]*?featureIds\.map[\s\S]*?`Sample \$\{index \+ 1\}`/);
    expect(demo).toMatch(/document\.createElement\(designContext === "sequence" \? "div" : "button"\)/);
    expect(demo).toMatch(/legend\.classList\.toggle\([\s\S]*?"single-feature"[\s\S]*?designContext === "pattern" && Object\.keys\(FEATURES\)\.length === 1/);
    expect(demo).toMatch(/\.map-legend\.pattern \{ top: 16px; left: 16px; width: 190px;/);
    expect(demo).toMatch(/\.design-legend\.pattern\.single-feature \.design-legend-item\.active[\s\S]*?border-color: transparent;[\s\S]*?box-shadow: none;/);
    expect(demo).toMatch(/\.legend-style-transfer[\s\S]*?right: 7px;[\s\S]*?\.legend-style-transfer-trigger[\s\S]*?background: transparent;[\s\S]*?border: 0;/);
    expect(demo).toMatch(/\.style-transfer-menu\[hidden\] \{ display: none; \}/);
  });

  it("derives Sequence previews from base, variation, and sparse overrides", () => {
    expect(demo).toContain('id="sequenceControls"');
    for (const id of ["sequenceSteps", "sequenceParameter", "sequenceStart", "sequenceEnd"]) {
      expect(demo).toContain(`id="${id}"`);
    }
    expect(demo).toContain('id="sequenceSteps" min="3" max="12"');
    expect(demo).toContain("const MAX_SEQUENCE_STEPS = 12");
    expect(demo).not.toContain('id="decreaseSequenceSteps"');
    expect(demo).not.toContain('id="increaseSequenceSteps"');
    expect(demo).toMatch(/function setSequenceSteps\(value\)[\s\S]*?MIN_SEQUENCE_STEPS[\s\S]*?MAX_SEQUENCE_STEPS[\s\S]*?applySequencePreview\(\)/);
    expect(demo).toContain('Background &amp; outline');
    expect(demo).toMatch(/const sequenceState = \{[\s\S]*?steps: 5,[\s\S]*?parameter: "weight"[\s\S]*?start: 1\.2,[\s\S]*?end: 10,[\s\S]*?progression: "linear"[\s\S]*?scheme: "sequential"[\s\S]*?inverted: false[\s\S]*?overrides: \{\}/);
    expect(demo).toMatch(/function sequenceValueAt\(index\)[\s\S]*?sequenceState\.overrides[\s\S]*?sequenceState\.inverted[\s\S]*?sequenceState\.scheme === "diverging"[\s\S]*?Math\.abs[\s\S]*?interpolateSequenceValue[\s\S]*?sequenceState\.progression/);
    expect(demo).toMatch(/function applySequencePreview\(\)[\s\S]*?sequenceStepForFeature[\s\S]*?applyLegacySequenceValue\(clone\(base\), sequenceValueAt\(step\)\)[\s\S]*?style\.patColor = sequenceColorAt\(step\)/);
    expect(demo).toMatch(/function currentPatternSequence\(\)[\s\S]*?base,[\s\S]*?variation:[\s\S]*?overrides:/);
    expect(demo).toMatch(/designContext === "sequence"[\s\S]*?currentGraduatedConfig\(\)/);
    expect(demo).toMatch(/function graduatedMapFeatures\(count\)[\s\S]*?"sequenceStep"/);
    expect(demo).toMatch(/progression: sequenceState\.progression[\s\S]*?visualOrder: sequenceState\.visualOrder/);
    expect(demo).toMatch(/start: 1\.2,[\s\S]*?end: 10,[\s\S]*?progression: "linear"/);
    expect(demo).toContain('`${label} selected. Every sequence step remains visible.`');
    expect(demo).not.toMatch(/(?:quantile|jenks|equal interval)/i);
  });

  it("uses visual families and progressive disclosure instead of a flat pattern catalogue", () => {
    expect(demo.match(/<button[^>]+data-pattern-family="/g)).toHaveLength(8);
    for (const family of ["solid", "dots", "stipple", "lines", "grid", "marks", "text", "svg"]) {
      expect(demo).toContain(`data-pattern-family="${family}"`);
    }
    expect(demo).not.toContain("Dot arrangement");
    expect(demo).not.toContain('data-pattern-subtypes="dots"');
    expect(demo).not.toContain('data-pattern-subtypes="grid"');
    expect(demo).toMatch(/data-pattern-subtypes="lines"[\s\S]*?data-pattern-subtypes="marks"/);
    expect(demo).toMatch(/Line style[\s\S]*?Straight lines[\s\S]*?Dashed hatch[\s\S]*?Dotted line[\s\S]*?Zigzag[\s\S]*?Wave/);
    expect(demo).not.toContain("Grid structure");
    expect(demo).not.toContain('data-cartographic-preset="brick"');
    expect(demo).toContain('id="patternFineTune"');
    expect(demo).toMatch(/\.pattern-family-preview \{[\s\S]*?height: 34px/);
    expect(demo).toMatch(/function renderCuratedPatternPreviews\(\)[\s\S]*?renderPreviewElement[\s\S]*?graduatedPresetStyle/);
    expect(demo).toMatch(/function patternSubtypePreviewStyles\(\)[\s\S]*?dashed-hatch[\s\S]*?dotted-line[\s\S]*?zigzag[\s\S]*?wave/);
    expect(demo).toMatch(/class="pattern-family-preview preview-marks"[\s\S]*?class="mark-diamond"/);
    expect(demo).toMatch(/\.preview-dots \{[\s\S]*?radial-gradient\(circle,[\s\S]*?background-size: 10px 10px/);
    expect(demo).toMatch(/class="pattern-family-preview preview-stipple"[\s\S]*?<circle cx="6" cy="6" r="1\.05"\/>[\s\S]*?<circle cx="68" cy="31" r="1\.05"\/>/);
    expect(demo).toMatch(/\.preview-marks svg \{ width: 46px; height: 16px/);
    expect(demo).toMatch(/const mark = \(cartographicPreset\)[\s\S]*?tile: 44,[\s\S]*?weight: 2\.8/);
    expect(demo).toMatch(/geometryGrid\.insertBefore\(\$\("sequenceControls"\), patternTuneBlock\)/);
    expect(demo).toMatch(/function rememberActiveStyle\([\s\S]*?scheduleDesignLegendRefresh\(\)/);
    expect(demo).toMatch(/const designWorkspaces = new Map\(\)[\s\S]*?function captureDesignWorkspace[\s\S]*?function restoreDesignWorkspace/);
    expect(demo).toMatch(/captureDesignWorkspace\(previousContext\)[\s\S]*?const savedWorkspace = designWorkspaces\.get\(context\)[\s\S]*?restoreDesignWorkspace\(savedWorkspace\)/);
    expect(demo).toMatch(/\$\("sequenceControls"\)\.prepend\(sequencePatternTitle, \$\("sequencePresetRamps"\)\)/);
    expect(demo).toMatch(/class="design-legend map-legend"[\s\S]*?id="designLegend"/);
    expect(demo).not.toMatch(/\.pill\.active::after/);
    expect(demo).toMatch(/\.pattern-family-tile\.active \{[\s\S]*?background: var\(--accent-soft\)/);
    expect(demo).not.toMatch(/box-shadow: inset 0 -2px var\(--accent\)/);
    expect(demo).toMatch(/id="angleControl"[\s\S]*?id="weightControl"[\s\S]*?id="tileControl"/);
    expect(demo).toMatch(/\$\("angleControl"\)\.hidden = !angleEnabled/);
    expect(demo).toMatch(/const preset = CARTOGRAPHIC_PRESETS\[style\.cartographicPreset\][\s\S]*?preset\?\.family === "glyph"[\s\S]*?preset\?\.family === "line"[\s\S]*?style\.pattern === "dots"/);
    expect(demo).toMatch(/focusEditor && designContext === "set"[\s\S]*?openTool\("fill"\)[\s\S]*?patternFineTune/);
  });

  it("keeps Graduated focused on curated low-to-high texture ramps", () => {
    for (const preset of [
      "dots", "hatch", "dashed", "crosshatch", "grid", "zigzag", "wave",
      "squares", "diamonds", "crosses", "chevrons", "triangles",
    ]) {
      expect(demo).toContain(`data-sequence-preset="${preset}"`);
    }
    expect(demo).not.toContain('data-sequence-preset="stipple"');
    expect(demo).toMatch(/data-sequence-preset="dots"[\s\S]*?data-sequence-preset="hatch"[\s\S]*?data-sequence-preset="dashed"[\s\S]*?data-sequence-preset="crosshatch"[\s\S]*?data-sequence-preset="grid"[\s\S]*?data-sequence-preset="zigzag"[\s\S]*?data-sequence-preset="wave"[\s\S]*?data-sequence-preset="squares"/);
    expect(demo).toMatch(/data-sequence-preset="crosses"[\s\S]*?data-sequence-preset="chevrons"[\s\S]*?data-sequence-preset="triangles"/);
    for (const parameter of ["spacing", "weight", "opacity"]) {
      expect(demo).toContain(`data-sequence-parameter="${parameter}"`);
    }
    expect(demo).not.toContain('id="sequenceStrength"');
    expect(demo).not.toMatch(/Range <span><span>Narrow<\/span><span>Full<\/span>/);
    expect(demo).toContain("Geometric · even visual steps");
    expect(demo).toMatch(/id="sequenceVariationPicker"[\s\S]*?>Weight<\/button>[\s\S]*?>Density<\/button>[\s\S]*?>Opacity<\/button>/);
    expect(demo).toMatch(/id="sequenceSchemePicker"[\s\S]*?data-sequence-scheme="sequential"[\s\S]*?data-sequence-scheme="diverging"/);
    expect(demo).toContain('id="sequenceInvertButton"');
    expect(demo).toMatch(/id="sequenceInvertButton" role="switch" aria-checked="false"/);
    expect(demo).toMatch(/sequenceInvertButton"\)\.setAttribute\("aria-checked", String\(sequenceState\.inverted\)\)/);
    expect(demo).toMatch(/id="sequenceDivergingColours"[\s\S]*?id="sequenceLowColor"[\s\S]*?id="sequenceHighColor"/);
    expect(demo).toMatch(/\.sequence-variation-picker button\.active \{ color: var\(--accent\); border-color: var\(--accent\); background: var\(--accent-soft\); \}/);
    expect(demo).not.toContain('data-sequence-preset="line-weight"');
    expect(demo).toContain('id="sequenceCustomizeToggle"');
    expect(demo).toContain('>Style all classes</button>');
    expect(demo).toContain('id="sequenceGlobalStyleNote" hidden');
    expect(demo).not.toContain('id="sequenceCustomizePanel"');
    expect(demo).not.toContain("Adjust an individual class");
    expect(demo).toMatch(/#panel\.sequence-context\.sequence-styling #geometricFieldset/);
    expect(demo).toMatch(/sequence-vary-spacing #tileControl[\s\S]*?sequence-vary-weight #weightControl[\s\S]*?sequence-vary-opacity #opacityControl/);
    expect(demo).toMatch(/function captureSequenceBaseEdit[\s\S]*?restoreLegacySequenceValue\(edited, sequenceBaseStyle\)[\s\S]*?applySequencePreview/);
    expect(demo).toMatch(/function bindColor[\s\S]*?hex\.addEventListener\("input"/);
    expect(demo).not.toMatch(/sequenceOverride|clearSequenceOverride/);
    expect(demo).toMatch(/\.map-legend\.sequence \{ width: 246px; \}/);
    expect(demo).toMatch(/\.map-legend\.set \{ width: min\(270px, calc\(100% - 32px\)\); \}/);
    expect(demo).toMatch(/canvas\.width = designContext === "sequence" \? 116 : 64/);
    expect(demo).toMatch(/canvas\.height = designContext === "sequence" \? 50 : 44/);
    expect(demo).not.toContain('id="designLegendHint"');
    expect(demo).not.toContain("Low → high");
    expect(demo).toMatch(/function applyGraduatedPreset[\s\S]*?useSequenceDefaults\(sequenceState\.parameter\)/);
    expect(demo).toMatch(/function useSequenceDefaults[\s\S]*?sequenceState\.start = preset\.start[\s\S]*?sequenceState\.end = preset\.end/);
    expect(demo).toMatch(/sequenceState\.start = 0\.06[\s\S]*?sequenceState\.end = 1/);
    expect(demo).toMatch(/preset\.weightStart[\s\S]*?preset\.weightEnd/);
    expect(demo).toMatch(/function sequenceColorAt\(index\)[\s\S]*?sequenceState\.lowColor[\s\S]*?sequenceState\.highColor/);
    expect(demo).toMatch(/function currentDivergingPatternSet\(\)[\s\S]*?kind: "pattern-set"[\s\S]*?key: step/);
    expect(demo).toMatch(/dots: \{ pattern: "dots", start: 72, end: 7, tile: 9,[\s\S]*?weightStart: 1\.2, weightEnd: 10/);
    expect(demo).toMatch(/squares: \{ pattern: "dots", cartographicPreset: "squares", start: 72, end: 7, tile: 20,[\s\S]*?weightStart: 0\.55, weightEnd: 3\.2/);
  });

  it("exposes classic cartographic presets through canonical primitives", () => {
    for (const preset of [
      "dashed-hatch", "dotted-line", "zigzag", "wave", "squares", "diamonds",
      "crosses", "x-marks", "triangles", "chevrons",
    ]) {
      expect(demo).toContain(`data-cartographic-preset="${preset}"`);
    }
    for (const internalPreset of ["dense-dots", "horizontal", "vertical", "reverse-diagonal", "offset-dots", "brick"]) {
      expect(demo).toContain(internalPreset);
    }
    expect(demo).toMatch(/function canonicalPresetPattern[\s\S]*?family: "glyph"[\s\S]*?family: "line"/);
    expect(demo).not.toMatch(/data-cartographic-preset="composite"/);
  });

  it("exports and restores all three canonical design objects", () => {
    expect(demo).toMatch(/CANONICAL_PATTERN_METADATA_KEY, createPatternTile/);
    expect(demo).toMatch(/createPatternStyleFragment, createPatternSetStyleFragment,[\s\S]*?createPatternSequenceStyleFragment/);
    expect(demo).toMatch(/function buildExportedStyle\(\)[\s\S]*?designContext === "set"[\s\S]*?createPatternSetStyleFragment\(currentPatternSet\(\), \{ property: "category" \}\)[\s\S]*?designContext === "sequence"[\s\S]*?currentGraduatedConfig\(\)[\s\S]*?createPatternSetStyleFragment\(graduated, \{ property: "step" \}\)[\s\S]*?createPatternSequenceStyleFragment\(graduated, \{ property: "step" \}\)/);
    expect(demo).toMatch(/canonical = layer\.metadata\?\.\[CANONICAL_PATTERN_METADATA_KEY\][\s\S]*?canonical\.patterns/);
    expect(demo).toMatch(/cfg\?\.kind === "pattern-set"[\s\S]*?loadCanonicalPatternSet\(cfg\)/);
    expect(demo).toMatch(/cfg\?\.kind === "pattern-sequence"[\s\S]*?loadCanonicalPatternSequence\(cfg\)/);
    expect(demo).toMatch(/cfg\?\.kind === "pattern"[\s\S]*?loadCanonicalPattern\(cfg\)/);
    expect(demo).not.toMatch(/disabled = multiPattern|introduced with the export\/API stage/);
  });

  it("does not offer a misleading standalone style.json copy", () => {
    expect(demo).not.toMatch(/id="exportBtn"|\$\("exportBtn"\)/);
    expect(demo).not.toMatch(/Copy style\.json|raw MapLibre style document/);
  });

  it("preserves the download button markup while preparing a bundle", () => {
    expect(demo).toMatch(/const title = button\.querySelector\("\.export-option-title"\)/);
    expect(demo).not.toMatch(/button\.textContent = "Preparing bundle"/);
  });

  it("copies only the layers needed by the MapLibre integration snippet", () => {
    expect(demo).toMatch(/JSON\.stringify\(\{ layers: buildExportedStyle\(\)\.layers \}, null, 2\)/);
    expect(demo).toMatch(/import \{ addPatternFill \} from "stipple-maplibre"/);
    expect(demo).toMatch(/await addPatternFill\(map, \{/);
    expect(demo).not.toMatch(/structuredClone\(exportedLayer\)/);
  });

  it("rejects the standard code export for whole-symbol SVG placement", () => {
    expect(demo).toMatch(/state\.svgFill\.on && state\.svgFill\.noCut[\s\S]*?cannot use the standard MapLibre code export/);
  });

});
