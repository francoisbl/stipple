import {
  scatterPointsInPolygon
} from "./chunk-33HMN42D.js";
import {
  addSvgIcon
} from "./chunk-QO6U5GJG.js";
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
  const { map, polygon, iconRadiusPx, density, seed, samples, rotationJitterDeg, scaleJitter, positionJitter, stagger } = options;
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
      samples,
      rotationJitterDeg,
      scaleJitter,
      positionJitter,
      stagger
    });
  });
  const features = points.map(({ x, y, rotation, scale }) => {
    const lngLat = map.unproject([x, y]);
    return {
      type: "Feature",
      geometry: { type: "Point", coordinates: [lngLat.lng, lngLat.lat] },
      properties: { rotation, scale }
    };
  });
  return { type: "FeatureCollection", features };
}

// src/maplibre/svgIconScatter.ts
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
    samples,
    rotationJitterDeg,
    scaleJitter,
    positionJitter,
    stagger
  } = options;
  await addSvgIcon(map, { id: iconId, svg, size });
  const points = scatterIconPoints({
    map,
    polygon,
    iconRadiusPx: size / Math.SQRT2,
    density,
    seed,
    samples,
    rotationJitterDeg,
    scaleJitter,
    positionJitter,
    stagger
  });
  const existingSource = map.getSource(sourceId);
  if (existingSource) {
    existingSource.setData(points);
  } else {
    map.addSource(sourceId, { type: "geojson", data: points });
  }
  if (!map.getLayer(layerId)) {
    map.addLayer({
      id: layerId,
      type: "symbol",
      source: sourceId,
      layout: {
        "icon-image": iconId,
        "icon-rotate": ["get", "rotation"],
        "icon-size": ["get", "scale"],
        "icon-allow-overlap": true
      }
    });
  }
}
export {
  installSvgIconScatter,
  scatterIconPoints
};
//# sourceMappingURL=experimental.js.map