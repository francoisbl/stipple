(async () => {
// UI controls for the browser bundle built in ../dist.

const {
  makeTile, syncPatternTexture, buildStyleFragment,
  installSvgPatternFill, installSvgIconScatter,
  createSvgPatternDefinition, createSvgScatterTile,
  installFontPatternFill, createFontPatternDefinition, createFontPatternTile,
  scalePatternForZoom,
  importGeoJsonPolygons, patternDefinitionId, PATTERN_METADATA_KEY,
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
const PNG_EXPORT_DEBUG = new URLSearchParams(window.location.search).get("debug") === "png";

const $ = (id) => document.getElementById(id);
const toast = (msg) => {
  const t = $("toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 1600);
};

let activeMotifFamily = "vegetation";


// State, serializable as-is as a preset config.
const state = {
  layer: null,             // { source }, id of the selected GeoJSON test source
  pattern: "stipple",      // solid | stipple | hachures | cross | grid | dots
  angle: 45,
  patColor: "#2c6a5b",
  patOpacity: 1,
  weight: 2,
  tile: 16,
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
    fontFill,
    svgFill,
    geometricScale,
    layer: selectedLayer,
  });
  geometricWeightByPattern.set(state.pattern, state.weight);
}

function rememberActiveStyle() {
  if (state.layer) FEATURE_STYLES[state.layer.source] = currentStyle();
}
const DEFAULT_STYLE = currentStyle();
const FEATURE_PRESETS = [
  { pattern: "stipple", patColor: "#2c6a5b", tile: 16, bg: { color: "#dce8e3", opacity: 0.38 } },
  { pattern: "hachures", patColor: "#d65f45", angle: 45, tile: 20, weight: 1.5, bg: { color: "#f3ded7", opacity: 0.42 } },
  { pattern: "dots", patColor: "#315f86", tile: 22, weight: 2.4, bg: { color: "#dce7ef", opacity: 0.4 } },
  { pattern: "cross", patColor: "#675d4d", angle: 0, tile: 18, weight: 1.3, bg: { color: "#ebe6d9", opacity: 0.44 } },
];

function featureStyleFor(index) {
  const style = clone(DEFAULT_STYLE);
  const preset = FEATURE_PRESETS[index % FEATURE_PRESETS.length];
  Object.assign(style, preset);
  style.bg = { ...style.bg, ...preset.bg };
  style.outline = { ...style.outline, color: preset.patColor };
  return style;
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
  ...(PNG_EXPORT_DEBUG ? { canvasContextAttributes: { preserveDrawingBuffer: true } } : {}),
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
const PANEL_WIDTH_KEY = "stipple:panel-width";
const PANEL_WIDTH_DEFAULT = 320;
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
    return;
  }
  if (state.svgFill.on) return;
  if (state.pattern === "solid") {
    ctx.fillStyle = withOpacity(state.patColor, state.patOpacity);
    ctx.fillRect(0, 0, physicalSize, physicalSize); return;
  }
  const tilePixelRatio = (physicalSize / PREVIEW_REPEATS) / state.tile;
  const tile = makeTile(state.pattern, state.tile, state.patColor, state.weight, state.angle, { pixelRatio: tilePixelRatio });
  const tmp = document.createElement("canvas"); tmp.width = tile.width; tmp.height = tile.height;
  tmp.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(tile.data), tile.width, tile.height), 0, 0);
  const pat = ctx.createPattern(tmp, "repeat");
  ctx.globalAlpha = state.patOpacity;
  ctx.fillStyle = pat; ctx.fillRect(0, 0, physicalSize, physicalSize);
  ctx.globalAlpha = 1;
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
  if (!state.layer || state.pattern === "solid" || state.fontFill.on || state.svgFill.on) return;
  const style = currentStyle();
  const layerId = `${state.layer.source}__pat`;
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
    if (!state.fontFill.on && !state.svgFill.on && state.pattern === "solid") {
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

// Export a polygon style fragment.
function buildExportedStyle() {
  const style = currentStyle();
  const fragment = buildStyleFragment({
    source: "<source>",
    sourceLayer: "<source-layer>",
    bg: { enabled: state.bg.on, color: state.bg.color, opacity: state.bg.opacity },
    pattern: {
      pattern: state.svgFill.on || state.fontFill.on ? "hachures" : state.pattern,
      tile: state.tile, color: state.patColor, opacity: state.patOpacity,
      weight: state.weight, angle: state.angle,
      pixelRatio: geometricPixelRatio(style),
    },
    line: { enabled: state.outline.on, color: state.outline.color, width: state.outline.width, dash: state.outline.dash },
  });
  const exportedPatternLayerIndex = fragment.layers.findIndex((layer) => layer.id === "<source>__pat");
  if (!state.svgFill.on && !state.fontFill.on) {
    if (state.pattern !== "solid" && state.geometricScale.mode === "map") {
      const variants = createGeometricZoomVariants(style);
      const [base] = variants;
      fragment.layers[exportedPatternLayerIndex].paint["fill-pattern"] =
        zoomPatternExpression(variants);
      fragment.layers[exportedPatternLayerIndex].metadata = {
        [PATTERN_METADATA_KEY]: {
          imageId: base.imageId,
          definition: base.definition,
          variants,
        },
      };
    }
    return fragment;
  }

  if (state.fontFill.on) {
    const variants = style.fontFill.scaleMode === "map"
      ? createFontZoomVariants(style)
      : [];
    const definition = variants[0]?.definition ?? createFontDefinition(style);
    const imageId = variants[0]?.imageId ?? patternDefinitionId(definition);
    fragment.layers[exportedPatternLayerIndex].paint["fill-pattern"] = variants.length
      ? zoomPatternExpression(variants)
      : imageId;
    fragment.layers[exportedPatternLayerIndex].paint["fill-opacity"] = style.patOpacity;
    fragment.layers[exportedPatternLayerIndex].metadata = {
      [PATTERN_METADATA_KEY]: {
        imageId,
        definition,
        ...(variants.length ? { variants } : {}),
      },
    };
    return fragment;
  }

  if (state.svgFill.noCut) {
    // Whole-symbol placement depends on live polygon geometry and remains an
    // experimental runtime operation, so do not export a placeholder fill.
    if (exportedPatternLayerIndex >= 0) fragment.layers.splice(exportedPatternLayerIndex, 1);
    return fragment;
  }

  if (state.svgFill.scaleMode === "map") {
    const variants = createSvgZoomVariants(style);
    const [base] = variants;
    fragment.layers[exportedPatternLayerIndex].paint["fill-pattern"] =
      zoomPatternExpression(variants);
    fragment.layers[exportedPatternLayerIndex].paint["fill-opacity"] = style.patOpacity;
    fragment.layers[exportedPatternLayerIndex].metadata = {
      [PATTERN_METADATA_KEY]: {
        imageId: base.imageId,
        definition: base.definition,
        variants,
      },
    };
  } else {
    const effective = effectiveSvgTexture(style, null);
    const definition = createSvgDefinition(style, effective);
    const imageId = patternDefinitionId(definition);
    fragment.layers[exportedPatternLayerIndex].paint["fill-pattern"] = imageId;
    fragment.layers[exportedPatternLayerIndex].metadata = {
      [PATTERN_METADATA_KEY]: { imageId, definition },
    };
  }
  return fragment;
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
    [`${id}__svg_img_z${zoom}`, `${id}__font_img_z${zoom}`].forEach((imageId) => {
      if (map.hasImage(imageId)) map.removeImage(imageId);
    });
  }
  if (map.getSource(`${id}__svgscatter`)) map.removeSource(`${id}__svgscatter`);
}

function removeStyleLayers(id) {
  [`${id}__idle_line`, `${id}__idle`].forEach((layerId) => map.getLayer(layerId) && map.removeLayer(layerId));
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

function showSelection(id) {
  Object.keys(FEATURES).forEach((featureId) => {
    const visibility = featureId === id ? "none" : "visible";
    if (map.getLayer(`${featureId}__idle`)) {
      map.setLayoutProperty(`${featureId}__idle`, "visibility", visibility);
      if (visibility === "visible") map.moveLayer(`${featureId}__idle`);
    }
    if (map.getLayer(`${featureId}__idle_line`)) {
      map.setLayoutProperty(`${featureId}__idle_line`, "visibility", visibility);
      if (visibility === "visible") map.moveLayer(`${featureId}__idle_line`);
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
  $("reloadCatalog").disabled =
    sourceMode === "import" || count >= MAX_SAMPLE_FEATURES;
  $("reloadCatalog").textContent = sourceMode === "import"
    ? "File loaded"
    : count >= MAX_SAMPLE_FEATURES
      ? "Sample limit"
      : "Add sample";
}

function fitAllFeatures() {
  const allCoords = Object.values(FEATURES).flatMap((fc) => fc.features[0].geometry.coordinates[0]);
  const bounds = allCoords.reduce(
    (acc, [x, y]) => [Math.min(acc[0], x), Math.min(acc[1], y), Math.max(acc[2], x), Math.max(acc[3], y)],
    [180, 90, -180, -90],
  );
  const compact = window.innerWidth < 700;
  map.fitBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]], {
    padding: compact
      ? { top: 80, right: 40, bottom: 80, left: 40 }
      : { top: 70, right: 70, bottom: 70, left: 70 },
    maxZoom: 13.5,
    duration: 450,
  });
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
    featureStyleFor(index),
  );
  sourceMode = "sample";
  sourceFileName = "";
  renderFeatureTable();
  selectLayer(id);
  fitAllFeatures();
}

function generateFeatures() {
  clearFeatures();
  featureOrigin = map.getCenter();
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

function selectLayer(id) {
  if (!id || !FEATURES[id]) return;
  if (state.layer && state.layer.source !== id) rememberActiveStyle();
  state.layer = { source: id };
  loadStyle(FEATURE_STYLES[id] || DEFAULT_STYLE);
  $("layerSelect").value = id;
  const label = FEATURE_META[id]?.label || `Polygon ${id.split("_")[1]}`;
  const count = Object.keys(FEATURES).length;
  $("activePolygonLabel").textContent = label;
  $("srcHint").textContent = sourceMode === "import"
    ? `${sourceFileName} · ${label}${count > 1 ? " selected" : ""}`
    : count === 1
      ? "Adjust its style, open vector data or add another sample."
      : `${label} selected. Click another shape to edit it.`;
  document.querySelectorAll("#featureTableBody tr").forEach((row) => {
    row.classList.toggle("active", row.dataset.feature === id);
  });
  applyStateToUI();
  showSelection(id);
  if (state.fontFill.on) syncFontFill();
  else if (state.svgFill.on) syncSvgFill();
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
}

$("toolTabs").addEventListener("click", (event) => {
  const tool = event.target.dataset.tool;
  if (tool) openTool(tool);
});

const BASEMAP_LABELS = {
  liberty: "OSM Liberty",
  neutral: "Neutral",
  streets: "Streets",
  positron: "Light",
  bright: "Bright",
  aerial: "Aerial",
};
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
      targetMap.setLayoutProperty(layer.id, "visibility", name === "liberty" ? "visible" : "none");
    }
  });
  if (targetMap.getLayer("bg")) {
    targetMap.setPaintProperty("bg", "background-color", name === "neutral" ? "#e9eeec" : "#d8dfdc");
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
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeMenus();
    closeBasemapPicker();
    closeLayersPicker();
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
$("locateBtn").addEventListener("click", () => fitAllFeatures());

function syncCompassControl() {
  $("compassBtn").hidden = Math.abs(map.getBearing()) < 0.01 && Math.abs(map.getPitch()) < 0.01;
}

map.on("rotate", syncCompassControl);
map.on("pitch", syncCompassControl);
syncCompassControl();

function bindColor(colorId, hexId, apply) {
  const col = $(colorId), hex = $(hexId);
  col.addEventListener("input", () => { hex.value = col.value; apply(col.value); });
  hex.addEventListener("change", () => {
    if (/^#[0-9a-f]{6}$/i.test(hex.value)) { col.value = hex.value; apply(hex.value); }
  });
}

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
  const p = e.target.dataset.p; if (!p) return;
  geometricWeightByPattern.set(state.pattern, state.weight);
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
  else if (state.pattern === "solid") repaint();
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
function updateFillChoiceUI() {
  document.querySelectorAll("#patternPills .pill").forEach((element) => {
    element.classList.toggle(
      "active",
      !state.fontFill.on && !state.svgFill.on && element.dataset.p === state.pattern,
    );
  });
  $("fontModePill").classList.toggle("active", state.fontFill.on);
  $("svgModePill").classList.toggle("active", state.svgFill.on);
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
  const angleEnabled = !state.fontFill.on && (state.pattern === "hachures" || state.pattern === "cross");
  const textureEnabled = state.fontFill.on || state.pattern !== "solid";
  $("angleControl").classList.toggle("is-disabled", !angleEnabled);
  document.querySelectorAll("#angleSeg button").forEach((button) => {
    button.disabled = !angleEnabled;
  });
  $("textureScaleControl").classList.toggle("is-disabled", !textureEnabled);
  $("scaleControl").classList.toggle("is-disabled", !textureEnabled);
  $("weight").disabled = !textureEnabled || state.fontFill.on;
  $("tile").disabled = !textureEnabled || state.fontFill.on;
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
  const enabled = !state.fontFill.on && !state.svgFill.on && state.pattern !== "solid";
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
  if (state.pattern === "solid" || state.fontFill.on || state.svgFill.on) return;
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

// Source
$("reloadCatalog").addEventListener("click", addFeature);
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

function geometryPositions(geometry) {
  const positions = [];
  const visit = (value) => {
    if (Array.isArray(value) && typeof value[0] === "number" && typeof value[1] === "number") {
      positions.push(value);
      return;
    }
    if (Array.isArray(value)) value.forEach(visit);
  };
  visit(geometry?.coordinates);
  return positions;
}

function mapIdle() {
  return new Promise((resolve) => map.once("idle", resolve));
}

function canvasPng(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Polygon PNG could not be created"));
    }, "image/png");
  });
}

function safeFileName(value) {
  const name = String(value || "polygon")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return name || "polygon";
}

async function downloadSelectedPolygonPng() {
  if (!PNG_EXPORT_DEBUG) throw new Error("Enable ?debug=png to use this temporary export");
  if (!state.layer || !FEATURES[state.layer.source]) throw new Error("Select a feature first");

  const featureId = state.layer.source;
  const feature = FEATURES[featureId].features[0];
  const coordinates = geometryPositions(feature.geometry);
  if (!coordinates.length) throw new Error("The selected polygon has no coordinates");

  const bounds = coordinates.reduce(
    (result, [lng, lat]) => result.extend([lng, lat]),
    new maplibregl.LngLatBounds(coordinates[0], coordinates[0]),
  );
  const previousCamera = {
    center: map.getCenter(),
    zoom: map.getZoom(),
    bearing: map.getBearing(),
    pitch: map.getPitch(),
    padding: map.getPadding(),
  };
  const previousPixelRatio = map.getPixelRatio();
  const layers = map.getStyle().layers || [];
  const previousVisibility = layers.map((layer) => ({
    id: layer.id,
    visibility: map.getLayoutProperty(layer.id, "visibility") || "visible",
  }));

  try {
    const selectedPrefix = `${featureId}__`;
    for (const layer of layers) {
      map.setLayoutProperty(
        layer.id,
        "visibility",
        layer.id.startsWith(selectedPrefix) ? previousVisibility.find((item) => item.id === layer.id).visibility : "none",
      );
    }
    map.setPixelRatio(Math.max(2, previousPixelRatio));
    map.fitBounds(bounds, { padding: 56, maxZoom: 15, duration: 0 });
    await mapIdle();
    map.triggerRepaint();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    const sourceCanvas = map.getCanvas();
    const scaleX = sourceCanvas.width / sourceCanvas.clientWidth;
    const scaleY = sourceCanvas.height / sourceCanvas.clientHeight;
    const projected = coordinates.map((position) => map.project(position));
    const cropPadding = 32;
    const minX = Math.min(...projected.map(({ x }) => x)) - cropPadding;
    const minY = Math.min(...projected.map(({ y }) => y)) - cropPadding;
    const maxX = Math.max(...projected.map(({ x }) => x)) + cropPadding;
    const maxY = Math.max(...projected.map(({ y }) => y)) + cropPadding;
    const sx = Math.max(0, Math.floor(minX * scaleX));
    const sy = Math.max(0, Math.floor(minY * scaleY));
    const sw = Math.min(sourceCanvas.width - sx, Math.ceil((maxX - minX) * scaleX));
    const sh = Math.min(sourceCanvas.height - sy, Math.ceil((maxY - minY) * scaleY));
    const output = document.createElement("canvas");
    output.width = sw;
    output.height = sh;
    const context = output.getContext("2d");
    if (!context) throw new Error("2D canvas context unavailable");
    context.drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, sw, sh);

    const blob = await canvasPng(output);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeFileName(FEATURE_META[featureId]?.label)}-stipple.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  } finally {
    previousVisibility.forEach(({ id, visibility }) => {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", visibility);
    });
    map.setPixelRatio(previousPixelRatio);
    map.jumpTo(previousCamera);
  }
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
  if (state.svgFill.on && state.svgFill.noCut) {
    throw new Error("Whole-symbol placement needs live geometry and cannot be exported as a repeating PNG");
  }

  const exported = buildExportedStyle();
  const registrations = [];
  for (const layer of exported.layers) {
    const metadata = layer.metadata?.[PATTERN_METADATA_KEY];
    if (!metadata) continue;
    registrations.push(
      { imageId: metadata.imageId, definition: metadata.definition },
      ...(metadata.variants || []),
    );
  }
  const unique = new Map(registrations.map((item) => [item.imageId, item.definition]));
  const images = {};
  const files = {
    "maplibre-pattern-fill/style.json": JSON.stringify(buildStaticStyle(exported), null, 2),
    "maplibre-pattern-fill/integration.js": buildStaticIntegration(),
    "maplibre-pattern-fill/README.md": buildStaticReadme(),
  };
  for (const [imageId, definition] of unique) {
    const path = `patterns/${imageId}.png`;
    const png = await buildStaticPatternPng(definition);
    images[imageId] = {
      path,
      pixelRatio: definition.kind === "geometric"
        ? definition.pixelRatio ?? STATIC_PIXEL_RATIO
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

$("exportBtn").addEventListener("click", () => {
  if (!state.layer) return toast("Select a feature first");
  $("ioArea").value = JSON.stringify(buildExportedStyle(), null, 2);
  navigator.clipboard?.writeText($("ioArea").value);
  if (state.svgFill.on) {
    toast(state.svgFill.noCut
      ? "style.json copied. Note: whole-symbol placement needs live polygon geometry, so it isn't in the metadata schema; wire installSvgIconScatter() manually"
      : "runtime-extended style copied. installPatternFills will restore its SVG texture");
  } else {
    toast("Polygon style.json copied to clipboard");
  }
});

function buildIntegrationSnippet() {
  const fragment = JSON.stringify(buildExportedStyle(), null, 2);
  return `// Put this import at the top of the module that creates your map.
// Install the package first with: npm install stipple-maplibre
import { installPatternFills } from "stipple-maplibre";

// Use the id of a polygon source that already exists in your map.
const SOURCE_ID = "my-polygons";

// Keep null for a GeoJSON source. For a vector source, enter its source-layer.
const SOURCE_LAYER = null;

const patternFill = ${fragment};

async function addPatternFill(map) {
if (!map.getSource(SOURCE_ID)) {
  throw new Error(\`MapLibre source "\${SOURCE_ID}" was not found\`);
}

const layers = patternFill.layers.map((exportedLayer) => {
  const layer = structuredClone(exportedLayer);
  layer.id = layer.id.replace("<source>", SOURCE_ID);
  layer.source = SOURCE_ID;

  if (SOURCE_LAYER) {
    layer["source-layer"] = SOURCE_LAYER;
  } else {
    delete layer["source-layer"];
  }

  return layer;
});

await installPatternFills(map, { layers });
for (const layer of layers) {
  map.addLayer(layer);
}
}

// Put this after: const map = new maplibregl.Map({ ... })
if (map.isStyleLoaded()) {
addPatternFill(map);
} else {
map.once("load", () => addPatternFill(map));
}
`;
}
$("exportJsBtn").addEventListener("click", () => {
  $("ioArea").value = buildIntegrationSnippet();
  navigator.clipboard?.writeText($("ioArea").value);
  toast("Code for an existing MapLibre map copied");
});
$("downloadBundleBtn").addEventListener("click", async (event) => {
  if (!state.layer) return toast("Select a feature first");
  const button = event.currentTarget;
  const label = button.textContent;
  button.disabled = true;
  button.textContent = "Preparing bundle";
  try {
    await downloadStaticBundle();
    toast("Static JSON + PNG bundle downloaded");
  } catch (error) {
    toast(error instanceof Error ? error.message : "Static bundle could not be created");
  } finally {
    button.disabled = false;
    button.textContent = label;
  }
});
if (PNG_EXPORT_DEBUG) $("exportPngDebugBtn").hidden = false;
$("exportPngDebugBtn").addEventListener("click", async (event) => {
  const button = event.currentTarget;
  const label = button.innerHTML;
  button.disabled = true;
  button.textContent = "Rendering transparent PNG";
  try {
    await downloadSelectedPolygonPng();
    toast("Transparent polygon PNG downloaded");
  } catch (error) {
    toast(error instanceof Error ? error.message : "Polygon PNG could not be created");
  } finally {
    button.disabled = false;
    button.innerHTML = label;
  }
});
$("copyConfigBtn").addEventListener("click", () => {
  $("ioArea").value = JSON.stringify(currentStyle(), null, 2);
  navigator.clipboard?.writeText($("ioArea").value);
  toast("Preset config copied");
});
$("importConfigBtn").addEventListener("click", () => {
  try {
    const cfg = JSON.parse($("ioArea").value);
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
  if (hit?.source && FEATURES[hit.source]) selectLayer(hit.source);
});
map.on("mousemove", (event) => {
  const overPolygon = map.queryRenderedFeatures(event.point, { layers: polygonLayerIds() }).length > 0;
  map.getCanvas().style.cursor = overPolygon ? "pointer" : "";
});

// Startup
map.on("load", () => {
  applyStateToUI();
  generateFeatures();
});
})();
