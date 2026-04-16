import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import * as turf from "@turf/turf";
import Fuse from "fuse.js";
import { Check, FileEdit, GitMerge, Home, Lasso, Layers, List, Minus, MousePointerClick, Pencil, Plus, Save, Scissors, Undo2, X } from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl from "maplibre-gl";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import Map, { Marker, NavigationControl } from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import { useTranslation } from "react-i18next";
import { farmQueryOptions } from "@/api/farm.queries";
import {
  plotsQueryOptions,
  useCreatePlotMutation,
  useMergePlotsMutation,
  useSplitPlotMutation,
  useUpdatePlotMutation,
} from "@/api/plots.queries";
import type { MergePlotsBody, SplitPlotBody } from "@/api/plots.queries";
import type { Plot } from "@/api/types";
import { useMembership } from "@/lib/useMembership";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const EMPTY_MAP_STYLE: maplibregl.StyleSpecification = { version: 8, sources: {}, layers: [] };
const VIEWPORT_STORAGE_KEY = "plots-map-viewport";
const EMPTY_GEOJSON: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };
const SPLIT_PIECE_COLORS = ["#4ade80", "#60a5fa", "#f97316", "#a78bfa"];

type SavedViewport = { lng: number; lat: number; zoom: number };

// --- Mode state machine ---

type SplitTool = "line" | "polygon" | "extract";

type ViewMode = { type: "view"; selectedPlotId: string | null };
type SplitMode = {
  type: "split";
  plotId: string;
  tool: SplitTool;
  drawnVertices: [number, number][];
  polygonClosed: boolean; // for polygon tool
  splitPolygons: GeoJSON.MultiPolygon[];
};
type MergeMode = { type: "merge"; primaryPlotId: string; selectedPlotIds: string[] };
type CreateMode = { type: "create"; drawnVertices: [number, number][]; closed: boolean };
// EditMode stores the exterior ring of each polygon in the MultiPolygon as mutable vertex arrays.
type EditMode = { type: "edit"; plotId: string; rings: number[][][]; geometryChanged: boolean };
type MapMode = ViewMode | SplitMode | MergeMode | CreateMode | EditMode;

type MapAction =
  | { type: "SELECT_PLOT"; plotId: string | null }
  | { type: "ENTER_MERGE"; primaryPlotId: string }
  | { type: "TOGGLE_MERGE_PLOT"; plotId: string }
  | { type: "ENTER_SPLIT"; plotId: string }
  | { type: "SET_SPLIT_TOOL"; tool: SplitTool }
  | { type: "ADD_VERTEX"; lngLat: [number, number] } // used in split-line, split-polygon, create
  | { type: "UNDO_VERTEX" }
  | { type: "CLOSE_POLYGON" } // closes the polygon in split-polygon or create mode
  | { type: "SET_SPLIT_POLYGONS"; polygons: GeoJSON.MultiPolygon[] }
  | { type: "ENTER_CREATE" }
  | { type: "ENTER_EDIT"; plotId: string; rings: number[][][] }
  | { type: "MOVE_EDIT_VERTEX"; ringIndex: number; vertexIndex: number; lngLat: [number, number] }
  | { type: "MOVE_POLYGON_VERTEX"; index: number; lngLat: [number, number] }
  | { type: "EXIT_MODE" };

function mapReducer(state: MapMode, action: MapAction): MapMode {
  switch (action.type) {
    case "SELECT_PLOT":
      if (state.type !== "view") return state;
      return { ...state, selectedPlotId: action.plotId };
    case "ENTER_MERGE":
      return { type: "merge", primaryPlotId: action.primaryPlotId, selectedPlotIds: [action.primaryPlotId] };
    case "TOGGLE_MERGE_PLOT":
      if (state.type !== "merge" || action.plotId === state.primaryPlotId) return state;
      return {
        ...state,
        selectedPlotIds: state.selectedPlotIds.includes(action.plotId)
          ? state.selectedPlotIds.filter((id) => id !== action.plotId)
          : [...state.selectedPlotIds, action.plotId],
      };
    case "ENTER_SPLIT":
      return { type: "split", plotId: action.plotId, tool: "line", drawnVertices: [], polygonClosed: false, splitPolygons: [] };
    case "SET_SPLIT_TOOL":
      if (state.type !== "split") return state;
      return { ...state, tool: action.tool, drawnVertices: [], polygonClosed: false };
    case "ADD_VERTEX": {
      if (state.type === "split") {
        // Polygon tool: don't add more vertices once closed
        if (state.tool === "polygon" && state.polygonClosed) return state;
        // Don't clear splitPolygons — pieces stay visible while drawing the next cut
        return { ...state, drawnVertices: [...state.drawnVertices, action.lngLat] };
      }
      if (state.type === "create") {
        if (state.closed) return state;
        return { ...state, drawnVertices: [...state.drawnVertices, action.lngLat] };
      }
      return state;
    }
    case "UNDO_VERTEX": {
      if (state.type === "split") {
        return { ...state, drawnVertices: state.drawnVertices.slice(0, -1), polygonClosed: false, splitPolygons: [] };
      }
      if (state.type === "create") {
        return { ...state, drawnVertices: state.drawnVertices.slice(0, -1), closed: false };
      }
      return state;
    }
    case "CLOSE_POLYGON": {
      if (state.type === "split" && state.tool === "polygon" && state.drawnVertices.length >= 3) {
        return { ...state, polygonClosed: true };
      }
      if (state.type === "create" && state.drawnVertices.length >= 3) {
        return { ...state, closed: true };
      }
      return state;
    }
    case "SET_SPLIT_POLYGONS":
      if (state.type !== "split") return state;
      // Reset drawing state so the user can immediately draw another cut
      return { ...state, splitPolygons: action.polygons, drawnVertices: [], polygonClosed: false };
    case "ENTER_CREATE":
      return { type: "create", drawnVertices: [], closed: false };
    case "ENTER_EDIT":
      return { type: "edit", plotId: action.plotId, rings: action.rings, geometryChanged: false };
    case "MOVE_EDIT_VERTEX": {
      if (state.type !== "edit") return state;
      const newRings = state.rings.map((ring, rIdx) => {
        if (rIdx !== action.ringIndex) return ring;
        return ring.map((vertex, vIdx) => (vIdx === action.vertexIndex ? action.lngLat : vertex));
      });
      return { ...state, rings: newRings, geometryChanged: true };
    }
    case "MOVE_POLYGON_VERTEX": {
      if (state.type === "split" && state.tool === "polygon") {
        const newVertices = state.drawnVertices.map((v, i) => i === action.index ? action.lngLat : v);
        return { ...state, drawnVertices: newVertices };
      }
      if (state.type === "create") {
        const newVertices = state.drawnVertices.map((v, i) => i === action.index ? action.lngLat : v);
        return { ...state, drawnVertices: newVertices };
      }
      return state;
    }
    case "EXIT_MODE": {
      const returnTo =
        state.type === "split" ? state.plotId
        : state.type === "merge" ? state.primaryPlotId
        : state.type === "edit" ? state.plotId
        : null;
      return { type: "view", selectedPlotId: returnTo };
    }
    default:
      return state;
  }
}

// --- Geometry helpers ---

function readSavedViewport(): SavedViewport | null {
  try {
    const raw = sessionStorage.getItem(VIEWPORT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedViewport) : null;
  } catch {
    return null;
  }
}

// djb2 hash → golden-angle hue → hex color, matching the RN app's plotIdToColor.
function plotIdToColor(id: string): string {
  let hash = 5381;
  for (let i = 0; i < id.length; i++) hash = (hash * 33) ^ id.charCodeAt(i);
  const hue = Math.abs(hash % 360) * 137.508;
  const h = hue / 360;
  const s = 0.7;
  const l = 0.45;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Splits a MultiPolygon by a line using half-plane intersection.
// Works for full cuts, corner cuts, and diagonal cuts.
function splitMultiPolygonByLine(
  multiPolygon: GeoJSON.MultiPolygon,
  line: GeoJSON.LineString,
): GeoJSON.MultiPolygon[] | null {
  const cleanMulti: GeoJSON.MultiPolygon = turf.cleanCoords(turf.clone(multiPolygon));
  const cleanLine: GeoJSON.LineString = turf.cleanCoords(turf.clone(line));
  const flattened = turf.flatten(cleanMulti);
  const lineCoords = cleanLine.coordinates as number[][];

  // Extend the line well beyond the polygon in both directions so the half-planes
  // cover the full plot regardless of where the user drew the line.
  // Use 20× the polygon's diagonal as the extension/offset distance.
  const bbox = turf.bbox(cleanMulti);
  const diagKm = turf.distance(turf.point([bbox[0], bbox[1]]), turf.point([bbox[2], bbox[3]]));
  const extDist = Math.max(diagKm * 20, 10); // km, at least 10km
  const bearing = turf.bearing(turf.point(lineCoords[0]), turf.point(lineCoords[lineCoords.length - 1]));
  const extStart = turf.destination(turf.point(lineCoords[0]), -extDist, bearing, { units: "kilometers" }).geometry.coordinates;
  const extEnd = turf.destination(turf.point(lineCoords[lineCoords.length - 1]), extDist, bearing, { units: "kilometers" }).geometry.coordinates;
  const extCoords = [extStart, ...lineCoords, extEnd];
  const extLineFeature = turf.lineString(extCoords);

  // Build two half-plane polygons — one on each side of the extended line
  const offsetA = turf.lineOffset(extLineFeature, extDist, { units: "kilometers" });
  const offsetB = turf.lineOffset(extLineFeature, -extDist, { units: "kilometers" });
  const coordsA = turf.getCoords(offsetA) as number[][];
  const coordsB = turf.getCoords(offsetB) as number[][];
  const halfPlaneA = turf.polygon([[...extCoords, ...[...coordsA].reverse(), extCoords[0]]]);
  const halfPlaneB = turf.polygon([[...extCoords, ...[...coordsB].reverse(), extCoords[0]]]);

  // Collect pieces for each side
  const sideA: GeoJSON.Polygon["coordinates"][] = [];
  const sideB: GeoJSON.Polygon["coordinates"][] = [];
  let anySplit = false;

  const pushGeom = (target: GeoJSON.Polygon["coordinates"][], geom: GeoJSON.Geometry) => {
    if (geom.type === "Polygon") target.push(geom.coordinates);
    else if (geom.type === "MultiPolygon") for (const c of geom.coordinates) target.push(c);
  };

  for (const feature of flattened.features) {
    const pieceA = turf.intersect(turf.featureCollection([feature, halfPlaneA]));
    const pieceB = turf.intersect(turf.featureCollection([feature, halfPlaneB]));
    const aHasArea = pieceA && turf.area(pieceA) > 0.1;
    const bHasArea = pieceB && turf.area(pieceB) > 0.1;

    if (aHasArea && bHasArea) {
      // Line crossed this sub-polygon → true split
      anySplit = true;
      pushGeom(sideA, pieceA.geometry);
      pushGeom(sideB, pieceB.geometry);
    } else if (aHasArea) {
      pushGeom(sideA, feature.geometry);
    } else if (bHasArea) {
      pushGeom(sideB, feature.geometry);
    }
  }

  if (!anySplit) return null;

  const toMultiPolygon = (coords: GeoJSON.Polygon["coordinates"][]): GeoJSON.MultiPolygon => ({
    type: "MultiPolygon",
    coordinates: coords
      .map((c) => { const t = turf.truncate(turf.polygon(c), { precision: 8 }); try { return turf.cleanCoords(t).geometry.coordinates; } catch { return t.geometry.coordinates; } })
      .filter((c) => { try { return turf.area(turf.polygon(c)) > 0.1; } catch { return false; } }),
  });

  const resultA = toMultiPolygon(sideA);
  const resultB = toMultiPolygon(sideB);
  return resultA.coordinates.length > 0 && resultB.coordinates.length > 0 ? [resultA, resultB] : null;
}

// Ported from coltivio-rn-app/utils/geo-spatials.ts — cuts a drawn polygon out of a MultiPolygon.
function cutPolygonFromMultiPolygon(
  multiPolygon: GeoJSON.MultiPolygon,
  drawnRing: [number, number][], // [lng, lat][], open or closed
): { remaining: GeoJSON.MultiPolygon; extracted: GeoJSON.MultiPolygon } | null {
  if (drawnRing.length < 3) return null;
  const ring = [...drawnRing];
  // Close the ring per GeoJSON spec
  if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) ring.push(ring[0]);
  const cutPolygon = turf.polygon([ring]);
  const flattened = turf.flatten(multiPolygon);
  const remainingCoords: number[][][][] = [];
  const cutCoords: number[][][][] = [];
  for (const feature of flattened.features) {
    if (!turf.booleanIntersects(feature, cutPolygon)) { remainingCoords.push(feature.geometry.coordinates); continue; }
    const intersection = turf.intersect(turf.featureCollection([feature, cutPolygon]));
    const remainder = turf.difference(turf.featureCollection([feature, cutPolygon]));
    if (!remainder) { cutCoords.push(feature.geometry.coordinates); continue; }
    if (remainder.geometry.type === "Polygon") remainingCoords.push(remainder.geometry.coordinates);
    else if (remainder.geometry.type === "MultiPolygon") for (const c of remainder.geometry.coordinates) remainingCoords.push(c);
    if (intersection) {
      if (intersection.geometry.type === "Polygon") cutCoords.push(intersection.geometry.coordinates);
      else if (intersection.geometry.type === "MultiPolygon") for (const c of intersection.geometry.coordinates) cutCoords.push(c);
    }
  }
  if (cutCoords.length === 0) return null;
  const clean = (coords: number[][][][]) =>
    coords
      .map((c) => { const t = turf.truncate(turf.polygon(c), { precision: 6 }); try { return turf.cleanCoords(t).geometry.coordinates; } catch { return t.geometry.coordinates; } })
      .filter((c) => { try { return turf.area(turf.polygon(c)) > 0.1; } catch { return false; } });
  const cleanedCut = clean(cutCoords);
  if (cleanedCut.length === 0) return null;
  const cleanedRemaining = clean(remainingCoords);
  return {
    remaining: cleanedRemaining.length > 0 ? turf.multiPolygon(cleanedRemaining).geometry : { type: "MultiPolygon", coordinates: [] },
    extracted: turf.multiPolygon(cleanedCut).geometry,
  };
}

// Ported from coltivio-rn-app/utils/geo-spatials.ts — extracts a sub-polygon by click point.
// Only works for MultiPolygons with 2+ polygons.
function extractSubPolygonByPoint(
  multiPolygon: GeoJSON.MultiPolygon,
  lngLat: [number, number],
): { remaining: GeoJSON.MultiPolygon; extracted: GeoJSON.MultiPolygon } | null {
  if (multiPolygon.coordinates.length <= 1) return null;
  const point = turf.point(lngLat);
  for (let j = 0; j < multiPolygon.coordinates.length; j++) {
    const poly = turf.polygon(multiPolygon.coordinates[j]);
    if (!turf.booleanPointInPolygon(point, poly)) continue;
    return {
      remaining: { type: "MultiPolygon", coordinates: multiPolygon.coordinates.filter((_, idx) => idx !== j) },
      extracted: { type: "MultiPolygon", coordinates: [multiPolygon.coordinates[j]] },
    };
  }
  return null;
}

export const Route = createFileRoute("/_authed/field-calendar/plots")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(plotsQueryOptions());
    queryClient.ensureQueryData(farmQueryOptions());
  },
  component: PlotsMap,
});

type BaseLayer = "satellite" | "pixelkarte";

function PlotsMap() {
  const { t } = useTranslation();
  const [activeLayer, setActiveLayer] = useState<BaseLayer>("satellite");
  const mapRef = useRef<MapRef>(null);
  const [mapReady, setMapReady] = useState(false);
  const hasCentered = useRef(false);
  const [mode, dispatch] = useReducer(mapReducer, { type: "view", selectedPlotId: null });
  const [listOpen, setListOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mergeFormOpen, setMergeFormOpen] = useState(false);
  const [splitFormOpen, setSplitFormOpen] = useState(false);
  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [editMetaOpen, setEditMetaOpen] = useState(false);
  const [toolError, setToolError] = useState<string | null>(null);
  const savedViewport = useMemo(() => readSavedViewport(), []);

  const updateMutation = useUpdatePlotMutation();

  const farmQuery = useQuery(farmQueryOptions());
  const plotsQuery = useQuery(plotsQueryOptions());
  const farm = farmQuery.data;
  const plots = plotsQuery.data?.result ?? [];

  const selectedPlotId = mode.type === "view" ? mode.selectedPlotId : null;
  const selectedPlot = useMemo(
    () => (selectedPlotId ? plots.find((p) => p.id === selectedPlotId) ?? null : null),
    [selectedPlotId, plots],
  );

  const mappablePlots = useMemo(() => plots.filter((p) => p.size > 0), [plots]);

  // The plot currently being worked on in split/edit mode
  const activePlot = useMemo(() => {
    const plotId = mode.type === "split" ? mode.plotId : mode.type === "edit" ? mode.plotId : null;
    return plotId ? plots.find((p) => p.id === plotId) ?? null : null;
  }, [mode, plots]);

  // In split mode, hide all plots except the target so the cut tools are unambiguous
  const visiblePlots = useMemo(
    () => mode.type === "split" ? mappablePlots.filter((p) => p.id === mode.plotId) : mappablePlots,
    [mode, mappablePlots],
  );

  const geojson = useMemo<GeoJSON.FeatureCollection>(() => ({
    type: "FeatureCollection",
    features: visiblePlots.map((plot) => ({
      type: "Feature",
      id: plot.id,
      properties: { id: plot.id, name: plot.name, color: plotIdToColor(plot.id), selected: plot.id === selectedPlotId ? 1 : 0 },
      geometry: plot.geometry,
    })),
  }), [visiblePlots, selectedPlotId]);

  const labelsGeojson = useMemo<GeoJSON.FeatureCollection>(() => {
    if (mode.type === "split") return EMPTY_GEOJSON;
    return {
      type: "FeatureCollection",
      features: visiblePlots.map((plot) => {
        const center = turf.centerOfMass({ type: "Feature", geometry: plot.geometry, properties: {} });
        return { type: "Feature", id: plot.id, properties: { name: plot.name }, geometry: center.geometry };
      }),
    };
  }, [mode.type, visiblePlots]);

  const splitTargetGeojson = useMemo<GeoJSON.FeatureCollection>(() => {
    if (mode.type !== "split") return EMPTY_GEOJSON;
    const plot = mappablePlots.find((p) => p.id === mode.plotId);
    if (!plot) return EMPTY_GEOJSON;
    return { type: "FeatureCollection", features: [{ type: "Feature", properties: { id: plot.id }, geometry: plot.geometry }] };
  }, [mode, mappablePlots]);

  const mergeSelectedGeojson = useMemo<GeoJSON.FeatureCollection>(() => {
    if (mode.type !== "merge") return EMPTY_GEOJSON;
    return {
      type: "FeatureCollection",
      features: mappablePlots
        .filter((p) => mode.selectedPlotIds.includes(p.id))
        .map((plot) => ({ type: "Feature", properties: { id: plot.id }, geometry: plot.geometry })),
    };
  }, [mode, mappablePlots]);

  // In-progress split line or polygon vertices + connecting lines (open polyline while drawing)
  const splitDrawingGeojson = useMemo<GeoJSON.FeatureCollection>(() => {
    if (mode.type !== "split" || mode.drawnVertices.length === 0) return EMPTY_GEOJSON;
    if (mode.tool === "polygon" && mode.polygonClosed) return EMPTY_GEOJSON; // closed → show via splitPolygonPreviewGeojson
    const features: GeoJSON.Feature[] = [];
    if (mode.drawnVertices.length >= 2) {
      features.push({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: mode.drawnVertices } });
    }
    for (const [lng, lat] of mode.drawnVertices) {
      features.push({ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [lng, lat] } });
    }
    return { type: "FeatureCollection", features };
  }, [mode]);

  // Closed polygon preview shown after snap-to-close, before applying cut
  const splitPolygonPreviewGeojson = useMemo<GeoJSON.FeatureCollection>(() => {
    if (mode.type !== "split" || mode.tool !== "polygon" || !mode.polygonClosed || mode.drawnVertices.length < 3) return EMPTY_GEOJSON;
    const ring = [...mode.drawnVertices, mode.drawnVertices[0]];
    return { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring] } }] };
  }, [mode]);

  const splitPolygonsGeojson = useMemo<GeoJSON.FeatureCollection>(() => {
    if (mode.type !== "split" || mode.splitPolygons.length < 2) return EMPTY_GEOJSON;
    return {
      type: "FeatureCollection",
      features: mode.splitPolygons.map((polygon, i) => ({
        type: "Feature",
        properties: { color: SPLIT_PIECE_COLORS[i % SPLIT_PIECE_COLORS.length] },
        geometry: polygon,
      })),
    };
  }, [mode]);

  const splitPolygonsLabelsGeojson = useMemo<GeoJSON.FeatureCollection>(() => {
    if (mode.type !== "split" || mode.splitPolygons.length < 2) return EMPTY_GEOJSON;
    return {
      type: "FeatureCollection",
      features: mode.splitPolygons.map((polygon, i) => {
        const size = turf.area(polygon);
        const center = turf.centerOfMass({ type: "Feature", geometry: polygon, properties: {} });
        return { type: "Feature", properties: { label: `${(size / 100).toFixed(2)} a`, index: i }, geometry: center.geometry };
      }),
    };
  }, [mode]);

  // In-progress drawing for create mode — open polyline while drawing, hidden once closed
  const createDrawingGeojson = useMemo<GeoJSON.FeatureCollection>(() => {
    if (mode.type !== "create" || mode.drawnVertices.length < 2 || mode.closed) return EMPTY_GEOJSON;
    const features: GeoJSON.Feature[] = [
      { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: mode.drawnVertices } },
      ...mode.drawnVertices.map(([lng, lat]) => ({ type: "Feature" as const, properties: {}, geometry: { type: "Point" as const, coordinates: [lng, lat] } })),
    ];
    return { type: "FeatureCollection", features };
  }, [mode]);

  // Polygon preview for create mode — shown as soon as 3+ vertices are placed
  const createPolygonGeojson = useMemo<GeoJSON.FeatureCollection>(() => {
    if (mode.type !== "create" || mode.drawnVertices.length < 3) return EMPTY_GEOJSON;
    const ring = [...mode.drawnVertices, mode.drawnVertices[0]];
    return { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring] } }] };
  }, [mode]);

  // Current state of edited rings for the edit mode overlay
  const editRingsGeojson = useMemo<GeoJSON.FeatureCollection>(() => {
    if (mode.type !== "edit") return EMPTY_GEOJSON;
    return {
      type: "FeatureCollection",
      features: mode.rings
        .filter((ring) => ring.length >= 3)
        .map((ring) => {
          const closed = [...ring, ring[0]];
          return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [closed] } };
        }),
    };
  }, [mode]);

  // Fly to selected plot
  useEffect(() => {
    if (!selectedPlotId || !mapRef.current) return;
    const plot = mappablePlots.find((p) => p.id === selectedPlotId);
    if (!plot) return;
    const center = turf.centerOfMass({ type: "Feature", geometry: plot.geometry, properties: {} });
    const [lng, lat] = center.geometry.coordinates;
    mapRef.current.flyTo({ center: [lng, lat], duration: 800 });
  }, [selectedPlotId, mappablePlots]);

  const geojsonRef = useRef(geojson);
  const labelsGeojsonRef = useRef(labelsGeojson);
  const activeLayerRef = useRef(activeLayer);
  geojsonRef.current = geojson;
  labelsGeojsonRef.current = labelsGeojson;
  activeLayerRef.current = activeLayer;

  const handleMapLoad = (e: maplibregl.MapLibreEvent) => {
    const map = e.target;

    map.addSource("satellite", { type: "raster", tiles: ["https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg"], tileSize: 256 });
    map.addLayer({ id: "satellite-layer", type: "raster", source: "satellite", layout: { visibility: activeLayerRef.current === "satellite" ? "visible" : "none" } });
    map.addSource("pixelkarte", { type: "raster", tiles: ["https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg"], tileSize: 256 });
    map.addLayer({ id: "pixelkarte-layer", type: "raster", source: "pixelkarte", layout: { visibility: activeLayerRef.current === "pixelkarte" ? "visible" : "none" } });

    map.addSource("plots", { type: "geojson", data: geojsonRef.current });
    map.addSource("plots-labels", { type: "geojson", data: labelsGeojsonRef.current });
    map.addLayer({ id: "plots-fill", type: "fill", source: "plots", paint: { "fill-color": ["case", ["==", ["get", "selected"], 1], "#4ade80", ["get", "color"]], "fill-opacity": 0.5 } });
    map.addLayer({ id: "plots-line", type: "line", source: "plots", paint: { "line-color": ["case", ["==", ["get", "selected"], 1], "#facc15", "#ffffff"], "line-width": ["case", ["==", ["get", "selected"], 1], 3, 1] } });

    // Dim target plot during split
    map.addSource("split-target", { type: "geojson", data: EMPTY_GEOJSON });
    map.addLayer({ id: "split-target-fill", type: "fill", source: "split-target", paint: { "fill-color": "#ffffff", "fill-opacity": 0.15 } });

    // Amber merge selection
    map.addSource("merge-selected", { type: "geojson", data: EMPTY_GEOJSON });
    map.addLayer({ id: "merge-selected-fill", type: "fill", source: "merge-selected", paint: { "fill-color": "#f59e0b", "fill-opacity": 0.5 } });
    map.addLayer({ id: "merge-selected-line", type: "line", source: "merge-selected", paint: { "line-color": "#d97706", "line-width": 2.5 } });

    // Split result preview
    map.addSource("split-polygons", { type: "geojson", data: EMPTY_GEOJSON });
    map.addLayer({ id: "split-polygons-fill", type: "fill", source: "split-polygons", paint: { "fill-color": ["get", "color"], "fill-opacity": 0.65 } });
    map.addLayer({ id: "split-polygons-line", type: "line", source: "split-polygons", paint: { "line-color": "#ffffff", "line-width": 2 } });

    // Split polygon-tool closed preview (before cut is applied)
    map.addSource("split-polygon-preview", { type: "geojson", data: EMPTY_GEOJSON });
    map.addLayer({ id: "split-polygon-preview-fill", type: "fill", source: "split-polygon-preview", paint: { "fill-color": "#facc15", "fill-opacity": 0.25 } });
    map.addLayer({ id: "split-polygon-preview-line", type: "line", source: "split-polygon-preview", paint: { "line-color": "#facc15", "line-width": 2 } });

    // In-progress split drawing (line/polygon vertices)
    map.addSource("split-drawing", { type: "geojson", data: EMPTY_GEOJSON });
    map.addLayer({ id: "split-drawing-line", type: "line", source: "split-drawing", filter: ["==", "$type", "LineString"], paint: { "line-color": "#facc15", "line-width": 2, "line-dasharray": [4, 2] } });
    map.addLayer({ id: "split-drawing-vertices", type: "circle", source: "split-drawing", filter: ["==", "$type", "Point"], paint: { "circle-radius": 5, "circle-color": "#ffffff", "circle-stroke-color": "#000000", "circle-stroke-width": 1.5 } });

    // Create mode drawing
    map.addSource("create-drawing", { type: "geojson", data: EMPTY_GEOJSON });
    map.addLayer({ id: "create-drawing-line", type: "line", source: "create-drawing", filter: ["==", "$type", "LineString"], paint: { "line-color": "#34d399", "line-width": 2, "line-dasharray": [4, 2] } });
    map.addLayer({ id: "create-drawing-vertices", type: "circle", source: "create-drawing", filter: ["==", "$type", "Point"], paint: { "circle-radius": 5, "circle-color": "#ffffff", "circle-stroke-color": "#000000", "circle-stroke-width": 1.5 } });

    // Create mode closed polygon preview
    map.addSource("create-polygon", { type: "geojson", data: EMPTY_GEOJSON });
    map.addLayer({ id: "create-polygon-fill", type: "fill", source: "create-polygon", paint: { "fill-color": "#34d399", "fill-opacity": 0.4 } });
    map.addLayer({ id: "create-polygon-line", type: "line", source: "create-polygon", paint: { "line-color": "#10b981", "line-width": 2 } });

    // Edit mode rings overlay
    map.addSource("edit-rings", { type: "geojson", data: EMPTY_GEOJSON });
    map.addLayer({ id: "edit-rings-line", type: "line", source: "edit-rings", paint: { "line-color": "#3b82f6", "line-width": 2 } });
    map.addLayer({ id: "edit-rings-fill", type: "fill", source: "edit-rings", paint: { "fill-color": "#3b82f6", "fill-opacity": 0.2 } });

    // Labels always on top
    map.addLayer({ id: "plots-label", type: "symbol", source: "plots-labels", layout: { "text-field": ["get", "name"], "text-size": 13 }, paint: { "text-color": "#ffffff", "text-halo-color": "#000000", "text-halo-width": 2, "text-opacity": ["step", ["zoom"], 0, 14, 1] } });
    map.addSource("split-polygons-labels", { type: "geojson", data: EMPTY_GEOJSON });
    map.addLayer({ id: "split-polygons-label", type: "symbol", source: "split-polygons-labels", layout: { "text-field": ["get", "label"], "text-size": 12 }, paint: { "text-color": "#ffffff", "text-halo-color": "#000000", "text-halo-width": 2 } });

    setMapReady(true);
  };

  useEffect(() => {
    if (!mapReady || !mapRef.current || !farm || hasCentered.current || savedViewport) return;
    mapRef.current.jumpTo({ center: [farm.location.coordinates[0], farm.location.coordinates[1]], zoom: 17 });
    hasCentered.current = true;
  }, [mapReady, farm, savedViewport]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current.getMap();
    const push = (sourceId: string, data: GeoJSON.FeatureCollection) => {
      const source = map.getSource(sourceId);
      if (source instanceof maplibregl.GeoJSONSource) source.setData(data);
    };
    push("plots", geojson);
    push("plots-labels", labelsGeojson);
    push("split-target", splitTargetGeojson);
    push("merge-selected", mergeSelectedGeojson);
    push("split-drawing", splitDrawingGeojson);
    push("split-polygon-preview", splitPolygonPreviewGeojson);
    push("split-polygons", splitPolygonsGeojson);
    push("split-polygons-labels", splitPolygonsLabelsGeojson);
    push("create-drawing", createDrawingGeojson);
    push("create-polygon", createPolygonGeojson);
    push("edit-rings", editRingsGeojson);
  }, [
    mapReady, geojson, labelsGeojson, splitTargetGeojson, mergeSelectedGeojson,
    splitDrawingGeojson, splitPolygonPreviewGeojson, splitPolygonsGeojson, splitPolygonsLabelsGeojson,
    createDrawingGeojson, createPolygonGeojson, editRingsGeojson,
  ]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current.getMap();
    map.setLayoutProperty("satellite-layer", "visibility", activeLayer === "satellite" ? "visible" : "none");
    map.setLayoutProperty("pixelkarte-layer", "visibility", activeLayer === "pixelkarte" ? "visible" : "none");
  }, [mapReady, activeLayer]);

  // Crosshair for drawing modes
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const canvas = mapRef.current.getMap().getCanvas();
    const needsCrosshair = mode.type === "split" || mode.type === "create";
    canvas.style.cursor = needsCrosshair ? "crosshair" : "";
  }, [mapReady, mode.type]);

  const fuse = useMemo(() => new Fuse(plots, { keys: ["name", "localId"], threshold: 0.4 }), [plots]);
  const filteredPlots = useMemo<Plot[]>(() => {
    if (!searchQuery.trim()) return plots;
    return fuse.search(searchQuery).map((r) => r.item);
  }, [fuse, searchQuery, plots]);

  function selectPlotAndFly(plotId: string) {
    dispatch({ type: "SELECT_PLOT", plotId });
    setListOpen(false);
  }

  function handleCommitSplitLine() {
    if (mode.type !== "split" || mode.tool !== "line" || mode.drawnVertices.length < 2) return;
    const line: GeoJSON.LineString = { type: "LineString", coordinates: mode.drawnVertices };
    // Use existing split pieces as sources for iterative cutting, or fall back to original plot
    const sources: GeoJSON.MultiPolygon[] = mode.splitPolygons.length >= 2
      ? mode.splitPolygons
      : (() => { const p = mappablePlots.find((p) => p.id === mode.plotId); return p ? [p.geometry] : []; })();
    if (sources.length === 0) return;
    const newPieces: GeoJSON.MultiPolygon[] = [];
    let didCut = false;
    for (const geom of sources) {
      const result = splitMultiPolygonByLine(geom, line);
      if (result) {
        newPieces.push(...result);
        didCut = true;
      } else {
        newPieces.push(geom);
      }
    }
    if (!didCut) { setToolError(t("fieldCalendar.plots.split.splitFailed")); return; }
    setToolError(null);
    dispatch({ type: "SET_SPLIT_POLYGONS", polygons: newPieces });
  }

  function handleCommitSplitPolygon() {
    if (mode.type !== "split" || mode.tool !== "polygon" || mode.drawnVertices.length < 3) return;
    const sources: GeoJSON.MultiPolygon[] = mode.splitPolygons.length >= 2
      ? mode.splitPolygons
      : (() => { const p = mappablePlots.find((p) => p.id === mode.plotId); return p ? [p.geometry] : []; })();
    if (sources.length === 0) return;
    const newPieces: GeoJSON.MultiPolygon[] = [];
    let didCut = false;
    for (const geom of sources) {
      if (!didCut) {
        const result = cutPolygonFromMultiPolygon(geom, mode.drawnVertices);
        if (result) {
          newPieces.push(result.remaining, result.extracted);
          didCut = true;
          continue;
        }
      }
      newPieces.push(geom);
    }
    if (!didCut) { setToolError(t("fieldCalendar.plots.split.splitFailed")); return; }
    setToolError(null);
    dispatch({ type: "SET_SPLIT_POLYGONS", polygons: newPieces });
  }

  function handleSaveShape() {
    if (mode.type !== "edit" || !mode.geometryChanged) return;
    const newGeometry: GeoJSON.MultiPolygon = {
      type: "MultiPolygon",
      coordinates: mode.rings.map((ring) => {
        const closed = [...ring];
        if (closed.length > 0) {
          const [fx, fy] = closed[0];
          const [lx, ly] = closed[closed.length - 1];
          if (fx !== lx || fy !== ly) closed.push([fx, fy]);
        }
        return [closed];
      }),
    };
    const size = Math.round(turf.area(newGeometry));
    updateMutation.mutate(
      { plotId: mode.plotId, body: { geometry: newGeometry, size } },
      { onSuccess: () => dispatch({ type: "EXIT_MODE" }) },
    );
  }

  // The interactive layers vary by mode so clicks are routed correctly.
  const interactiveLayerIds = useMemo(() => {
    if (mode.type === "split" || mode.type === "create" || mode.type === "edit") return [] as string[];
    if (mode.type === "merge") return ["plots-fill", "merge-selected-fill"];
    return ["plots-fill"];
  }, [mode.type]);

  // Is the split-target plot a MultiPolygon with 2+ sub-polygons (extract is only useful then)?
  const targetIsMultiPolygon = useMemo(() => {
    if (mode.type !== "split") return false;
    const plot = mappablePlots.find((p) => p.id === mode.plotId);
    return (plot?.geometry.coordinates.length ?? 0) > 1;
  }, [mode, mappablePlots]);

  // Computed area during create mode (when polygon is closed)
  const createArea = useMemo(() => {
    if (mode.type !== "create" || mode.drawnVertices.length < 3) return 0;
    const ring = [...mode.drawnVertices, mode.drawnVertices[0]];
    try { return turf.area(turf.polygon([ring])); } catch { return 0; }
  }, [mode]);

  return (
    <PageContent title={t("fieldCalendar.plots.title")} showBackButton={false}>
      <div className="rounded-md border overflow-hidden relative" style={{ height: "calc(100vh - 200px)" }}>
        <Map
          ref={mapRef}
          initialViewState={{ longitude: savedViewport?.lng ?? 8.2, latitude: savedViewport?.lat ?? 46.8, zoom: savedViewport?.zoom ?? 8 }}
          mapStyle={EMPTY_MAP_STYLE}
          onLoad={handleMapLoad}
          onMoveEnd={(e) => {
            sessionStorage.setItem(VIEWPORT_STORAGE_KEY, JSON.stringify({ lng: e.viewState.longitude, lat: e.viewState.latitude, zoom: e.viewState.zoom }));
          }}
          onClick={(e) => {
            setToolError(null);

            if (mode.type === "split") {
              if (mode.tool === "line") {
                dispatch({ type: "ADD_VERTEX", lngLat: [e.lngLat.lng, e.lngLat.lat] });
                return;
              }
              if (mode.tool === "polygon") {
                if (mode.polygonClosed) return; // closed — only vertex dragging allowed
                // Snap-to-close: if clicking within 20px of the first vertex with 3+ points, close polygon
                if (mode.drawnVertices.length >= 3 && mapRef.current) {
                  const map = mapRef.current.getMap();
                  const firstPx = map.project(mode.drawnVertices[0] as [number, number]);
                  const clickPx = map.project([e.lngLat.lng, e.lngLat.lat]);
                  const dx = firstPx.x - clickPx.x;
                  const dy = firstPx.y - clickPx.y;
                  if (Math.sqrt(dx * dx + dy * dy) < 20) {
                    dispatch({ type: "CLOSE_POLYGON" });
                    return;
                  }
                }
                dispatch({ type: "ADD_VERTEX", lngLat: [e.lngLat.lng, e.lngLat.lat] });
                return;
              }
              if (mode.tool === "extract") {
                const plot = mappablePlots.find((p) => p.id === mode.plotId);
                if (!plot) return;
                const result = extractSubPolygonByPoint(plot.geometry, [e.lngLat.lng, e.lngLat.lat]);
                if (!result) { setToolError(t("fieldCalendar.plots.split.extractFailed")); return; }
                dispatch({ type: "SET_SPLIT_POLYGONS", polygons: [result.remaining, result.extracted] });
                return;
              }
              return;
            }

            if (mode.type === "create") {
              if (mode.closed) return; // closed — only vertex dragging allowed
              // Snap-to-close: if clicking within 20px of the first vertex with 3+ points, close polygon
              if (mode.drawnVertices.length >= 3 && mapRef.current) {
                const map = mapRef.current.getMap();
                const firstPx = map.project(mode.drawnVertices[0] as [number, number]);
                const clickPx = map.project([e.lngLat.lng, e.lngLat.lat]);
                const dx = firstPx.x - clickPx.x;
                const dy = firstPx.y - clickPx.y;
                if (Math.sqrt(dx * dx + dy * dy) < 20) {
                  dispatch({ type: "CLOSE_POLYGON" });
                  return;
                }
              }
              dispatch({ type: "ADD_VERTEX", lngLat: [e.lngLat.lng, e.lngLat.lat] });
              return;
            }

            const features = e.features ?? [];
            const hit = features.find((f) => f.layer?.id === "plots-fill" || f.layer?.id === "merge-selected-fill");

            if (mode.type === "merge") {
              if (hit) dispatch({ type: "TOGGLE_MERGE_PLOT", plotId: hit.properties?.id as string });
              return;
            }

            // View mode
            if (hit) {
              const plotId = hit.properties?.id as string;
              dispatch({ type: "SELECT_PLOT", plotId: selectedPlotId === plotId ? null : plotId });
            } else {
              dispatch({ type: "SELECT_PLOT", plotId: null });
            }
          }}
          interactiveLayerIds={interactiveLayerIds}
          style={{ width: "100%", height: "100%" }}
        >
          {farm && (
            <Marker longitude={farm.location.coordinates[0]} latitude={farm.location.coordinates[1]} anchor="center">
              <div className="bg-white rounded-full p-1.5 shadow-md border border-gray-300 pointer-events-none">
                <Home className="h-4 w-4 text-gray-700" />
              </div>
            </Marker>
          )}

          {/* Draggable vertex markers for edit mode */}
          {mode.type === "edit" && mode.rings.map((ring, rIdx) =>
            ring.map((vertex, vIdx) => (
              <Marker
                key={`edit-${rIdx}-${vIdx}`}
                longitude={vertex[0]}
                latitude={vertex[1]}
                draggable
                onDragEnd={(e) =>
                  dispatch({ type: "MOVE_EDIT_VERTEX", ringIndex: rIdx, vertexIndex: vIdx, lngLat: [e.lngLat.lng, e.lngLat.lat] })
                }
              >
                <div className="w-3 h-3 rounded-full bg-white border-2 border-blue-500 cursor-move shadow" />
              </Marker>
            ))
          )}

          {/* Draggable vertex markers for closed polygon (split-area) */}
          {mode.type === "split" && mode.tool === "polygon" && mode.polygonClosed && mode.drawnVertices.map((vertex, i) => (
            <Marker key={`poly-${i}`} longitude={vertex[0]} latitude={vertex[1]} draggable
              onDragEnd={(e) => dispatch({ type: "MOVE_POLYGON_VERTEX", index: i, lngLat: [e.lngLat.lng, e.lngLat.lat] })}>
              <div className="w-3 h-3 rounded-full bg-white border-2 border-yellow-400 cursor-move shadow" />
            </Marker>
          ))}

          {/* Draggable vertex markers for closed polygon (create) */}
          {mode.type === "create" && mode.closed && mode.drawnVertices.map((vertex, i) => (
            <Marker key={`create-${i}`} longitude={vertex[0]} latitude={vertex[1]} draggable
              onDragEnd={(e) => dispatch({ type: "MOVE_POLYGON_VERTEX", index: i, lngLat: [e.lngLat.lng, e.lngLat.lat] })}>
              <div className="w-3 h-3 rounded-full bg-white border-2 border-green-500 cursor-move shadow" />
            </Marker>
          ))}

          <NavigationControl position="top-left" />
        </Map>

        {/* Drawing instruction — top center */}
        {((mode.type === "split" && !mode.polygonClosed) || (mode.type === "create" && !mode.closed)) && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <span className="text-xs bg-background/90 backdrop-blur-sm text-muted-foreground rounded-md px-3 py-1.5 border shadow-sm">
              {mode.type === "split" && mode.tool === "line" && (
                mode.drawnVertices.length === 0
                  ? t("fieldCalendar.plots.split.toolbar")
                  : t("fieldCalendar.plots.split.toolbarHasLine", { count: mode.drawnVertices.length })
              )}
              {mode.type === "split" && mode.tool === "polygon" && (
                mode.drawnVertices.length < 3
                  ? t("fieldCalendar.plots.split.toolbarArea")
                  : t("fieldCalendar.plots.split.toolbarAreaReady", { count: mode.drawnVertices.length })
              )}
              {mode.type === "split" && mode.tool === "extract" && t("fieldCalendar.plots.split.toolbarExtract")}
              {mode.type === "create" && (
                mode.drawnVertices.length < 3
                  ? t("fieldCalendar.plots.create.toolbar")
                  : t("fieldCalendar.plots.create.toolbarReady", { count: mode.drawnVertices.length })
              )}
            </span>
          </div>
        )}

        {/* Layer toggle */}
        <div className="absolute top-2 right-2 z-10">
          <Button variant="outline" size="icon" onClick={() => setActiveLayer((p) => p === "satellite" ? "pixelkarte" : "satellite")}>
            <Layers className="h-4 w-4" />
          </Button>
        </div>

        {/* Plot list button */}
        <div className="absolute bottom-6 left-2 z-10">
          <Button variant="outline" size="icon" onClick={() => setListOpen(true)}>
            <List className="h-4 w-4" />
          </Button>
        </div>

        {/* Mode toolbar — bottom-center */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1.5">
          {toolError && (
            <div className="text-xs text-destructive bg-background/95 rounded px-2 py-1 border border-destructive/50">
              {toolError}
            </div>
          )}

          {/* View mode: always show New Plot, show Merge/Split when a plot is selected */}
          {mode.type === "view" && (
            <div className="flex gap-2 bg-background/95 backdrop-blur-sm rounded-md border shadow-md px-2 py-1.5">
              {selectedPlot && (
                <>
                  <Button variant="secondary" size="sm" onClick={() => dispatch({ type: "ENTER_MERGE", primaryPlotId: selectedPlot.id })}>
                    <GitMerge className="h-4 w-4 mr-1.5" />
                    {t("fieldCalendar.plots.enterMerge")}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => dispatch({ type: "ENTER_SPLIT", plotId: selectedPlot.id })}>
                    <Scissors className="h-4 w-4 mr-1.5" />
                    {t("fieldCalendar.plots.enterSplit")}
                  </Button>
                </>
              )}
              {!selectedPlot && (
                <Button variant="secondary" size="sm" onClick={() => dispatch({ type: "ENTER_CREATE" })}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  {t("fieldCalendar.plots.newPlot")}
                </Button>
              )}
            </div>
          )}

          {/* Merge mode */}
          {mode.type === "merge" && (
            <div className="flex items-center gap-2 bg-background/95 backdrop-blur-sm rounded-md border shadow-md px-3 py-1.5">
              <Button variant="ghost" size="sm" onClick={() => dispatch({ type: "EXIT_MODE" })}>
                <X className="h-4 w-4 mr-1" />{t("common.cancel")}
              </Button>
              <span className="text-sm text-muted-foreground px-1">
                {t("fieldCalendar.plots.merge.toolbar", { count: mode.selectedPlotIds.length })}
              </span>
              <Button size="sm" disabled={mode.selectedPlotIds.length < 2} onClick={() => setMergeFormOpen(true)}>
                <Check className="h-4 w-4 mr-1" />
                {t("fieldCalendar.plots.merge.confirm", { count: mode.selectedPlotIds.length })}
              </Button>
            </div>
          )}

          {/* Split mode — tool selector + single control bar */}
          {mode.type === "split" && (
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex gap-1 bg-background/95 backdrop-blur-sm rounded-md border shadow-md px-2 py-1">
                <Button variant={mode.tool === "line" ? "default" : "ghost"} size="sm" onClick={() => dispatch({ type: "SET_SPLIT_TOOL", tool: "line" })}>
                  <Minus className="h-3.5 w-3.5 mr-1" />{t("fieldCalendar.plots.split.toolLine")}
                </Button>
                <Button variant={mode.tool === "polygon" ? "default" : "ghost"} size="sm" onClick={() => dispatch({ type: "SET_SPLIT_TOOL", tool: "polygon" })}>
                  <Lasso className="h-3.5 w-3.5 mr-1" />{t("fieldCalendar.plots.split.toolArea")}
                </Button>
                {targetIsMultiPolygon && (
                  <Button variant={mode.tool === "extract" ? "default" : "ghost"} size="sm" onClick={() => dispatch({ type: "SET_SPLIT_TOOL", tool: "extract" })}>
                    <MousePointerClick className="h-3.5 w-3.5 mr-1" />{t("fieldCalendar.plots.split.toolExtract")}
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-1.5 bg-background/95 backdrop-blur-sm rounded-md border shadow-md px-3 py-1.5">
                <Button variant="ghost" size="sm" onClick={() => { dispatch({ type: "EXIT_MODE" }); setToolError(null); }}>
                  <X className="h-4 w-4 mr-1" />{t("common.cancel")}
                </Button>
                {mode.tool !== "extract" && mode.drawnVertices.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => { dispatch({ type: "UNDO_VERTEX" }); setToolError(null); }}>
                    <Undo2 className="h-4 w-4 mr-1" />{t("common.back")}
                  </Button>
                )}
                {mode.tool === "line" && (
                  <Button size="sm" disabled={mode.drawnVertices.length < 2} onClick={handleCommitSplitLine}>
                    <Scissors className="h-4 w-4 mr-1" />{t("fieldCalendar.plots.split.applyCut")}
                  </Button>
                )}
                {mode.tool === "polygon" && mode.polygonClosed && (
                  <Button size="sm" onClick={handleCommitSplitPolygon}>
                    <Scissors className="h-4 w-4 mr-1" />{t("fieldCalendar.plots.split.applyCut")}
                  </Button>
                )}
                {mode.splitPolygons.length >= 2 && (
                  <Button size="sm" variant="default" disabled={mode.drawnVertices.length > 0} onClick={() => setSplitFormOpen(true)}>
                    <Save className="h-4 w-4 mr-1" />{t("fieldCalendar.plots.split.confirmSplit")}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Create mode */}
          {mode.type === "create" && (
            <div className="flex items-center gap-1.5 bg-background/95 backdrop-blur-sm rounded-md border shadow-md px-3 py-1.5">
              <Button variant="ghost" size="sm" onClick={() => dispatch({ type: "EXIT_MODE" })}>
                <X className="h-4 w-4 mr-1" />{t("common.cancel")}
              </Button>
              {mode.drawnVertices.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => dispatch({ type: "UNDO_VERTEX" })}>
                  <Undo2 className="h-4 w-4 mr-1" />{t("common.back")}
                </Button>
              )}
              {mode.closed && (
                <>
                  {createArea > 0 && <span className="text-sm text-muted-foreground px-1">{(createArea / 100).toFixed(2)} a</span>}
                  <Button size="sm" onClick={() => setCreateFormOpen(true)}>
                    <Save className="h-4 w-4 mr-1" />{t("fieldCalendar.plots.create.confirm")}
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Edit shape mode */}
          {mode.type === "edit" && (
            <div className="flex items-center gap-2 bg-background/95 backdrop-blur-sm rounded-md border shadow-md px-3 py-1.5">
              <Button variant="ghost" size="sm" onClick={() => dispatch({ type: "EXIT_MODE" })}>
                <X className="h-4 w-4 mr-1" />{t("common.cancel")}
              </Button>
              <span className="text-sm text-muted-foreground">{t("fieldCalendar.plots.edit.dragInstruction")}</span>
              <Button size="sm" disabled={!mode.geometryChanged || updateMutation.isPending} onClick={handleSaveShape}>
                <Save className="h-4 w-4 mr-1" />{t("fieldCalendar.plots.edit.saveShape")}
              </Button>
            </div>
          )}
        </div>

        {/* Right-side detail panel */}
        <div className={`absolute top-0 right-0 h-full w-72 bg-background/95 backdrop-blur-sm border-l shadow-lg z-10 transition-transform duration-300 flex flex-col ${selectedPlot ? "translate-x-0" : "translate-x-full"}`}>
          {selectedPlot && (
            <PlotDetailPanel
              plot={selectedPlot}
              onClose={() => dispatch({ type: "SELECT_PLOT", plotId: null })}
              dispatch={dispatch}
              onEditMeta={() => setEditMetaOpen(true)}
            />
          )}
        </div>
      </div>

      {/* Searchable plot list */}
      <Sheet open={listOpen} onOpenChange={setListOpen}>
        <SheetContent side="left" className="w-80 flex flex-col gap-0 p-0">
          <SheetHeader className="p-4 pb-2">
            <SheetTitle>{t("fieldCalendar.plots.title")}</SheetTitle>
            <Input placeholder={t("common.search")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="mt-2" autoFocus />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1">
            {filteredPlots.map((plot) => (
              <button key={plot.id} className="w-full text-left px-3 py-2 rounded-md hover:bg-accent transition-colors" onClick={() => selectPlotAndFly(plot.id)}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: plotIdToColor(plot.id) }} />
                  <span className="font-medium text-sm truncate">{plot.name}</span>
                </div>
                <div className="text-xs text-muted-foreground ml-5">
                  {(plot.size / 100).toFixed(2)} a
                  {plot.currentCropRotation && ` · ${plot.currentCropRotation.crop.name}`}
                </div>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {mode.type === "merge" && (
        <MergeFormDialog
          open={mergeFormOpen}
          selectedPlotIds={mode.selectedPlotIds}
          plots={plots}
          onClose={() => setMergeFormOpen(false)}
          onSuccess={() => { setMergeFormOpen(false); dispatch({ type: "EXIT_MODE" }); }}
        />
      )}

      {mode.type === "split" && mode.splitPolygons.length >= 2 && (
        <SplitFormDialog
          open={splitFormOpen}
          plotId={mode.plotId}
          originalPlot={plots.find((p) => p.id === mode.plotId) ?? null}
          splitPolygons={mode.splitPolygons}
          onClose={() => setSplitFormOpen(false)}
          onSuccess={() => { setSplitFormOpen(false); dispatch({ type: "EXIT_MODE" }); }}
        />
      )}

      {mode.type === "create" && mode.closed && (
        <CreatePlotFormDialog
          open={createFormOpen}
          drawnVertices={mode.drawnVertices}
          area={createArea}
          onClose={() => setCreateFormOpen(false)}
          onSuccess={() => { setCreateFormOpen(false); dispatch({ type: "EXIT_MODE" }); }}
        />
      )}

      {selectedPlot && (
        <EditMetadataDialog
          open={editMetaOpen}
          plot={selectedPlot}
          onClose={() => setEditMetaOpen(false)}
          onSuccess={() => setEditMetaOpen(false)}
        />
      )}
    </PageContent>
  );
}

function PlotDetailPanel({
  plot,
  onClose,
  dispatch,
  onEditMeta,
}: {
  plot: Plot;
  onClose: () => void;
  dispatch: React.Dispatch<MapAction>;
  onEditMeta: () => void;
}) {
  const { t } = useTranslation();
  const { hasAccess } = useMembership();

  const searchNavLinks = [
    { label: t("fieldCalendar.harvests.title"), to: "/field-calendar/harvests" as const },
    { label: t("fieldCalendar.fertilizerApplications.title"), to: "/field-calendar/fertilizer-applications" as const },
    { label: t("fieldCalendar.tillages.title"), to: "/field-calendar/tillages" as const },
    { label: t("fieldCalendar.cropProtectionApplications.title"), to: "/field-calendar/crop-protection-applications" as const },
  ] as const;

  return (
    <>
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold text-base truncate pr-2">{plot.name}</h2>
        <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-xs text-muted-foreground">{t("fieldCalendar.plots.size")}</div>
            <div>{(plot.size / 100).toFixed(2)} a</div>
          </div>
          {plot.localId && (
            <div>
              <div className="text-xs text-muted-foreground">{t("fieldCalendar.plots.localId")}</div>
              <div>{plot.localId}</div>
            </div>
          )}
          {plot.usage != null && (
            <div>
              <div className="text-xs text-muted-foreground">{t("fieldCalendar.plots.usage")}</div>
              <div>{plot.usage}</div>
            </div>
          )}
          {plot.cuttingDate && (
            <div>
              <div className="text-xs text-muted-foreground">{t("fieldCalendar.plots.cuttingDate")}</div>
              <div>{new Date(plot.cuttingDate).toLocaleDateString()}</div>
            </div>
          )}
        </div>
        {plot.currentCropRotation && (
          <div>
            <div className="text-xs text-muted-foreground">{t("fieldCalendar.plots.currentCrop")}</div>
            <div className="font-medium">{plot.currentCropRotation.crop.name}</div>
          </div>
        )}
        {plot.additionalNotes && (
          <div>
            <div className="text-xs text-muted-foreground">{t("fieldCalendar.plots.additionalNotes")}</div>
            <div className="text-xs whitespace-pre-wrap">{plot.additionalNotes}</div>
          </div>
        )}

        {/* Edit / merge / split actions */}
        <div className="border-t pt-3 flex flex-col gap-2">
          <Button variant="outline" size="sm" className="w-full justify-start" onClick={onEditMeta}>
            <FileEdit className="h-3.5 w-3.5 mr-1.5" />{t("fieldCalendar.plots.edit.editInfo")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() =>
              dispatch({
                type: "ENTER_EDIT",
                plotId: plot.id,
                rings: plot.geometry.coordinates.map((polygon) => polygon[0].map((coord) => [coord[0], coord[1]])),
              })
            }
          >
            <Pencil className="h-3.5 w-3.5 mr-1.5" />{t("fieldCalendar.plots.edit.editShape")}
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => dispatch({ type: "ENTER_MERGE", primaryPlotId: plot.id })}>
            <GitMerge className="h-3.5 w-3.5 mr-1.5" />{t("fieldCalendar.plots.enterMerge")}
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => dispatch({ type: "ENTER_SPLIT", plotId: plot.id })}>
            <Scissors className="h-3.5 w-3.5 mr-1.5" />{t("fieldCalendar.plots.enterSplit")}
          </Button>
        </div>

        <div className="border-t pt-3 space-y-1">
          <Link to="/field-calendar/plots/$plotId/crop-rotations" params={{ plotId: plot.id }} className="block px-2 py-1.5 rounded hover:bg-accent text-sm transition-colors">
            {t("fieldCalendar.cropRotations.title")}
          </Link>
          {searchNavLinks.map(({ label, to }) => (
            <Link key={to} to={to} search={{ plotId: plot.id, returnTo: "/field-calendar/plots" }} className="block px-2 py-1.5 rounded hover:bg-accent text-sm transition-colors">
              {label}
            </Link>
          ))}
          {hasAccess && (
            <Link to="/field-calendar/plots/$plotId/journal" params={{ plotId: plot.id }} search={{ returnTo: "/field-calendar/plots" }} className="block px-2 py-1.5 rounded hover:bg-accent text-sm transition-colors">
              {t("journal.title")}
            </Link>
          )}
        </div>

        <Link to="/field-calendar/plots/$plotId" params={{ plotId: plot.id }} className="block w-full">
          <Button className="w-full" size="sm">{t("fieldCalendar.plots.viewDetails")}</Button>
        </Link>
      </div>
    </>
  );
}

function MergeFormDialog({ open, selectedPlotIds, plots, onClose, onSuccess }: {
  open: boolean; selectedPlotIds: string[]; plots: Plot[]; onClose: () => void; onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const mergeMutation = useMergePlotsMutation();
  const selectedPlots = useMemo(() => plots.filter((p) => selectedPlotIds.includes(p.id)), [plots, selectedPlotIds]);

  const mergedAreaAres = useMemo(() => {
    if (selectedPlots.length === 0) return 0;
    try {
      let merged = turf.multiPolygon(selectedPlots[0].geometry.coordinates);
      for (let i = 1; i < selectedPlots.length; i++) {
        const other = turf.multiPolygon(selectedPlots[i].geometry.coordinates);
        const union = turf.union(turf.featureCollection([merged, other]));
        if (union) merged = union.geometry.type === "MultiPolygon" ? turf.multiPolygon(union.geometry.coordinates) : turf.multiPolygon([union.geometry.coordinates]);
      }
      return turf.area(merged) / 100;
    } catch { return selectedPlots.reduce((sum, p) => sum + p.size / 100, 0); }
  }, [selectedPlots]);

  const [name, setName] = useState(() => selectedPlots.map((p) => p.localId ?? p.name).join(" + "));
  const [strategy, setStrategy] = useState<"keep_reference" | "delete_and_migrate">("keep_reference");

  useEffect(() => {
    if (open) { setName(selectedPlots.map((p) => p.localId ?? p.name).join(" + ")); setStrategy("keep_reference"); }
  }, [open, selectedPlots]);

  function handleSubmit() {
    const body: MergePlotsBody = strategy === "delete_and_migrate"
      ? { strategy: "delete_and_migrate", plotIds: selectedPlotIds, name }
      : { strategy: "keep_reference", plotIds: selectedPlotIds, name };
    mergeMutation.mutate(body, { onSuccess });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{t("fieldCalendar.plots.merge.dialog.title")}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5"><Label>{t("fieldCalendar.plots.merge.dialog.name")}</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1.5">
            <Label>{t("fieldCalendar.plots.merge.dialog.strategy")}</Label>
            <Select value={strategy} onValueChange={(v) => setStrategy(v as "keep_reference" | "delete_and_migrate")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="keep_reference">{t("fieldCalendar.plots.merge.dialog.strategyKeepReference")}</SelectItem>
                <SelectItem value="delete_and_migrate">{t("fieldCalendar.plots.merge.dialog.strategyDeleteAndMigrate")}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{strategy === "keep_reference" ? t("fieldCalendar.plots.merge.dialog.strategyKeepReferenceInfo") : t("fieldCalendar.plots.merge.dialog.strategyDeleteAndMigrateInfo")}</p>
            {strategy === "delete_and_migrate" && <p className="text-xs text-destructive">{t("fieldCalendar.plots.merge.dialog.deleteWarning")}</p>}
          </div>
          <div><div className="text-xs text-muted-foreground">{t("fieldCalendar.plots.merge.dialog.area")}</div><div className="font-medium">{mergedAreaAres.toFixed(2)} a</div></div>
          <div className="text-xs text-muted-foreground space-y-0.5">{selectedPlots.map((p) => <div key={p.id}>{p.name} — {(p.size / 100).toFixed(2)} a</div>)}</div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || mergeMutation.isPending}>{t("fieldCalendar.plots.merge.dialog.title")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const SPLIT_LETTERS = ["A", "B", "C", "D", "E"];

function SplitFormDialog({ open, plotId, originalPlot, splitPolygons, onClose, onSuccess }: {
  open: boolean; plotId: string; originalPlot: Plot | null; splitPolygons: GeoJSON.MultiPolygon[]; onClose: () => void; onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const splitMutation = useSplitPlotMutation();
  const baseName = originalPlot?.name ?? "Plot";
  const [strategy, setStrategy] = useState<"keep_reference" | "delete_and_migrate">("keep_reference");
  const [originalPlotName, setOriginalPlotName] = useState(baseName);
  const [subPlotNames, setSubPlotNames] = useState<string[]>(splitPolygons.map((_, i) => `${baseName} ${SPLIT_LETTERS[i] ?? String(i + 1)}`));
  const [migrateToIndex, setMigrateToIndex] = useState(0);

  useEffect(() => {
    if (open) {
      const base = originalPlot?.name ?? "Plot";
      setOriginalPlotName(base);
      setSubPlotNames(splitPolygons.map((_, i) => `${base} ${SPLIT_LETTERS[i] ?? String(i + 1)}`));
      setStrategy("keep_reference");
      setMigrateToIndex(0);
    }
  }, [open, originalPlot, splitPolygons]);

  function handleSubmit() {
    const subPlots = splitPolygons.map((geometry, i) => ({
      geometry: { type: "MultiPolygon" as const, coordinates: geometry.coordinates },
      name: subPlotNames[i] ?? `${baseName} ${SPLIT_LETTERS[i] ?? String(i + 1)}`,
      size: Math.round(turf.area(geometry)),
    }));
    const body: SplitPlotBody = strategy === "delete_and_migrate"
      ? { strategy: "delete_and_migrate", migrateToIndex, subPlots }
      : { strategy: "keep_reference", originalPlotName, subPlots };
    splitMutation.mutate({ plotId, body }, { onSuccess });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{t("fieldCalendar.plots.split.dialog.title")}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>{t("fieldCalendar.plots.split.dialog.strategy")}</Label>
            <Select value={strategy} onValueChange={(v) => setStrategy(v as "keep_reference" | "delete_and_migrate")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="keep_reference">{t("fieldCalendar.plots.split.dialog.strategyKeepReference")}</SelectItem>
                <SelectItem value="delete_and_migrate">{t("fieldCalendar.plots.split.dialog.strategyDeleteAndMigrate")}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{strategy === "keep_reference" ? t("fieldCalendar.plots.split.dialog.strategyKeepReferenceInfo") : t("fieldCalendar.plots.split.dialog.strategyDeleteAndMigrateInfo")}</p>
          </div>
          {strategy === "keep_reference" && (
            <div className="space-y-1.5"><Label>{t("fieldCalendar.plots.split.dialog.originalPlotName")}</Label><Input value={originalPlotName} onChange={(e) => setOriginalPlotName(e.target.value)} /></div>
          )}
          <div className="space-y-2">
            {splitPolygons.map((polygon, i) => {
              const area = turf.area(polygon) / 100;
              return (
                <div key={i} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: SPLIT_PIECE_COLORS[i % SPLIT_PIECE_COLORS.length] }} />
                    <Label className="text-xs">{t("fieldCalendar.plots.split.dialog.subPlot", { letter: SPLIT_LETTERS[i] ?? String(i + 1) })} — {area.toFixed(2)} a</Label>
                    {strategy === "delete_and_migrate" && (
                      <button
                        className={`ml-auto text-xs px-1.5 py-0.5 rounded border transition-colors ${migrateToIndex === i ? "bg-primary text-primary-foreground border-primary" : "border-muted-foreground/30 text-muted-foreground hover:border-primary"}`}
                        onClick={() => setMigrateToIndex(i)}
                      >
                        {t("fieldCalendar.plots.split.dialog.migrateHere")}
                      </button>
                    )}
                  </div>
                  <Input
                    value={subPlotNames[i] ?? ""}
                    onChange={(e) => { const u = [...subPlotNames]; u[i] = e.target.value; setSubPlotNames(u); }}
                  />
                </div>
              );
            })}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
          <Button onClick={handleSubmit} disabled={subPlotNames.some((n) => !n.trim()) || splitMutation.isPending}>{t("fieldCalendar.plots.split.confirmSplit")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreatePlotFormDialog({ open, drawnVertices, area, onClose, onSuccess }: {
  open: boolean; drawnVertices: [number, number][]; area: number; onClose: () => void; onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const createMutation = useCreatePlotMutation();
  const [name, setName] = useState("");
  const [localId, setLocalId] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => { if (open) { setName(""); setLocalId(""); setNotes(""); } }, [open]);

  function handleSubmit() {
    const ring = [...drawnVertices, drawnVertices[0]];
    const geometry: GeoJSON.MultiPolygon = { type: "MultiPolygon", coordinates: [[ring]] };
    createMutation.mutate(
      { name: name.trim(), geometry, size: Math.round(area), localId: localId.trim() || undefined, additionalNotes: notes.trim() || undefined },
      { onSuccess },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{t("fieldCalendar.plots.create.dialog.title")}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5"><Label>{t("fieldCalendar.plots.create.dialog.name")}</Label><Input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
          <div className="space-y-1.5"><Label>{t("fieldCalendar.plots.localId")}</Label><Input value={localId} onChange={(e) => setLocalId(e.target.value)} /></div>
          <div><div className="text-xs text-muted-foreground">{t("fieldCalendar.plots.size")}</div><div className="font-medium">{(area / 100).toFixed(2)} a</div></div>
          <div className="space-y-1.5"><Label>{t("fieldCalendar.plots.additionalNotes")}</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || createMutation.isPending}>{t("common.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditMetadataDialog({ open, plot, onClose, onSuccess }: {
  open: boolean; plot: Plot; onClose: () => void; onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const updateMutation = useUpdatePlotMutation();
  const [name, setName] = useState(plot.name);
  const [localId, setLocalId] = useState(plot.localId ?? "");
  const [notes, setNotes] = useState(plot.additionalNotes ?? "");

  useEffect(() => {
    if (open) { setName(plot.name); setLocalId(plot.localId ?? ""); setNotes(plot.additionalNotes ?? ""); }
  }, [open, plot]);

  function handleSubmit() {
    updateMutation.mutate(
      { plotId: plot.id, body: { name: name.trim(), localId: localId.trim() || undefined, additionalNotes: notes.trim() || undefined } },
      { onSuccess },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{t("fieldCalendar.plots.edit.dialog.title")}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5"><Label>{t("common.name")}</Label><Input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
          <div className="space-y-1.5"><Label>{t("fieldCalendar.plots.localId")}</Label><Input value={localId} onChange={(e) => setLocalId(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>{t("fieldCalendar.plots.additionalNotes")}</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || updateMutation.isPending}>{t("common.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
