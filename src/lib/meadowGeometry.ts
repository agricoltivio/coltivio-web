import * as turf from "@turf/turf";
import type { Meadow, Plot } from "@/api/types";

// Closes tiny cadastral gaps between neighbouring plots when merging them
const ADJACENCY_TOLERANCE_METERS = 1;
// Parts smaller than this are slivers left over by the union, not real areas
const MIN_PART_SQUARE_METERS = 1;
// Intersections smaller than this are treated as touching edges, not overlaps
const OVERLAP_TOLERANCE_SQUARE_METERS = 1;

type PolygonFeature = GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>;

export type MeadowGeometryError =
  | { kind: "self_intersecting" }
  | { kind: "overlaps"; meadowName: string };

function unionFeatures(features: PolygonFeature[]): PolygonFeature | null {
  if (features.length === 0) return null;
  let merged: PolygonFeature = features[0];
  for (let i = 1; i < features.length; i++) {
    const result = turf.union(turf.featureCollection([merged, features[i]]));
    if (result) merged = result;
  }
  return merged;
}

function toMultiPolygon(feature: PolygonFeature): GeoJSON.MultiPolygon {
  const parts =
    feature.geometry.type === "MultiPolygon"
      ? feature.geometry.coordinates
      : [feature.geometry.coordinates];
  return {
    type: "MultiPolygon",
    coordinates: parts.filter(
      (part) => turf.area(turf.polygon(part)) >= MIN_PART_SQUARE_METERS,
    ),
  };
}

// Merges plots into one meadow geometry: adjacent plots become one area, plots
// that don't touch stay separate parts. Same rules as the mobile app.
export function mergePlotsIntoMeadowGeometry(
  plots: Plot[],
): GeoJSON.MultiPolygon | null {
  const plotFeatures = plots.map((plot) =>
    turf.multiPolygon(plot.geometry.coordinates),
  );
  const merged = unionFeatures(plotFeatures);
  if (!merged) return null;
  const mergedGeometry = toMultiPolygon(merged);
  if (mergedGeometry.coordinates.length === 1) return mergedGeometry;

  // Neighbouring cadastral plots often don't share exact edges: grow each plot a
  // bit, merge, shrink back and simplify away the vertices added by the buffer.
  // Only used when it actually closes gaps, i.e. results in fewer parts.
  const buffered = plotFeatures
    .map((feature) =>
      turf.buffer(feature, ADJACENCY_TOLERANCE_METERS, { units: "meters" }),
    )
    .filter((feature): feature is PolygonFeature => feature !== undefined);
  const bufferedUnion = unionFeatures(buffered);
  const shrunk = bufferedUnion
    ? turf.buffer(bufferedUnion, -ADJACENCY_TOLERANCE_METERS, {
        units: "meters",
      })
    : undefined;
  if (!shrunk) return mergedGeometry;
  const shrunkGeometry = toMultiPolygon(
    turf.simplify(shrunk, { tolerance: 0.000002, highQuality: true }),
  );
  return shrunkGeometry.coordinates.length < mergedGeometry.coordinates.length
    ? shrunkGeometry
    : mergedGeometry;
}

// Checks the rules a meadow geometry must satisfy before it is saved
export function findMeadowGeometryError(
  geometry: GeoJSON.MultiPolygon,
  otherMeadows: Meadow[],
): MeadowGeometryError | null {
  const feature = turf.multiPolygon(geometry.coordinates);
  if (turf.kinks(feature).features.length > 0) {
    return { kind: "self_intersecting" };
  }
  for (const otherMeadow of otherMeadows) {
    const intersection = turf.intersect(
      turf.featureCollection([
        feature,
        turf.multiPolygon(otherMeadow.geometry.coordinates),
      ]),
    );
    if (intersection && turf.area(intersection) > OVERLAP_TOLERANCE_SQUARE_METERS) {
      return { kind: "overlaps", meadowName: otherMeadow.name };
    }
  }
  return null;
}

// Approximate fence length: outer boundary of every part (holes aren't fenced)
export function meadowFenceLengthMeters(geometry: GeoJSON.MultiPolygon): number {
  return geometry.coordinates.reduce(
    (sum, part) =>
      sum + turf.length(turf.lineString(part[0]), { units: "meters" }),
    0,
  );
}
