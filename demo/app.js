(async () => {
// UI controls for the browser bundle built in ../dist.

const {
  makeTile, syncPatternTexture, buildStyleFragment,
  installSvgPatternFill, installSvgIconScatter,
  createSvgPatternDefinition, createSvgScatterTile,
  installFontPatternFill, createFontPatternDefinition, createFontPatternTile,
  scalePatternForZoom,
  importGeoJsonPolygons, patternDefinitionId, PATTERN_METADATA_KEY,
  parsePattern, parsePatternSet, patternFromLegacyDefinition, patternToLegacyDefinition,
  interpolateSequenceValue, parsePatternSequence,
  CANONICAL_PATTERN_METADATA_KEY, createPatternTile, installPatternTexture,
  createPatternStyleFragment, createPatternSetStyleFragment,
  createPatternSequenceStyleFragment,
} = window.MaplibrePatternFills;
const DASH_PRESETS = {
  solid: [],
  dotted: [1, 2],
  dashdot: [4, 2, 1, 2],
};
const GEOMETRIC_DEFAULT_WEIGHTS = Object.freeze({
  solid: 2,
  stipple: 2,
  hachures: 2,
  cross: 1.25,
  grid: 2,
  dots: 2,
});
const FONT_GROUND_SCALE_MAX = 48;
const SVG_GROUND_SCALE_MAX = 56;
const GEOMETRIC_DEFAULT_TILE_SIZE = 33;
const CARTOGRAPHIC_PRESETS = Object.freeze({
  "dense-dots": { family: "glyph", glyph: "circle", angle: 0, rowOffset: 0.5, spacingRatio: 0.34 },
  horizontal: { family: "line", shape: "straight", angle: 0 },
  vertical: { family: "line", shape: "straight", angle: 90 },
  "reverse-diagonal": { family: "line", shape: "straight", angle: -45 },
  "dashed-hatch": { family: "line", shape: "dashed" },
  "dotted-line": { family: "line", shape: "dashed", dashStyle: "dotted" },
  zigzag: { family: "line", shape: "zigzag" },
  wave: { family: "line", shape: "wave" },
  squares: { family: "glyph", glyph: "square", angle: 0 },
  diamonds: { family: "glyph", glyph: "diamond", angle: 0 },
  crosses: { family: "glyph", glyph: "plus", angle: 0 },
  "x-marks": { family: "glyph", glyph: "x", angle: 0 },
  triangles: { family: "glyph", glyph: "triangle", angle: 0 },
  chevrons: { family: "glyph", glyph: "chevron", angle: 0 },
  "offset-dots": { family: "glyph", glyph: "circle", angle: 0, rowOffset: 0.5 },
  brick: { family: "glyph", glyph: "square", angle: 0, rowOffset: 0.5, columnOffset: 0.5 },
});
const GRADUATED_PRESETS = Object.freeze({
  dots: { pattern: "dots", start: 72, end: 7, tile: 9, weight: 5.2, weightStart: 1.2, weightEnd: 10 },
  hatch: { pattern: "hachures", start: 72, end: 7, tile: 18, weight: 1.65, weightStart: 0.45, weightEnd: 4.4, angle: 45 },
  dashed: { pattern: "hachures", cartographicPreset: "dashed-hatch", start: 72, end: 7, tile: 18, weight: 1.65, weightStart: 0.45, weightEnd: 4.4, angle: 45 },
  crosshatch: { pattern: "cross", start: 76, end: 8, tile: 18, weight: 1.35, weightStart: 0.4, weightEnd: 3.8, angle: 45 },
  grid: { pattern: "grid", start: 72, end: 7, tile: 17, weight: 1.35, weightStart: 0.4, weightEnd: 3.8, angle: 0 },
  zigzag: { pattern: "hachures", cartographicPreset: "zigzag", start: 72, end: 8, tile: 20, weight: 1.55, weightStart: 0.45, weightEnd: 4.2, angle: 0 },
  wave: { pattern: "hachures", cartographicPreset: "wave", start: 72, end: 8, tile: 20, weight: 1.55, weightStart: 0.45, weightEnd: 4.2, angle: 0 },
  squares: { pattern: "dots", cartographicPreset: "squares", start: 72, end: 7, tile: 20, weight: 2, weightStart: 0.55, weightEnd: 3.2, angle: 0 },
  diamonds: { pattern: "dots", cartographicPreset: "diamonds", start: 72, end: 7, tile: 20, weight: 2.6, weightStart: 0.65, weightEnd: 7.8, angle: 0 },
  crosses: { pattern: "dots", cartographicPreset: "crosses", start: 72, end: 7, tile: 20, weight: 2.4, weightStart: 0.6, weightEnd: 7.2, angle: 0 },
  chevrons: { pattern: "dots", cartographicPreset: "chevrons", start: 72, end: 7, tile: 20, weight: 2, weightStart: 0.55, weightEnd: 3.2, angle: 0 },
  triangles: { pattern: "dots", cartographicPreset: "triangles", start: 72, end: 7, tile: 20, weight: 2.4, weightStart: 0.6, weightEnd: 7.2, angle: 0 },
});

const $ = (id) => document.getElementById(id);
const geometryGrid = document.querySelector("#geometricFieldset .geometry-grid");
const patternTuneBlock = geometryGrid.querySelector(".pattern-tune-block");
geometryGrid.insertBefore($("sequenceControls"), patternTuneBlock);
const sequencePatternTitle = $("sequenceControls").querySelector(".sequence-pattern-title");
$("sequenceControls").prepend(sequencePatternTitle, $("sequencePresetRamps"));
const toast = (msg) => {
  const t = $("toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 1600);
};

let activeMotifFamily = "vegetation";
let designContext = "pattern";
let copiedStyle = null;
let copiedStyleSource = "";
const DEFAULT_CATEGORY_COUNT = 11;
const MIN_CATEGORIES = 2;
const MAX_CATEGORIES = 24;
const SET_SAMPLE_LABELS = Array.from({ length: MAX_CATEGORIES }, (_, index) =>
  `Category ${String.fromCharCode(65 + index)}`,
);
const SEQUENCE_SAMPLE_LABELS = ["Very low", "Low", "Medium", "High", "Very high"];
let worldDemoFeatures = [];
const sequenceState = {
  steps: 5,
  parameter: "weight",
  start: 1.2,
  end: 10,
  progression: "linear",
  visualOrder: "low-to-high",
  scheme: "sequential",
  inverted: false,
  lowColor: "#2f6fa3",
  highColor: "#b33d52",
  overrides: {},
};
let sequenceBaseStyle = null;
let updatingSequencePreview = false;
let sequencePresetId = "dots";
let sequenceStyling = false;
const THEMATIC_DEMO_VIEW = Object.freeze({ center: [13, 42], zoom: 2.8 });
const MIN_SEQUENCE_STEPS = 3;
const MAX_SEQUENCE_STEPS = 12;

function setThematicModeAvailability(available) {
  document.querySelectorAll('[data-design-context="set"], [data-design-context="sequence"]')
    .forEach((button) => {
      button.disabled = !available;
      button.title = available ? "" : "Loading world map…";
    });
}

setThematicModeAvailability(false);

function graduatedLabels(count, visualOrder = "low-to-high") {
  const labels = count === 3
    ? ["Low", "Medium", "High"]
    : count === 4
      ? ["Very low", "Low", "High", "Very high"]
      : count === 5
        ? [...SEQUENCE_SAMPLE_LABELS]
        : Array.from({ length: count }, (_, index) => {
            if (index === 0) return "Very low";
            if (index === count - 1) return "Very high";
            return `Level ${index + 1}`;
          });
  return visualOrder === "high-to-low" ? labels.reverse() : labels;
}

async function loadDemoGeography() {
  const countriesResponse = await fetch("./data/world-countries.geojson", { cache: "no-store" });
  if (!countriesResponse.ok) {
    throw new Error("Demo geography could not be loaded");
  }
  const countries = await countriesResponse.json();
  worldDemoFeatures = countries.features.filter((feature) =>
    feature.geometry && feature.properties?.ADMIN !== "Antarctica",
  );
  if (worldDemoFeatures.length < 180) {
    throw new Error("The built-in world geography is incomplete");
  }
  setThematicModeAvailability(true);
}

function featurePolygons(feature) {
  if (feature.geometry.type === "Polygon") return [feature.geometry.coordinates];
  if (feature.geometry.type === "MultiPolygon") return feature.geometry.coordinates;
  return [];
}

function groupedWorldMapFeatures(count, labels, propertyName, features = worldDemoFeatures) {
  if (worldDemoFeatures.length < 180) {
    throw new Error("The built-in world geography is incomplete");
  }
  const groups = Array.from({ length: count }, () => ({ polygons: [], countries: [] }));
  features.forEach((feature, index) => {
    const group = groups[index % count];
    group.polygons.push(...featurePolygons(feature));
    group.countries.push(feature.properties?.ADMIN || feature.properties?.NAME || `Country ${index + 1}`);
  });
  return groups.map((group, index) => ({
    type: "Feature",
    geometry: { type: "MultiPolygon", coordinates: group.polygons },
    properties: {
      name: labels[index],
      [propertyName]: propertyName === "sequenceStep" ? index : labels[index],
      countries: group.countries,
    },
  }));
}

function graduatedMapFeatures(count) {
  return groupedWorldMapFeatures(count, graduatedLabels(count), "sequenceStep");
}

function categorizedMapFeatures(count = SET_SAMPLE_LABELS.length) {
  return groupedWorldMapFeatures(
    count,
    SET_SAMPLE_LABELS.slice(0, count),
    "category",
    categorizedCountryOrder || worldDemoFeatures,
  );
}


// State, serializable as-is as a preset config.
const state = {
  layer: null,             // { source }, id of the selected GeoJSON test source
  pattern: "stipple",      // solid | stipple | hachures | cross | grid | dots
  cartographicPreset: null, // curated canonical glyph/line preset, when selected
  angle: 45,
  patColor: "#2c6a5b",
  patOpacity: 1,
  weight: 2,
  tile: GEOMETRIC_DEFAULT_TILE_SIZE,
  geometricScale: {
    mode: "screen",
    referenceZoom: 12,
    pixelRatio: "auto",
  },
  bg: { on: true, color: "#dce8e3", opacity: 0.35 },
  outline: { on: true, color: "#234c46", width: 1.5, dash: [] },
  fontFill: {
    on: false,
    text: "A",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 18,
    fontWeight: "500",
    fontStyle: "normal",
    letterSpacing: 0,
    horizontalSpacing: 26,
    verticalSpacing: 22,
    rotationDeg: 0,
    stagger: true,
    scaleMode: "screen",
    referenceZoom: 12,
  },
  svgFill: {
    on: false,
    noCut: false,
    sample: "grass-tuft",
    customSvg: "",
    visualSize: 14,
    spacing: 20,
    distribution: "offset",
    minSpacing: 4,
    positionJitter: 0.15,
    rotationJitterDeg: 0,
    scaleJitter: 0,
    scaleMode: "screen",
    referenceZoom: 12,
    seed: "1",
  },
};
const geometricWeightByPattern = new Map([
  [state.pattern, state.weight],
]);
const FEATURE_STYLES = {};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function currentStyle() {
  return clone({
    pattern: state.pattern,
    cartographicPreset: state.cartographicPreset,
    angle: state.angle,
    patColor: state.patColor,
    patOpacity: state.patOpacity,
    weight: state.weight,
    tile: state.tile,
    geometricScale: state.geometricScale,
    bg: state.bg,
    outline: state.outline,
    fontFill: state.fontFill,
    svgFill: state.svgFill,
  });
}

function loadStyle(style) {
  const selectedLayer = state.layer;
  const loaded = clone(style);
  const fontFill = {
    ...state.fontFill,
    ...(loaded.fontFill || {}),
  };
  const svgFill = {
    ...state.svgFill,
    ...(loaded.svgFill || {}),
  };
  const geometricScale = {
    ...state.geometricScale,
    ...(loaded.geometricScale || {}),
  };
  geometricScale.mode ??= "screen";
  geometricScale.referenceZoom ??= 12;
  geometricScale.pixelRatio ??= "auto";
  fontFill.scaleMode ??= "screen";
  fontFill.referenceZoom ??= 12;
  svgFill.distribution = svgFill.distribution ?? (svgFill.stagger === false ? "regular" : "offset");
  svgFill.minSpacing ??= 4;
  svgFill.scaleMode ??= "screen";
  svgFill.referenceZoom ??= 12;
  const sampleMetric = SVG_PATTERN_METRICS[svgFill.sample] || { opticalScale: 1 };
  svgFill.visualSize ??= (svgFill.stampSize ?? 24) * sampleMetric.opticalScale;
  svgFill.spacing ??= 100 / Math.sqrt(svgFill.density ?? 1.93);
  delete svgFill.stagger;
  delete svgFill.stampSize;
  delete svgFill.density;
  if (svgFill.on) fontFill.on = false;
  Object.assign(state, loaded, {
    cartographicPreset: loaded.cartographicPreset ?? null,
    fontFill,
    svgFill,
    geometricScale,
    layer: selectedLayer,
  });
  geometricWeightByPattern.set(state.pattern, state.weight);
}

let designLegendRefreshFrame = 0;
function scheduleDesignLegendRefresh() {
  if ($("designLegend").hidden) return;
  cancelAnimationFrame(designLegendRefreshFrame);
  designLegendRefreshFrame = requestAnimationFrame(() => {
    designLegendRefreshFrame = 0;
    renderDesignLegend();
  });
}

function rememberActiveStyle({ refreshLegend = true } = {}) {
  if (!state.layer) return;
  FEATURE_STYLES[state.layer.source] = currentStyle();
  if (refreshLegend) scheduleDesignLegendRefresh();
}

function updateStyleTransferControls() {
  document.querySelectorAll("[data-style-paste]").forEach((button) => {
    button.disabled = !copiedStyle;
    button.title = copiedStyle
      ? `Paste style copied from ${copiedStyleSource}`
      : "Copy a style first";
  });
}

function copySelectedStyle() {
  if (!state.layer || designContext === "sequence") return;
  rememberActiveStyle({ refreshLegend: false });
  copiedStyle = clone(currentStyle());
  copiedStyleSource = FEATURE_META[state.layer.source]?.label || "selected feature";
  updateStyleTransferControls();
  toast(`Style copied from ${copiedStyleSource}`);
}

function pasteSelectedStyle() {
  if (!state.layer || !copiedStyle || designContext === "sequence") return;
  const targetId = state.layer.source;
  const targetLabel = FEATURE_META[targetId]?.label || "selected feature";
  loadStyle(clone(copiedStyle));
  FEATURE_STYLES[targetId] = currentStyle();
  rebuildLayers();
  applyStateToUI();
  renderDesignLegend();
  toast(`Style pasted to ${targetLabel}`);
}

function closeStyleTransferMenus(except = null) {
  document.querySelectorAll(".style-transfer-menu").forEach((menu) => {
    if (menu === except) return;
    menu.hidden = true;
    menu.parentElement?.querySelector(".legend-style-transfer-trigger")
      ?.setAttribute("aria-expanded", "false");
  });
}

function createStyleTransferControl(label) {
  const control = document.createElement("div");
  control.className = "legend-style-transfer";
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "legend-style-transfer-trigger";
  trigger.setAttribute("aria-label", `Copy or paste style for ${label}`);
  trigger.setAttribute("aria-expanded", "false");
  trigger.innerHTML = '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="2.5" y="2.5" width="8.5" height="8.5" rx="1.6"/><rect x="7" y="7" width="8.5" height="8.5" rx="1.6" fill="var(--surface)"/></svg>';
  const menu = document.createElement("div");
  menu.className = "style-transfer-menu";
  menu.hidden = true;
  menu.setAttribute("role", "menu");
  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.textContent = "Copy style";
  copyButton.setAttribute("role", "menuitem");
  const pasteButton = document.createElement("button");
  pasteButton.type = "button";
  pasteButton.textContent = "Paste style";
  pasteButton.dataset.stylePaste = "";
  pasteButton.setAttribute("role", "menuitem");
  pasteButton.disabled = !copiedStyle;
  pasteButton.title = copiedStyle
    ? `Paste style copied from ${copiedStyleSource}`
    : "Copy a style first";
  trigger.addEventListener("click", (event) => {
    event.stopPropagation();
    const opening = menu.hidden;
    closeStyleTransferMenus();
    menu.hidden = !opening;
    trigger.setAttribute("aria-expanded", String(opening));
  });
  copyButton.addEventListener("click", (event) => {
    event.stopPropagation();
    copySelectedStyle();
    closeStyleTransferMenus();
  });
  pasteButton.addEventListener("click", (event) => {
    event.stopPropagation();
    pasteSelectedStyle();
    closeStyleTransferMenus();
  });
  menu.append(copyButton, pasteButton);
  control.append(trigger, menu);
  return control;
}
const DEFAULT_STYLE = currentStyle();
const FEATURE_PRESETS = [
  { pattern: "grid", cartographicPreset: null, patColor: "#0b7f73", angle: 0, tile: 38, weight: 1.2, bg: { color: "#a8ddd2", opacity: 0.98 } },
  { cartographicPreset: "dense-dots", patColor: "#ad2d5d", tile: 30, weight: 1.65, bg: { color: "#f3b8cc", opacity: 0.98 } },
  { pattern: "dots", cartographicPreset: null, patColor: "#1f78ad", bg: { color: "#b9ddf0", opacity: 0.98 }, svgFill: { on: true, sample: "wave-lines", visualSize: 15, spacing: 23, distribution: "regular" } },
  { cartographicPreset: "dashed-hatch", patColor: "#aa6808", angle: 45, tile: 38, weight: 1.35, bg: { color: "#f4d493", opacity: 0.98 } },
  { pattern: "dots", cartographicPreset: null, patColor: "#2f854a", bg: { color: "#b8dfb8", opacity: 0.98 }, svgFill: { on: true, sample: "grass-tuft", visualSize: 13, spacing: 22, distribution: "offset" } },
  { cartographicPreset: "squares", patColor: "#7442a8", angle: 0, tile: 34, weight: 1.9, bg: { color: "#d4bae9", opacity: 0.98 } },
  { pattern: "solid", cartographicPreset: null, patColor: "#d96548", patOpacity: 0.9, bg: { on: false, color: "#f1b9a9", opacity: 0 } },
  { cartographicPreset: "diamonds", patColor: "#bb3554", angle: 0, tile: 38, weight: 1.7, bg: { color: "#f2b9c3", opacity: 0.98 } },
  { cartographicPreset: "crosses", patColor: "#0f858a", angle: 0, tile: 40, weight: 1.6, bg: { color: "#acdfdf", opacity: 0.98 } },
  { pattern: "dots", cartographicPreset: null, patColor: "#a85315", bg: { color: "#efd093", opacity: 0.98 }, fontFill: { on: true, text: "A", fontSize: 13, horizontalSpacing: 26, verticalSpacing: 24, stagger: true } },
  { pattern: "stipple", cartographicPreset: null, patColor: "#27658d", angle: 0, tile: 30, weight: 1.8, bg: { color: "#bcd8ea", opacity: 0.98 } },
  { cartographicPreset: "triangles", patColor: "#776216", angle: 0, tile: 36, weight: 1.8, bg: { color: "#e5d58f", opacity: 0.98 } },
  { cartographicPreset: "horizontal", patColor: "#216f9b", angle: 0, tile: 27, weight: 1.25, bg: { color: "#baddf0", opacity: 0.98 } },
  { cartographicPreset: "vertical", patColor: "#96496f", angle: 90, tile: 29, weight: 1.3, bg: { color: "#e7bed5", opacity: 0.98 } },
  { cartographicPreset: "reverse-diagonal", patColor: "#2c7b4f", angle: -45, tile: 31, weight: 1.35, bg: { color: "#b9dfc5", opacity: 0.98 } },
  { cartographicPreset: "dotted-line", patColor: "#ad4134", angle: 45, tile: 33, weight: 1.45, bg: { color: "#f0bdb0", opacity: 0.98 } },
  { cartographicPreset: "zigzag", patColor: "#654ca5", angle: 0, tile: 35, weight: 1.35, bg: { color: "#cec4eb", opacity: 0.98 } },
  { cartographicPreset: "wave", patColor: "#0d817d", angle: 0, tile: 37, weight: 1.4, bg: { color: "#addfd9", opacity: 0.98 } },
  { cartographicPreset: "x-marks", patColor: "#a96a16", angle: 0, tile: 39, weight: 1.65, bg: { color: "#ebce96", opacity: 0.98 } },
  { cartographicPreset: "offset-dots", patColor: "#983c68", angle: 0, tile: 41, weight: 1.75, bg: { color: "#e7b8cf", opacity: 0.98 } },
  { cartographicPreset: "chevrons", patColor: "#527a24", angle: 0, tile: 43, weight: 1.8, bg: { color: "#c8dfa2", opacity: 0.98 } },
  { cartographicPreset: "brick", patColor: "#ad542c", angle: 0, tile: 45, weight: 1.85, bg: { color: "#efba99", opacity: 0.98 } },
  { pattern: "dots", cartographicPreset: null, patColor: "#19745a", bg: { color: "#b4ddca", opacity: 0.98 }, svgFill: { on: true, sample: "fern", visualSize: 14, spacing: 25, distribution: "regular" } },
  { pattern: "dots", cartographicPreset: null, patColor: "#7b4a99", bg: { color: "#d3bee7", opacity: 0.98 }, fontFill: { on: true, text: "B", fontSize: 14, horizontalSpacing: 29, verticalSpacing: 26, stagger: false } },
];
let categorizedPresetOrder = FEATURE_PRESETS.map((_, index) => index);
let randomizedCategorizedStyles = null;
let categorizedCountryOrder = null;
const CATEGORIZED_BACKGROUND_OPACITIES = [
  0.96, 0.78, 0.62, 0, 0.48, 0.82, 0,
  0.7, 0.9, 0.56, 0.76, 0.42, 0.94, 0.66,
  0.84, 0.52, 0.74, 0.9, 0, 0.64, 0.8, 0.46, 0.88, 0.58,
];

function featureStyleFor(index) {
  if (index < 0 || index >= FEATURE_PRESETS.length) {
    throw new RangeError(`No unique categorized preset is available for category ${index + 1}`);
  }
  const style = clone(DEFAULT_STYLE);
  const preset = FEATURE_PRESETS[index];
  const background = { ...style.bg, ...preset.bg };
  const fontFill = { ...style.fontFill, ...preset.fontFill };
  const svgFill = { ...style.svgFill, ...preset.svgFill };
  Object.assign(style, preset);
  style.bg = background;
  if (style.bg.on !== false && style.pattern !== "solid") {
    style.bg.opacity = CATEGORIZED_BACKGROUND_OPACITIES[index];
    style.bg.on = style.bg.opacity > 0;
  }
  style.fontFill = fontFill;
  style.svgFill = svgFill;
  if (svgFill.on) style.fontFill.on = false;
  if (fontFill.on) style.svgFill.on = false;
  style.outline = { ...style.outline, color: "#535b58", width: 0.75 };
  return style;
}

function shuffled(values) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }
  return result;
}

const CATEGORIZED_RANDOM_FAMILIES = [
  "solid", "svg", "mark", "geometric", "line", "svg",
  "mark", "text", "geometric", "svg", "line", "mark",
  "svg", "geometric", "line", "mark", "svg", "text",
  "geometric", "line", "svg", "mark", "svg", "mark",
];
const CATEGORIZED_RANDOM_SVG_SAMPLES = [
  "grass-tuft", "fern", "broadleaf-outline", "conifer-outline",
  "forest-mixed", "palm", "pasture", "wave-lines", "droplet",
  "snow-ice", "fish", "gravel", "rocks", "industrial",
];
const CATEGORIZED_RANDOM_TEXT_SAMPLES = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const CATEGORIZED_RANDOM_TILE = 38;
const CATEGORIZED_RANDOM_LINE_WEIGHT = 1.35;
const CATEGORIZED_RANDOM_MARK_WEIGHT = 1.7;
const CATEGORIZED_QUALITATIVE_COLOUR_PAIRS = [
  [{ foreground: "#216f9b", background: "#baddf0" }, { foreground: "#aa6808", background: "#f4d493" }],
  [{ foreground: "#2f854a", background: "#b8dfb8" }, { foreground: "#ad2d5d", background: "#f3b8cc" }],
  [{ foreground: "#7442a8", background: "#d4bae9" }, { foreground: "#776216", background: "#e5d58f" }],
  [{ foreground: "#0b7f73", background: "#a8ddd2" }, { foreground: "#d96548", background: "#f1b9a9" }],
  [{ foreground: "#27658d", background: "#bcd8ea" }, { foreground: "#ad542c", background: "#efba99" }],
  [{ foreground: "#2c7b4f", background: "#b9dfc5" }, { foreground: "#bb3554", background: "#f2b9c3" }],
  [{ foreground: "#654ca5", background: "#cec4eb" }, { foreground: "#a96a16", background: "#ebce96" }],
  [{ foreground: "#0f858a", background: "#acdfdf" }, { foreground: "#ad4134", background: "#f0bdb0" }],
  [{ foreground: "#1f78ad", background: "#b9ddf0" }, { foreground: "#a85315", background: "#efd093" }],
  [{ foreground: "#19745a", background: "#b4ddca" }, { foreground: "#983c68", background: "#e7b8cf" }],
  [{ foreground: "#7b4a99", background: "#d3bee7" }, { foreground: "#527a24", background: "#c8dfa2" }],
  [{ foreground: "#16828b", background: "#b5dfe2" }, { foreground: "#bd553f", background: "#f0bcad" }],
];

function randomizedQualitativeColours() {
  return shuffled(CATEGORIZED_QUALITATIVE_COLOUR_PAIRS)
    .flatMap((pair) => Math.random() < 0.5 ? pair : [...pair].reverse());
}

function randomizedCategorizedStyleSet() {
  const families = shuffled(CATEGORIZED_RANDOM_FAMILIES);
  const backgroundOpacities = shuffled(CATEGORIZED_BACKGROUND_OPACITIES);
  const colours = randomizedQualitativeColours();
  const geometricPatterns = shuffled([
    { pattern: "dots", angle: 0 },
    { pattern: "stipple", angle: 0 },
    { pattern: "hachures", angle: 45 },
    { pattern: "cross", angle: 45 },
    { pattern: "grid", angle: 0 },
    { pattern: "grid", angle: 45 },
  ]);
  const markPresets = shuffled(Object.entries(CARTOGRAPHIC_PRESETS)
    .filter(([, preset]) => preset.family === "glyph")
    .map(([id]) => id));
  const linePresets = shuffled(Object.entries(CARTOGRAPHIC_PRESETS)
    .filter(([, preset]) => preset.family === "line")
    .map(([id]) => id));
  const availableSvgSamples = new Set(SVG_PATTERN_CATALOG.map(({ value }) => value));
  const svgSamples = shuffled(CATEGORIZED_RANDOM_SVG_SAMPLES
    .filter((value) => availableSvgSamples.has(value)));
  const textSamples = shuffled(CATEGORIZED_RANDOM_TEXT_SAMPLES);
  const cursors = { geometric: 0, mark: 0, line: 0, svg: 0, text: 0 };

  return families.map((family, index) => {
    const style = clone(DEFAULT_STYLE);
    const colour = colours[index];
    const backgroundOpacity = backgroundOpacities[index];
    style.patColor = colour.foreground;
    style.patOpacity = 1;
    style.bg = {
      on: backgroundOpacity > 0,
      color: colour.background,
      opacity: backgroundOpacity,
    };
    style.outline = { on: true, color: "#535b58", width: 0.75, dash: [] };
    style.cartographicPreset = null;
    style.fontFill = { ...style.fontFill, on: false };
    style.svgFill = { ...style.svgFill, on: false };

    if (family === "solid") {
      style.pattern = "solid";
      style.patOpacity = 0.9;
      style.bg = { on: false, color: colour.background, opacity: 0 };
    } else if (family === "geometric") {
      Object.assign(style, geometricPatterns[cursors.geometric++]);
      style.tile = CATEGORIZED_RANDOM_TILE;
      style.weight = CATEGORIZED_RANDOM_LINE_WEIGHT;
    } else if (family === "mark") {
      style.pattern = "dots";
      style.cartographicPreset = markPresets[cursors.mark++];
      style.angle = 0;
      style.tile = CATEGORIZED_RANDOM_TILE;
      style.weight = CATEGORIZED_RANDOM_MARK_WEIGHT;
    } else if (family === "line") {
      style.pattern = "hachures";
      style.cartographicPreset = linePresets[cursors.line++];
      const linePreset = CARTOGRAPHIC_PRESETS[style.cartographicPreset];
      style.angle = linePreset.angle ?? (["zigzag", "wave"].includes(linePreset.shape) ? 0 : 45);
      style.tile = CATEGORIZED_RANDOM_TILE;
      style.weight = CATEGORIZED_RANDOM_LINE_WEIGHT;
    } else if (family === "svg") {
      style.pattern = "dots";
      style.svgFill = {
        ...style.svgFill,
        on: true,
        sample: svgSamples[cursors.svg++],
        visualSize: 14,
        spacing: 24,
        distribution: "offset",
      };
    } else if (family === "text") {
      style.pattern = "dots";
      style.fontFill = {
        ...style.fontFill,
        on: true,
        text: textSamples[cursors.text++],
        fontSize: 13,
        horizontalSpacing: 27,
        verticalSpacing: 24,
        stagger: true,
      };
    }
    return style;
  });
}

function recolorSvgPaintValue(value, color) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized || normalized === "none" || normalized === "transparent" ||
      normalized === "inherit" || normalized.startsWith("url(")) return value;
  return color;
}

function recolorSvgStyle(style, color) {
  return String(style || "").replace(
    /(^|[;{]\s*)(fill|stroke|color|stop-color)\s*:\s*([^;}]+)/gi,
    (declaration, prefix, property, value) =>
      `${prefix}${property}: ${recolorSvgPaintValue(value, color)}`,
  );
}

function recolorCustomSvg(svg, color) {
  if (!svg) return svg;
  const document = new DOMParser().parseFromString(svg, "image/svg+xml");
  if (document.querySelector("parsererror")) return svg;
  const root = document.documentElement;
  const elements = [root, ...root.querySelectorAll("*")];
  const paintAttributes = ["fill", "stroke", "color", "stop-color"];

  for (const element of elements) {
    for (const attribute of paintAttributes) {
      if (!element.hasAttribute(attribute)) continue;
      element.setAttribute(
        attribute,
        recolorSvgPaintValue(element.getAttribute(attribute), color),
      );
    }
    if (element.hasAttribute("style")) {
      element.setAttribute("style", recolorSvgStyle(element.getAttribute("style"), color));
    }
    if (element.tagName.toLowerCase() === "style") {
      element.textContent = recolorSvgStyle(element.textContent, color);
    }
  }

  // SVG shapes without an explicit fill render black by default. Setting the
  // inherited root fill makes those shapes follow the motif colour too, while
  // explicit fill="none" values above remain untouched.
  if (!root.hasAttribute("fill") && !/(^|;)\s*fill\s*:/i.test(root.getAttribute("style") || "")) {
    root.setAttribute("fill", color);
  }
  root.setAttribute("color", color);
  return new XMLSerializer().serializeToString(root);
}

function resolveSvgFillSample(svgFill = state.svgFill, color = state.patColor) {
  if (svgFill.sample === "custom") return recolorCustomSvg(svgFill.customSvg, color);
  return SVG_PATTERN_SAMPLES[svgFill.sample]?.replace(
    /#[0-9a-f]{6}/gi,
    color,
  );
}
// Map and optional context layers.
// Hardtwald, just north of Karlsruhe. This is only the anchor for Sample 1;
// subsequent samples follow the regular left-to-right grid below.
const SAMPLE_CENTER = [8.425, 49.066];
// OSM Liberty (OpenFreeMap, a free/no-key vector basemap) is the default
// basemap. Its sources/layers/sprite/glyphs are merged directly into this
// style rather than swapped in later with `setStyle`, so switching
// basemaps stays an instant layer-visibility toggle with no flash and
// never needs the sample polygon layers to be re-added afterwards. Its own
// flat "background" layer is dropped since our own "bg" layer already
// covers that. None of our own layers use text or icons, so adopting its
// glyphs/sprite globally is safe. Falls back to no Liberty layers (the
// "Neutral" basemap) if the fetch fails, e.g. offline.
const libertyStyle = await fetch("https://tiles.openfreemap.org/styles/liberty")
  .then((response) => (response.ok ? response.json() : null))
  .catch(() => null);
const libertyIsDefault = Boolean(libertyStyle);
const libertyLayers = (libertyStyle?.layers ?? [])
  .filter((layer) => layer.type !== "background")
  .map((layer) => ({
    ...layer,
    // Set the correct initial visibility directly in the style instead of
    // calling map.setLayoutProperty() right after construction: the style
    // hasn't finished loading yet at that point, and MapLibre throws
    // ("Style is not done loading") for any mutation before it has,
    // aborting the rest of this script.
    layout: { ...layer.layout, visibility: libertyIsDefault ? "visible" : "none" },
  }));
const libertyWaterLayer = libertyLayers.find((layer) => layer.id === "water");
const libertyWaterColor = libertyWaterLayer?.paint?.["fill-color"];
const basemapStyle = {
  version: 8,
  glyphs: libertyStyle?.glyphs ?? "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  ...(libertyStyle?.sprite ? { sprite: libertyStyle.sprite } : {}),
  sources: {
    ...(libertyStyle?.sources ?? {}),
    streets: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
    positron: {
      // CARTO's free anonymous raster endpoint now requires an API key,
      // so this uses Esri's equivalent free, no-key light basemap instead.
      type: "raster",
      tiles: ["https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      attribution: "Tiles © Esri",
    },
    bright: {
      type: "raster",
      tiles: ["https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      attribution: "Tiles © Esri",
    },
    aerial: {
      type: "raster",
      tiles: ["https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      attribution: "Tiles © Esri",
    },
  },
  layers: [
    { id: "bg", type: "background", paint: { "background-color": libertyIsDefault ? "#d8dfdc" : "#e9eeec" } },
    ...libertyLayers,
    { id: "basemap-streets", type: "raster", source: "streets", layout: { visibility: "none" }, paint: { "raster-saturation": -0.35, "raster-opacity": 0.82 } },
    { id: "basemap-positron", type: "raster", source: "positron", layout: { visibility: "none" } },
    { id: "basemap-bright", type: "raster", source: "bright", layout: { visibility: "none" } },
    { id: "basemap-aerial", type: "raster", source: "aerial", layout: { visibility: "none" }, paint: { "raster-saturation": -0.25, "raster-brightness-max": 0.82 } },
  ],
};
const map = new maplibregl.Map({
  container: "map",
  style: clone(basemapStyle),
  center: SAMPLE_CENTER, zoom: 12,
  attributionControl: false,
});
map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: "metric" }), "bottom-right");
const attributionControl = new maplibregl.AttributionControl({ compact: true });
map.addControl(attributionControl, "bottom-right");

function collapseMapAttribution() {
  const attribution = map.getContainer().querySelector(".maplibregl-ctrl-attrib");
  attribution?.classList.remove("maplibregl-compact-show");
  attribution?.removeAttribute("open");
}

collapseMapAttribution();
map.once("load", collapseMapAttribution);

// Resizable desktop style panel. The chosen width is local UI state, so it
// is remembered independently from the exported pattern configuration.
const PANEL_WIDTH_KEY = "stipple:panel-width:v2";
const PANEL_WIDTH_DEFAULT = 360;
const PANEL_WIDTH_MIN = 280;
const PANEL_WIDTH_MAX = 720;
const MAP_WIDTH_MIN = 280;
const workspace = document.querySelector(".workspace");
const panelResizer = $("panelResizer");
let panelWidth = PANEL_WIDTH_DEFAULT;
let resizeFrame = 0;

function maximumPanelWidth() {
  const workspaceWidth = workspace.getBoundingClientRect().width;
  const railWidth = window.innerWidth <= 760 ? 40 : 48;
  return Math.max(
    PANEL_WIDTH_MIN,
    Math.min(PANEL_WIDTH_MAX, workspaceWidth - railWidth - MAP_WIDTH_MIN),
  );
}

function setPanelWidth(value, persist = false) {
  panelWidth = Math.round(Math.max(PANEL_WIDTH_MIN, Math.min(maximumPanelWidth(), value)));
  workspace.style.setProperty("--panel-width", `${panelWidth}px`);
  panelResizer.setAttribute("aria-valuenow", String(panelWidth));
  panelResizer.setAttribute("aria-valuetext", `${panelWidth} pixels`);
  if (persist) {
    try { localStorage.setItem(PANEL_WIDTH_KEY, String(panelWidth)); } catch { /* private mode */ }
  }
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => map.resize());
}

try {
  const savedPanelWidth = Number(localStorage.getItem(PANEL_WIDTH_KEY));
  if (Number.isFinite(savedPanelWidth) && savedPanelWidth > 0) panelWidth = savedPanelWidth;
} catch { /* private mode */ }
setPanelWidth(panelWidth);

panelResizer.addEventListener("pointerdown", (event) => {
  if (window.innerWidth <= 760 || event.button !== 0) return;
  event.preventDefault();
  panelResizer.setPointerCapture(event.pointerId);
  document.body.classList.add("is-resizing-panel");
});
panelResizer.addEventListener("pointermove", (event) => {
  if (!panelResizer.hasPointerCapture(event.pointerId)) return;
  const workspaceRight = workspace.getBoundingClientRect().right;
  setPanelWidth(workspaceRight - event.clientX);
});
function finishPanelResize(event) {
  if (!panelResizer.hasPointerCapture(event.pointerId)) return;
  panelResizer.releasePointerCapture(event.pointerId);
  document.body.classList.remove("is-resizing-panel");
  setPanelWidth(panelWidth, true);
}
panelResizer.addEventListener("pointerup", finishPanelResize);
panelResizer.addEventListener("pointercancel", finishPanelResize);
panelResizer.addEventListener("dblclick", () => setPanelWidth(PANEL_WIDTH_DEFAULT, true));
panelResizer.addEventListener("keydown", (event) => {
  const step = event.shiftKey ? 40 : 10;
  let next = panelWidth;
  if (event.key === "ArrowLeft") next += step;
  else if (event.key === "ArrowRight") next -= step;
  else if (event.key === "Home") next = PANEL_WIDTH_MIN;
  else if (event.key === "End") next = maximumPanelWidth();
  else if (event.key === "Enter") next = PANEL_WIDTH_DEFAULT;
  else return;
  event.preventDefault();
  setPanelWidth(next, true);
});
window.addEventListener("resize", () => {
  if (window.innerWidth > 760) setPanelWidth(panelWidth);
  else map.resize();
});

// Tile preview canvas in the panel (2x2 tiled to show seams). Rendered at
// the display's actual physical resolution (CSS size * devicePixelRatio,
// capped like the library's own pixelRatio convention) so the swatch is
// crisp instead of a small raster blown up and blurred by the browser.
const PREVIEW_DISPLAY_PX = 56; // matches .preview-canvas width/height
const PREVIEW_REPEATS = 2;
let previewGeneration = 0;
async function renderPreview() {
  const generation = ++previewGeneration;
  const pc = $("tilePreview");
  const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 1), 2);
  const physicalSize = Math.round(PREVIEW_DISPLAY_PX * dpr);
  pc.width = pc.height = physicalSize;
  const ctx = pc.getContext("2d");
  ctx.clearRect(0, 0, physicalSize, physicalSize);
  if (state.fontFill.on) {
    const tile = await createFontPatternTile({
      imageId: "font-preview",
      ...state.fontFill,
      color: state.patColor,
      pixelRatio: dpr,
    });
    if (generation !== previewGeneration) return;
    const tmp = document.createElement("canvas");
    tmp.width = tile.width; tmp.height = tile.height;
    tmp.getContext("2d").putImageData(
      new ImageData(new Uint8ClampedArray(tile.data), tile.width, tile.height),
      0,
      0,
    );
    ctx.globalAlpha = state.patOpacity;
    ctx.fillStyle = ctx.createPattern(tmp, "repeat");
    ctx.fillRect(0, 0, physicalSize, physicalSize);
    ctx.globalAlpha = 1;
    renderActivePatternSwatch(pc);
    return;
  }
  if (state.svgFill.on) {
    renderActivePatternSwatch();
    return;
  }
  if (state.pattern === "solid" && !state.cartographicPreset) {
    ctx.fillStyle = withOpacity(state.patColor, state.patOpacity);
    ctx.fillRect(0, 0, physicalSize, physicalSize);
    renderActivePatternSwatch(pc);
    return;
  }
  if (state.cartographicPreset) {
    const pattern = canonicalPresetPattern("preview", "Preview", currentStyle());
    const tile = await createPatternTile(pattern, { pixelRatio: dpr });
    if (generation !== previewGeneration) return;
    const tmp = document.createElement("canvas");
    tmp.width = tile.width; tmp.height = tile.height;
    tmp.getContext("2d").putImageData(
      new ImageData(new Uint8ClampedArray(tile.data), tile.width, tile.height),
      0,
      0,
    );
    ctx.globalAlpha = state.patOpacity;
    ctx.fillStyle = ctx.createPattern(tmp, "repeat");
    ctx.fillRect(0, 0, physicalSize, physicalSize);
    ctx.globalAlpha = 1;
    renderActivePatternSwatch(pc);
    return;
  }
  const tilePixelRatio = (physicalSize / PREVIEW_REPEATS) / state.tile;
  const tile = makeTile(state.pattern, state.tile, state.patColor, state.weight, state.angle, { pixelRatio: tilePixelRatio });
  const tmp = document.createElement("canvas"); tmp.width = tile.width; tmp.height = tile.height;
  tmp.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(tile.data), tile.width, tile.height), 0, 0);
  const pat = ctx.createPattern(tmp, "repeat");
  ctx.globalAlpha = state.patOpacity;
  ctx.fillStyle = pat; ctx.fillRect(0, 0, physicalSize, physicalSize);
  ctx.globalAlpha = 1;
  renderActivePatternSwatch(pc);
}

function renderActivePatternSwatch(preview) {
  const canvas = $("activePatternSwatch");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (state.bg.on) {
    ctx.fillStyle = withOpacity(state.bg.color, state.bg.opacity);
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  if (preview) {
    ctx.drawImage(preview, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = withOpacity(state.patColor, Math.max(0.16, state.patOpacity * 0.24));
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = state.patColor;
    ctx.font = "600 13px 'IBM Plex Mono', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(state.svgFill.on ? "SVG" : "A", canvas.width / 2, canvas.height / 2);
  }
  if (state.outline.on) {
    ctx.strokeStyle = state.outline.color;
    ctx.lineWidth = Math.max(1, state.outline.width);
    ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);
  }
}

async function renderStyleSwatch(canvas, style, id, label) {
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  if (style.bg.on) {
    context.fillStyle = withOpacity(style.bg.color, style.bg.opacity);
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  const pattern = styleToCanonicalPattern(id, label, style);
  if (pattern.fill.family === "solid") {
    context.fillStyle = withOpacity(pattern.fill.color, pattern.opacity);
    context.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    const tile = await createPatternTile(pattern, { pixelRatio: 1 });
    const tileCanvas = document.createElement("canvas");
    tileCanvas.width = tile.width;
    tileCanvas.height = tile.height;
    tileCanvas.getContext("2d").putImageData(
      new ImageData(new Uint8ClampedArray(tile.data), tile.width, tile.height),
      0,
      0,
    );
    context.globalAlpha = pattern.opacity;
    context.fillStyle = context.createPattern(tileCanvas, "repeat");
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.globalAlpha = 1;
  }
  if (style.outline.on) {
    context.strokeStyle = style.outline.color;
    context.lineWidth = Math.max(1, style.outline.width);
    context.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);
  }
}

async function renderPreviewElement(element, style, id, width, height) {
  if (!element) return;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.setAttribute("aria-hidden", "true");
  const previewStyle = clone(style);
  previewStyle.bg = { on: true, color: "#f7f4eb", opacity: 1 };
  previewStyle.outline = { ...previewStyle.outline, on: false };
  await renderStyleSwatch(canvas, previewStyle, id, id);
  element.replaceChildren(canvas);
}

function geometricPreviewStyle(pattern, options = {}) {
  return {
    ...clone(DEFAULT_STYLE),
    pattern,
    cartographicPreset: null,
    patColor: "#203d36",
    patOpacity: 1,
    fontFill: { ...DEFAULT_STYLE.fontFill, on: false },
    svgFill: { ...DEFAULT_STYLE.svgFill, on: false },
    ...options,
  };
}

function patternSubtypePreviewStyles() {
  const line = (cartographicPreset, options = {}) => geometricPreviewStyle("hachures", {
    cartographicPreset,
    tile: 18,
    weight: 1.6,
    angle: 0,
    ...options,
  });
  const mark = (cartographicPreset) => geometricPreviewStyle("dots", {
    cartographicPreset,
    tile: 44,
    weight: 2.8,
    angle: 0,
  });
  return [
    ['[data-pattern-subtypes="lines"] [data-p="hachures"]', line(null)],
    ['[data-pattern-subtypes="lines"] [data-cartographic-preset="dashed-hatch"]', line("dashed-hatch")],
    ['[data-pattern-subtypes="lines"] [data-cartographic-preset="dotted-line"]', line("dotted-line")],
    ['[data-pattern-subtypes="lines"] [data-cartographic-preset="zigzag"]', line("zigzag")],
    ['[data-pattern-subtypes="lines"] [data-cartographic-preset="wave"]', line("wave")],
    ...["squares", "diamonds", "crosses", "x-marks", "triangles", "chevrons"].map((preset) => [
      `[data-pattern-subtypes="marks"] [data-cartographic-preset="${preset}"]`,
      mark(preset),
    ]),
  ];
}

async function renderCuratedPatternPreviews() {
  await Promise.all(patternSubtypePreviewStyles().map(([selector, style], index) =>
    renderPreviewElement(
      document.querySelector(`${selector} .subtype-preview`),
      style,
      `subtype-preview-${index}`,
      112,
      40,
    ),
  ));
  await Promise.all(Object.keys(GRADUATED_PRESETS).map((presetId) =>
    renderPreviewElement(
      document.querySelector(`[data-sequence-preset="${presetId}"] .mini-ramp`),
      graduatedPresetStyle(presetId),
      `sequence-preview-${presetId}`,
      96,
      32,
    ),
  ));
}

function renderDesignLegend() {
  const legend = $("designLegend");
  const items = $("designLegendItems");
  const actions = $("designLegendActions");
  const actionsLabel = $("designLegendActionsLabel");
  const removeButton = $("designLegendRemove");
  const addButton = $("designLegendAdd");
  const visible = Boolean(state.layer);
  legend.hidden = !visible;
  if (!visible) {
    items.innerHTML = "";
    actions.hidden = true;
    return;
  }
  actions.hidden = false;
  legend.classList.toggle("sequence", designContext === "sequence");
  legend.classList.toggle("set", designContext === "set");
  legend.classList.toggle("pattern", designContext === "pattern");
  legend.classList.toggle(
    "single-feature",
    designContext === "pattern" && Object.keys(FEATURES).length === 1,
  );
  $("designLegendCategoryCount").hidden = designContext !== "set";
  $("designLegendSequenceCount").hidden = designContext !== "sequence";
  $("randomizeCategoriesButton").hidden = designContext !== "set";
  items.innerHTML = "";
  const featureIds = Object.keys(FEATURES);
  const entries = designContext === "pattern"
    ? featureIds.map((id, index) => ({
        id,
        label: FEATURE_META[id]?.label || `Sample ${index + 1}`,
        step: index,
      }))
    : designContext === "sequence"
    ? graduatedLabels(sequenceState.steps, sequenceState.visualOrder).map((label, step) => ({
        id: featureIds.find((featureId, index) => sequenceStepForFeature(featureId, index) === step),
        label,
        step,
      })).filter(({ id }) => Boolean(id))
    : featureIds.map((id, index) => ({
        id,
        label: FEATURE_META[id]?.label || `Item ${index + 1}`,
        step: index,
      }));
  entries.forEach(({ id, label }) => {
    const item = document.createElement("div");
    const active = designContext !== "sequence" && id === state.layer?.source;
    item.className = `design-legend-item${active ? " active" : ""}`;
    item.dataset.feature = id;
    const main = document.createElement(designContext === "sequence" ? "div" : "button");
    main.className = "design-legend-main";
    if (main instanceof HTMLButtonElement) {
      main.type = "button";
      main.setAttribute("aria-label", `Edit ${label}`);
    }
    const canvas = document.createElement("canvas");
    canvas.className = "design-legend-swatch";
    // Match the canvas bitmap ratio to its CSS box. Otherwise the browser
    // stretches the rendered texture and turns circles into ovals.
    canvas.width = designContext === "sequence" ? 116 : 64;
    canvas.height = designContext === "sequence" ? 50 : 44;
    const text = document.createElement("span");
    text.className = "design-legend-label";
    text.textContent = label;
    main.append(canvas, text);
    item.append(main);
    if (main instanceof HTMLButtonElement) {
      main.addEventListener("click", () => selectLayer(id, { focusEditor: true }));
    }
    if (active && designContext !== "sequence") item.append(createStyleTransferControl(label));
    items.appendChild(item);
    renderStyleSwatch(canvas, FEATURE_STYLES[id] || DEFAULT_STYLE, id, label)
      .catch(() => undefined);
  });
  const featureCount = featureIds.length;
  if (designContext === "pattern") {
    actionsLabel.textContent = "Single pattern";
    actions.querySelector(".design-legend-stepper").setAttribute("aria-label", "Number of samples");
    removeButton.setAttribute("aria-label", "Remove selected sample");
    removeButton.disabled = sourceMode !== "sample" || featureCount <= 1;
    removeButton.title = sourceMode !== "sample"
      ? "Samples cannot be removed from imported data"
      : featureCount <= 1 ? "Keep at least one sample" : "Remove selected sample";
    addButton.setAttribute("aria-label", "Add sample");
    addButton.disabled = sourceMode !== "sample" || featureCount >= MAX_SAMPLE_FEATURES;
    addButton.title = sourceMode !== "sample"
      ? "Samples cannot be added to imported data"
      : featureCount >= MAX_SAMPLE_FEATURES ? "Sample limit reached" : "Add sample polygon";
  } else if (designContext === "set") {
    actionsLabel.textContent = "Categorized";
    actions.querySelector(".design-legend-stepper").setAttribute("aria-label", "Number of categories");
    removeButton.setAttribute("aria-label", "Remove one category");
    removeButton.disabled = sourceMode !== "sample" || featureCount <= MIN_CATEGORIES;
    removeButton.title = sourceMode !== "sample"
      ? "Categories cannot be removed from imported data"
      : featureCount <= MIN_CATEGORIES
        ? `Keep at least ${MIN_CATEGORIES} categories`
        : "Remove one category";
    addButton.setAttribute("aria-label", "Add category");
    addButton.disabled = sourceMode !== "sample" || featureCount >= MAX_CATEGORIES;
    addButton.title = sourceMode !== "sample"
      ? "Categories cannot be added to imported data"
      : featureCount >= MAX_CATEGORIES
        ? `Limit of ${MAX_CATEGORIES} categories reached`
        : "Add category";
  } else {
    actionsLabel.textContent = "Graduated";
    actions.querySelector(".design-legend-stepper").setAttribute("aria-label", "Number of classes");
    removeButton.setAttribute("aria-label", "Remove one class");
    removeButton.disabled = sequenceState.steps <= MIN_SEQUENCE_STEPS;
    removeButton.title = removeButton.disabled
      ? `Keep at least ${MIN_SEQUENCE_STEPS} classes`
      : "Remove one graduated class";
    addButton.setAttribute("aria-label", "Add class");
    addButton.disabled = sequenceState.steps >= MAX_SEQUENCE_STEPS;
    addButton.title = addButton.disabled
      ? `Limit of ${MAX_SEQUENCE_STEPS} classes reached`
      : "Add graduated class";
  }
}

function withOpacity(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

const geomImageId = () => `${state.layer.source}__pat_img`;
const fontImageId = (id = state.layer.source) => `${id}__font_img`;
const svgImageId = (id = state.layer.source) => `${id}__svg_img`;
const ids = () => ({
  src: state.layer.source,
  bg: `${state.layer.source}__bg`,
  pat: `${state.layer.source}__pat`,
  line: `${state.layer.source}__line`,
});

function geometricPixelRatio(style) {
  return style.geometricScale.pixelRatio === "1x" ? 1 : undefined;
}

function geometricWeight(style, size = style.tile) {
  if (style.geometricScale.mode !== "map") return style.weight;
  const scaled = style.weight * (size / style.tile);
  const readabilityFloor = style.pattern === "stipple" ? 1 : 0.5;
  const readableMinimum = Math.min(style.weight, readabilityFloor);
  return Math.max(readableMinimum, scaled);
}

function createGeometricDefinition(style, size = style.tile) {
  const pixelRatio = geometricPixelRatio(style);
  // Ground-scaled stipple variants share one normalized point set. Scaling
  // the tile and the dots therefore preserves the exact texture instead of
  // generating a new random density at every integer zoom.
  const stippleCount = style.pattern === "stipple" && style.geometricScale.mode === "map"
    ? Math.max(1, Math.round((style.tile / 6) ** 2))
    : undefined;
  return {
    kind: "geometric",
    pattern: style.pattern,
    size,
    color: style.patColor,
    weight: geometricWeight(style, size),
    angle: style.angle,
    ...(pixelRatio === undefined ? {} : { pixelRatio }),
    ...(stippleCount === undefined ? {} : { stippleCount }),
  };
}

function automaticGeometricZoomStops(style) {
  // Eight pixels is the smallest tile that can still reproduce the same
  // normalized point/line geometry cleanly at 1x. Above the reference zoom,
  // keep exact powers of two for as long as the image atlas remains cheap.
  const minimumTile = Math.min(style.tile, 8);
  const maximumTile = 256;
  const firstZoom = Math.max(
    0,
    Math.floor(style.geometricScale.referenceZoom + Math.log2(minimumTile / style.tile)),
  );
  const lastZoom = Math.min(
    22,
    Math.max(
      firstZoom,
      Math.ceil(style.geometricScale.referenceZoom + Math.log2(maximumTile / style.tile)),
    ),
  );
  const stops = [];
  for (let zoom = firstZoom; zoom <= lastZoom; zoom++) {
    stops.push({
      zoom,
      tile: Math.max(
        minimumTile,
        Math.min(maximumTile, style.tile * 2 ** (zoom - style.geometricScale.referenceZoom)),
      ),
    });
  }
  return stops;
}

function geometricZoomStops(style) {
  return automaticGeometricZoomStops(style);
}

function createGeometricZoomVariants(style) {
  return geometricZoomStops(style).map((stop) => {
    const definition = createGeometricDefinition(style, stop.tile);
    return {
      zoom: stop.zoom,
      imageId: patternDefinitionId(definition),
      definition,
    };
  });
}

function liveGeometricZoomVariants(style, id) {
  return createGeometricZoomVariants(style).map((variant) => ({
    ...variant,
    imageId: `${id}__pat_img_z${variant.zoom}`,
  }));
}

function installGeometricDefinition(imageId, definition) {
  syncPatternTexture(map, {
    imageId,
    pattern: definition.pattern,
    size: definition.size,
    color: definition.color,
    weight: definition.weight,
    angle: definition.angle,
    pixelRatio: definition.pixelRatio,
    stippleCount: definition.stippleCount,
  });
}

function syncGeomTexture() {
  if (!state.layer || (state.pattern === "solid" && !state.cartographicPreset) || state.fontFill.on || state.svgFill.on) return;
  const style = currentStyle();
  const layerId = `${state.layer.source}__pat`;
  if (style.cartographicPreset) {
    syncCanonicalTextureForFeature(state.layer.source, style);
    rememberActiveStyle();
    return;
  }
  if (style.geometricScale.mode === "map") {
    const variants = liveGeometricZoomVariants(style, state.layer.source);
    variants.forEach(({ imageId, definition }) => installGeometricDefinition(imageId, definition));
    if (map.getLayer(layerId)) {
      map.setPaintProperty(layerId, "fill-pattern", zoomPatternExpression(variants));
    }
  } else {
    installGeometricDefinition(geomImageId(), createGeometricDefinition(style));
    if (map.getLayer(layerId)) {
      map.setPaintProperty(layerId, "fill-pattern", geomImageId());
    }
  }
  rememberActiveStyle();
}

async function syncCanonicalTextureForFeature(id, style) {
  const variants = style.geometricScale.mode === "map"
    ? liveCanonicalZoomVariants(style, id)
    : [];
  const imageId = `${id}__pat_img`;
  if (variants.length) {
    await Promise.all(variants.map((variant) => installPatternTexture(map, {
      imageId: variant.imageId,
      pattern: variant.pattern,
    })));
  } else {
    const pattern = canonicalPresetPattern(id, FEATURE_META[id]?.label || id, style);
    await installPatternTexture(map, { imageId, pattern });
  }
  const layerId = `${id}__pat`;
  if (map.getLayer(layerId)) {
    map.setPaintProperty(
      layerId,
      "fill-pattern",
      variants.length ? zoomPatternExpression(variants) : imageId,
    );
    map.setPaintProperty(layerId, "fill-opacity", style.patOpacity);
  }
}

function liveCanonicalZoomVariants(style, id) {
  return geometricZoomStops(style).map(({ zoom, tile }) => {
    const scaledStyle = clone(style);
    scaledStyle.tile = tile;
    scaledStyle.weight = geometricWeight(style, tile);
    return {
      zoom,
      imageId: `${id}__pat_img_z${zoom}`,
      pattern: canonicalPresetPattern(id, FEATURE_META[id]?.label || id, scaledStyle),
    };
  });
}

function fontPatternOptions(id, style, imageId = fontImageId(id), fontFill = style.fontFill) {
  return {
    imageId,
    ...fontFill,
    color: style.patColor,
  };
}

async function syncFontTextureForFeature(id, style) {
  const mapScale = style.fontFill.scaleMode === "map";
  const variants = mapScale ? liveFontZoomVariants(style, id) : [];
  if (mapScale) {
    await Promise.all(variants.map(({ imageId, definition }) => {
      const { kind: _kind, ...fontFill } = definition;
      return installFontPatternFill(map, fontPatternOptions(id, style, imageId, fontFill));
    }));
  } else {
    await installFontPatternFill(map, fontPatternOptions(id, style));
  }
  const layerId = `${id}__pat`;
  if (map.getLayer(layerId)) {
    map.setPaintProperty(
      layerId,
      "fill-pattern",
      mapScale ? zoomPatternExpression(variants) : fontImageId(id),
    );
    map.setPaintProperty(layerId, "fill-opacity", style.patOpacity);
  }
}

let fontFillSyncTimer = 0;
function syncFontFill() {
  clearTimeout(fontFillSyncTimer);
  fontFillSyncTimer = setTimeout(async () => {
    if (!state.layer || !state.fontFill.on) return;
    await syncFontTextureForFeature(state.layer.source, currentStyle());
    rememberActiveStyle();
  }, 40);
}

function svgMetrics(svgFill) {
  return SVG_PATTERN_METRICS[svgFill.sample] || {
    opticalScale: 1,
    minReadableSize: 12,
  };
}

function effectiveSvgTexture(style, id, zoom = map.getZoom()) {
  const metrics = svgMetrics(style.svgFill);
  return scalePatternForZoom({
    mode: style.svgFill.scaleMode,
    zoom,
    referenceZoom: style.svgFill.referenceZoom,
    visualSize: style.svgFill.visualSize,
    spacing: style.svgFill.spacing,
    opticalScale: metrics.opticalScale,
    minReadableSize: metrics.minReadableSize,
    maxVisualSize: Math.max(style.svgFill.visualSize, SVG_GROUND_SCALE_MAX),
    maxSpacingAtReadableFloorRatio: 2,
  });
}

async function syncSvgTextureForFeature(id, style) {
  const svg = resolveSvgFillSample(style.svgFill, style.patColor);
  if (!svg) return toast("Paste a custom SVG first");
  const effective = effectiveSvgTexture(style, id);
  const options = {
    imageId: svgImageId(id), svg,
    stampSize: effective.stampSize,
    density: effective.density,
    distribution: style.svgFill.distribution,
    minSpacing: style.svgFill.minSpacing * effective.scale,
    positionJitter: style.svgFill.positionJitter,
    rotationJitterDeg: style.svgFill.rotationJitterDeg,
    scaleJitter: style.svgFill.scaleJitter,
    seed: style.svgFill.seed,
  };
  // Screen-sized clipped fills keep one stable image for the lifetime of the
  // layer, just like font and geometric fills.
  await installSvgPatternFill(map, options);
  const layerId = `${id}__pat`;
  if (map.getLayer(layerId)) {
    map.setPaintProperty(layerId, "fill-opacity", style.patOpacity);
  }
}

function liveSvgZoomVariants(style, id) {
  return createSvgZoomVariants(style).map((variant) => ({
    ...variant,
    // Keep a bounded set of image names in the live workshop. Definitions
    // change while sliders move, so content-addressed ids would otherwise
    // leave every intermediate texture in MapLibre's image atlas.
    imageId: `${svgImageId(id)}_z${variant.zoom}`,
  }));
}

async function syncSvgGroundScaleForFeature(id, style) {
  const variants = liveSvgZoomVariants(style, id);
  // MapLibre cross-fades pattern images around integer zooms. Preloading the
  // neighbouring sizes lets ground-scaled motifs grow continuously instead
  // of replacing one raster abruptly after moveend.
  await Promise.all(variants.map(({ imageId, definition }) => {
    const { kind: _kind, ...options } = definition;
    return installSvgPatternFill(map, { imageId, ...options });
  }));
  const layerId = `${id}__pat`;
  if (map.getLayer(layerId)) {
    map.setPaintProperty(layerId, "fill-pattern", zoomPatternExpression(variants));
    map.setPaintProperty(layerId, "fill-opacity", style.patOpacity);
  }
  rememberActiveStyle();
}

async function syncSvgTexture() {
  if (!state.layer) return;
  await syncSvgTextureForFeature(state.layer.source, currentStyle());
  rememberActiveStyle();
}

// Optional symbol placement for users who prefer complete motifs at edges.
const svgIconScatterIds = (id = state.layer.source, svgFill = state.svgFill) => ({
  source: `${id}__svgscatter`,
  layer: `${id}__svgscatter_layer`,
  icon: `${id}__svg_icon_${svgFill.sample}`,
});

async function syncSvgIconScatterForFeature(id, style) {
  const svg = resolveSvgFillSample(style.svgFill, style.patColor);
  if (!svg) return toast("Paste a custom SVG first");
  const { source, layer, icon } = svgIconScatterIds(id, style.svgFill);
  const polygon = FEATURES[id].features[0].geometry;
  const effective = effectiveSvgTexture(style, id);
  await installSvgIconScatter(map, {
    sourceId: source, layerId: layer, iconId: icon, polygon, svg,
    size: effective.stampSize,
    density: effective.density,
    seed: style.svgFill.seed,
    distribution: style.svgFill.distribution,
    minSpacing: style.svgFill.minSpacing * effective.scale,
    positionJitter: style.svgFill.positionJitter,
    rotationJitterDeg: style.svgFill.rotationJitterDeg,
    scaleJitter: style.svgFill.scaleJitter,
    opacity: style.patOpacity,
    scaleMode: style.svgFill.scaleMode,
    edgeClearance: true,
  });
}

let svgScatterSyncPending = false;
let svgScatterSyncPromise = null;
function syncSvgIconScatter() {
  svgScatterSyncPending = true;
  if (svgScatterSyncPromise) return svgScatterSyncPromise;
  svgScatterSyncPromise = (async () => {
    try {
      while (svgScatterSyncPending) {
        svgScatterSyncPending = false;
        if (!state.layer) continue;
        await syncSvgIconScatterForFeature(state.layer.source, currentStyle());
        rememberActiveStyle();
      }
    } finally {
      svgScatterSyncPromise = null;
    }
  })();
  return svgScatterSyncPromise;
}

function removeSvgIconScatter() {
  if (!state.layer) return;
  const { source, layer } = svgIconScatterIds();
  if (map.getLayer(layer)) map.removeLayer(layer);
  if (map.getSource(source)) map.removeSource(source);
}

let svgFillSyncTimer = 0;
function syncSvgFill() {
  clearTimeout(svgFillSyncTimer);
  svgFillSyncTimer = setTimeout(() => {
    if (state.svgFill.noCut) syncSvgIconScatter();
    else if (state.svgFill.scaleMode === "map" && state.layer) {
      syncSvgGroundScaleForFeature(state.layer.source, currentStyle());
    } else syncSvgTexture();
  }, 40);
}

// Style layers for the selected polygon.
function rebuildPolygonLayers(id) {
  const bg = `${id}__bg`, pat = `${id}__pat`, line = `${id}__line`;

  if (state.bg.on) {
    map.addLayer({ id: bg, type: "fill", source: id, paint: { "fill-color": state.bg.color, "fill-opacity": state.bg.opacity } });
  }

  if (state.fontFill.on) {
    const style = currentStyle();
    const variants = style.fontFill.scaleMode === "map"
      ? liveFontZoomVariants(style, id)
      : [];
    syncFontTextureForFeature(id, style);
    map.addLayer({
      id: pat,
      type: "fill",
      source: id,
      paint: {
        "fill-pattern": variants.length
          ? zoomPatternExpression(variants)
          : fontImageId(id),
        "fill-opacity": state.patOpacity,
      },
    });
  } else if (state.svgFill.on && state.svgFill.noCut) {
    syncSvgIconScatterForFeature(id, currentStyle());
  } else if (state.svgFill.on && state.svgFill.scaleMode === "map") {
    const style = currentStyle();
    const variants = liveSvgZoomVariants(style, id);
    syncSvgGroundScaleForFeature(id, style);
    map.addLayer({
      id: pat,
      type: "fill",
      source: id,
      paint: {
        "fill-pattern": zoomPatternExpression(variants),
        "fill-opacity": state.patOpacity,
      },
    });
  } else if (state.svgFill.on) {
    syncSvgTextureForFeature(id, currentStyle());
    map.addLayer({
      id: pat,
      type: "fill",
      source: id,
      paint: { "fill-pattern": svgImageId(id), "fill-opacity": state.patOpacity },
    });
  } else if (state.cartographicPreset) {
    const style = currentStyle();
    const variants = style.geometricScale.mode === "map"
      ? liveCanonicalZoomVariants(style, id)
      : [];
    syncCanonicalTextureForFeature(id, style);
    map.addLayer({
      id: pat,
      type: "fill",
      source: id,
      paint: {
        "fill-pattern": variants.length ? zoomPatternExpression(variants) : geomImageId(),
        "fill-opacity": state.patOpacity,
      },
    });
  } else if (state.pattern === "solid") {
    map.addLayer({ id: pat, type: "fill", source: id, paint: { "fill-color": state.patColor, "fill-opacity": state.patOpacity } });
  } else if (state.geometricScale.mode === "map") {
    const style = currentStyle();
    const variants = liveGeometricZoomVariants(style, id);
    variants.forEach(({ imageId, definition }) => installGeometricDefinition(imageId, definition));
    map.addLayer({
      id: pat,
      type: "fill",
      source: id,
      paint: {
        "fill-pattern": zoomPatternExpression(variants),
        "fill-opacity": state.patOpacity,
      },
    });
  } else {
    syncGeomTexture();
    map.addLayer({ id: pat, type: "fill", source: id, paint: { "fill-pattern": geomImageId(), "fill-opacity": state.patOpacity } });
  }

  if (state.outline.on) {
    map.addLayer({
      id: line, type: "line", source: id,
      paint: { "line-color": state.outline.color, "line-width": state.outline.width, ...(state.outline.dash.length ? { "line-dasharray": state.outline.dash } : {}) },
    });
  }
}

// Rebuild the style layers of the selected test feature.
function rebuildLayers() {
  if (!state.layer) return;
  const id = state.layer.source;
  removePatternLayers(id);
  rebuildPolygonLayers(id);
  rememberActiveStyle();
  showSelection(id);
}

// Lightweight paint updates for sliders (no layer rebuild).
function repaint() {
  if (!state.layer) return;
  const { bg, pat, line } = ids();
  if (map.getLayer(pat)) {
    map.setPaintProperty(pat, "fill-opacity", state.patOpacity);
    if (!state.fontFill.on && !state.svgFill.on && !state.cartographicPreset && state.pattern === "solid") {
      map.setPaintProperty(pat, "fill-color", state.patColor);
    }
  }
  if (map.getLayer(bg)) {
    map.setPaintProperty(bg, "fill-color", state.bg.color);
    map.setPaintProperty(bg, "fill-opacity", state.bg.opacity);
  }
  if (map.getLayer(line)) {
    map.setPaintProperty(line, "line-color", state.outline.color);
    map.setPaintProperty(line, "line-width", state.outline.width);
  }
  const scatterLayer = `${state.layer.source}__svgscatter_layer`;
  if (map.getLayer(scatterLayer)) {
    map.setPaintProperty(scatterLayer, "icon-opacity", state.patOpacity);
  }
  rememberActiveStyle();
}

function createSvgDefinition(style, effective) {
  const svg = resolveSvgFillSample(style.svgFill, style.patColor);
  return createSvgPatternDefinition({
    svg: svg || "<!-- paste a custom SVG in the panel first -->",
    stampSize: effective.stampSize,
    density: effective.density,
    distribution: style.svgFill.distribution,
    minSpacing: style.svgFill.minSpacing * effective.scale,
    positionJitter: style.svgFill.positionJitter,
    rotationJitterDeg: style.svgFill.rotationJitterDeg,
    scaleJitter: style.svgFill.scaleJitter,
    seed: style.svgFill.seed,
  });
}

function effectiveFontFill(style, zoom = map.getZoom()) {
  const source = style.fontFill;
  const maximumFontSize = Math.max(source.fontSize, FONT_GROUND_SCALE_MAX);
  const effective = scalePatternForZoom({
    mode: source.scaleMode,
    zoom,
    referenceZoom: source.referenceZoom,
    visualSize: source.fontSize,
    spacing: source.fontSize + Math.max(source.horizontalSpacing, source.verticalSpacing),
    minReadableSize: 8,
    maxVisualSize: maximumFontSize,
  });
  const atReadableFloor = effective.rawVisualSize <= effective.visualSize;
  const gapLimit = effective.visualSize * 0.2;
  const scaled = (value) => value * effective.scale;
  return {
    ...source,
    fontSize: effective.visualSize,
    letterSpacing: scaled(source.letterSpacing),
    horizontalSpacing: atReadableFloor
      ? Math.min(scaled(source.horizontalSpacing), gapLimit)
      : scaled(source.horizontalSpacing),
    verticalSpacing: atReadableFloor
      ? Math.min(scaled(source.verticalSpacing), gapLimit)
      : scaled(source.verticalSpacing),
  };
}

function createFontDefinition(style, fontFill = style.fontFill) {
  return createFontPatternDefinition({
    ...fontFill,
    color: style.patColor,
  });
}

function createFontZoomVariants(style) {
  const source = style.fontFill;
  const minimumFontSize = Math.min(source.fontSize, 8);
  const maximumFontSize = Math.max(source.fontSize, FONT_GROUND_SCALE_MAX);
  const firstZoom = Math.max(
    0,
    Math.floor(source.referenceZoom + Math.log2(minimumFontSize / source.fontSize)),
  );
  const lastZoom = Math.min(
    22,
    Math.max(
      firstZoom,
      Math.ceil(source.referenceZoom + Math.log2(maximumFontSize / source.fontSize)),
    ),
  );
  const variants = [];
  for (let zoom = firstZoom; zoom <= lastZoom; zoom++) {
    const definition = createFontDefinition(style, effectiveFontFill(style, zoom));
    variants.push({
      zoom,
      imageId: patternDefinitionId(definition),
      definition,
    });
  }
  return variants;
}

function liveFontZoomVariants(style, id) {
  return createFontZoomVariants(style).map((variant) => ({
    ...variant,
    imageId: `${fontImageId(id)}_z${variant.zoom}`,
  }));
}

function createSvgZoomVariants(style) {
  const metrics = svgMetrics(style.svgFill);
  const maximumVisualSize = Math.max(style.svgFill.visualSize, SVG_GROUND_SCALE_MAX);
  const minimumVisualSize = Math.min(
    style.svgFill.visualSize,
    metrics.minReadableSize,
  );
  const firstZoom = Math.max(
    0,
    Math.floor(
      style.svgFill.referenceZoom +
      Math.log2(minimumVisualSize / style.svgFill.visualSize),
    ),
  );
  const lastZoom = Math.min(
    22,
    Math.max(
      firstZoom,
      Math.ceil(
        style.svgFill.referenceZoom +
        Math.log2(maximumVisualSize / style.svgFill.visualSize),
      ),
    ),
  );
  const variants = [];
  for (let zoom = firstZoom; zoom <= lastZoom; zoom++) {
    const effective = scalePatternForZoom({
      mode: "map",
      zoom,
      referenceZoom: style.svgFill.referenceZoom,
      visualSize: style.svgFill.visualSize,
      spacing: style.svgFill.spacing,
      opticalScale: metrics.opticalScale,
      minReadableSize: metrics.minReadableSize,
      maxVisualSize: maximumVisualSize,
      maxSpacingAtReadableFloorRatio: 2,
    });
    const definition = createSvgDefinition(style, effective);
    variants.push({
      zoom,
      imageId: patternDefinitionId(definition),
      definition,
    });
  }
  return variants;
}

function zoomPatternExpression(variants) {
  return [
    "step",
    ["zoom"],
    variants[0].imageId,
    ...variants.slice(1).flatMap((variant) => [variant.zoom, variant.imageId]),
  ];
}

function canonicalScaleForStyle(style) {
  if (style.fontFill.on) {
    return style.fontFill.scaleMode === "map"
      ? { mode: "map", referenceZoom: style.fontFill.referenceZoom }
      : { mode: "screen" };
  }
  if (style.svgFill.on) {
    return style.svgFill.scaleMode === "map"
      ? { mode: "map", referenceZoom: style.svgFill.referenceZoom }
      : { mode: "screen" };
  }
  return style.geometricScale.mode === "map"
    ? { mode: "map", referenceZoom: style.geometricScale.referenceZoom }
    : { mode: "screen" };
}

function canonicalPresetPattern(id, label, style) {
  const preset = CARTOGRAPHIC_PRESETS[style.cartographicPreset];
  if (!preset) throw new TypeError(`Unknown cartographic preset: ${style.cartographicPreset}`);
  const spacing = Math.max(2, style.tile * (preset.spacingRatio ?? 0.5));
  let fill;
  if (preset.family === "glyph") {
    fill = {
      family: "glyph",
      glyph: preset.glyph,
      color: style.patColor,
      size: Math.max(1, style.weight * 2.4),
      rotation: preset.glyph === "diamond" ? 0 : style.angle,
      opacity: 1,
      placement: {
        kind: "lattice",
        tileSize: style.tile,
        spacing: { mode: "explicit", horizontal: spacing, vertical: spacing },
        rowOffset: preset.rowOffset ?? 0,
        columnOffset: preset.columnOffset ?? 0,
        gridAngle: 0,
        positionJitter: 0,
        rotationJitter: 0,
        scaleJitter: 0,
        seed: 1,
      },
    };
  } else {
    fill = {
      family: "line",
      shape: preset.shape,
      color: style.patColor,
      angle: style.angle,
      spacing,
      strokeWidth: style.weight,
      opacity: 1,
      ...(preset.shape === "dashed"
        ? preset.dashStyle === "dotted"
          ? { dash: { length: Math.max(1, style.weight), gap: Math.max(3, spacing * 0.32) } }
          : { dash: { length: Math.max(3, spacing * 0.55), gap: Math.max(2, spacing * 0.3) } }
        : {}),
      ...(preset.shape === "zigzag" || preset.shape === "wave"
        ? { oscillation: { amplitude: Math.max(1.5, spacing * 0.22), wavelength: Math.max(6, spacing * 1.35) } }
        : {}),
    };
  }
  return parsePattern({
    version: 1,
    kind: "pattern",
    id: `${id}-pattern`,
    name: label,
    fill,
    opacity: style.patOpacity,
    ...(style.bg.on ? { background: { color: style.bg.color, opacity: style.bg.opacity } } : {}),
    ...(style.outline.on ? {
      outline: { color: style.outline.color, width: style.outline.width, dash: style.outline.dash },
    } : {}),
    scale: canonicalScaleForStyle(style),
    render: { pixelRatio: style.geometricScale.pixelRatio === "auto" ? "auto" : 1 },
  });
}

function styleToCanonicalPattern(id, label, style) {
  const shared = {
    id: `${id}-pattern`,
    name: label,
    opacity: style.patOpacity,
    ...(style.bg.on
      ? { background: { color: style.bg.color, opacity: style.bg.opacity } }
      : {}),
    ...(style.outline.on
      ? {
          outline: {
            color: style.outline.color,
            width: style.outline.width,
            dash: style.outline.dash,
          },
        }
      : {}),
    scale: canonicalScaleForStyle(style),
  };
  if (style.cartographicPreset) return canonicalPresetPattern(id, label, style);
  if (style.pattern === "solid" && !style.fontFill.on && !style.svgFill.on) {
    return parsePattern({
      version: 1,
      kind: "pattern",
      ...shared,
      fill: { family: "solid", color: style.patColor },
      render: {
        pixelRatio: style.geometricScale.pixelRatio === "auto"
          ? "auto"
          : 1,
      },
    });
  }

  let definition;
  if (style.fontFill.on) {
    definition = createFontDefinition(style);
  } else if (style.svgFill.on) {
    definition = createSvgDefinition(
      style,
      effectiveSvgTexture(style, id, style.svgFill.referenceZoom),
    );
  } else {
    definition = createGeometricDefinition(style);
  }
  return patternFromLegacyDefinition(definition, shared);
}

function currentPatternSet() {
  rememberActiveStyle();
  return parsePatternSet({
    version: 1,
    kind: "pattern-set",
    id: "playground-pattern-set",
    name: "Playground pattern set",
    entries: Object.keys(FEATURES).map((id, index) => {
      const label = FEATURE_META[id]?.label || `Category ${index + 1}`;
      return {
        key: Object.prototype.hasOwnProperty.call(FEATURE_META[id] || {}, "key")
          ? FEATURE_META[id].key
          : label,
        label,
        pattern: styleToCanonicalPattern(
          id,
          label,
          FEATURE_STYLES[id] || DEFAULT_STYLE,
        ),
      };
    }),
  });
}

function canonicalSequenceParameter(pattern) {
  if (sequenceState.parameter === "opacity") return "opacity";
  if (sequenceState.parameter === "spacing") return "spacing";
  const fill = pattern.fill;
  if (fill.family === "line") return "strokeWidth";
  if (
    fill.family === "composite" &&
    fill.layers.some((layer) => layer.family === "line")
  ) return "strokeWidth";
  return "size";
}

function canonicalSequenceValue(value, style, parameter) {
  if (sequenceState.parameter !== "weight") {
    if (sequenceState.parameter !== "spacing") return value;
    if (style.fontFill.on || style.svgFill.on) return value;
    if (style.cartographicPreset) {
      return value * (CARTOGRAPHIC_PRESETS[style.cartographicPreset]?.spacingRatio ?? 0.5);
    }
    if (style.pattern === "stipple") return value / Math.sqrt(7);
    if (style.pattern === "hachures" || style.pattern === "cross") return value / 2;
    return value;
  }
  if (style.svgFill.on) return value / svgMetrics(style.svgFill).opticalScale;
  if (
    style.cartographicPreset &&
    CARTOGRAPHIC_PRESETS[style.cartographicPreset]?.family === "glyph" &&
    parameter === "size"
  ) return value * 2.4;
  if (style.pattern === "stipple" && parameter === "size") return value * 1.2;
  return value;
}

function currentPatternSequence() {
  const baseStyle = sequenceBaseStyle || currentStyle();
  const base = styleToCanonicalPattern("sequence-base", "Sequence base", baseStyle);
  const parameter = canonicalSequenceParameter(base);
  const start = sequenceState.inverted ? sequenceState.end : sequenceState.start;
  const end = sequenceState.inverted ? sequenceState.start : sequenceState.end;
  return parsePatternSequence({
    version: 1,
    kind: "pattern-sequence",
    id: "playground-pattern-sequence",
    name: "Playground pattern sequence",
    base,
    steps: sequenceState.steps,
    variation: {
      parameter,
      start: canonicalSequenceValue(start, baseStyle, parameter),
      end: canonicalSequenceValue(end, baseStyle, parameter),
      progression: sequenceState.progression,
      visualOrder: sequenceState.visualOrder,
    },
    overrides: Object.entries(sequenceState.overrides).map(([step, value]) => ({
      step: Number(step),
      value: canonicalSequenceValue(value, baseStyle, parameter),
    })),
  });
}

function currentDivergingPatternSet() {
  const ids = Object.keys(FEATURES).sort((first, second) =>
    sequenceStepForFeature(first) - sequenceStepForFeature(second),
  );
  return parsePatternSet({
    version: 1,
    kind: "pattern-set",
    id: "playground-diverging-pattern-set",
    name: "Playground diverging graduated set",
    entries: ids.map((id, index) => {
      const step = sequenceStepForFeature(id, index);
      const label = graduatedLabels(sequenceState.steps)[step] || `Class ${step + 1}`;
      return {
        key: step,
        label,
        pattern: styleToCanonicalPattern(
          `diverging-step-${step + 1}`,
          label,
          FEATURE_STYLES[id] || DEFAULT_STYLE,
        ),
      };
    }),
  });
}

function currentGraduatedConfig() {
  return sequenceState.scheme === "diverging"
    ? currentDivergingPatternSet()
    : currentPatternSequence();
}

function cartographicPresetForFill(fill) {
  if (fill.family === "glyph") {
    if (fill.glyph === "circle") {
      return fill.placement.kind === "lattice" && fill.placement.rowOffset === 0.5
        ? "offset-dots"
        : "dense-dots";
    }
    if (
      fill.glyph === "square" && fill.placement.kind === "lattice" &&
      (fill.placement.rowOffset !== 0 || fill.placement.columnOffset !== 0)
    ) return "brick";
    return ({
      square: "squares",
      diamond: "diamonds",
      plus: "crosses",
      x: "x-marks",
      triangle: "triangles",
      chevron: "chevrons",
    })[fill.glyph] || null;
  }
  if (fill.family !== "line") return null;
  if (fill.shape === "dashed") {
    return fill.dash && fill.dash.length <= fill.dash.gap * 0.4
      ? "dotted-line"
      : "dashed-hatch";
  }
  if (fill.shape === "zigzag") return "zigzag";
  if (fill.shape === "wave") return "wave";
  if (fill.shape !== "straight") return null;
  if (fill.angle === 0) return "horizontal";
  if (Math.abs(fill.angle) === 90) return "vertical";
  if (fill.angle === -45 || fill.angle === 135) return "reverse-diagonal";
  return null;
}

function legacyStyleFromCanonicalPattern(value) {
  const pattern = parsePattern(value);
  const style = clone(DEFAULT_STYLE);
  style.patOpacity = pattern.opacity;
  style.bg = pattern.background
    ? { on: true, color: pattern.background.color, opacity: pattern.background.opacity }
    : { ...style.bg, on: false };
  style.outline = pattern.outline
    ? {
        on: true,
        color: pattern.outline.color,
        width: pattern.outline.width,
        dash: pattern.outline.dash,
      }
    : { ...style.outline, on: false };

  const scaleMode = pattern.scale.mode;
  const referenceZoom = pattern.scale.mode === "map" ? pattern.scale.referenceZoom : 12;
  if (pattern.fill.family === "solid") {
    style.pattern = "solid";
    style.patColor = pattern.fill.color;
    style.fontFill.on = false;
    style.svgFill.on = false;
    style.geometricScale = {
      mode: scaleMode,
      referenceZoom,
      pixelRatio: pattern.render.pixelRatio,
    };
    return style;
  }

  const presetId = cartographicPresetForFill(pattern.fill);
  if (presetId) {
    const fill = pattern.fill;
    const preset = CARTOGRAPHIC_PRESETS[presetId];
    style.cartographicPreset = presetId;
    style.patColor = fill.color;
    style.angle = fill.family === "line" ? fill.angle : fill.rotation;
    style.weight = fill.family === "line" ? fill.strokeWidth : fill.size / 2.4;
    style.tile = fill.family === "glyph"
      ? fill.placement.tileSize
      : fill.spacing / (preset.spacingRatio ?? 0.5);
    style.fontFill.on = false;
    style.svgFill.on = false;
    style.geometricScale = {
      mode: scaleMode,
      referenceZoom,
      pixelRatio: pattern.render.pixelRatio,
    };
    return style;
  }

  const definition = patternToLegacyDefinition(pattern);
  if (definition.kind === "geometric") {
    style.pattern = definition.pattern;
    style.patColor = definition.color;
    style.weight = definition.weight;
    style.angle = definition.angle;
    style.tile = definition.size;
    style.fontFill.on = false;
    style.svgFill.on = false;
    style.geometricScale = {
      mode: scaleMode,
      referenceZoom,
      pixelRatio: definition.pixelRatio ?? pattern.render.pixelRatio,
    };
  } else if (definition.kind === "font") {
    style.pattern = "hachures";
    style.patColor = definition.color;
    style.fontFill = {
      ...style.fontFill,
      on: true,
      text: definition.text,
      fontFamily: definition.fontFamily,
      fontSize: definition.fontSize,
      fontWeight: definition.fontWeight,
      fontStyle: definition.fontStyle,
      letterSpacing: definition.letterSpacing,
      horizontalSpacing: definition.horizontalSpacing,
      verticalSpacing: definition.verticalSpacing,
      rotationDeg: definition.rotationDeg,
      stagger: definition.stagger,
      scaleMode,
      referenceZoom,
    };
    style.svgFill.on = false;
  } else {
    style.pattern = "hachures";
    style.svgFill = {
      ...style.svgFill,
      on: true,
      noCut: false,
      sample: "custom",
      customSvg: definition.svg,
      visualSize: definition.stampSize,
      spacing: 100 / Math.sqrt(definition.density),
      distribution: definition.distribution,
      minSpacing: definition.minSpacing,
      positionJitter: definition.positionJitter,
      rotationJitterDeg: definition.rotationJitterDeg,
      scaleJitter: definition.scaleJitter,
      scaleMode,
      referenceZoom,
      seed: definition.seed,
    };
    style.fontFill.on = false;
  }
  return style;
}

function legacySequenceValue(value, baseStyle, parameter) {
  if (parameter === "opacity") return value;
  if (parameter === "spacing") {
    if (baseStyle.fontFill.on || baseStyle.svgFill.on) return value;
    if (baseStyle.cartographicPreset) {
      return value / (CARTOGRAPHIC_PRESETS[baseStyle.cartographicPreset]?.spacingRatio ?? 0.5);
    }
    if (baseStyle.pattern === "stipple") return value * Math.sqrt(7);
    if (baseStyle.pattern === "hachures" || baseStyle.pattern === "cross") return value * 2;
    return value;
  }
  if (baseStyle.svgFill.on) return value * svgMetrics(baseStyle.svgFill).opticalScale;
  if (
    baseStyle.cartographicPreset &&
    CARTOGRAPHIC_PRESETS[baseStyle.cartographicPreset]?.family === "glyph" &&
    parameter === "size"
  ) return value / 2.4;
  if (baseStyle.pattern === "stipple" && parameter === "size") return value / 1.2;
  return value;
}

function setCollectionPolygons(center, count) {
  if (count > 0 && count <= SET_SAMPLE_LABELS.length && worldDemoFeatures.length) {
    return categorizedMapFeatures(count);
  }
  const columns = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / columns);
  const width = 0.12;
  const height = 0.07;
  const left = center.lng - width / 2;
  const top = center.lat + height / 2;
  return Array.from({ length: count }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x0 = left + width * column / columns;
    const x1 = left + width * (column + 1) / columns;
    const y1 = top - height * row / rows;
    const y0 = top - height * (row + 1) / rows;
    return {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]],
      },
      properties: {},
    };
  });
}

function loadCanonicalPattern(value) {
  const style = legacyStyleFromCanonicalPattern(value);
  setDesignContext("pattern");
  loadStyle(style);
  if (state.layer) {
    FEATURE_STYLES[state.layer.source] = currentStyle();
    rebuildLayers();
  }
  applyStateToUI();
}

function loadCanonicalPatternSet(value) {
  const patternSet = parsePatternSet(value);
  if (patternSet.entries.length > MAX_FEATURES) {
    throw new RangeError(`The playground previews at most ${MAX_FEATURES} Pattern Set entries`);
  }
  const styles = patternSet.entries.map(({ pattern }) => legacyStyleFromCanonicalPattern(pattern));
  setDesignContext("set");
  const center = map.getCenter();
  clearFeatures();
  featureOrigin = center;
  sourceMode = "sample";
  sourceFileName = "";
  setCollectionPolygons(center, patternSet.entries.length).forEach((feature, index) => {
    const entry = patternSet.entries[index];
    const id = addFeatureToMap(
      feature,
      entry.label || String(entry.key),
      styles[index],
    );
    FEATURE_META[id].key = entry.key;
    if (patternSet.entries.length <= SET_SAMPLE_LABELS.length && worldDemoFeatures.length) {
      FEATURE_META[id].demoContext = "categorized";
    }
  });
  renderFeatureTable();
  const firstId = Object.keys(FEATURES)[0];
  if (firstId) selectLayer(firstId);
  fitWorkspaceFeatures();
}

function loadCanonicalPatternSequence(value) {
  const sequence = parsePatternSequence(value);
  if (sequence.steps < 3 || sequence.steps > 7) {
    throw new RangeError("The playground previews Pattern Sequences with 3 to 7 steps");
  }
  const baseStyle = legacyStyleFromCanonicalPattern(sequence.base);
  const uiParameter = sequence.variation.parameter === "opacity"
    ? "opacity"
    : sequence.variation.parameter === "spacing"
      ? "spacing"
      : "weight";
  setDesignContext("sequence");
  sequenceBaseStyle = baseStyle;
  sequenceState.steps = sequence.steps;
  sequenceState.parameter = uiParameter;
  sequenceState.progression = sequence.variation.progression ?? "linear";
  sequenceState.start = legacySequenceValue(
    sequence.variation.start,
    baseStyle,
    sequence.variation.parameter,
  );
  sequenceState.end = legacySequenceValue(
    sequence.variation.end,
    baseStyle,
    sequence.variation.parameter,
  );
  const numericIncrease = sequence.variation.end > sequence.variation.start;
  const inferredWeightIncrease = sequence.variation.parameter === "spacing"
    ? !numericIncrease
    : numericIncrease;
  sequenceState.visualOrder = sequence.variation.visualOrder ?? (
    inferredWeightIncrease ? "low-to-high" : "high-to-low"
  );
  sequenceState.scheme = "sequential";
  sequenceState.inverted = sequenceState.visualOrder === "high-to-low";
  if (sequenceState.inverted) {
    [sequenceState.start, sequenceState.end] = [sequenceState.end, sequenceState.start];
  }
  sequencePresetId = inferGraduatedPreset(baseStyle, uiParameter);
  sequenceStyling = false;
  $("panel").classList.remove("sequence-styling");
  sequenceState.overrides = Object.fromEntries(sequence.overrides.map(({ step, value: override }) => [
    step,
    legacySequenceValue(override, baseStyle, sequence.variation.parameter),
  ]));
  applySequencePreview();
}

// Export a polygon style fragment.
function buildExportedStyle() {
  if (designContext === "set") {
    return createPatternSetStyleFragment(currentPatternSet(), { property: "category" });
  }
  if (designContext === "sequence") {
    const graduated = currentGraduatedConfig();
    return graduated.kind === "pattern-set"
      ? createPatternSetStyleFragment(graduated, { property: "step" })
      : createPatternSequenceStyleFragment(graduated, { property: "step" });
  }
  return createPatternStyleFragment(
    styleToCanonicalPattern("playground-pattern", "Playground pattern", currentStyle()),
  );
}

// Random GeoJSON test features.
const MAX_FEATURES = 64;
const MAX_SAMPLE_FEATURES = 64;
const FEATURES = {};
const FEATURE_META = {};
// A conventional reading-order grid anchored at Sample 1: fill each row
// from left to right, then continue on the next row below. Spacing (see
// `spacingX`/`spacingY` in addFeature) remains wide enough that generated
// polygons cannot overlap.
const SAMPLE_GRID_COLUMNS = 5;
function buildGridLattice(count, columns) {
  const points = [];
  for (let i = 0; i < count; i++) {
    const col = i % columns;
    const row = Math.floor(i / columns);
    points.push([col, -row]);
  }
  return points;
}
const SAMPLE_LATTICE = buildGridLattice(MAX_SAMPLE_FEATURES, SAMPLE_GRID_COLUMNS);
function samplePosition(index) {
  return SAMPLE_LATTICE[index] || [0, 0];
}
let featureOrigin = null;
let featureSerial = 0;
let sourceMode = "sample";
let sourceFileName = "";

function randomPolygon(cx, cy, rBase) {
  const pts = [], n = 6 + Math.floor(Math.random() * 4);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = rBase * (0.6 + Math.random() * 0.7);
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.7]);
  }
  pts.push(pts[0]);
  return { type: "Feature", geometry: { type: "Polygon", coordinates: [pts] }, properties: {} };
}

// Remove generated layers without touching the main GeoJSON source.
function removePatternLayers(id) {
  [`${id}__line`, `${id}__pat`, `${id}__bg`, `${id}__svgscatter_layer`].forEach((l) => map.getLayer(l) && map.removeLayer(l));
  if (map.hasImage(`${id}__pat_img`)) map.removeImage(`${id}__pat_img`);
  if (map.hasImage(`${id}__svg_img`)) map.removeImage(`${id}__svg_img`);
  if (map.hasImage(`${id}__font_img`)) map.removeImage(`${id}__font_img`);
  for (let zoom = 0; zoom <= 22; zoom++) {
    [`${id}__pat_img_z${zoom}`, `${id}__svg_img_z${zoom}`, `${id}__font_img_z${zoom}`].forEach((imageId) => {
      if (map.hasImage(imageId)) map.removeImage(imageId);
    });
  }
  if (map.getSource(`${id}__svgscatter`)) map.removeSource(`${id}__svgscatter`);
}

function removeStyleLayers(id) {
  [`${id}__selection`, `${id}__idle_line`, `${id}__idle`]
    .forEach((layerId) => map.getLayer(layerId) && map.removeLayer(layerId));
  removePatternLayers(id);
}

function removeFeatureCompletely(id) {
  removeStyleLayers(id);
  if (map.getSource(id)) map.removeSource(id);
}

function clearFeatures() {
  Object.keys(FEATURES).forEach((id) => {
    removeFeatureCompletely(id);
    delete FEATURES[id];
    delete FEATURE_STYLES[id];
    delete FEATURE_META[id];
  });
  $("layerSelect").innerHTML = "";
  state.layer = null;
  featureSerial = 0;
}

// Each design context is a small independent workspace. Switching tabs should
// never destroy the polygons, category count, styles, or active selection that
// the user already edited in another context.
const designWorkspaces = new Map();

function captureDesignWorkspace(context = designContext) {
  if (Object.keys(FEATURES).length === 0) return;
  rememberActiveStyle({ refreshLegend: false });
  const ids = Object.keys(FEATURES);
  designWorkspaces.set(context, {
    entries: ids.map((id) => ({
      feature: clone(FEATURES[id].features[0]),
      meta: clone(FEATURE_META[id]),
      style: clone(FEATURE_STYLES[id] || DEFAULT_STYLE),
    })),
    selectedIndex: Math.max(0, ids.indexOf(state.layer?.source)),
    sourceMode,
    sourceFileName,
    featureOrigin: featureOrigin ? clone(featureOrigin) : null,
  });
}

function restoreDesignWorkspace(workspace) {
  clearFeatures();
  sourceMode = workspace.sourceMode;
  sourceFileName = workspace.sourceFileName;
  featureOrigin = workspace.featureOrigin ? clone(workspace.featureOrigin) : null;
  workspace.entries.forEach((entry) => {
    const id = addFeatureToMap(
      entry.feature,
      entry.meta.label,
      entry.style,
      Boolean(entry.meta.imported),
    );
    Object.assign(FEATURE_META[id], clone(entry.meta));
  });
  renderFeatureTable();
  const ids = Object.keys(FEATURES);
  const selectedId = ids[Math.min(workspace.selectedIndex, ids.length - 1)];
  if (selectedId) selectLayer(selectedId);
  fitWorkspaceFeatures();
}

function showSelection(id) {
  Object.keys(FEATURES).forEach((featureId) => {
    const visibility = designContext !== "pattern" || featureId === id ? "none" : "visible";
    if (map.getLayer(`${featureId}__idle`)) {
      map.setLayoutProperty(`${featureId}__idle`, "visibility", visibility);
      if (visibility === "visible") map.moveLayer(`${featureId}__idle`);
    }
    if (map.getLayer(`${featureId}__idle_line`)) {
      map.setLayoutProperty(`${featureId}__idle_line`, "visibility", visibility);
      if (visibility === "visible") map.moveLayer(`${featureId}__idle_line`);
    }
    const selectionId = `${featureId}__selection`;
    if (map.getLayer(selectionId)) {
      // A thematic item can represent dozens of countries in one MultiPolygon.
      // Highlight its legend item instead of drawing one loud outline around
      // every country that happens to share the selected class/category.
      const selected = designContext === "pattern" && featureId === id;
      map.setLayoutProperty(selectionId, "visibility", selected ? "visible" : "none");
      if (selected) map.moveLayer(selectionId);
    }
  });
}

const EYE_ICON = '<svg viewBox="0 0 18 10" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M1 5c1.8-3 4.8-4.5 8-4.5S15.2 2 17 5c-1.8 3-4.8 4.5-8 4.5S2.8 8 1 5Z"/><circle cx="9" cy="5" r="1.7" fill="currentColor" stroke="none"/></svg>';

function renderFeatureTable() {
  const body = $("featureTableBody");
  body.innerHTML = "";
  Object.keys(FEATURES).forEach((id, index) => {
    const row = document.createElement("tr");
    row.dataset.feature = id;
    row.className = id === state.layer?.source ? "active" : "";
    const indexCell = document.createElement("td");
    indexCell.className = "row-index";
    indexCell.textContent = String(index + 1).padStart(2, "0");
    const labelCell = document.createElement("td");
    labelCell.className = "row-label";
    labelCell.textContent = FEATURE_META[id]?.label || `Polygon ${index + 1}`;
    const eyeCell = document.createElement("td");
    eyeCell.className = "row-eye";
    eyeCell.innerHTML = EYE_ICON;
    row.append(indexCell, labelCell, eyeCell);
    row.addEventListener("click", () => selectLayer(id));
    body.appendChild(row);
  });
  const count = Object.keys(FEATURES).length;
  $("polygonCount").textContent = `${count} polygon${count === 1 ? "" : "s"}`;
  updateCategoryControls();
  renderDesignLegend();
}

function updateCategoryControls() {
  const count = Object.keys(FEATURES).length;
  const available = designContext === "set" && sourceMode === "sample";
  $("categoryCountInput").value = String(count);
  $("categoryCountInput").disabled = !available;
  $("randomizeCategoriesButton").disabled = !available;
  $("randomizeCategoriesButton").title = available
    ? "Randomize patterns and colours"
    : "Randomizing categories is available in the built-in categorized example";
}

function fitAllFeatures() {
  const allCoords = [];
  const collectPositions = (coordinates) => {
    if (
      Array.isArray(coordinates) && coordinates.length >= 2 &&
      typeof coordinates[0] === "number" && typeof coordinates[1] === "number"
    ) {
      allCoords.push(coordinates);
      return;
    }
    coordinates.forEach(collectPositions);
  };
  Object.values(FEATURES).forEach((collection) => {
    collectPositions(collection.features[0].geometry.coordinates);
  });
  const bounds = allCoords.reduce(
    (acc, [x, y]) => [Math.min(acc[0], x), Math.min(acc[1], y), Math.max(acc[2], x), Math.max(acc[3], y)],
    [180, 90, -180, -90],
  );
  const compact = window.innerWidth < 700;
  const workspacePadding = designContext === "set" ? 34 : 70;
  map.fitBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]], {
    padding: compact
      ? designContext === "set"
        ? { top: 38, right: 24, bottom: 38, left: 24 }
        : { top: 80, right: 40, bottom: 80, left: 40 }
      : { top: workspacePadding, right: workspacePadding, bottom: workspacePadding, left: workspacePadding },
    maxZoom: 13.5,
    duration: 450,
  });
}

function fitThematicDemo() {
  const compact = window.innerWidth < 700;
  map.easeTo({
    center: THEMATIC_DEMO_VIEW.center,
    zoom: compact ? 2.25 : THEMATIC_DEMO_VIEW.zoom,
    bearing: 0,
    pitch: 0,
    duration: 450,
  });
}

function fitWorkspaceFeatures() {
  const usesWorldDemo = Object.values(FEATURE_META).some(({ demoContext }) =>
    demoContext === "categorized" || demoContext === "graduated",
  );
  if (sourceMode === "sample" && designContext !== "pattern" && usesWorldDemo) {
    fitThematicDemo();
    return;
  }
  fitAllFeatures();
}

function addFeatureToMap(feature, label, style, imported = false) {
  const index = Object.keys(FEATURES).length;
  if (index >= MAX_FEATURES) return;
  if (state.layer) rememberActiveStyle();
  const sel = $("layerSelect");
  const id = `feature_${++featureSerial}`;
  const fc = { type: "FeatureCollection", features: [clone(feature)] };
  FEATURES[id] = fc;
  FEATURE_META[id] = { label, imported };
  map.addSource(id, { type: "geojson", data: fc });

  const option = document.createElement("option");
  option.value = id;
  option.textContent = label;
  sel.appendChild(option);

  FEATURE_STYLES[id] = clone(style);
  state.layer = { source: id };
  loadStyle(FEATURE_STYLES[id]);
  rebuildPolygonLayers(id);
  map.addLayer({
    id: `${id}__idle`,
    type: "fill",
    source: id,
    paint: { "fill-color": "#cbd2cf", "fill-opacity": 0.9 },
  });
  map.addLayer({
    id: `${id}__idle_line`,
    type: "line",
    source: id,
    paint: { "line-color": "#87928d", "line-width": 1.2, "line-opacity": 0.9 },
  });
  map.addLayer({
    id: `${id}__selection`,
    type: "line",
    source: id,
    layout: { visibility: "none" },
    paint: { "line-color": "#2c6a5b", "line-width": 1.8, "line-opacity": 0.9 },
  });
  return id;
}

function addFeature() {
  const index = Object.keys(FEATURES).length;
  if (index >= MAX_SAMPLE_FEATURES) return;
  const span = 0.028;
  // randomPolygon draws an ellipse-ish shape (y scaled by 0.7), so its
  // vertices never reach farther than ~1.07*span horizontally or
  // ~0.75*span vertically from its own center. Spacing each axis to that
  // axis's own worst case (with a small margin) keeps any two generated
  // polygons from ever touching while packing them much closer than a
  // single shared spacing value would.
  const spacingX = span * 2.2;
  const spacingY = span * 1.55;
  const [offsetX, offsetY] = samplePosition(index);
  const cx = featureOrigin.lng + offsetX * spacingX;
  const cy = featureOrigin.lat + offsetY * spacingY;
  const feature = randomPolygon(cx, cy, span * 0.82);
  const id = addFeatureToMap(
    feature,
    `Sample ${index + 1}`,
    DEFAULT_STYLE,
  );
  sourceMode = "sample";
  sourceFileName = "";
  renderFeatureTable();
  selectLayer(id);
  fitAllFeatures();
}

function removeSelectedSample() {
  const ids = Object.keys(FEATURES);
  if (designContext !== "pattern" || sourceMode !== "sample" || ids.length <= 1) return;
  rememberActiveStyle({ refreshLegend: false });
  const selectedIndex = Math.max(0, ids.indexOf(state.layer?.source));
  const targetId = ids[selectedIndex] || ids[ids.length - 1];
  removeFeatureCompletely(targetId);
  delete FEATURES[targetId];
  delete FEATURE_STYLES[targetId];
  delete FEATURE_META[targetId];
  Array.from($("layerSelect").options)
    .find((option) => option.value === targetId)
    ?.remove();
  const remainingIds = Object.keys(FEATURES);
  remainingIds.forEach((id, index) => {
    const label = `Sample ${index + 1}`;
    FEATURE_META[id].label = label;
    const option = Array.from($("layerSelect").options)
      .find((candidate) => candidate.value === id);
    if (option) option.textContent = label;
  });
  state.layer = null;
  renderFeatureTable();
  selectLayer(remainingIds[Math.min(selectedIndex, remainingIds.length - 1)]);
  fitAllFeatures();
  toast("Sample removed");
}

function generateFeatures() {
  clearFeatures();
  // The single-pattern example is intentionally anchored in Karlsruhe,
  // independently of the last viewport used by the thematic examples.
  featureOrigin = { lng: SAMPLE_CENTER[0], lat: SAMPLE_CENTER[1] };
  sourceMode = "sample";
  sourceFileName = "";
  addFeature();
}

function importedFeatureLabel(feature, index) {
  const properties = feature.properties || {};
  const value = [
    properties.name,
    properties.nom,
    properties.title,
    properties.label,
    properties.ref,
    properties.code,
    feature.id,
  ].find((candidate) => (
    typeof candidate === "string" && candidate.trim() ||
    typeof candidate === "number"
  ));
  return value === undefined ? `Polygon ${index + 1}` : String(value).trim();
}

function replaceWithImportedFeatures(features, fileName) {
  clearFeatures();
  sourceMode = "import";
  sourceFileName = fileName;
  const labels = new Map();
  let firstId = null;
  features.forEach((feature, index) => {
    const baseLabel = importedFeatureLabel(feature, index);
    const occurrence = (labels.get(baseLabel) || 0) + 1;
    labels.set(baseLabel, occurrence);
    const label = occurrence === 1 ? baseLabel : `${baseLabel} (${occurrence})`;
    const id = addFeatureToMap(feature, label, DEFAULT_STYLE, true);
    firstId ||= id;
  });
  renderFeatureTable();
  selectLayer(firstId);
  fitAllFeatures();
}

function selectLayer(id, { focusEditor = false } = {}) {
  if (!id || !FEATURES[id]) return;
  if (state.layer && state.layer.source !== id) rememberActiveStyle();
  state.layer = { source: id };
  loadStyle(FEATURE_STYLES[id] || DEFAULT_STYLE);
  $("layerSelect").value = id;
  const featureLabel = FEATURE_META[id]?.label || `Polygon ${id.split("_")[1]}`;
  const label = designContext === "sequence"
    ? graduatedLabels(sequenceState.steps, sequenceState.visualOrder)[activeSequenceStepIndex(id)]
    : featureLabel;
  const count = Object.keys(FEATURES).length;
  $("activePolygonLabel").textContent = label;
  $("activeContextLabel").textContent = designContext === "set"
    ? "Editing:"
    : designContext === "sequence"
      ? "Editing step:"
      : "Pattern:";
  $("srcHint").textContent = sourceMode === "import"
      ? `${sourceFileName} · ${featureLabel}${count > 1 ? " selected" : ""}`
    : designContext === "set"
      ? `${label} selected. All set members remain visible for comparison.`
      : designContext === "sequence"
        ? `${label} selected. Every sequence step remains visible.`
      : count === 1
      ? "Adjust its style, open vector data or add another sample."
      : `${label} selected. Click another shape to edit it.`;
  document.querySelectorAll("#featureTableBody tr").forEach((row) => {
    row.classList.toggle("active", row.dataset.feature === id);
  });
  applyStateToUI();
  updateSequenceControls();
  updateStyleTransferControls();
  showSelection(id);
  renderDesignLegend();
  if (state.fontFill.on) syncFontFill();
  else if (state.svgFill.on) syncSvgFill();
  if (focusEditor && designContext === "set") {
    openTool("fill");
    $("patternFineTune").open = false;
    if (state.svgFill.on) openSvgInspectorSection("appearance");
    if (state.fontFill.on) openFontInspectorSection("type");
    const panelBody = document.querySelector('[data-panel-body="feature"]');
    panelBody.scrollTop = Math.max(0, $("toolTabs").offsetTop - 12);
  }
}

function rebuildCategorizedSamples(count, selectedIndex = 0, suppliedStyles = null) {
  const previousIds = Object.keys(FEATURES);
  const preservePrevious = previousIds.length > 0 && previousIds.every((id) =>
    FEATURE_META[id]?.demoContext === "categorized",
  );
  const previousStyles = suppliedStyles || (preservePrevious
    ? previousIds.map((id) => clone(FEATURE_STYLES[id] || DEFAULT_STYLE))
    : []);
  clearFeatures();
  featureOrigin = { lng: THEMATIC_DEMO_VIEW.center[0], lat: THEMATIC_DEMO_VIEW.center[1] };
  sourceMode = "sample";
  sourceFileName = "";
  categorizedMapFeatures(count).forEach((feature, index) => {
    const id = addFeatureToMap(
      feature,
      SET_SAMPLE_LABELS[index],
      previousStyles[index]
        || randomizedCategorizedStyles?.[index]
        || featureStyleFor(categorizedPresetOrder[index]),
    );
    FEATURE_META[id].demoContext = "categorized";
  });
  renderFeatureTable();
  const ids = Object.keys(FEATURES);
  const selectedId = ids[Math.min(selectedIndex, ids.length - 1)];
  if (selectedId) selectLayer(selectedId);
  fitWorkspaceFeatures();
}

function randomizeCategorizedSamples() {
  if (designContext !== "set" || sourceMode !== "sample") return;
  rememberActiveStyle({ refreshLegend: false });
  const ids = Object.keys(FEATURES);
  if (ids.length === 0) return;
  const activeIndex = Math.max(0, ids.indexOf(state.layer?.source));
  randomizedCategorizedStyles = randomizedCategorizedStyleSet();
  categorizedCountryOrder = shuffled(worldDemoFeatures);
  rebuildCategorizedSamples(
    ids.length,
    activeIndex,
    randomizedCategorizedStyles.slice(0, ids.length),
  );
}

function ensureSetSamples() {
  if (sourceMode !== "sample") {
    updateCategoryControls();
    return;
  }
  const existingIds = Object.keys(FEATURES);
  const alreadyCategorized = existingIds.length > 0 && existingIds.every((id) =>
    FEATURE_META[id]?.demoContext === "categorized",
  );
  if (!alreadyCategorized) rebuildCategorizedSamples(DEFAULT_CATEGORY_COUNT);
  else updateCategoryControls();
}

function ensurePatternSample() {
  if (sourceMode !== "sample") return;
  const ids = Object.keys(FEATURES);
  const alreadySinglePattern = ids.length === 1 && FEATURE_META[ids[0]]?.label === "Sample 1";
  if (!alreadySinglePattern) generateFeatures();
}

function ensureSequenceSamples() {
  if (sourceMode !== "sample") return;
  const existingIds = Object.keys(FEATURES);
  const alreadySequence = existingIds.length === sequenceState.steps &&
    existingIds.every((id) => FEATURE_META[id]?.demoContext === "graduated" &&
      FEATURE_META[id]?.sequenceSteps === sequenceState.steps);
  if (alreadySequence) return;

  const center = map.getCenter();
  clearFeatures();
  featureOrigin = center;
  sourceMode = "sample";
  graduatedMapFeatures(sequenceState.steps).forEach((feature, index) => {
    const step = feature.properties.sequenceStep;
    const id = addFeatureToMap(
      feature,
      feature.properties.name || `Region ${index + 1}`,
      sequenceBaseStyle || DEFAULT_STYLE,
    );
    FEATURE_META[id].demoContext = "graduated";
    FEATURE_META[id].sequenceStep = step;
    FEATURE_META[id].sequenceSteps = sequenceState.steps;
  });
  renderFeatureTable();
  const firstId = Object.keys(FEATURES)[0];
  if (firstId) state.layer = { source: firstId };
  fitWorkspaceFeatures();
}

function sequenceValueAt(index) {
  if (Object.prototype.hasOwnProperty.call(sequenceState.overrides, index)) {
    return sequenceState.overrides[index];
  }
  const linearProgress = index / (sequenceState.steps - 1);
  const orderedProgress = sequenceState.inverted ? 1 - linearProgress : linearProgress;
  const progress = sequenceState.scheme === "diverging"
    ? Math.abs(orderedProgress * 2 - 1)
    : orderedProgress;
  return interpolateSequenceValue(
    sequenceState.start,
    sequenceState.end,
    progress,
    sequenceState.progression,
  );
}

function colorChannels(hex) {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function interpolateHexColor(from, to, progress) {
  const first = colorChannels(from);
  const second = colorChannels(to);
  const channels = first.map((value, index) =>
    Math.round(value + (second[index] - value) * progress),
  );
  return `#${channels.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function sequenceColorAt(index) {
  if (sequenceState.scheme !== "diverging") return sequenceBaseStyle?.patColor || "#273733";
  let progress = index / (sequenceState.steps - 1);
  if (sequenceState.inverted) progress = 1 - progress;
  const neutral = "#737a76";
  return progress <= 0.5
    ? interpolateHexColor(sequenceState.lowColor, neutral, progress * 2)
    : interpolateHexColor(neutral, sequenceState.highColor, (progress - 0.5) * 2);
}

function sequenceStepForFeature(id, fallbackIndex = 0) {
  return FEATURE_META[id]?.sequenceStep ?? (fallbackIndex % sequenceState.steps);
}

function activeSequenceStepIndex(id = state.layer?.source) {
  const ids = Object.keys(FEATURES);
  const index = Math.max(0, ids.indexOf(id));
  return sequenceStepForFeature(id, index);
}

function applyLegacySequenceValue(style, value) {
  if (sequenceState.parameter === "opacity") {
    style.patOpacity = value;
  } else if (sequenceState.parameter === "weight") {
    if (style.fontFill.on) style.fontFill.fontSize = value;
    else if (style.svgFill.on) style.svgFill.visualSize = value;
    else style.weight = value;
  } else if (style.fontFill.on) {
    style.fontFill.horizontalSpacing = value;
    style.fontFill.verticalSpacing = value;
  } else if (style.svgFill.on) {
    style.svgFill.spacing = value;
  } else {
    style.tile = value;
  }
  return style;
}

function restoreLegacySequenceValue(target, source) {
  if (sequenceState.parameter === "opacity") {
    target.patOpacity = source.patOpacity;
  } else if (sequenceState.parameter === "weight") {
    target.weight = source.weight;
    target.fontFill.fontSize = source.fontFill.fontSize;
    target.svgFill.visualSize = source.svgFill.visualSize;
  } else {
    target.tile = source.tile;
    target.fontFill.horizontalSpacing = source.fontFill.horizontalSpacing;
    target.fontFill.verticalSpacing = source.fontFill.verticalSpacing;
    target.svgFill.spacing = source.svgFill.spacing;
  }
}

function updateSequenceControls() {
  const activeTool = document.querySelector("#toolTabs .tool-tab.active")?.dataset.tool;
  const visible = designContext === "sequence" && activeTool === "fill";
  $("sequenceControls").hidden = !visible;
  $("patternTuneStageLabel").textContent = "Tune";
  $("sequenceSteps").value = String(sequenceState.steps);
  if (!visible) return;
  $("sequenceParameter").value = sequenceState.parameter;
  document.querySelectorAll("#sequenceSchemePicker [data-sequence-scheme]").forEach((button) => {
    button.classList.toggle("active", button.dataset.sequenceScheme === sequenceState.scheme);
  });
  $("sequenceInvertButton").setAttribute("aria-checked", String(sequenceState.inverted));
  $("sequenceInvertButton").title = sequenceState.inverted
    ? "Use original class order"
    : "Invert class order";
  $("sequenceDivergingColours").hidden = sequenceState.scheme !== "diverging";
  $("sequenceLowColor").value = $("sequenceLowColorHex").value = sequenceState.lowColor;
  $("sequenceHighColor").value = $("sequenceHighColorHex").value = sequenceState.highColor;
  document.querySelectorAll("#sequenceVariationPicker [data-sequence-parameter]").forEach((button) => {
    button.classList.toggle("active", button.dataset.sequenceParameter === sequenceState.parameter);
  });
  document.querySelectorAll("#sequencePresetRamps [data-sequence-preset]").forEach((button) => {
    button.classList.toggle("active", button.dataset.sequencePreset === sequencePresetId);
  });
  $("sequenceCustomizeToggle").setAttribute("aria-expanded", String(sequenceStyling));
  $("sequenceCustomizeToggle").textContent = sequenceStyling ? "Hide global styling" : "Style all classes";
  $("sequenceGlobalStyleNote").hidden = !sequenceStyling;
  $("panel").classList.toggle("sequence-styling", sequenceStyling);
  $("panel").classList.toggle("sequence-vary-spacing", sequenceState.parameter === "spacing");
  $("panel").classList.toggle("sequence-vary-weight", sequenceState.parameter === "weight");
  $("panel").classList.toggle("sequence-vary-opacity", sequenceState.parameter === "opacity");
  const progressionDescription = sequenceState.scheme === "diverging"
    ? sequenceState.parameter === "spacing"
      ? "texture opens at the centre and becomes denser toward both ends"
      : sequenceState.parameter === "weight"
        ? "marks become lighter at the centre and heavier toward both ends"
        : "texture becomes lighter at the centre and darker toward both ends"
    : sequenceState.parameter === "spacing"
      ? sequenceState.visualOrder === "low-to-high" ? "texture becomes denser" : "texture becomes more open"
      : sequenceState.parameter === "weight"
        ? sequenceState.visualOrder === "low-to-high" ? "marks become heavier" : "marks become lighter"
        : sequenceState.visualOrder === "low-to-high" ? "texture becomes darker" : "texture becomes lighter";
  const progressionLabel = sequenceState.progression === "geometric"
    ? "Geometric · even visual steps"
    : "Linear · equal numeric steps";
  $("sequenceDirectionNote").textContent = sequenceState.scheme === "diverging"
    ? `${progressionLabel} · ${progressionDescription}. Two hues identify the opposing ends.`
    : `${progressionLabel} · ${progressionDescription}.`;
  $("sequenceStart").value = sequenceState.start;
  $("sequenceEnd").value = sequenceState.end;
}

function applySequencePreview() {
  if (designContext !== "sequence" || updatingSequencePreview) return;
  ensureSequenceSamples();
  const ids = Object.keys(FEATURES);
  if (ids.length === 0) return;
  const activeId = ids.includes(state.layer?.source) ? state.layer.source : ids[0];
  const base = sequenceBaseStyle || currentStyle();
  updatingSequencePreview = true;
  try {
    ids.forEach((id, index) => {
      const step = sequenceStepForFeature(id, index);
      const style = applyLegacySequenceValue(clone(base), sequenceValueAt(step));
      if (sequenceState.scheme === "diverging") style.patColor = sequenceColorAt(step);
      FEATURE_STYLES[id] = style;
      state.layer = { source: id };
      loadStyle(style);
      removePatternLayers(id);
      rebuildPolygonLayers(id);
    });
    selectLayer(activeId);
  } finally {
    updatingSequencePreview = false;
  }
  updateSequenceControls();
}

function graduatedPresetStyle(id) {
  const preset = GRADUATED_PRESETS[id];
  if (!preset) throw new TypeError(`Unknown graduated preset: ${id}`);
  const style = clone(DEFAULT_STYLE);
  style.pattern = preset.pattern;
  style.cartographicPreset = preset.cartographicPreset ?? null;
  style.angle = preset.angle ?? style.angle;
  style.tile = preset.tile;
  style.weight = preset.weight;
  style.patColor = "#273733";
  style.patOpacity = 1;
  style.bg = { on: true, color: "#f4f1e8", opacity: 0.72 };
  style.outline = { on: true, color: "#33413d", width: 0.85, dash: [] };
  style.fontFill.on = false;
  style.svgFill.on = false;
  return style;
}

function inferGraduatedPreset(style, parameter = "spacing") {
  const matchingPreset = Object.entries(GRADUATED_PRESETS).find(([, preset]) =>
    preset.cartographicPreset && preset.cartographicPreset === style.cartographicPreset,
  );
  if (matchingPreset) return matchingPreset[0];
  if (style.pattern === "stipple") return "stipple";
  if (style.pattern === "hachures") return "hatch";
  if (style.pattern === "cross") return "crosshatch";
  if (style.pattern === "grid") return "grid";
  if (style.pattern === "dots") return "dots";
  return null;
}

function applyGraduatedPreset(id) {
  const preset = GRADUATED_PRESETS[id];
  if (!preset) return;
  sequencePresetId = id;
  sequenceBaseStyle = graduatedPresetStyle(id);
  useSequenceDefaults(sequenceState.parameter);
  applySequencePreview();
}

function useSequenceDefaults(parameter) {
  sequenceState.parameter = parameter;
  sequenceState.progression = parameter === "spacing" ? "geometric" : "linear";
  sequenceState.visualOrder = sequenceState.scheme === "sequential" && sequenceState.inverted
    ? "high-to-low"
    : "low-to-high";
  sequenceState.overrides = {};
  const preset = GRADUATED_PRESETS[sequencePresetId] || GRADUATED_PRESETS.dots;
  if (parameter === "opacity") {
    sequenceState.start = 0.06;
    sequenceState.end = 1;
  } else if (parameter === "weight") {
    sequenceState.start = preset.weightStart;
    sequenceState.end = preset.weightEnd;
  } else {
    sequenceState.start = preset.start;
    sequenceState.end = preset.end;
  }
}

function setDesignContext(context) {
  if (context !== "pattern" && context !== "sequence" && context !== "set") return;
  if (context !== "pattern" && sourceMode === "sample" && worldDemoFeatures.length < 180) {
    toast("World map is still loading");
    return;
  }
  const previousContext = designContext;
  if (context === previousContext) return;
  captureDesignWorkspace(previousContext);
  const savedWorkspace = designWorkspaces.get(context);
  if (context === "sequence" && !savedWorkspace) {
    sequencePresetId = "dots";
    sequenceBaseStyle = graduatedPresetStyle(sequencePresetId);
    sequenceState.scheme = "sequential";
    sequenceState.inverted = false;
    useSequenceDefaults("weight");
    sequenceStyling = false;
  }
  const enteringThematicDemo = context !== "pattern" && previousContext === "pattern" && sourceMode === "sample";
  const leavingThematicDemo = context === "pattern" && previousContext !== "pattern";
  if (enteringThematicDemo) {
    basemapBeforeThematic = selectedBasemap;
    setBasemap("softblue");
  } else if (leavingThematicDemo && basemapBeforeThematic) {
    setBasemap(basemapBeforeThematic);
    basemapBeforeThematic = null;
  }
  designContext = context;
  updateLayersRailAvailability();
  $("panel").classList.toggle("pattern-context", context === "pattern");
  $("panel").classList.toggle("sequence-context", context === "sequence");
  $("panel").classList.toggle("set-context", context === "set");
  $("panel").classList.toggle("sequence-styling", context === "sequence" && sequenceStyling);
  document.querySelectorAll("#designContextTabs [data-design-context]").forEach((button) => {
    button.classList.toggle("active", button.dataset.designContext === context);
  });
  openTool("fill");
  if (savedWorkspace) {
    restoreDesignWorkspace(savedWorkspace);
  } else {
    if (context === "pattern") ensurePatternSample();
    if (context === "set") ensureSetSamples();
    if (context === "sequence") applySequencePreview();
  }
  updateCategoryControls();
  renderDesignLegend();
  updateSequenceControls();
  updateStyleTransferControls();
  $("exportJsBtn").disabled = false;
  $("downloadBundleBtn").disabled = false;
  $("exportJsBtn").title = "";
  $("downloadBundleBtn").title = "";
  if (!savedWorkspace && state.layer) selectLayer(state.layer.source);
}

// UI wiring
function updateFeaturePanelScrollMode() {
  const activeTool = document.querySelector("#toolTabs .tool-tab.active")?.dataset.tool;
  document.querySelector('[data-panel-body="feature"]').classList.toggle(
    "inspector-scroll-mode",
    activeTool === "fill" && (state.fontFill.on || state.svgFill.on),
  );
}

function openTool(tool) {
  document.querySelectorAll("#toolTabs .tool-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.tool === tool);
  });
  document.querySelectorAll("[data-tool-panel]").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.toolPanel === tool);
  });
  updateFeaturePanelScrollMode();
  updateSequenceControls();
}

$("toolTabs").addEventListener("click", (event) => {
  const tool = event.target.dataset.tool;
  if (tool) openTool(tool);
});

$("designContextTabs").addEventListener("click", (event) => {
  const button = event.target.closest("[data-design-context]");
  if (button && !button.disabled) setDesignContext(button.dataset.designContext);
});

function setCategorizedCount(value) {
  if (designContext !== "set" || sourceMode !== "sample") return;
  if (value === "" || !Number.isFinite(Number(value))) {
    updateCategoryControls();
    return;
  }
  const target = Math.min(
    MAX_CATEGORIES,
    Math.max(MIN_CATEGORIES, Math.round(Number(value))),
  );
  rememberActiveStyle({ refreshLegend: false });
  const ids = Object.keys(FEATURES);
  if (target === ids.length) {
    updateCategoryControls();
    return;
  }
  const selectedIndex = Math.max(0, ids.indexOf(state.layer?.source));
  const preservedStyles = ids
    .slice(0, Math.min(ids.length, target))
    .map((id) => clone(FEATURE_STYLES[id] || DEFAULT_STYLE));
  rebuildCategorizedSamples(
    target,
    Math.min(selectedIndex, target - 1),
    preservedStyles,
  );
  toast(`${target} categories`);
}

$("categoryCountInput").addEventListener("change", (event) => {
  setCategorizedCount(event.target.value);
});

$("categoryCountInput").addEventListener("input", (event) => {
  const value = Number(event.target.value);
  if (Number.isInteger(value) && value >= MIN_CATEGORIES && value <= MAX_CATEGORIES) {
    setCategorizedCount(value);
  }
});

$("randomizeCategoriesButton").addEventListener("click", () => {
  randomizeCategorizedSamples();
  toast("Categories randomized");
});

function setSequenceSteps(value) {
  if (value === "" || !Number.isFinite(Number(value))) {
    updateSequenceControls();
    return;
  }
  const steps = Math.min(
    MAX_SEQUENCE_STEPS,
    Math.max(MIN_SEQUENCE_STEPS, Math.round(Number(value))),
  );
  if (steps === sequenceState.steps) {
    updateSequenceControls();
    return;
  }
  sequenceState.steps = steps;
  sequenceState.overrides = Object.fromEntries(
    Object.entries(sequenceState.overrides)
      .filter(([step]) => Number(step) < sequenceState.steps),
  );
  applySequencePreview();
}

$("sequenceSteps").addEventListener("change", (event) => {
  setSequenceSteps(event.target.value);
});

$("sequenceSteps").addEventListener("input", (event) => {
  const value = Number(event.target.value);
  if (Number.isInteger(value) && value >= MIN_SEQUENCE_STEPS && value <= MAX_SEQUENCE_STEPS) {
    setSequenceSteps(value);
  }
});
$("sequencePresetRamps").addEventListener("click", (event) => {
  const button = event.target.closest("[data-sequence-preset]");
  if (button) applyGraduatedPreset(button.dataset.sequencePreset);
});
$("sequenceSchemePicker").addEventListener("click", (event) => {
  const button = event.target.closest("[data-sequence-scheme]");
  if (!button || button.dataset.sequenceScheme === sequenceState.scheme) return;
  sequenceState.scheme = button.dataset.sequenceScheme;
  sequenceState.inverted = false;
  useSequenceDefaults(sequenceState.parameter);
  updateSequenceControls();
  applySequencePreview();
});
$("sequenceInvertButton").addEventListener("click", () => {
  sequenceState.inverted = !sequenceState.inverted;
  sequenceState.visualOrder = sequenceState.scheme === "sequential" && sequenceState.inverted
    ? "high-to-low"
    : "low-to-high";
  updateSequenceControls();
  applySequencePreview();
});
$("sequenceVariationPicker").addEventListener("click", (event) => {
  const button = event.target.closest("[data-sequence-parameter]");
  if (!button) return;
  useSequenceDefaults(button.dataset.sequenceParameter);
  updateSequenceControls();
  applySequencePreview();
});
$("sequenceCustomizeToggle").addEventListener("click", () => {
  sequenceStyling = !sequenceStyling;
  $("panel").classList.toggle("sequence-styling", sequenceStyling);
  updateSequenceControls();
});

let sequenceBaseUpdateTimer = 0;
function captureSequenceBaseEdit(event) {
  if (
    designContext !== "sequence" || updatingSequencePreview ||
    event.target.closest("#sequenceControls") ||
    !event.target.closest("[data-tool-panel]")
  ) return;
  clearTimeout(sequenceBaseUpdateTimer);
  sequenceBaseUpdateTimer = setTimeout(() => {
    if (designContext !== "sequence" || updatingSequencePreview) return;
    const edited = currentStyle();
    if (sequenceBaseStyle) restoreLegacySequenceValue(edited, sequenceBaseStyle);
    sequenceBaseStyle = edited;
    if (edited.pattern === "solid" && !edited.fontFill.on && !edited.svgFill.on &&
        sequenceState.parameter !== "opacity") {
      useSequenceDefaults("opacity");
    }
    applySequencePreview();
  }, 0);
}
$("panel").addEventListener("input", captureSequenceBaseEdit);
$("panel").addEventListener("change", captureSequenceBaseEdit);
$("panel").addEventListener("click", captureSequenceBaseEdit);

const BASEMAP_LABELS = {
  liberty: "OSM Liberty",
  neutral: "Neutral",
  streets: "Streets",
  positron: "Light",
  softblue: "OSM Soft blue",
  bright: "Bright",
  aerial: "Aerial",
};
let selectedBasemap = libertyIsDefault ? "liberty" : "neutral";
let basemapBeforeThematic = null;
const BASEMAP_PREVIEW_ORDER = Object.keys(BASEMAP_LABELS);

function applyBasemapToMap(targetMap, name) {
  ["streets", "positron", "bright", "aerial"].forEach((id) => {
    const layerId = `basemap-${id}`;
    if (targetMap.getLayer(layerId)) {
      targetMap.setLayoutProperty(layerId, "visibility", name === id ? "visible" : "none");
    }
  });
  libertyLayers.forEach((layer) => {
    if (targetMap.getLayer(layer.id)) {
      const showOsmLayer = name === "liberty"
        || (name === "softblue" && layer.type !== "symbol");
      targetMap.setLayoutProperty(layer.id, "visibility", showOsmLayer ? "visible" : "none");
    }
  });
  if (targetMap.getLayer("water") && libertyWaterColor !== undefined) {
    targetMap.setPaintProperty(
      "water",
      "fill-color",
      name === "softblue" ? "#d5edf5" : libertyWaterColor,
    );
  }
  if (targetMap.getLayer("bg")) {
    const backgroundColor = name === "neutral"
      ? "#e9eeec"
      : name === "softblue" ? "#f8f4f0" : "#d8dfdc";
    targetMap.setPaintProperty("bg", "background-color", backgroundColor);
  }
}

function waitForBasemapPreviewFrame(previewMap) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve();
    };
    const timeout = setTimeout(finish, 2500);
    previewMap.once("idle", finish);
    previewMap.triggerRepaint();
  });
}

let basemapPreviewPromise;
function ensureBasemapPreviews() {
  if (basemapPreviewPromise) return basemapPreviewPromise;
  basemapPreviewPromise = (async () => {
    const container = document.createElement("div");
    container.className = "basemap-preview-renderer";
    container.setAttribute("aria-hidden", "true");
    document.body.append(container);
    const previewMap = new maplibregl.Map({
      container,
      style: clone(basemapStyle),
      center: SAMPLE_CENTER,
      zoom: 11.5,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
      preserveDrawingBuffer: true,
    });
    try {
      await new Promise((resolve) => {
        const timeout = setTimeout(resolve, 5000);
        previewMap.once("load", () => {
          clearTimeout(timeout);
          resolve();
        });
      });
      for (const name of BASEMAP_PREVIEW_ORDER) {
        applyBasemapToMap(previewMap, name);
        await waitForBasemapPreviewFrame(previewMap);
        const image = document.querySelector(`[data-basemap-preview="${name}"]`);
        if (!image) continue;
        try {
          image.addEventListener("load", () => image.classList.add("ready"), { once: true });
          image.src = previewMap.getCanvas().toDataURL("image/jpeg", 0.82);
        } catch {
          // Keep the lightweight CSS fallback if a remote tile server does
          // not allow its pixels to be copied from the WebGL canvas.
        }
      }
    } finally {
      previewMap.remove();
      container.remove();
    }
  })();
  return basemapPreviewPromise;
}

function updateBasemapSelection(name) {
  selectedBasemap = name;
  document.querySelectorAll("#basemapPopover [data-basemap]").forEach((button) => {
    const active = button.dataset.basemap === name;
    button.classList.toggle("active", active);
    button.setAttribute("aria-checked", String(active));
  });
  const label = BASEMAP_LABELS[name] || name;
  $("basemapTrigger").setAttribute("aria-label", `Basemap: ${label}`);
  $("basemapTrigger").title = `Basemap: ${label}`;
}

function closeBasemapPicker() {
  $("basemapPopover").hidden = true;
  $("basemapTrigger").setAttribute("aria-expanded", "false");
  $("basemapTrigger").classList.remove("active");
}

function closeLayersPicker() {
  $("layersPopover").hidden = true;
  $("layersTrigger").setAttribute("aria-expanded", "false");
  $("layersTrigger").classList.remove("active");
}

function updateLayersRailAvailability() {
  const available = designContext === "pattern";
  $("layersRailLabel").hidden = !available;
  $("layersPicker").hidden = !available;
  $("layersRailSeparator").hidden = !available;
  if (!available) closeLayersPicker();
}

function setBasemap(name) {
  applyBasemapToMap(map, name);
  updateBasemapSelection(name);
}
// OSM Liberty is the default basemap (falls back to Neutral if it failed
// to fetch, e.g. offline). The correct layers/bg colour are already set
// directly in the style above; this only needs to mark the right rail
// button as active, so it's plain DOM and never touches the MapLibre API
// before the style has finished loading.
updateBasemapSelection(libertyIsDefault ? "liberty" : "neutral");

$("basemapTrigger").addEventListener("click", (event) => {
  event.stopPropagation();
  const willOpen = $("basemapPopover").hidden;
  closeLayersPicker();
  $("basemapPopover").hidden = !willOpen;
  $("basemapTrigger").setAttribute("aria-expanded", String(willOpen));
  $("basemapTrigger").classList.toggle("active", willOpen);
  if (willOpen) ensureBasemapPreviews();
});
$("basemapPopover").addEventListener("click", (event) => {
  event.stopPropagation();
  const button = event.target.closest("[data-basemap]");
  if (!button) return;
  setBasemap(button.dataset.basemap);
  closeBasemapPicker();
});

$("layersTrigger").addEventListener("click", (event) => {
  if (designContext !== "pattern") return;
  event.stopPropagation();
  const willOpen = $("layersPopover").hidden;
  closeBasemapPicker();
  $("layersPopover").hidden = !willOpen;
  $("layersTrigger").setAttribute("aria-expanded", String(willOpen));
  $("layersTrigger").classList.toggle("active", willOpen);
});
$("layersPopover").addEventListener("click", (event) => event.stopPropagation());

// File / Help menus
function closeMenus(except) {
  document.querySelectorAll(".menu-popover").forEach((popover) => {
    if (popover !== except) popover.hidden = true;
  });
  document.querySelectorAll(".menu > .menu-button").forEach((button) => {
    if (button.nextElementSibling !== except) button.classList.remove("open");
  });
}
document.querySelectorAll(".menu > .menu-button").forEach((button) => {
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    const popover = button.nextElementSibling;
    const willOpen = popover.hidden;
    closeMenus(willOpen ? popover : null);
    popover.hidden = !willOpen;
    button.classList.toggle("open", willOpen);
    button.setAttribute("aria-expanded", String(willOpen));
  });
});
document.addEventListener("click", () => {
  closeMenus();
  closeBasemapPicker();
  closeLayersPicker();
  closeStyleTransferMenus();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeMenus();
    closeBasemapPicker();
    closeLayersPicker();
    closeStyleTransferMenus();
  }
});
// Persistent export button, pinned to the bottom of the side panel. Its
// own drawer, not the File menu: toggling it just flips `hidden` on a
// sibling element already wired to the actual export/preset buttons.
$("exportFooterBtn").addEventListener("click", () => {
  const willOpen = $("exportDrawer").hidden;
  $("exportDrawer").hidden = !willOpen;
  $("exportFooterBtn").setAttribute("aria-expanded", String(willOpen));
});
$("exportDrawerClose").addEventListener("click", () => {
  $("exportDrawer").hidden = true;
  $("exportFooterBtn").setAttribute("aria-expanded", "false");
});

// Zoom / compass / locate
$("zoomInBtn").addEventListener("click", () => map.zoomIn());
$("zoomOutBtn").addEventListener("click", () => map.zoomOut());
$("compassBtn").addEventListener("click", () => map.easeTo({ bearing: 0, pitch: 0, duration: 250 }));
$("locateBtn").addEventListener("click", () => fitWorkspaceFeatures());

function syncCompassControl() {
  $("compassBtn").hidden = Math.abs(map.getBearing()) < 0.01 && Math.abs(map.getPitch()) < 0.01;
}

map.on("rotate", syncCompassControl);
map.on("pitch", syncCompassControl);
syncCompassControl();

function bindColor(colorId, hexId, apply) {
  const col = $(colorId), hex = $(hexId);
  col.addEventListener("input", () => { hex.value = col.value; apply(col.value); });
  hex.addEventListener("input", () => {
    if (/^#[0-9a-f]{6}$/i.test(hex.value)) { col.value = hex.value; apply(hex.value); }
  });
}

bindColor("sequenceLowColor", "sequenceLowColorHex", (value) => {
  sequenceState.lowColor = value;
  if (designContext === "sequence" && sequenceState.scheme === "diverging") applySequencePreview();
});
bindColor("sequenceHighColor", "sequenceHighColorHex", (value) => {
  sequenceState.highColor = value;
  if (designContext === "sequence" && sequenceState.scheme === "diverging") applySequencePreview();
});

function wireCustomSvgPanel({ panelId, textId, fileId, applyId, onApply }) {
  $(fileId).addEventListener("change", async (e) => {
    const file = e.target.files[0]; if (!file) return;
    $(textId).value = await file.text();
    $("svgFillCustomFileName").textContent = file.name;
  });
  $(applyId).addEventListener("click", () => {
    const text = $(textId).value.trim();
    if (!text.startsWith("<svg")) return toast("Paste SVG markup starting with <svg>");
    onApply(text);
    toast("Custom SVG applied");
  });
}

function motifCatalogEntry(sample) {
  return SVG_PATTERN_CATALOG.find((item) => item.value === sample);
}

function renderMotifBrowser() {
  // The custom-SVG panel belongs to the "Custom" tab itself, not to
  // whichever motif happens to be applied: otherwise switching to another
  // family tab left the panel stuck on screen (it only hid once a new
  // motif was actually picked), which felt like there was no way out of it.
  const customFamilyActive = activeMotifFamily === "custom";
  $("svgFillCustomPanel").classList.toggle("hidden", !customFamilyActive);
  $("motifGrid").hidden = customFamilyActive;
  $("svgFillFieldset").hidden = customFamilyActive && state.svgFill.sample !== "custom";
  const families = [...new Map(
    SVG_PATTERN_CATALOG.map((item) => [item.family, item.familyLabel]),
  )];
  $("motifFamilySelect").innerHTML = families.map(([family, label]) => `
    <option value="${family}">${label}</option>
  `).join("");
  $("motifFamilySelect").value = activeMotifFamily;
  $("motifGrid").innerHTML = SVG_PATTERN_CATALOG
    .filter((item) => item.family === activeMotifFamily)
    .map((item) => {
      const preview = item.value === "custom"
        ? `<span class="motif-swatch" aria-hidden="true">SVG</span>`
        : `<span class="motif-swatch" aria-hidden="true">${resolveSvgFillSample({ sample: item.value }, state.patColor)}</span>`;
      const active = state.svgFill.on && item.value === state.svgFill.sample ? " active" : "";
      return `<button type="button" class="motif-choice${active}" data-svg-sample="${item.value}">
        ${preview}<span class="motif-choice-label">${item.label}</span>
      </button>`;
    }).join("");
}

function openSvgInspectorSection(section) {
  document.querySelectorAll("[data-svg-section-tab]").forEach((button) => {
    const active = button.dataset.svgSectionTab === section;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  document.querySelectorAll("[data-svg-section]").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.svgSection === section);
  });
}

function selectSvgSample(sample) {
  const entry = motifCatalogEntry(sample);
  if (!entry) return;
  state.svgFill.on = true;
  state.fontFill.on = false;
  state.cartographicPreset = null;
  state.svgFill.sample = sample;
  activeMotifFamily = entry.family;
  openSvgInspectorSection("appearance");
  $("svgFillToggle").checked = true;
  updateFillModePanels();
  updateFillChoiceUI();
  updateSvgControlAvailability();
  updateSvgScaleReadout();
  updateSvgQualityHint();
  rebuildLayers();
}

$("patternPills").addEventListener("click", (e) => {
  const choice = e.target.closest("[data-p], [data-cartographic-preset]");
  if (!choice) return;
  const presetId = choice.dataset.cartographicPreset;
  if (presetId) {
    const preset = CARTOGRAPHIC_PRESETS[presetId];
    if (!preset) return;
    state.cartographicPreset = presetId;
    state.angle = preset.angle ?? state.angle;
    state.weight = preset.family === "line" ? 1.4 : 1.8;
    state.fontFill.on = false;
    state.svgFill.on = false;
    $("svgFillToggle").checked = false;
    $("weight").value = state.weight;
    $("weightVal").textContent = state.weight.toFixed(2) + " px";
    applyStateToUI();
    rebuildLayers();
    return;
  }
  const p = choice.dataset.p; if (!p) return;
  geometricWeightByPattern.set(state.pattern, state.weight);
  state.cartographicPreset = null;
  state.pattern = p;
  state.weight = geometricWeightByPattern.get(p) ?? GEOMETRIC_DEFAULT_WEIGHTS[p] ?? 2;
  geometricWeightByPattern.set(p, state.weight);
  $("weight").value = state.weight;
  $("weightVal").textContent = state.weight.toFixed(2) + " px";
  state.fontFill.on = false;
  state.svgFill.on = false;
  $("svgFillToggle").checked = false;
  updateFillModePanels();
  updateFillChoiceUI();
  updatePatternControlAvailability();
  updateSvgControlAvailability();
  renderPreview(); rebuildLayers();
});

$("fontModePill").addEventListener("click", () => {
  state.fontFill.on = true;
  state.svgFill.on = false;
  state.cartographicPreset = null;
  $("svgFillToggle").checked = false;
  updateFillModePanels();
  updateFillChoiceUI();
  updatePatternControlAvailability();
  updateSvgControlAvailability();
  renderPreview();
  rebuildLayers();
});

$("svgModePill").addEventListener("click", () => {
  // Explicit switch into "SVG motif" mode: reveals the motif browser
  // (defaulting to whichever motif was last picked, or the catalog's
  // first one) instead of it being reachable by clicking on what looked
  // like inert browsing UI underneath the active geometric pattern.
  selectSvgSample(state.svgFill.sample);
});

$("motifFamilySelect").addEventListener("change", (event) => {
  activeMotifFamily = event.target.value;
  renderMotifBrowser();
});

$("motifGrid").addEventListener("click", (event) => {
  const button = event.target.closest("[data-svg-sample]");
  if (button) selectSvgSample(button.dataset.svgSample);
});

$("svgInspectorTabs").addEventListener("click", (event) => {
  const button = event.target.closest("[data-svg-section-tab]");
  if (button) openSvgInspectorSection(button.dataset.svgSectionTab);
});

$("angleSeg").addEventListener("click", (e) => {
  const a = e.target.dataset.a; if (a === undefined) return;
  state.angle = +a;
  document.querySelectorAll("#angleSeg button").forEach((b) => b.classList.toggle("active", b.dataset.a === a));
  renderPreview(); syncGeomTexture();
});

bindColor("patColor", "patColorHex", (v) => {
  state.patColor = v;
  $("svgPatColor").value = $("svgPatColorHex").value = v;
  renderPreview();
  if (state.fontFill.on) syncFontFill();
  else if (state.svgFill.on) syncSvgFill();
  else if (state.pattern === "solid" && !state.cartographicPreset) repaint();
  else syncGeomTexture();
});
bindColor("svgPatColor", "svgPatColorHex", (v) => {
  state.patColor = v;
  $("patColor").value = $("patColorHex").value = v;
  renderMotifBrowser();
  if (state.svgFill.on) syncSvgFill();
});
$("patOpacity").addEventListener("input", (e) => {
  state.patOpacity = +e.target.value; $("patOpacityVal").textContent = state.patOpacity.toFixed(2);
  $("svgPatOpacity").value = state.patOpacity;
  $("svgPatOpacityVal").textContent = state.patOpacity.toFixed(2);
  renderPreview(); repaint();
});
$("svgPatOpacity").addEventListener("input", (e) => {
  state.patOpacity = +e.target.value;
  $("svgPatOpacityVal").textContent = state.patOpacity.toFixed(2);
  $("patOpacity").value = state.patOpacity;
  $("patOpacityVal").textContent = state.patOpacity.toFixed(2);
  repaint();
});
$("weight").addEventListener("input", (e) => {
  state.weight = +e.target.value; $("weightVal").textContent = state.weight.toFixed(2) + " px";
  renderPreview(); syncGeomTexture();
});
$("tile").addEventListener("input", (e) => {
  state.tile = +e.target.value;
  $("tileVal").textContent = state.tile + " px";
  updateGeometricScaleReadout();
  renderPreview(); syncGeomTexture();
});
$("geometricScaleModeSeg").addEventListener("click", (event) => {
  const mode = event.target.dataset.geometricScaleMode;
  if (!mode) return;
  state.geometricScale.mode = mode;
  updateGeometricScaleControls();
  rebuildLayers();
});
$("geometricReferenceZoom").addEventListener("input", (event) => {
  state.geometricScale.referenceZoom = +event.target.value;
  $("geometricReferenceZoomVal").textContent = `z${state.geometricScale.referenceZoom.toFixed(0)}`;
  updateGeometricScaleReadout();
  syncGeomTexture();
});
$("geometricUseCurrentZoom").addEventListener("click", () => {
  state.geometricScale.referenceZoom = Math.floor(map.getZoom());
  $("geometricReferenceZoom").value = state.geometricScale.referenceZoom;
  $("geometricReferenceZoomVal").textContent = `z${state.geometricScale.referenceZoom.toFixed(0)}`;
  updateGeometricScaleReadout();
  syncGeomTexture();
});
$("geometricPixelRatioSeg").addEventListener("click", (event) => {
  const pixelRatio = event.target.dataset.geometricPixelRatio;
  if (!pixelRatio) return;
  state.geometricScale.pixelRatio = pixelRatio;
  updateGeometricScaleControls();
  syncGeomTexture();
});
// Font fill
function openFontInspectorSection(section) {
  document.querySelectorAll("[data-font-section-tab]").forEach((button) => {
    const active = button.dataset.fontSectionTab === section;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  document.querySelectorAll("[data-font-section]").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.fontSection === section);
  });
}

$("fontInspectorTabs").addEventListener("click", (event) => {
  const button = event.target.closest("[data-font-section-tab]");
  if (button) openFontInspectorSection(button.dataset.fontSectionTab);
});

function refreshFontFill() {
  if (!state.fontFill.on || !state.fontFill.text.trim()) return;
  renderPreview();
  syncFontFill();
}

$("fontText").addEventListener("input", (event) => {
  state.fontFill.text = event.target.value;
  refreshFontFill();
});
$("fontText").addEventListener("blur", (event) => {
  if (event.target.value.trim()) return;
  event.target.value = state.fontFill.text = "A";
  refreshFontFill();
});
$("fontFamily").addEventListener("change", (event) => {
  state.fontFill.fontFamily = event.target.value;
  refreshFontFill();
});
$("fontStyleSeg").addEventListener("click", (event) => {
  const value = event.target.dataset.fontStyle;
  if (!value) return;
  state.fontFill.fontStyle = value;
  document.querySelectorAll("#fontStyleSeg button").forEach((button) => {
    button.classList.toggle("active", button.dataset.fontStyle === value);
  });
  refreshFontFill();
});
$("fontWeightSeg").addEventListener("click", (event) => {
  const value = event.target.dataset.fontWeight;
  if (!value) return;
  state.fontFill.fontWeight = value;
  document.querySelectorAll("#fontWeightSeg button").forEach((button) => {
    button.classList.toggle("active", button.dataset.fontWeight === value);
  });
  refreshFontFill();
});
$("fontLayoutSeg").addEventListener("click", (event) => {
  const value = event.target.dataset.fontLayout;
  if (!value) return;
  state.fontFill.stagger = value === "staggered";
  document.querySelectorAll("#fontLayoutSeg button").forEach((button) => {
    button.classList.toggle("active", button.dataset.fontLayout === value);
  });
  refreshFontFill();
});
$("fontScaleModeSeg").addEventListener("click", (event) => {
  const value = event.target.dataset.fontScaleMode;
  if (!value) return;
  state.fontFill.scaleMode = value;
  updateFontScaleControls();
  if (state.fontFill.on) rebuildLayers();
});
$("fontReferenceZoom").addEventListener("input", (event) => {
  state.fontFill.referenceZoom = +event.target.value;
  $("fontReferenceZoomVal").textContent = `z${state.fontFill.referenceZoom.toFixed(0)}`;
  updateFontScaleReadout();
  if (state.fontFill.on && state.fontFill.scaleMode === "map") syncFontFill();
});
$("fontUseCurrentZoom").addEventListener("click", () => {
  state.fontFill.referenceZoom = Math.floor(map.getZoom());
  $("fontReferenceZoom").value = state.fontFill.referenceZoom;
  $("fontReferenceZoomVal").textContent = `z${state.fontFill.referenceZoom.toFixed(0)}`;
  updateFontScaleReadout();
  if (state.fontFill.on && state.fontFill.scaleMode === "map") syncFontFill();
});
[
  ["fontSize", "fontSize", "fontSizeVal", (value) => `${value} px`],
  ["fontLetterSpacing", "letterSpacing", "fontLetterSpacingVal", (value) => `${value} px`],
  ["fontHorizontalSpacing", "horizontalSpacing", "fontHorizontalSpacingVal", (value) => `${value} px`],
  ["fontVerticalSpacing", "verticalSpacing", "fontVerticalSpacingVal", (value) => `${value} px`],
  ["fontRotation", "rotationDeg", "fontRotationVal", (value) => `${value}°`],
].forEach(([inputId, key, valueId, format]) => {
  $(inputId).addEventListener("input", (event) => {
    const value = +event.target.value;
    state.fontFill[key] = value;
    $(valueId).textContent = format(value);
    refreshFontFill();
  });
});

// SVG fill
function updateFillModePanels() {
  $("geometricFieldset").classList.toggle("font-mode", state.fontFill.on);
  $("geometricFieldset").classList.toggle("svg-mode", state.svgFill.on);
  document.querySelector(".font-settings").classList.toggle("active-mode", state.fontFill.on);
  document.querySelector(".svg-settings").classList.toggle("active-mode", state.svgFill.on);
  updateFontScaleControls();
  updateFeaturePanelScrollMode();
}
function patternFamilyForStyle(style = state) {
  if (style.fontFill.on) return "text";
  if (style.svgFill.on) return "svg";
  const preset = CARTOGRAPHIC_PRESETS[style.cartographicPreset];
  if (preset?.family === "glyph") {
    return style.cartographicPreset === "dense-dots" || style.cartographicPreset === "offset-dots"
      ? "dots"
      : "marks";
  }
  if (preset?.family === "line") return "lines";
  if (style.pattern === "solid" && !style.cartographicPreset) return "solid";
  if (style.pattern === "stipple") return "stipple";
  if (style.pattern === "dots") return "dots";
  if (style.pattern === "grid" || style.pattern === "cross") return "grid";
  return "lines";
}
function updateFillChoiceUI() {
  const activeFamily = patternFamilyForStyle();
  document.querySelectorAll("#patternPills .pattern-family-tile").forEach((element) => {
    element.classList.toggle("active", element.dataset.patternFamily === activeFamily);
  });
  document.querySelectorAll("#patternPills .pattern-subtype").forEach((element) => {
    element.classList.toggle(
      "active",
      !state.fontFill.on && !state.svgFill.on && (
        element.dataset.cartographicPreset === state.cartographicPreset ||
        (!state.cartographicPreset && element.dataset.p === state.pattern)
      ),
    );
  });
  document.querySelectorAll("[data-pattern-subtypes]").forEach((panel) => {
    panel.hidden = panel.dataset.patternSubtypes !== activeFamily;
  });
  $("svgModePill").setAttribute("aria-expanded", String(state.svgFill.on));
  // The motif browser only exists to configure the "SVG motif" fill type,
  // so it stays out of the way entirely until that's explicitly chosen
  // instead of always being clickable underneath whatever geometric
  // pattern is actually active.
  $("motifBrowserSection").hidden = !state.svgFill.on;
  const entry = motifCatalogEntry(state.svgFill.sample);
  $("activeMotifLabel").textContent = entry?.label || "Custom SVG";
  renderMotifBrowser(); // also syncs the custom-SVG panel's visibility
}
function updatePatternControlAvailability() {
  const preset = CARTOGRAPHIC_PRESETS[state.cartographicPreset];
  const family = patternFamilyForStyle();
  const angleEnabled = !state.fontFill.on && !state.svgFill.on && (
    state.pattern === "hachures" || state.pattern === "cross" ||
    state.pattern === "grid" ||
    preset?.family === "line" || preset?.family === "glyph"
  );
  const textureEnabled = !state.fontFill.on && !state.svgFill.on &&
    (Boolean(state.cartographicPreset) || state.pattern !== "solid");
  const familyLabels = {
    solid: "Solid colour",
    dots: "Dots",
    stipple: "Stipple",
    lines: "Lines",
    grid: "Grid",
    marks: "Marks",
    text: "Text",
    svg: "SVG motif",
  };
  $("patternTuneTitle").textContent = familyLabels[family] || "Pattern";
  $("weightLabel").textContent = family === "dots" || family === "stipple" ? "Dot size"
    : family === "marks" ? "Mark size"
      : "Line weight";
  $("tileLabel").textContent = "Spacing";
  $("angleControl").hidden = !angleEnabled;
  const gridDirectionsOnly = family === "grid";
  document.querySelectorAll("#angleSeg button").forEach((button) => {
    button.hidden = gridDirectionsOnly && button.dataset.a !== "0" && button.dataset.a !== "45";
    button.disabled = !angleEnabled;
  });
  $("scaleControl").hidden = !textureEnabled;
  $("weightControl").hidden = !textureEnabled;
  $("tileControl").hidden = !textureEnabled;
  $("patternFineTune").hidden = !textureEnabled;
  $("weight").disabled = !textureEnabled;
  $("tile").disabled = !textureEnabled;
  updateGeometricScaleControls();
}
function updateFontScaleControls() {
  const enabled = state.fontFill.on;
  const mapScale = enabled && state.fontFill.scaleMode === "map";
  document.querySelectorAll("#fontScaleModeSeg button").forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.fontScaleMode === state.fontFill.scaleMode,
    );
    button.disabled = !enabled;
  });
  $("fontReferenceZoomControl").classList.toggle("is-disabled", !mapScale);
  $("fontReferenceZoom").disabled = !mapScale;
  $("fontUseCurrentZoom").disabled = !mapScale;
  updateFontScaleReadout();
}
function updateFontScaleReadout() {
  const effective = effectiveFontFill(currentStyle(), map.getZoom());
  const atMinimum = state.fontFill.scaleMode === "map" && effective.fontSize === 8;
  const atMaximum = state.fontFill.scaleMode === "map" &&
    map.getZoom() > state.fontFill.referenceZoom &&
    effective.fontSize === Math.max(state.fontFill.fontSize, FONT_GROUND_SCALE_MAX);
  $("fontScaleReadout").textContent = state.fontFill.scaleMode === "screen"
    ? `${state.fontFill.fontSize} px type at every zoom`
    : `At z${map.getZoom().toFixed(1)}: ${effective.fontSize.toFixed(1)} px type${atMinimum ? " · readable minimum" : atMaximum ? " · maximum display size" : ""}`;
}
function effectiveGeometricStop(style, zoom = map.getZoom()) {
  const stops = geometricZoomStops(style);
  return stops.reduce(
    (active, stop) => zoom >= stop.zoom ? stop : active,
    stops[0],
  );
}
function updateGeometricScaleControls() {
  const enabled = !state.fontFill.on && !state.svgFill.on && (
    Boolean(state.cartographicPreset) || state.pattern !== "solid"
  );
  const mapScale = enabled && state.geometricScale.mode === "map";
  document.querySelectorAll("#geometricScaleModeSeg button").forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.geometricScaleMode === state.geometricScale.mode,
    );
    button.disabled = !enabled;
  });
  document.querySelectorAll("#geometricPixelRatioSeg button").forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.geometricPixelRatio === state.geometricScale.pixelRatio,
    );
    button.disabled = !enabled;
  });
  $("geometricReferenceZoomControl").classList.toggle("is-disabled", !mapScale);
  $("geometricReferenceZoom").disabled = !mapScale;
  $("geometricUseCurrentZoom").disabled = !mapScale;
  updateGeometricScaleReadout();
}
function updateGeometricScaleReadout() {
  if ((state.pattern === "solid" && !state.cartographicPreset) || state.fontFill.on || state.svgFill.on) return;
  if (state.geometricScale.mode === "screen") {
    $("geometricScaleReadout").textContent = `${state.tile} px tile at every zoom`;
    return;
  }
  const zoom = map.getZoom();
  const stop = effectiveGeometricStop(currentStyle(), zoom);
  $("geometricScaleReadout").textContent =
    `At z${zoom.toFixed(2)}: ${Number(stop.tile.toFixed(2))} px tile`;
}
function updateSvgControlAvailability() {
  document.querySelectorAll("[data-svg-options]").forEach((group) => {
    group.classList.toggle("is-disabled", !state.svgFill.on);
    group.querySelectorAll("button, input, select, textarea").forEach((control) => {
      control.disabled = !state.svgFill.on;
    });
  });
  const colourEnabled = state.svgFill.on;
  $("svgBuiltInColor").classList.toggle("is-disabled", !colourEnabled);
  $("svgPatColor").disabled = !colourEnabled;
  $("svgPatColorHex").disabled = !colourEnabled;
  updateSvgDistributionControls();
  updateSvgScaleModeControls();
}
function updateSvgDistributionControls() {
  document.querySelectorAll("#svgDistributionSeg button").forEach((button) => {
    button.classList.toggle("active", button.dataset.distribution === state.svgFill.distribution);
  });
  const natural = state.svgFill.on && state.svgFill.distribution === "natural";
  $("svgMinSpacingControl").classList.toggle("is-disabled", !natural);
  $("svgMinSpacing").disabled = !natural;
  const positionVariation = state.svgFill.on && state.svgFill.distribution === "offset";
  $("svgPositionJitterControl").classList.toggle("is-disabled", !positionVariation);
  $("svgPosJitter").disabled = !positionVariation;
}
function updateSvgScaleModeControls() {
  document.querySelectorAll("#svgScaleModeSeg button").forEach((button) => {
    button.classList.toggle("active", button.dataset.scaleMode === state.svgFill.scaleMode);
    button.disabled = !state.svgFill.on;
  });
  $("svgScaleModeControl").classList.toggle(
    "is-disabled",
    !state.svgFill.on,
  );
  const mapScale = state.svgFill.on && state.svgFill.scaleMode === "map";
  $("svgReferenceZoomControl").classList.toggle("is-disabled", !mapScale);
  $("svgReferenceZoom").disabled = !mapScale;
  $("svgUseCurrentZoom").disabled = !mapScale;
  document.querySelectorAll("#svgBoundarySeg button").forEach((button) => {
    const mode = state.svgFill.noCut ? "whole" : "clip";
    button.classList.toggle("active", button.dataset.boundaryMode === mode);
    button.disabled = !state.svgFill.on;
  });
  $("symbolPlacementHint").textContent = state.svgFill.noCut
    ? "Complete symbols stay inside, which leaves a margin near the boundary."
    : "Symbols continue to the edge and are clipped by the boundary.";
  updateSvgScaleReadout();
}
function updateSvgScaleReadout() {
  if (!state.layer) return;
  const zoom = map.getZoom();
  const effective = effectiveSvgTexture(currentStyle(), state.layer.source, zoom);
  const suffix = effective.capped
    ? " · maximum display size"
    : effective.floored
      ? " · minimum readable size"
      : "";
  $("svgScaleReadout").textContent =
    `At z${zoom.toFixed(1)}: ${effective.visualSize.toFixed(1)} px motif · ${effective.spacing.toFixed(1)} px spacing${suffix}`;
}
function updateSvgQualityHint() {
  if (!state.layer) return;
  const effective = effectiveSvgTexture(currentStyle(), state.layer.source);
  const largestStamp = effective.visualSize * (1 + state.svgFill.scaleJitter);
  let message = "High-density rendering is automatic.";
  if (effective.floored) {
    message = "The motif remains visible at its minimum readable size.";
  } else if (effective.capped) {
    message = "The motif has reached its maximum display size.";
  } else if (state.svgFill.distribution === "natural") {
    message = "Natural spacing prevents overlaps and visible rows.";
  } else if (largestStamp > effective.spacing * 0.9) {
    message = "Symbols may overlap. Increase spacing or reduce visual size.";
  } else if (state.svgFill.positionJitter > 0.5) {
    message = "Strong position variation can create uneven gaps.";
  }
  $("svgQualityHint").textContent = message;
}
function updateAppearanceControlAvailability() {
  [
    ["[data-bg-options]", state.bg.on],
    ["[data-line-options]", state.outline.on],
  ].forEach(([selector, enabled]) => {
    const group = document.querySelector(selector);
    group.classList.toggle("is-disabled", !enabled);
    group.querySelectorAll("button, input, select, textarea").forEach((control) => {
      control.disabled = !enabled;
    });
  });
}
$("svgFillToggle").addEventListener("change", (e) => {
  state.svgFill.on = e.target.checked;
  if (state.svgFill.on) state.fontFill.on = false;
  updateFillModePanels();
  updateFillChoiceUI();
  updateSvgControlAvailability();
  updateSvgScaleReadout();
  updateSvgQualityHint();
  rebuildLayers();
});
$("svgBoundarySeg").addEventListener("click", (event) => {
  const mode = event.target.dataset.boundaryMode;
  if (!mode) return;
  state.svgFill.noCut = mode === "whole";
  updateSvgScaleModeControls();
  updateSvgQualityHint();
  if (state.svgFill.on) rebuildLayers();
});
$("svgVisualSize").addEventListener("input", (e) => {
  state.svgFill.visualSize = +e.target.value;
  $("svgVisualSizeVal").textContent = state.svgFill.visualSize + " px";
  updateSvgScaleReadout();
  updateSvgQualityHint();
  if (state.svgFill.on) syncSvgFill();
});
$("svgSpacing").addEventListener("input", (e) => {
  state.svgFill.spacing = +e.target.value;
  $("svgSpacingVal").textContent = state.svgFill.spacing + " px";
  updateSvgScaleReadout();
  updateSvgQualityHint();
  if (state.svgFill.on) syncSvgFill();
});
$("svgDistributionSeg").addEventListener("click", (event) => {
  const distribution = event.target.dataset.distribution;
  if (!distribution) return;
  state.svgFill.distribution = distribution;
  updateSvgDistributionControls();
  updateSvgQualityHint();
  if (state.svgFill.on) syncSvgFill();
});
$("svgMinSpacing").addEventListener("input", (event) => {
  state.svgFill.minSpacing = +event.target.value;
  $("svgMinSpacingVal").textContent = state.svgFill.minSpacing + " px";
  if (state.svgFill.on && state.svgFill.distribution === "natural") syncSvgFill();
});
$("svgScaleModeSeg").addEventListener("click", (event) => {
  const scaleMode = event.target.dataset.scaleMode;
  if (!scaleMode) return;
  state.svgFill.scaleMode = scaleMode;
  updateSvgScaleModeControls();
  updateSvgQualityHint();
  if (state.svgFill.on) rebuildLayers();
});
$("svgReferenceZoom").addEventListener("input", (event) => {
  state.svgFill.referenceZoom = +event.target.value;
  $("svgReferenceZoomVal").textContent = `z${state.svgFill.referenceZoom.toFixed(0)}`;
  updateSvgScaleReadout();
  updateSvgQualityHint();
  if (state.svgFill.on && state.svgFill.scaleMode === "map") syncSvgFill();
});
$("svgUseCurrentZoom").addEventListener("click", () => {
  state.svgFill.referenceZoom = Math.floor(map.getZoom());
  $("svgReferenceZoom").value = state.svgFill.referenceZoom;
  $("svgReferenceZoomVal").textContent = `z${state.svgFill.referenceZoom.toFixed(0)}`;
  updateSvgScaleReadout();
  updateSvgQualityHint();
  if (state.svgFill.on && state.svgFill.scaleMode === "map") syncSvgFill();
});
$("svgPosJitter").addEventListener("input", (e) => {
  state.svgFill.positionJitter = +e.target.value; $("svgPosJitterVal").textContent = "±" + state.svgFill.positionJitter.toFixed(2);
  updateSvgQualityHint();
  if (state.svgFill.on) syncSvgFill();
});
$("svgRotJitter").addEventListener("input", (e) => {
  state.svgFill.rotationJitterDeg = +e.target.value; $("svgRotJitterVal").textContent = "±" + state.svgFill.rotationJitterDeg + "°";
  if (state.svgFill.on) syncSvgFill();
});
$("svgScaleJitter").addEventListener("input", (e) => {
  state.svgFill.scaleJitter = +e.target.value; $("svgScaleJitterVal").textContent = "±" + state.svgFill.scaleJitter.toFixed(2);
  updateSvgQualityHint();
  if (state.svgFill.on) syncSvgFill();
});
$("svgSeed").addEventListener("change", (e) => { state.svgFill.seed = e.target.value; if (state.svgFill.on) syncSvgFill(); });
wireCustomSvgPanel({
  panelId: "svgFillCustomPanel", textId: "svgFillCustomText", fileId: "svgFillCustomFile", applyId: "svgFillCustomApply",
  onApply: (svg) => {
    state.svgFill.customSvg = svg;
    selectSvgSample("custom");
  },
});

// Background
$("bgToggle").addEventListener("change", (e) => {
  state.bg.on = e.target.checked;
  updateAppearanceControlAvailability();
  rebuildLayers();
});
bindColor("bgColor", "bgColorHex", (v) => { state.bg.color = v; repaint(); });
$("bgOpacity").addEventListener("input", (e) => {
  state.bg.opacity = +e.target.value; $("bgOpacityVal").textContent = state.bg.opacity.toFixed(2); repaint();
});

// Preview outline
$("lineToggle").addEventListener("change", (e) => {
  state.outline.on = e.target.checked;
  updateAppearanceControlAvailability();
  rebuildLayers();
});
bindColor("lineColor", "lineColorHex", (v) => { state.outline.color = v; repaint(); });
$("lineWidth").addEventListener("input", (e) => {
  state.outline.width = +e.target.value; $("lineWidthVal").textContent = state.outline.width.toFixed(2) + " px"; repaint();
});
$("dashSeg").addEventListener("click", (e) => {
  const d = e.target.dataset.d; if (!d) return;
  document.querySelectorAll("#dashSeg button").forEach((b) => b.classList.toggle("active", b.dataset.d === d));
  state.outline.dash = DASH_PRESETS[d].slice();
  $("dashInput").value = state.outline.dash.join(" ");
  rebuildLayers();
});
$("dashInput").addEventListener("change", (e) => {
  state.outline.dash = e.target.value.trim().split(/\s+/).map(Number).filter((n) => n > 0);
  rebuildLayers();
});

// Resize the active design collection from the same place in every context.
$("designLegendRemove").addEventListener("click", () => {
  if (designContext === "pattern") {
    removeSelectedSample();
  } else if (designContext === "set") {
    setCategorizedCount(Object.keys(FEATURES).length - 1);
  } else if (designContext === "sequence") {
    setSequenceSteps(sequenceState.steps - 1);
  }
});

$("designLegendAdd").addEventListener("click", () => {
  if (designContext === "pattern") {
    addFeature();
  } else if (designContext === "set") {
    setCategorizedCount(Object.keys(FEATURES).length + 1);
  } else if (designContext === "sequence") {
    setSequenceSteps(sequenceState.steps + 1);
  }
});

// Source
$("layerSelect").addEventListener("change", (e) => selectLayer(e.target.value));
const MAX_VECTOR_BYTES = 200 * 1024 * 1024;
const GDAL_PACKAGE_URL = "https://cdn.jsdelivr.net/npm/gdal3.js@2.8.1/dist/package";
const SHPJS_URL = "https://cdn.jsdelivr.net/npm/shpjs@6.2.0/dist/shp.esm.js";
const HYPARQUET_URL = "https://cdn.jsdelivr.net/npm/hyparquet@1.27.1/+esm";
const HYPARQUET_COMPRESSORS_URL = "https://cdn.jsdelivr.net/npm/hyparquet-compressors@1.1.1/+esm";
const SHAPEFILE_PARTS = new Set(["shp", "shx", "dbf", "prj", "cpg"]);
let gdalPromise;

function extensionOf(file) {
  const match = file.name.toLowerCase().match(/\.([^.]+)$/);
  return match ? match[1] : "";
}

function collectGeoJsonFeatures(value, features = []) {
  if (Array.isArray(value)) {
    value.forEach((entry) => collectGeoJsonFeatures(entry, features));
  } else if (value?.type === "FeatureCollection" && Array.isArray(value.features)) {
    features.push(...value.features);
  } else if (value?.type === "Feature") {
    features.push(value);
  } else if (typeof value?.type === "string") {
    features.push({ type: "Feature", properties: {}, geometry: value });
  }
  return features;
}

function serializableProperty(value) {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Uint8Array || value instanceof ArrayBuffer) return undefined;
  if (Array.isArray(value)) {
    return value.map(serializableProperty).filter((entry) => entry !== undefined);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, entry]) => [key, serializableProperty(entry)])
        .filter(([, entry]) => entry !== undefined),
    );
  }
  return value;
}

async function readJsonFile(file) {
  try {
    return JSON.parse(await file.text());
  } catch {
    throw new TypeError("This file is not valid JSON");
  }
}

async function readShapefile(files) {
  const { default: shp } = await import(SHPJS_URL);
  const zip = files.length === 1 && extensionOf(files[0]) === "zip";
  if (zip) return shp(await files[0].arrayBuffer());

  const parts = new Map(files.map((file) => [extensionOf(file), file]));
  if (!parts.has("shp")) {
    throw new TypeError("Select the .shp file with its companion files");
  }
  const input = {};
  for (const extension of ["shp", "dbf"]) {
    if (parts.has(extension)) input[extension] = await parts.get(extension).arrayBuffer();
  }
  for (const extension of ["prj", "cpg"]) {
    if (parts.has(extension)) input[extension] = await parts.get(extension).text();
  }
  return shp(input);
}

function geoParquetMetadata(metadata) {
  const entries = metadata?.key_value_metadata || metadata?.keyValueMetadata || [];
  const entry = Array.isArray(entries)
    ? entries.find((item) => item?.key === "geo")
    : entries.geo;
  const raw = entry?.value ?? entry;
  if (!raw) return null;
  try {
    return JSON.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw));
  } catch {
    return null;
  }
}

function assertGeoParquetCrs(geo) {
  const primary = geo?.primary_column;
  const crs = primary ? geo?.columns?.[primary]?.crs : null;
  if (!crs) return;
  const id = crs.id || crs.coordinate_system?.id;
  const authority = String(id?.authority || "").toUpperCase();
  const code = String(id?.code || "").toUpperCase();
  const allowed = (authority === "EPSG" && code === "4326") ||
    (authority === "OGC" && code === "CRS84");
  if (!allowed) {
    throw new RangeError("This GeoParquet uses a projected CRS. Reproject it to EPSG:4326 before opening it");
  }
}

async function readGeoParquet(file) {
  const [{ parquetMetadataAsync, parquetReadObjects }, { compressors }] = await Promise.all([
    import(HYPARQUET_URL),
    import(HYPARQUET_COMPRESSORS_URL),
  ]);
  const buffer = await file.arrayBuffer();
  const metadata = await parquetMetadataAsync(buffer);
  const geo = geoParquetMetadata(metadata);
  assertGeoParquetCrs(geo);
  const rows = await parquetReadObjects({ file: buffer, compressors });
  const primaryColumn = geo?.primary_column;
  const features = [];

  rows.forEach((row) => {
    const geometryEntry = primaryColumn && row[primaryColumn]?.type
      ? [primaryColumn, row[primaryColumn]]
      : Object.entries(row).find(([, value]) => (
        value && typeof value === "object" && typeof value.type === "string" &&
        ("coordinates" in value || value.type === "GeometryCollection")
      ));
    if (!geometryEntry) return;
    const [geometryColumn, geometry] = geometryEntry;
    const properties = Object.fromEntries(
      Object.entries(row)
        .filter(([key]) => key !== geometryColumn)
        .map(([key, value]) => [key, serializableProperty(value)])
        .filter(([, value]) => value !== undefined),
    );
    features.push({ type: "Feature", geometry, properties });
  });
  return { type: "FeatureCollection", features };
}

function loadScript(source) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${source}"]`);
    if (existing?.dataset.loaded === "true") return resolve();
    const script = existing || document.createElement("script");
    script.src = source;
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      resolve();
    }, { once: true });
    script.addEventListener("error", () => reject(new Error("The format reader could not be loaded")), { once: true });
    if (!existing) document.head.appendChild(script);
  });
}

function getGdal() {
  if (!gdalPromise) {
    gdalPromise = (async () => {
      await loadScript(`${GDAL_PACKAGE_URL}/gdal3.js`);
      if (typeof window.initGdalJs !== "function") {
        throw new Error("The format reader did not initialise");
      }
      return window.initGdalJs({ path: GDAL_PACKAGE_URL, useWorker: false });
    })();
  }
  return gdalPromise;
}

function asFileList(files) {
  if (files.length === 1) return files[0];
  const transfer = new DataTransfer();
  files.forEach((file) => transfer.items.add(file));
  return transfer.files;
}

async function readWithGdal(files) {
  const Gdal = await getGdal();
  const isZip = files.length === 1 && extensionOf(files[0]) === "zip";
  const opened = await Gdal.open(asFileList(files), [], isZip ? ["vsizip"] : []);
  if (!opened.datasets.length) {
    throw new TypeError(opened.errors?.[0] || "This vector dataset could not be opened");
  }
  const documents = [];
  let outputSerial = 0;
  try {
    for (const dataset of opened.datasets) {
      const info = await Gdal.getInfo(dataset);
      if (info.type !== "vector") continue;
      const layers = info.layers?.length ? info.layers : [null];
      for (const layer of layers) {
        const options = ["-f", "GeoJSON", "-t_srs", "EPSG:4326", "-skipfailures"];
        if (layer?.name) options.push(layer.name);
        const output = await Gdal.ogr2ogr(dataset, options, `vector_${++outputSerial}.geojson`);
        const bytes = await Gdal.getFileBytes(output);
        documents.push(JSON.parse(new TextDecoder().decode(bytes)));
      }
    }
  } finally {
    await Promise.all(opened.datasets.map((dataset) => Gdal.close(dataset)));
  }
  if (!documents.length) throw new TypeError("No vector layer was found in this dataset");
  return documents;
}

async function loadVectorFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > MAX_VECTOR_BYTES) {
    throw new RangeError("The selected files exceed the 200 MB browser limit");
  }

  const extensions = new Set(files.map(extensionOf));
  let documents;
  if (files.length === 1 && (extensions.has("geojson") || extensions.has("json"))) {
    documents = [await readJsonFile(files[0])];
  } else if (files.length === 1 && (extensions.has("parquet") || extensions.has("geoparquet"))) {
    documents = [await readGeoParquet(files[0])];
  } else if ([...extensions].some((extension) => SHAPEFILE_PARTS.has(extension))) {
    documents = [await readShapefile(files)];
  } else if (files.length === 1 && extensions.has("zip")) {
    try {
      documents = [await readShapefile(files)];
    } catch {
      documents = await readWithGdal(files);
    }
  } else {
    documents = await readWithGdal(files);
  }

  const geoJson = {
    type: "FeatureCollection",
    features: documents.flatMap((document) => collectGeoJsonFeatures(document)),
  };
  let imported;
  try {
    imported = importGeoJsonPolygons(geoJson, Number.MAX_SAFE_INTEGER);
  } catch (error) {
    const isShapefile = extensions.has("zip") ||
      [...extensions].some((extension) => SHAPEFILE_PARTS.has(extension));
    if (isShapefile && error instanceof RangeError && /WGS84/.test(error.message)) {
      if (!extensions.has("prj") && !extensions.has("zip")) {
        throw new RangeError(
          "This Shapefile uses projected coordinates. Select its .prj file together with the .shp and .dbf files, or open the complete dataset as a ZIP",
        );
      }
      throw new RangeError(
        "The Shapefile CRS could not be converted to WGS84. Check that its .prj file is present and valid",
      );
    }
    throw error;
  }
  const openedFeatures = imported.features.slice(0, MAX_FEATURES);
  const omittedPolygons = imported.features.length - openedFeatures.length;
  const names = files.map((file) => file.name).join(", ");
  replaceWithImportedFeatures(openedFeatures, names);
  const ignored = imported.ignoredFeatures
    ? `, ${imported.ignoredFeatures} non-polygon feature${imported.ignoredFeatures === 1 ? "" : "s"} ignored`
    : "";
  const omitted = omittedPolygons
    ? `, ${omittedPolygons} additional polygon part${omittedPolygons === 1 ? "" : "s"} not loaded`
    : "";
  toast(`${openedFeatures.length} polygon${openedFeatures.length === 1 ? "" : "s"} opened${ignored}${omitted}`);
}

async function openVectorFiles(files) {
  const triggers = document.querySelectorAll(".import-trigger");
  triggers.forEach((el) => {
    el.disabled = true;
    el.setAttribute("aria-busy", "true");
  });
  try {
    await loadVectorFiles(files);
  } catch (error) {
    toast(error instanceof Error ? error.message : "This dataset could not be opened");
  } finally {
    triggers.forEach((el) => {
      el.disabled = false;
      el.removeAttribute("aria-busy");
    });
  }
}

document.querySelectorAll(".import-trigger").forEach((trigger) => {
  trigger.addEventListener("click", () => $("vectorFile").click());
});
$("vectorFile").addEventListener("change", async (event) => {
  await openVectorFiles(event.target.files);
  event.target.value = "";
});

const mapShell = document.querySelector(".map-shell");
let vectorDragDepth = 0;
mapShell.addEventListener("dragenter", (event) => {
  event.preventDefault();
  vectorDragDepth++;
  mapShell.classList.add("is-dragging");
});
mapShell.addEventListener("dragover", (event) => {
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
});
mapShell.addEventListener("dragleave", () => {
  vectorDragDepth = Math.max(0, vectorDragDepth - 1);
  if (vectorDragDepth === 0) mapShell.classList.remove("is-dragging");
});
mapShell.addEventListener("drop", async (event) => {
  event.preventDefault();
  vectorDragDepth = 0;
  mapShell.classList.remove("is-dragging");
  await openVectorFiles(event.dataTransfer?.files);
});

// Export / config
function tileImageToPng(tile) {
  const canvas = document.createElement("canvas");
  canvas.width = tile.width;
  canvas.height = tile.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("2D canvas context unavailable");
  const pixels = new Uint8ClampedArray(tile.data);
  context.putImageData(new ImageData(pixels, tile.width, tile.height), 0, 0);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Pattern PNG could not be created"));
    }, "image/png");
  });
}

const STATIC_PIXEL_RATIO = 2;

async function buildStaticPatternPng(definition) {
  if (definition.kind === "font") {
    const tile = await createFontPatternTile({
      imageId: "static-pattern",
      ...definition,
      pixelRatio: STATIC_PIXEL_RATIO,
    });
    return tileImageToPng(tile);
  }

  if (definition.kind === "svg") {
    const tile = await createSvgScatterTile({
      imageId: "static-pattern",
      ...definition,
      pixelRatio: STATIC_PIXEL_RATIO,
    });
    return tileImageToPng(tile);
  }

  if (definition.kind === "geometric") {
    return tileImageToPng(makeTile(
      definition.pattern,
      definition.size,
      definition.color,
      definition.weight,
      definition.angle,
      {
        pixelRatio: definition.pixelRatio ?? STATIC_PIXEL_RATIO,
        stippleCount: definition.stippleCount,
      },
    ));
  }
  throw new Error("Unsupported static pattern definition");
}

async function buildStaticCanonicalPatternPng(pattern) {
  return tileImageToPng(await createPatternTile(pattern, { pixelRatio: STATIC_PIXEL_RATIO }));
}

function buildStaticStyle(fragment) {
  fragment = clone(fragment);
  for (const layer of fragment.layers) {
    delete layer.metadata;
  }
  return fragment;
}

function buildStaticIntegration() {
  return `const styleUrl = new URL("./style.json", import.meta.url);
const imagesUrl = new URL("./images.json", import.meta.url);

export async function addPatternFill(map, {
sourceId,
sourceLayer = null,
beforeId,
}) {
if (!map.getSource(sourceId)) {
  throw new Error(\`MapLibre source "\${sourceId}" was not found\`);
}

const response = await fetch(styleUrl);
if (!response.ok) throw new Error("Pattern style could not be loaded");
const fragment = await response.json();
const imagesResponse = await fetch(imagesUrl);
if (!imagesResponse.ok) throw new Error("Pattern image index could not be loaded");
const images = await imagesResponse.json();
for (const [imageId, descriptor] of Object.entries(images)) {
  if (!map.hasImage(imageId)) {
    const relativeUrl = typeof descriptor === "string" ? descriptor : descriptor.path;
    const pixelRatio = typeof descriptor === "string" ? 2 : descriptor.pixelRatio;
    const imageUrl = new URL(relativeUrl, imagesUrl);
    const loaded = await map.loadImage(imageUrl.href);
    map.addImage(imageId, loaded.data || loaded, { pixelRatio });
  }
}

const insertionPoint = beforeId && map.getLayer(beforeId) ? beforeId : undefined;
for (const exportedLayer of fragment.layers) {
  const layer = { ...exportedLayer };
  layer.id = layer.id.replace("<source>", sourceId);
  layer.source = sourceId;

  if (sourceLayer) {
    layer["source-layer"] = sourceLayer;
  } else {
    delete layer["source-layer"];
  }

  map.addLayer(layer, insertionPoint);
}
}
`;
}

function buildStaticReadme() {
  return `# MapLibre pattern fill

This bundle contains a static copy of the pattern designed in
Stipple. It does not require the plugin at runtime.

## Files

- style.json: background, pattern and outline layers
- images.json: image identifiers used by the style
- patterns/: repeating images rendered at 2x resolution
- integration.js: loads every required image and adds the layers

## Use

Keep the three files together in your application, then import the helper:

\`\`\`js
import { addPatternFill } from "./maplibre-pattern-fill/integration.js";

const install = () => addPatternFill(map, {
sourceId: "my-polygons",
sourceLayer: null,
beforeId: undefined,
});

if (map.isStyleLoaded()) install();
else map.once("load", install);
\`\`\`

Set sourceId to an existing polygon source in your map.

Keep sourceLayer as null for GeoJSON. For a vector tile source, use the name
of its source-layer. Set beforeId when the fill should appear below an existing
label or symbol layer.
`;
}

async function downloadStaticBundle() {
  if (exportContainsWholeSymbolPlacement()) {
    throw new Error("Whole-symbol placement needs live geometry and cannot be exported as a repeating PNG");
  }

  const exported = buildExportedStyle();
  const registrations = [];
  for (const layer of exported.layers) {
    const legacy = layer.metadata?.[PATTERN_METADATA_KEY];
    if (legacy) {
      registrations.push(
        { imageId: legacy.imageId, definition: legacy.definition },
        ...(legacy.variants || []),
      );
    }
    const canonical = layer.metadata?.[CANONICAL_PATTERN_METADATA_KEY];
    if (canonical) registrations.push(...canonical.patterns);
  }
  const unique = new Map(registrations.map((item) => [item.imageId, item]));
  const images = {};
  const files = {
    "maplibre-pattern-fill/style.json": JSON.stringify(buildStaticStyle(exported), null, 2),
    "maplibre-pattern-fill/integration.js": buildStaticIntegration(),
    "maplibre-pattern-fill/README.md": buildStaticReadme(),
  };
  for (const [imageId, registration] of unique) {
    const path = `patterns/${imageId}.png`;
    const png = registration.pattern
      ? await buildStaticCanonicalPatternPng(registration.pattern)
      : await buildStaticPatternPng(registration.definition);
    images[imageId] = {
      path,
      pixelRatio: registration.definition?.kind === "geometric"
        ? registration.definition.pixelRatio ?? STATIC_PIXEL_RATIO
        : STATIC_PIXEL_RATIO,
    };
    files[`maplibre-pattern-fill/${path}`] =
      new Uint8Array(await png.arrayBuffer());
  }
  files["maplibre-pattern-fill/images.json"] =
    JSON.stringify(images, null, 2);
  const zip = window.createStoredZip(files);
  const url = URL.createObjectURL(zip);
  const link = document.createElement("a");
  link.href = url;
  link.download = "maplibre-pattern-fill.zip";
  link.click();
  URL.revokeObjectURL(url);
}

function buildIntegrationSnippet() {
  const pattern = JSON.stringify({ layers: buildExportedStyle().layers }, null, 2);
  const propertyNote = designContext === "set"
    ? '// Each feature should have a "category" property matching a PatternSet key.\n'
    : designContext === "sequence"
      ? '// Each feature should have a zero-based "step" property.\n'
      : "";
  return `// Put this import at the top of the module that creates your map.
// Install the package first with: npm install stipple-maplibre
import { addPatternFill } from "stipple-maplibre";

${propertyNote}const pattern = ${pattern};

// Put this after the source has been added to the map.
await addPatternFill(map, {
  sourceId: "my-polygons",
  sourceLayer: null, // Keep null for GeoJSON; use the source-layer for vector tiles.
  pattern,
});
`;
}

function exportContainsWholeSymbolPlacement() {
  if (designContext === "sequence") return Boolean(sequenceBaseStyle?.svgFill.on && sequenceBaseStyle.svgFill.noCut);
  if (designContext === "set") {
    rememberActiveStyle();
    return Object.values(FEATURE_STYLES).some((style) => style.svgFill.on && style.svgFill.noCut);
  }
  return state.svgFill.on && state.svgFill.noCut;
}
$("exportJsBtn").addEventListener("click", () => {
  if (exportContainsWholeSymbolPlacement()) {
    return toast("Whole-symbol SVG placement needs polygon geometry and cannot use the standard MapLibre code export");
  }
  $("ioArea").value = buildIntegrationSnippet();
  navigator.clipboard?.writeText($("ioArea").value);
  toast("Code for an existing MapLibre map copied");
});
$("downloadBundleBtn").addEventListener("click", async (event) => {
  if (!state.layer) return toast("Select a feature first");
  const button = event.currentTarget;
  const title = button.querySelector(".export-option-title");
  const label = title.textContent;
  button.disabled = true;
  title.textContent = "Preparing bundle";
  try {
    await downloadStaticBundle();
    toast("Static JSON + PNG bundle downloaded");
  } catch (error) {
    toast(error instanceof Error ? error.message : "Static bundle could not be created");
  } finally {
    button.disabled = false;
    title.textContent = label;
  }
});
$("copyConfigBtn").addEventListener("click", () => {
  const config = designContext === "set"
    ? currentPatternSet()
    : designContext === "sequence"
      ? currentGraduatedConfig()
      : styleToCanonicalPattern("playground-pattern", "Playground pattern", currentStyle());
  $("ioArea").value = JSON.stringify(
    config,
    null,
    2,
  );
  navigator.clipboard?.writeText($("ioArea").value);
  toast(designContext === "set"
    ? "Pattern Set config copied"
    : designContext === "sequence"
      ? sequenceState.scheme === "diverging"
        ? "Diverging graduated set copied"
        : "Pattern Sequence config copied"
      : "Preset config copied");
});
$("importConfigBtn").addEventListener("click", () => {
  try {
    const cfg = JSON.parse($("ioArea").value);
    if (cfg?.kind === "pattern-set") {
      loadCanonicalPatternSet(cfg);
      return toast("Pattern Set config loaded");
    }
    if (cfg?.kind === "pattern-sequence") {
      loadCanonicalPatternSequence(cfg);
      return toast("Pattern Sequence config loaded");
    }
    if (cfg?.kind === "pattern") {
      loadCanonicalPattern(cfg);
      return toast("Pattern config loaded");
    }
    loadStyle(cfg);
    applyStateToUI();
    if (state.layer) rebuildLayers();
    toast("Config loaded");
  } catch (e) { toast("Invalid JSON: " + e.message); }
});

// Reflect state into the controls (after loading a preset).
function applyStateToUI() {
  $("patColor").value = $("patColorHex").value = state.patColor;
  $("svgPatColor").value = $("svgPatColorHex").value = state.patColor;
  $("patOpacity").value = state.patOpacity; $("patOpacityVal").textContent = (+state.patOpacity).toFixed(2);
  $("svgPatOpacity").value = state.patOpacity; $("svgPatOpacityVal").textContent = (+state.patOpacity).toFixed(2);
  $("weight").value = state.weight; $("weightVal").textContent = (+state.weight).toFixed(2) + " px";
  $("tile").value = state.tile; $("tileVal").textContent = state.tile + " px";
  $("geometricReferenceZoom").value = state.geometricScale.referenceZoom;
  $("geometricReferenceZoomVal").textContent = `z${state.geometricScale.referenceZoom.toFixed(0)}`;
  $("fontText").value = state.fontFill.text;
  $("fontFamily").value = state.fontFill.fontFamily;
  $("fontSize").value = state.fontFill.fontSize;
  $("fontSizeVal").textContent = state.fontFill.fontSize + " px";
  $("fontLetterSpacing").value = state.fontFill.letterSpacing;
  $("fontLetterSpacingVal").textContent = state.fontFill.letterSpacing + " px";
  $("fontHorizontalSpacing").value = state.fontFill.horizontalSpacing;
  $("fontHorizontalSpacingVal").textContent = state.fontFill.horizontalSpacing + " px";
  $("fontVerticalSpacing").value = state.fontFill.verticalSpacing;
  $("fontVerticalSpacingVal").textContent = state.fontFill.verticalSpacing + " px";
  $("fontRotation").value = state.fontFill.rotationDeg;
  $("fontRotationVal").textContent = state.fontFill.rotationDeg + "°";
  $("fontReferenceZoom").value = state.fontFill.referenceZoom;
  $("fontReferenceZoomVal").textContent = `z${state.fontFill.referenceZoom.toFixed(0)}`;
  document.querySelectorAll("#fontStyleSeg button").forEach((button) => {
    button.classList.toggle("active", button.dataset.fontStyle === state.fontFill.fontStyle);
  });
  document.querySelectorAll("#fontWeightSeg button").forEach((button) => {
    button.classList.toggle("active", button.dataset.fontWeight === state.fontFill.fontWeight);
  });
  document.querySelectorAll("#fontLayoutSeg button").forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.fontLayout === (state.fontFill.stagger ? "staggered" : "regular"),
    );
  });
  updateFontScaleControls();
  $("bgColor").value = $("bgColorHex").value = state.bg.color;
  $("bgOpacity").value = state.bg.opacity; $("bgOpacityVal").textContent = (+state.bg.opacity).toFixed(2);
  $("bgToggle").checked = state.bg.on;
  $("lineColor").value = $("lineColorHex").value = state.outline.color;
  $("lineWidth").value = state.outline.width; $("lineWidthVal").textContent = (+state.outline.width).toFixed(2) + " px";
  $("lineToggle").checked = state.outline.on;
  $("dashInput").value = (state.outline.dash || []).join(" ");
  $("svgFillToggle").checked = state.svgFill.on;
  let motif = motifCatalogEntry(state.svgFill.sample);
  if (!motif) {
    state.svgFill.sample = SVG_PATTERN_CATALOG[0].value;
    motif = SVG_PATTERN_CATALOG[0];
  }
  activeMotifFamily = motif.family;
  $("svgFillCustomText").value = state.svgFill.customSvg;
  $("svgVisualSize").value = state.svgFill.visualSize;
  $("svgVisualSizeVal").textContent = state.svgFill.visualSize.toFixed(0) + " px";
  $("svgSpacing").value = state.svgFill.spacing;
  $("svgSpacingVal").textContent = state.svgFill.spacing.toFixed(0) + " px";
  $("svgReferenceZoom").value = state.svgFill.referenceZoom;
  $("svgReferenceZoomVal").textContent = `z${state.svgFill.referenceZoom.toFixed(0)}`;
  $("svgMinSpacing").value = state.svgFill.minSpacing;
  $("svgMinSpacingVal").textContent = state.svgFill.minSpacing + " px";
  $("svgPosJitter").value = state.svgFill.positionJitter; $("svgPosJitterVal").textContent = "±" + state.svgFill.positionJitter.toFixed(2);
  $("svgRotJitter").value = state.svgFill.rotationJitterDeg; $("svgRotJitterVal").textContent = "±" + state.svgFill.rotationJitterDeg + "°";
  $("svgScaleJitter").value = state.svgFill.scaleJitter; $("svgScaleJitterVal").textContent = "±" + state.svgFill.scaleJitter.toFixed(2);
  $("svgSeed").value = state.svgFill.seed;
  updateSvgDistributionControls();
  updateSvgScaleModeControls();
  updateSvgQualityHint();
  updateFillModePanels();
  updateFillChoiceUI();
  document.querySelectorAll("#angleSeg button").forEach((b) => b.classList.toggle("active", +b.dataset.a === state.angle));
  document.querySelectorAll("#dashSeg button").forEach((button) => {
    const preset = DASH_PRESETS[button.dataset.d] || [];
    button.classList.toggle("active", JSON.stringify(preset) === JSON.stringify(state.outline.dash || []));
  });
  updatePatternControlAvailability();
  updateSvgControlAvailability();
  updateAppearanceControlAvailability();
  renderPreview();
  renderDesignLegend();
}

map.on("moveend", () => {
  if (state.svgFill.on) {
    if (state.svgFill.noCut && state.svgFill.scaleMode === "screen") {
      syncSvgIconScatter();
    }
    updateSvgScaleReadout();
    updateSvgQualityHint();
  } else if (state.fontFill.on) {
    updateFontScaleReadout();
  } else if (!state.fontFill.on && state.pattern !== "solid") {
    updateGeometricScaleReadout();
  }
});

function polygonLayerIds() {
  return Object.keys(FEATURES)
    .flatMap((id) => [`${id}__idle_line`, `${id}__idle`, `${id}__line`, `${id}__pat`, `${id}__bg`])
    .filter((id) => map.getLayer(id));
}

map.on("click", (event) => {
  const hit = map.queryRenderedFeatures(event.point, { layers: polygonLayerIds() })[0];
  if (hit?.source && FEATURES[hit.source]) selectLayer(hit.source, { focusEditor: true });
});
map.on("mousemove", (event) => {
  const overPolygon = map.queryRenderedFeatures(event.point, { layers: polygonLayerIds() }).length > 0;
  map.getCanvas().style.cursor = overPolygon ? "pointer" : "";
});

// Startup
map.on("load", async () => {
  try {
    await loadDemoGeography();
  } catch (error) {
    console.error(error);
    toast("Built-in map geometry could not be loaded");
  }
  applyStateToUI();
  generateFeatures();
  renderCuratedPatternPreviews().catch((error) => console.error("Pattern previews could not be rendered", error));
});
})();
