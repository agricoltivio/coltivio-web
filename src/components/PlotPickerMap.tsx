import { useCallback, useEffect, useRef, useState } from "react";
import Map, {
  AttributionControl,
  Marker,
  NavigationControl,
  type MapRef,
} from "react-map-gl/maplibre";
import * as maplibregl from "maplibre-gl";
import * as turf from "@turf/turf";
import "maplibre-gl/dist/maplibre-gl.css";
import { Home, Layers, PencilIcon, Undo2Icon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { farmQueryOptions } from "@/api/farm.queries";
import { Button } from "@/components/ui/button";
import { PlotColorModeToggle } from "@/components/PlotColorModeToggle";
import { resolvePlotColor, type PlotColorMode } from "@/lib/plotColor";
import { mapAttribution } from "@/lib/mapAttribution";
import type { Plot } from "@/api/types";
import {
  drawnRingAt,
  isSelfCrossing,
  NO_DRAWN_AREAS,
  type DrawnArea,
  type DrawingOutcome,
} from "@/lib/drawnAreas";
import { insertVertexAfter, ringMidpoints } from "@/lib/ringMidpoints";
import { MidpointMarker } from "@/components/MidpointMarker";
import { useTranslation } from "react-i18next";

const EMPTY_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {},
  layers: [],
};

const SWISS_SATELLITE =
  "https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg";
const SWISS_PIXELKARTE =
  "https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg";

type BaseLayer = "satellite" | "pixelkarte";

// Clicks closer than this to the last point count as the same point
const SAME_POINT_DISTANCE_PX = 6;

const EMPTY_COLLECTION: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

function toFeatureCollection(
  plots: Plot[],
  selectedIds: string[],
  colorMode: PlotColorMode,
  drawnAreas: Record<string, DrawnArea> = NO_DRAWN_AREAS,
): GeoJSON.FeatureCollection {
  // a plot with a drawn area isn't highlighted as a whole, its drawn part is
  const selected = new Set(selectedIds.filter((plotId) => !drawnAreas[plotId]));
  return {
    type: "FeatureCollection",
    features: plots.map((plot) => ({
      type: "Feature",
      id: plot.id,
      properties: {
        id: plot.id,
        name: plot.name,
        selected: selected.has(plot.id),
        color: resolvePlotColor(plot, colorMode),
      },
      geometry: plot.geometry,
    })),
  };
}

function drawnAreasCollection(
  drawnAreas: Record<string, DrawnArea>,
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: Object.entries(drawnAreas).map(([plotId, area]) => ({
      type: "Feature",
      properties: { plotId },
      geometry: area.geometry,
    })),
  };
}

// In-progress drawing outline; its points are draggable markers
function drawingCollection(
  vertices: [number, number][],
): GeoJSON.FeatureCollection {
  if (vertices.length < 2) return EMPTY_COLLECTION;
  const outline = vertices.length >= 3 ? [...vertices, vertices[0]] : vertices;
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: outline },
      },
    ],
  };
}

/**
 * A map of all plots — the same swisstopo base map and controls as the plots
 * overview. Clicking a plot polygon calls `onPick` with its id (the caller decides
 * whether that means "select" or "toggle"). With `onDrawComplete`, an area can also
 * be drawn point by point; `drawnAreas` shows the drawn parts of plots. Clicking a
 * drawn part reopens its drawing for editing, and points can be dragged.
 */
export function PlotPickerMap({
  plots,
  selectedIds,
  onPick,
  drawnAreas = NO_DRAWN_AREAS,
  onDrawComplete,
}: {
  plots: Plot[];
  selectedIds: string[];
  onPick: (plotId: string) => void;
  drawnAreas?: Record<string, DrawnArea>;
  // editedRing: the drawing that was reopened and changed, null for a new one. Returns false
  // when the drawing touches no plot: the drawing stays open with a message.
  onDrawComplete?: (
    drawnRing: [number, number][],
    editedRing: [number, number][] | null,
  ) => DrawingOutcome;
}) {
  const { t, i18n } = useTranslation();
  const mapRef = useRef<MapRef>(null);
  const hoveredIdRef = useRef<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [activeLayer, setActiveLayer] = useState<BaseLayer>("satellite");
  const [colorMode, setColorMode] = useState<PlotColorMode>("plot");
  const activeLayerRef = useRef(activeLayer);
  activeLayerRef.current = activeLayer;
  const colorModeRef = useRef(colorMode);
  colorModeRef.current = colorMode;
  const selectedKey = selectedIds.join(",");
  const [drawing, setDrawing] = useState(false);
  const [drawnVertices, setDrawnVertices] = useState<[number, number][]>([]);
  const [editedRing, setEditedRing] = useState<[number, number][] | null>(null);
  // Earlier states of the drawing, so "undo" reverts the last action (added, inserted or moved point)
  const [vertexHistory, setVertexHistory] = useState<[number, number][][]>([]);
  // Why the last "apply" changed nothing, shown until the drawing changes
  const [drawingProblem, setDrawingProblem] = useState<Exclude<
    DrawingOutcome,
    "applied"
  > | null>(null);
  function changeVertices(nextVertices: [number, number][]) {
    setVertexHistory((history) => [...history, drawnVertices]);
    setDrawnVertices(nextVertices);
    setDrawingProblem(null);
  }
  function undoVertexChange() {
    const previous = vertexHistory[vertexHistory.length - 1];
    if (!previous) return;
    setDrawnVertices(previous);
    setVertexHistory((history) => history.slice(0, -1));
    setDrawingProblem(null);
  }
  function moveVertex(index: number, lngLat: { lng: number; lat: number }) {
    setDrawnVertices((prev) =>
      prev.map((vertex, vertexIndex) =>
        vertexIndex === index ? [lngLat.lng, lngLat.lat] : vertex,
      ),
    );
  }
  const drawingSelfCrosses = drawing && isSelfCrossing(drawnVertices);

  const farm = useQuery(farmQueryOptions()).data;

  const handleLoad = useCallback(
    (event: maplibregl.MapLibreEvent) => {
      const map = event.target;
      const attribution = mapAttribution(t, i18n.language);

      map.addSource("satellite", {
        type: "raster",
        tiles: [SWISS_SATELLITE],
        tileSize: 256,
        attribution: attribution.swisstopo,
      });
      map.addLayer({
        id: "satellite-layer",
        type: "raster",
        source: "satellite",
        layout: {
          visibility:
            activeLayerRef.current === "satellite" ? "visible" : "none",
        },
      });
      map.addSource("pixelkarte", {
        type: "raster",
        tiles: [SWISS_PIXELKARTE],
        tileSize: 256,
        attribution: attribution.swisstopo,
      });
      map.addLayer({
        id: "pixelkarte-layer",
        type: "raster",
        source: "pixelkarte",
        layout: {
          visibility:
            activeLayerRef.current === "pixelkarte" ? "visible" : "none",
        },
      });

      map.addSource("plots", {
        type: "geojson",
        promoteId: "id",
        data: toFeatureCollection(plots, selectedIds, colorModeRef.current),
        attribution: attribution.cantons,
      });
      map.addLayer({
        id: "plots-fill",
        type: "fill",
        source: "plots",
        paint: {
          "fill-color": [
            "case",
            ["get", "selected"],
            "#2a5159",
            ["boolean", ["feature-state", "hover"], false],
            "#db751d",
            ["get", "color"],
          ],
          "fill-opacity": ["case", ["get", "selected"], 0.6, 0.45],
        },
      });
      map.addLayer({
        id: "plots-line",
        type: "line",
        source: "plots",
        paint: {
          "line-color": ["case", ["get", "selected"], "#ffffff", "#ffffff"],
          "line-width": ["case", ["get", "selected"], 2.5, 1.5],
        },
      });
      map.addSource("drawn-areas", {
        type: "geojson",
        data: drawnAreasCollection(drawnAreas),
      });
      map.addLayer({
        id: "drawn-areas-fill",
        type: "fill",
        source: "drawn-areas",
        paint: { "fill-color": "#2a5159", "fill-opacity": 0.6 },
      });
      map.addLayer({
        id: "drawn-areas-line",
        type: "line",
        source: "drawn-areas",
        paint: { "line-color": "#db751d", "line-width": 2.5 },
      });
      map.addSource("drawing", { type: "geojson", data: EMPTY_COLLECTION });
      map.addLayer({
        id: "drawing-line",
        type: "line",
        source: "drawing",
        filter: ["==", ["geometry-type"], "LineString"],
        paint: {
          "line-color": "#db751d",
          "line-width": 2.5,
          "line-dasharray": [2, 1],
        },
      });
      map.addLayer({
        id: "plots-label",
        type: "symbol",
        source: "plots",
        layout: { "text-field": ["get", "name"], "text-size": 13 },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "#000000",
          "text-halo-width": 2,
        },
      });

      setMapReady(true);
    },
    // handleLoad only runs once; deps kept for lint completeness.
    [plots, selectedIds],
  );

  // Center on the farm once ready, matching the plots overview; fall back to
  // fitting all plots when the farm has no location.
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    if (farm?.location?.coordinates) {
      map.jumpTo({
        center: [farm.location.coordinates[0], farm.location.coordinates[1]],
        zoom: 17,
      });
    } else if (plots.length > 0) {
      const [minX, minY, maxX, maxY] = turf.bbox(
        toFeatureCollection(plots, [], colorMode),
      );
      map.fitBounds(
        [
          [minX, minY],
          [maxX, maxY],
        ],
        {
          padding: 48,
          duration: 0,
          maxZoom: 17,
        },
      );
    }
  }, [mapReady, farm, plots]);

  // Keep the "selected" highlight, colours and drawn areas in sync. drawnAreas is a
  // new object on every change, so a redrawn area of the same plot updates too.
  useEffect(() => {
    const map = mapRef.current?.getMap();
    const plotSource = map?.getSource("plots");
    if (plotSource instanceof maplibregl.GeoJSONSource) {
      plotSource.setData(
        toFeatureCollection(plots, selectedIds, colorMode, drawnAreas),
      );
    }
    const drawnAreasSource = map?.getSource("drawn-areas");
    if (drawnAreasSource instanceof maplibregl.GeoJSONSource) {
      drawnAreasSource.setData(drawnAreasCollection(drawnAreas));
    }
  }, [plots, selectedKey, colorMode, drawnAreas, mapReady]);

  useEffect(() => {
    const source = mapRef.current?.getMap().getSource("drawing");
    if (source instanceof maplibregl.GeoJSONSource) {
      source.setData(drawingCollection(drawnVertices));
    }
  }, [drawnVertices, mapReady]);

  function stopDrawing() {
    setDrawing(false);
    setDrawnVertices([]);
    setEditedRing(null);
    setVertexHistory([]);
    setDrawingProblem(null);
  }

  function finishDrawing() {
    if (drawnVertices.length < 3 || drawingSelfCrosses || !onDrawComplete)
      return;
    const outcome = onDrawComplete(drawnVertices, editedRing);
    if (outcome !== "applied") {
      setDrawingProblem(outcome);
      return;
    }
    stopDrawing();
  }

  // reopens the drawing (of the clicked spot) a drawn area was cut from
  function editDrawing(plotId: string, lngLat: [number, number]) {
    const drawnArea = drawnAreas[plotId];
    if (!drawnArea || !onDrawComplete) return;
    const drawnRing = drawnRingAt(drawnArea, lngLat);
    setDrawnVertices(drawnRing);
    setEditedRing(drawnRing);
    setVertexHistory([]);
    setDrawingProblem(null);
    setDrawing(true);
  }

  // Toggle the base layer visibility.
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!mapReady || !map) return;
    map.setLayoutProperty(
      "satellite-layer",
      "visibility",
      activeLayer === "satellite" ? "visible" : "none",
    );
    map.setLayoutProperty(
      "pixelkarte-layer",
      "visibility",
      activeLayer === "pixelkarte" ? "visible" : "none",
    );
  }, [mapReady, activeLayer]);

  function setHover(plotId: string | null, overDrawnArea = false) {
    const map = mapRef.current?.getMap();
    if (!map) return;
    if (hoveredIdRef.current) {
      map.setFeatureState(
        { source: "plots", id: hoveredIdRef.current },
        { hover: false },
      );
    }
    hoveredIdRef.current = plotId;
    if (plotId) {
      map.setFeatureState({ source: "plots", id: plotId }, { hover: true });
    }
    map.getCanvas().style.cursor = drawing
      ? "crosshair"
      : plotId || overDrawnArea
        ? "pointer"
        : "";
  }

  return (
    <div className="relative h-[75vh] w-full overflow-hidden rounded-lg border">
      <Map
        ref={mapRef}
        initialViewState={{ longitude: 8.23, latitude: 46.8, zoom: 7 }}
        mapStyle={EMPTY_STYLE}
        onLoad={handleLoad}
        attributionControl={false}
        interactiveLayerIds={["drawn-areas-fill", "plots-fill"]}
        onMouseMove={(event) => {
          const feature = event.features?.[0];
          if (feature?.layer.id === "drawn-areas-fill") {
            setHover(null, true);
            return;
          }
          setHover(
            feature?.properties?.id ? String(feature.properties.id) : null,
          );
        }}
        onMouseLeave={() => setHover(null)}
        // a double click would otherwise zoom while points are being placed
        doubleClickZoom={!drawing}
        onClick={(event) => {
          // markers sit inside the map container: a click on a point or midpoint handle also
          // reaches the map, it must not add a point as well
          const clickTarget = event.originalEvent.target;
          if (
            clickTarget instanceof Element &&
            clickTarget.closest(".maplibregl-marker")
          )
            return;
          if (drawing) {
            // A double click (or a second click on the same spot) adds no second point there
            const lastVertex = drawnVertices[drawnVertices.length - 1];
            const map = mapRef.current;
            if (lastVertex && map) {
              const lastPoint = map.project(lastVertex);
              if (
                Math.hypot(
                  lastPoint.x - event.point.x,
                  lastPoint.y - event.point.y,
                ) < SAME_POINT_DISTANCE_PX
              ) {
                return;
              }
            }
            changeVertices([
              ...drawnVertices,
              [event.lngLat.lng, event.lngLat.lat],
            ]);
            return;
          }
          const feature = event.features?.[0];
          if (
            feature?.layer.id === "drawn-areas-fill" &&
            feature.properties?.plotId
          ) {
            editDrawing(String(feature.properties.plotId), [
              event.lngLat.lng,
              event.lngLat.lat,
            ]);
            return;
          }
          if (feature?.properties?.id) onPick(String(feature.properties.id));
        }}
        style={{ width: "100%", height: "100%" }}
      >
        <NavigationControl position="top-left" />
        <AttributionControl compact={false} position="bottom-right" />
        {drawing &&
          drawnVertices.map(([lng, lat], index) => (
            <Marker
              key={index}
              longitude={lng}
              latitude={lat}
              anchor="center"
              draggable
              onDragStart={() => {
                setVertexHistory((history) => [...history, drawnVertices]);
                setDrawingProblem(null);
              }}
              onDrag={(event) => moveVertex(index, event.lngLat)}
            >
              {/* larger transparent hit area around the visible point, easier to grab on a tablet */}
              <div className="flex size-7 cursor-move items-center justify-center">
                <div className="size-3 rounded-full border-2 border-[#db751d] bg-white" />
              </div>
            </Marker>
          ))}
        {drawing &&
          ringMidpoints(drawnVertices, true).map(({ afterIndex, lngLat }) => (
            <MidpointMarker
              key={`midpoint-${afterIndex}`}
              lngLat={lngLat}
              className="border-[#db751d]"
              onInsert={(insertedLngLat) =>
                changeVertices(
                  insertVertexAfter(drawnVertices, afterIndex, insertedLngLat),
                )
              }
            />
          ))}
        {farm?.location?.coordinates && (
          <Marker
            longitude={farm.location.coordinates[0]}
            latitude={farm.location.coordinates[1]}
            anchor="center"
          >
            <div className="rounded-full border border-border bg-background p-1.5 shadow-md">
              <Home className="size-4 text-foreground" />
            </div>
          </Marker>
        )}
      </Map>

      <div className="absolute right-2 top-2 z-10 flex flex-col gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() =>
            setActiveLayer((prev) =>
              prev === "satellite" ? "pixelkarte" : "satellite",
            )
          }
        >
          <Layers className="size-4" />
        </Button>
        <PlotColorModeToggle value={colorMode} onChange={setColorMode} />
      </div>

      {onDrawComplete && (
        <div className="absolute bottom-8 left-2 z-10 flex max-w-[calc(100%-1rem)] flex-wrap items-center gap-2 rounded-md border bg-background/95 p-2 shadow-md">
          {drawing ? (
            <>
              {drawingSelfCrosses ? (
                <span className="text-sm text-destructive">
                  {t("fieldCalendar.plots.drawSelfCrossing")}
                </span>
              ) : drawingProblem === "touches_no_plot" ? (
                <span className="text-sm text-destructive">
                  {t("fieldCalendar.plots.drawTouchesNoPlot")}
                </span>
              ) : drawingProblem === "only_whole_plots" ? (
                <span className="text-sm text-destructive">
                  {t("fieldCalendar.plots.drawOnlyWholePlots")}
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">
                  {t("fieldCalendar.plots.drawHint")}
                </span>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={vertexHistory.length === 0}
                onClick={undoVertexChange}
              >
                <Undo2Icon className="size-4" />
                {t("fieldCalendar.plots.undoPoint")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={stopDrawing}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={drawnVertices.length < 3 || drawingSelfCrosses}
                onClick={finishDrawing}
              >
                {t("fieldCalendar.plots.finishDrawing")}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDrawing(true)}
              >
                <PencilIcon className="size-4" />
                {t("fieldCalendar.plots.drawArea")}
              </Button>
              {Object.keys(drawnAreas).length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {t("fieldCalendar.plots.editDrawingHint")}
                </span>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
