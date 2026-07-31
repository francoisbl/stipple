import {
  scatterPointsInPolygon
} from "./chunk-WUNIYF3E.js";
import {
  loadSvgImage
} from "./chunk-Z7LWPO7O.js";
import "./chunk-GBEE6YET.js";

// src/maplibre/scatterIconPoints.ts
function toPolygons(polygon) {
  return polygon.type === "Polygon" ? [polygon.coordinates] : polygon.coordinates;
}
function componentSeed(seed, index) {
  const base = seed ?? 1;
  return typeof base === "string" ? `${base}:${index}` : base + Math.imul(index, 2654435761);
}
function scatterIconPoints(options) {
  const {
    map,
    polygon,
    iconRadiusPx,
    density,
    seed,
    rotationJitterDeg,
    scaleJitter,
    positionJitter,
    stagger,
    distribution,
    minSpacing,
    viewportPaddingPx
  } = options;
  let clipBounds;
  if (viewportPaddingPx !== void 0) {
    if (!Number.isFinite(viewportPaddingPx) || viewportPaddingPx < 0) {
      throw new RangeError("viewportPaddingPx must be a finite number greater than or equal to 0");
    }
    const canvas = map.getCanvas?.();
    if (canvas) {
      const pixelRatio = globalThis.devicePixelRatio || 1;
      const width = canvas.clientWidth || canvas.width / pixelRatio;
      const height = canvas.clientHeight || canvas.height / pixelRatio;
      clipBounds = {
        minX: -viewportPaddingPx,
        minY: -viewportPaddingPx,
        maxX: width + viewportPaddingPx,
        maxY: height + viewportPaddingPx
      };
    }
  }
  const points = toPolygons(polygon).flatMap((polygonRings, polygonIndex) => {
    const pixelRings = polygonRings.map(
      (ring) => ring.map(([lng, lat]) => {
        const p = map.project([lng, lat]);
        return [p.x, p.y];
      })
    );
    return scatterPointsInPolygon(pixelRings, {
      radius: iconRadiusPx,
      density,
      seed: componentSeed(seed, polygonIndex),
      rotationJitterDeg,
      scaleJitter,
      positionJitter,
      stagger,
      distribution,
      minSpacing,
      clipBounds
    });
  });
  const features = points.map(({ x, y, rotation, scale }, index) => {
    const lngLat = map.unproject([x, y]);
    return {
      type: "Feature",
      id: index,
      geometry: { type: "Point", coordinates: [lngLat.lng, lngLat.lat] },
      properties: { rotation, scale }
    };
  });
  return { type: "FeatureCollection", features };
}

// src/maplibre/svgIcon.ts
var installedSvgIcons = /* @__PURE__ */ new WeakMap();
async function addSvgIcon(map, options) {
  const { id, svg, size = 32, pixelRatio = 2 } = options;
  const px = Math.round(size * pixelRatio);
  const signature = `${size}@${pixelRatio}:${svg}`;
  let installedById = installedSvgIcons.get(map);
  if (!installedById) {
    installedById = /* @__PURE__ */ new Map();
    installedSvgIcons.set(map, installedById);
  }
  const previous = installedById.get(id);
  if (map.hasImage(id) && previous?.signature === signature) {
    return { id, width: previous.width, height: previous.height };
  }
  const image = await loadSvgImage(svg);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = px;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");
  ctx.clearRect(0, 0, px, px);
  ctx.drawImage(image, 0, 0, px, px);
  const imageData = ctx.getImageData(0, 0, px, px);
  const tile = { width: px, height: px, data: new Uint8Array(imageData.data.buffer) };
  if (map.hasImage(id) && previous?.width === px && previous.height === px && previous.pixelRatio === pixelRatio) {
    map.updateImage(id, tile);
  } else {
    if (map.hasImage(id)) map.removeImage(id);
    map.addImage(id, tile, { pixelRatio });
  }
  installedById.set(id, {
    signature,
    width: px,
    height: px,
    pixelRatio
  });
  return { id, width: px, height: px };
}

// src/maplibre/svgIconScatter.ts
var installedScatterFeatures = /* @__PURE__ */ new WeakMap();
var installedScatterLayerStates = /* @__PURE__ */ new WeakMap();
function featureDiff(previous, next) {
  const [previousLng, previousLat] = previous.geometry.coordinates;
  const [nextLng, nextLat] = next.geometry.coordinates;
  const geometryChanged = previousLng !== nextLng || previousLat !== nextLat;
  const propertiesChanged = previous.properties.rotation !== next.properties.rotation || previous.properties.scale !== next.properties.scale;
  if (!geometryChanged && !propertiesChanged) return void 0;
  return {
    id: next.id,
    ...geometryChanged ? { newGeometry: next.geometry } : {},
    ...propertiesChanged ? {
      addOrUpdateProperties: [
        { key: "rotation", value: next.properties.rotation },
        { key: "scale", value: next.properties.scale }
      ]
    } : {}
  };
}
function scatterSourceDiff(previous, next) {
  const sharedCount = Math.min(previous.length, next.length);
  const update = [];
  for (let index = 0; index < sharedCount; index++) {
    const diff = featureDiff(previous[index], next[index]);
    if (diff) update.push(diff);
  }
  return {
    ...previous.length > next.length ? { remove: previous.slice(next.length).map(({ id }) => id) } : {},
    ...next.length > previous.length ? { add: next.slice(previous.length) } : {},
    ...update.length ? { update } : {}
  };
}
async function updateScatterSource(map, sourceId, points) {
  let featuresBySource = installedScatterFeatures.get(map);
  if (!featuresBySource) {
    featuresBySource = /* @__PURE__ */ new Map();
    installedScatterFeatures.set(map, featuresBySource);
  }
  const previous = featuresBySource.get(sourceId);
  featuresBySource.set(sourceId, points.features);
  const existingSource = map.getSource(sourceId);
  if (!existingSource) {
    map.addSource(sourceId, {
      type: "geojson",
      data: points,
      // Point geometry does not need high-zoom vector-tile subdivision.
      // Overscaling above z14 preserves positions while reducing rebuild work.
      maxzoom: 14
    });
    return;
  }
  if (previous && typeof existingSource.updateData === "function") {
    const diff = scatterSourceDiff(previous, points.features);
    if (!diff.add && !diff.remove && !diff.update) return;
    try {
      await existingSource.updateData(diff);
      return;
    } catch {
    }
  }
  existingSource.setData(points);
}
async function installSvgIconScatter(map, options) {
  const {
    sourceId,
    layerId,
    iconId,
    polygon,
    svg,
    size = 32,
    density,
    seed,
    rotationJitterDeg,
    scaleJitter,
    positionJitter,
    stagger,
    distribution,
    minSpacing,
    opacity = 1,
    scaleMode = "screen",
    edgeClearance = true,
    viewportPaddingPx
  } = options;
  if (scaleMode !== "screen" && scaleMode !== "map") {
    throw new TypeError("scaleMode must be screen or map");
  }
  await addSvgIcon(map, { id: iconId, svg, size });
  const approximateSpacing = density && density > 0 ? 100 / Math.sqrt(density) : 100;
  const screenPadding = viewportPaddingPx ?? Math.max(
    192,
    size * (1 + (scaleJitter ?? 0)) * 2,
    approximateSpacing * 2
  );
  const points = scatterIconPoints({
    map,
    polygon,
    iconRadiusPx: edgeClearance ? size / Math.SQRT2 : 0,
    density,
    seed,
    rotationJitterDeg,
    scaleJitter,
    positionJitter,
    stagger,
    distribution,
    minSpacing,
    viewportPaddingPx: scaleMode === "screen" ? screenPadding : void 0
  });
  await updateScatterSource(map, sourceId, points);
  const iconSize = scaleMode === "map" ? [
    "interpolate",
    ["exponential", 2],
    ["zoom"],
    map.getZoom() - 8,
    ["*", ["get", "scale"], 1 / 256],
    map.getZoom(),
    ["get", "scale"],
    map.getZoom() + 8,
    ["*", ["get", "scale"], 256]
  ] : ["get", "scale"];
  let layerStates = installedScatterLayerStates.get(map);
  if (!layerStates) {
    layerStates = /* @__PURE__ */ new Map();
    installedScatterLayerStates.set(map, layerStates);
  }
  const layerModeSignature = scaleMode === "screen" ? "screen" : `map:${map.getZoom()}`;
  if (!map.getLayer(layerId)) {
    map.addLayer({
      id: layerId,
      type: "symbol",
      source: sourceId,
      layout: {
        "icon-image": iconId,
        "icon-rotate": ["get", "rotation"],
        "icon-size": iconSize,
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        "symbol-z-order": "source"
      },
      paint: {
        "icon-opacity": opacity
      }
    });
    layerStates.set(layerId, {
      mode: layerModeSignature,
      iconId,
      opacity
    });
  } else {
    const previousLayer = layerStates.get(layerId);
    if (previousLayer?.mode !== layerModeSignature) {
      map.setLayoutProperty(layerId, "icon-size", iconSize);
    }
    if (previousLayer?.iconId !== iconId) {
      map.setLayoutProperty(layerId, "icon-image", iconId);
    }
    if (previousLayer?.opacity !== opacity) {
      map.setPaintProperty(layerId, "icon-opacity", opacity);
    }
    layerStates.set(layerId, {
      mode: layerModeSignature,
      iconId,
      opacity
    });
  }
}
export {
  installSvgIconScatter,
  scatterIconPoints
};
//# sourceMappingURL=experimental.js.map