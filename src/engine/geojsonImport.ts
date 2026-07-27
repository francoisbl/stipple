export interface ImportedPolygonFeature {
  type: "Feature";
  id?: string | number;
  properties: Record<string, unknown>;
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  };
}

export interface GeoJsonPolygonImport {
  features: ImportedPolygonFeature[];
  ignoredFeatures: number;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function position(value: unknown, path: string): number[] {
  if (
    !Array.isArray(value) ||
    value.length < 2 ||
    value.some((coordinate) => typeof coordinate !== "number" || !Number.isFinite(coordinate))
  ) {
    throw new TypeError(`${path} must contain finite coordinate positions`);
  }
  const [longitude, latitude] = value;
  if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
    throw new RangeError(`${path} must use WGS84 longitude and latitude`);
  }
  return value.slice();
}

function samePosition(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function ring(value: unknown, path: string): number[][] {
  if (!Array.isArray(value) || value.length < 3) {
    throw new TypeError(`${path} must contain at least three positions`);
  }
  const positions = value.map((item, index) => position(item, `${path}[${index}]`));
  if (!samePosition(positions[0], positions[positions.length - 1])) {
    positions.push(positions[0].slice());
  }
  const unique = new Set(
    positions.slice(0, -1).map((item) => `${item[0]},${item[1]}`),
  );
  if (unique.size < 3) {
    throw new TypeError(`${path} must contain at least three distinct positions`);
  }
  return positions;
}

function polygonCoordinates(value: unknown, path: string): number[][][] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError(`${path} must contain at least one linear ring`);
  }
  return value.map((item, index) => ring(item, `${path}[${index}]`));
}

function properties(value: unknown): Record<string, unknown> {
  return record(value) ? { ...value } : {};
}

function featureId(value: unknown): string | number | undefined {
  return typeof value === "string" || typeof value === "number"
    ? value
    : undefined;
}

/**
 * Extracts editable Polygon features from GeoJSON. MultiPolygons are split
 * into one feature per polygon so every part can receive its own fill.
 */
export function importGeoJsonPolygons(
  input: unknown,
  maximumFeatures = 48,
): GeoJsonPolygonImport {
  if (!Number.isInteger(maximumFeatures) || maximumFeatures < 1) {
    throw new RangeError("maximumFeatures must be a positive integer");
  }

  const result: ImportedPolygonFeature[] = [];
  let ignoredFeatures = 0;

  function appendPolygon(
    coordinates: unknown,
    sourceProperties: unknown,
    id: unknown,
    path: string,
  ) {
    result.push({
      type: "Feature",
      ...(featureId(id) === undefined ? {} : { id: featureId(id) }),
      properties: properties(sourceProperties),
      geometry: {
        type: "Polygon",
        coordinates: polygonCoordinates(coordinates, path),
      },
    });
    if (result.length > maximumFeatures) {
      throw new RangeError(
        `GeoJSON contains more than ${maximumFeatures} polygon parts`,
      );
    }
  }

  function visitGeometry(
    geometry: unknown,
    sourceProperties: unknown,
    id: unknown,
    path: string,
  ): boolean {
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
          `${path}.coordinates[${index}]`,
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
          `${path}.geometries[${index}]`,
        ) || found;
      });
      return found;
    }
    return false;
  }

  function visit(value: unknown, path: string) {
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
          `${path}.features[${index}].geometry`,
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
        `${path}.geometry`,
      );
      if (!found) ignoredFeatures++;
      return;
    }
    if (!visitGeometry(value, {}, undefined, path)) ignoredFeatures++;
  }

  visit(input, "GeoJSON");
  if (result.length === 0) {
    throw new TypeError("GeoJSON does not contain Polygon or MultiPolygon geometry");
  }
  return { features: result, ignoredFeatures };
}
