import {
  createMiniContext,
  createSvgScatterLayout,
  makeTile
} from "./chunk-TFHIJLYC.js";
import {
  scatterPointsInPolygon
} from "./chunk-WUNIYF3E.js";
import {
  hashStringToSeed,
  mulberry32
} from "./chunk-GBEE6YET.js";

// src/engine/patternScale.ts
function finite(value, name) {
  if (!Number.isFinite(value)) throw new TypeError(`${name} must be finite`);
  return value;
}
function positive(value, name) {
  finite(value, name);
  if (value <= 0) throw new RangeError(`${name} must be greater than 0`);
  return value;
}
function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}
function scalePatternForZoom(options) {
  const zoom = finite(options.zoom, "zoom");
  const referenceZoom = finite(options.referenceZoom, "referenceZoom");
  const visualSize = positive(options.visualSize, "visualSize");
  const spacing = positive(options.spacing, "spacing");
  const opticalScale = positive(options.opticalScale ?? 1, "opticalScale");
  const minReadableSize = positive(
    options.minReadableSize ?? 10,
    "minReadableSize"
  );
  const maxVisualSize = positive(
    options.maxVisualSize ?? 72,
    "maxVisualSize"
  );
  if (maxVisualSize < minReadableSize) {
    throw new RangeError("maxVisualSize must be greater than or equal to minReadableSize");
  }
  const rawScale = options.mode === "map" ? 2 ** (zoom - referenceZoom) : 1;
  const rawVisualSize = visualSize * rawScale;
  const minimumVisualSize = Math.min(visualSize, minReadableSize);
  const minimumScale = minimumVisualSize / visualSize;
  const maximumScale = maxVisualSize / visualSize;
  const scale = clamp(rawScale, minimumScale, maximumScale);
  const renderedVisualSize = visualSize * scale;
  const renderedSpacing = spacing * scale;
  return {
    scale,
    rawVisualSize,
    visualSize: renderedVisualSize,
    stampSize: renderedVisualSize / opticalScale,
    spacing: renderedSpacing,
    density: 1e4 / (renderedSpacing * renderedSpacing),
    opacity: 1,
    floored: rawScale < minimumScale,
    capped: rawScale > maximumScale
  };
}

// src/engine/screenPatternPhase.ts
function screenPatternPhase(zoom, steps = 8) {
  if (!Number.isFinite(zoom)) {
    throw new TypeError("zoom must be a finite number");
  }
  if (!Number.isInteger(steps) || steps < 1) {
    throw new RangeError("steps must be a positive integer");
  }
  const fraction = zoom - Math.floor(zoom);
  const index = Math.min(steps, Math.round(fraction * steps));
  return {
    index,
    pixelRatioScale: 2 ** (index / steps)
  };
}

// src/engine/geojsonImport.ts
function record(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function position(value, path) {
  if (!Array.isArray(value) || value.length < 2 || value.some((coordinate) => typeof coordinate !== "number" || !Number.isFinite(coordinate))) {
    throw new TypeError(`${path} must contain finite coordinate positions`);
  }
  const [longitude, latitude] = value;
  if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
    throw new RangeError(`${path} must use WGS84 longitude and latitude`);
  }
  return value.slice();
}
function samePosition(a, b) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}
function ring(value, path) {
  if (!Array.isArray(value) || value.length < 3) {
    throw new TypeError(`${path} must contain at least three positions`);
  }
  const positions = value.map((item, index) => position(item, `${path}[${index}]`));
  if (!samePosition(positions[0], positions[positions.length - 1])) {
    positions.push(positions[0].slice());
  }
  const unique = new Set(
    positions.slice(0, -1).map((item) => `${item[0]},${item[1]}`)
  );
  if (unique.size < 3) {
    throw new TypeError(`${path} must contain at least three distinct positions`);
  }
  return positions;
}
function polygonCoordinates(value, path) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError(`${path} must contain at least one linear ring`);
  }
  return value.map((item, index) => ring(item, `${path}[${index}]`));
}
function properties(value) {
  return record(value) ? { ...value } : {};
}
function featureId(value) {
  return typeof value === "string" || typeof value === "number" ? value : void 0;
}
function importGeoJsonPolygons(input, maximumFeatures = 48) {
  if (!Number.isInteger(maximumFeatures) || maximumFeatures < 1) {
    throw new RangeError("maximumFeatures must be a positive integer");
  }
  const result = [];
  let ignoredFeatures = 0;
  function appendPolygon(coordinates, sourceProperties, id, path) {
    result.push({
      type: "Feature",
      ...featureId(id) === void 0 ? {} : { id: featureId(id) },
      properties: properties(sourceProperties),
      geometry: {
        type: "Polygon",
        coordinates: polygonCoordinates(coordinates, path)
      }
    });
    if (result.length > maximumFeatures) {
      throw new RangeError(
        `GeoJSON contains more than ${maximumFeatures} polygon parts`
      );
    }
  }
  function visitGeometry(geometry, sourceProperties, id, path) {
    if (!record(geometry) || typeof geometry.type !== "string") return false;
    if (geometry.type === "Polygon") {
      appendPolygon(geometry.coordinates, sourceProperties, id, `${path}.coordinates`);
      return true;
    }
    if (geometry.type === "MultiPolygon") {
      if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length === 0) {
        throw new TypeError(`${path}.coordinates must contain polygons`);
      }
      geometry.coordinates.forEach((coordinates, index) => {
        appendPolygon(
          coordinates,
          sourceProperties,
          id,
          `${path}.coordinates[${index}]`
        );
      });
      return true;
    }
    if (geometry.type === "GeometryCollection") {
      if (!Array.isArray(geometry.geometries)) {
        throw new TypeError(`${path}.geometries must be an array`);
      }
      let found = false;
      geometry.geometries.forEach((item, index) => {
        found = visitGeometry(
          item,
          sourceProperties,
          id,
          `${path}.geometries[${index}]`
        ) || found;
      });
      return found;
    }
    return false;
  }
  function visit(value, path) {
    if (!record(value) || typeof value.type !== "string") {
      throw new TypeError(`${path} must be a GeoJSON object`);
    }
    if (value.type === "FeatureCollection") {
      if (!Array.isArray(value.features)) {
        throw new TypeError(`${path}.features must be an array`);
      }
      value.features.forEach((item, index) => {
        if (!record(item) || item.type !== "Feature") {
          throw new TypeError(`${path}.features[${index}] must be a Feature`);
        }
        const found = visitGeometry(
          item.geometry,
          item.properties,
          item.id,
          `${path}.features[${index}].geometry`
        );
        if (!found) ignoredFeatures++;
      });
      return;
    }
    if (value.type === "Feature") {
      const found = visitGeometry(
        value.geometry,
        value.properties,
        value.id,
        `${path}.geometry`
      );
      if (!found) ignoredFeatures++;
      return;
    }
    if (!visitGeometry(value, {}, void 0, path)) ignoredFeatures++;
  }
  visit(input, "GeoJSON");
  if (result.length === 0) {
    throw new TypeError("GeoJSON does not contain Polygon or MultiPolygon geometry");
  }
  return { features: result, ignoredFeatures };
}
export {
  createMiniContext,
  createSvgScatterLayout,
  hashStringToSeed,
  importGeoJsonPolygons,
  makeTile,
  mulberry32,
  scalePatternForZoom,
  scatterPointsInPolygon,
  screenPatternPhase
};
//# sourceMappingURL=core.js.map