import * as turf from "@turf/turf";
import type * as maplibregl from "maplibre-gl";
import type { Meadow, Plot } from "@/api/types";

// Archived plots and meadows on the plots map: a grey veil with a dashed outline on a
// dark casing (same look as the app), below the active layers and read-only

export type ArchivedArea =
  | { kind: "plot"; area: Plot }
  | { kind: "meadow"; area: Meadow };

export const ARCHIVED_AREAS_SOURCE_ID = "archived-areas";
export const ARCHIVED_AREA_LABELS_SOURCE_ID = "archived-areas-labels";
export const ARCHIVED_AREA_FILL_LAYER_ID = "archived-areas-fill";
export const ARCHIVED_AREA_LAYER_IDS = [
  ARCHIVED_AREA_FILL_LAYER_ID,
  "archived-areas-casing",
  "archived-areas-line",
  "archived-areas-label",
];

// Added before the plot layers, so archived areas lie below them
export function addArchivedAreaLayers(map: maplibregl.Map) {
  const empty: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };
  map.addSource(ARCHIVED_AREAS_SOURCE_ID, { type: "geojson", data: empty });
  map.addSource(ARCHIVED_AREA_LABELS_SOURCE_ID, { type: "geojson", data: empty });
  map.addLayer({
    id: ARCHIVED_AREA_FILL_LAYER_ID,
    type: "fill",
    source: ARCHIVED_AREAS_SOURCE_ID,
    paint: { "fill-color": "#999999", "fill-opacity": 0.45 },
  });
  map.addLayer({
    id: "archived-areas-casing",
    type: "line",
    source: ARCHIVED_AREAS_SOURCE_ID,
    paint: {
      "line-color": "#111111",
      "line-opacity": 0.35,
      "line-width": ["case", ["==", ["get", "selected"], 1], 4.5, 2.5],
    },
  });
  map.addLayer({
    id: "archived-areas-line",
    type: "line",
    source: ARCHIVED_AREAS_SOURCE_ID,
    paint: {
      "line-color": ["case", ["==", ["get", "selected"], 1], "#facc15", "#ffffff"],
      "line-width": ["case", ["==", ["get", "selected"], 1], 3, 1.5],
      "line-dasharray": [2, 1.5],
    },
  });
}

// Added with the other labels, so they stay on top
export function addArchivedAreaLabelLayer(map: maplibregl.Map) {
  map.addLayer({
    id: "archived-areas-label",
    type: "symbol",
    source: ARCHIVED_AREA_LABELS_SOURCE_ID,
    layout: { "text-field": ["get", "name"], "text-size": 13 },
    paint: { "text-color": "#ffffff", "text-halo-color": "#111111", "text-halo-width": 2 },
  });
}

export function buildArchivedAreasGeojson(
  areas: ArchivedArea[],
  selectedId: string | null,
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: areas.map(({ kind, area }) => ({
      type: "Feature",
      properties: { id: area.id, kind, selected: area.id === selectedId ? 1 : 0 },
      geometry: area.geometry,
    })),
  };
}

export function buildArchivedAreaLabelsGeojson(areas: ArchivedArea[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: areas.map(({ area }) => ({
      type: "Feature",
      properties: { name: area.name },
      geometry: turf.centerOfMass(turf.multiPolygon(area.geometry.coordinates)).geometry,
    })),
  };
}
