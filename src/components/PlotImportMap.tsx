import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Map, {
  AttributionControl,
  NavigationControl,
  type MapRef,
} from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import * as turf from "@turf/turf";
import "maplibre-gl/dist/maplibre-gl.css";
import { Layers } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { mapAttribution } from "@/lib/mapAttribution";
import type { Plot } from "@/api/types";

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

export type ImportRowStatus = "new" | "conflict" | "error" | "invalid";

export const IMPORT_STATUS_COLORS: Record<ImportRowStatus, string> = {
  new: "#16a34a",
  conflict: "#dc2626",
  error: "#7c3aed",
  invalid: "#6b7280",
};
export const SKIPPED_ROW_COLOR = "#9ca3af";
const EXISTING_PLOT_COLOR = "#facc15";

export type PlotImportMapRow = {
  rowNumber: number;
  name: string;
  status: ImportRowStatus;
  selected: boolean;
  geometry: { type: "MultiPolygon"; coordinates: number[][][][] };
};

function importFeatureCollection(
  rows: PlotImportMapRow[],
  focusedRowNumber: number | null,
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: rows.map((row) => ({
      type: "Feature",
      id: row.rowNumber,
      properties: {
        rowNumber: row.rowNumber,
        name: row.name,
        status: row.status,
        selected: row.selected,
        focused: row.rowNumber === focusedRowNumber,
      },
      geometry: row.geometry,
    })),
  };
}

function existingFeatureCollection(
  plots: Plot[],
  overlappedPlotIds: Set<string>,
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: plots.map((plot) => ({
      type: "Feature",
      id: plot.id,
      properties: {
        id: plot.id,
        name: plot.name,
        overlapped: overlappedPlotIds.has(plot.id),
      },
      geometry: plot.geometry,
    })),
  };
}

// Diagonal red stripes used as fill pattern for conflicting rows
function createStripePattern(): ImageData | null {
  const size = 16;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.fillStyle = "rgba(220, 38, 38, 0.35)";
  context.fillRect(0, 0, size, size);
  context.strokeStyle = "rgba(220, 38, 38, 0.95)";
  context.lineWidth = 3;
  context.beginPath();
  // Three lines so the stripes continue seamlessly across tile borders
  for (const offset of [-size, 0, size]) {
    context.moveTo(offset, size);
    context.lineTo(offset + size, 0);
  }
  context.stroke();
  return context.getImageData(0, 0, size, size);
}

/**
 * Map for the shapefile import preview: shows the existing farm plots in grey and the
 * rows to import coloured by status (conflicts striped red). Clicking an import
 * polygon calls `onPick` with its row number.
 */
export function PlotImportMap({
  rows,
  existingPlots,
  overlappedPlotIds,
  focusedRowNumber,
  zoomRequest,
  onPick,
  overlay,
}: {
  rows: PlotImportMapRow[];
  existingPlots: Plot[];
  overlappedPlotIds: Set<string>;
  focusedRowNumber: number | null;
  // The nonce lets the same row be zoomed to again after the user panned away
  zoomRequest: { rowNumber: number; nonce: number } | null;
  onPick: (rowNumber: number) => void;
  // Rendered as a panel on the right side of the map (the row list)
  overlay?: ReactNode;
}) {
  const { t, i18n } = useTranslation();
  const mapRef = useRef<MapRef>(null);
  const [mapReady, setMapReady] = useState(false);
  const [activeLayer, setActiveLayer] = useState<BaseLayer>("satellite");
  const activeLayerRef = useRef(activeLayer);
  activeLayerRef.current = activeLayer;
  const hasFittedRef = useRef(false);

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
          visibility: activeLayerRef.current === "satellite" ? "visible" : "none",
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
          visibility: activeLayerRef.current === "pixelkarte" ? "visible" : "none",
        },
      });

      const stripes = createStripePattern();
      if (stripes) map.addImage("conflict-stripes", stripes);

      map.addSource("existing", {
        type: "geojson",
        promoteId: "id",
        data: existingFeatureCollection(existingPlots, overlappedPlotIds),
      });
      map.addLayer({
        id: "existing-fill",
        type: "fill",
        source: "existing",
        paint: { "fill-color": EXISTING_PLOT_COLOR, "fill-opacity": 0.5 },
      });
      map.addLayer({
        id: "existing-line",
        type: "line",
        source: "existing",
        paint: {
          "line-color": ["case", ["get", "overlapped"], "#ca8a04", EXISTING_PLOT_COLOR],
          "line-width": ["case", ["get", "overlapped"], 3, 2],
        },
      });

      map.addSource("import", {
        type: "geojson",
        promoteId: "rowNumber",
        data: importFeatureCollection(rows, focusedRowNumber),
        attribution: attribution.cantons,
      });
      map.addLayer({
        id: "import-fill",
        type: "fill",
        source: "import",
        // Skipped conflicts fall into this layer and are drawn plain grey
        filter: ["!", ["all", ["==", ["get", "status"], "conflict"], ["get", "selected"]]],
        paint: {
          "fill-color": [
            "case",
            ["!", ["get", "selected"]], SKIPPED_ROW_COLOR,
            [
              "match",
              ["get", "status"],
              "new", IMPORT_STATUS_COLORS.new,
              "error", IMPORT_STATUS_COLORS.error,
              IMPORT_STATUS_COLORS.invalid,
            ],
          ],
          "fill-opacity": ["case", ["get", "selected"], 0.55, 0.35],
        },
      });
      map.addLayer({
        id: "import-conflict-fill",
        type: "fill",
        source: "import",
        filter: ["all", ["==", ["get", "status"], "conflict"], ["get", "selected"]],
        paint: { "fill-pattern": "conflict-stripes" },
      });
      map.addLayer({
        id: "import-line",
        type: "line",
        source: "import",
        paint: {
          "line-color": [
            "case",
            ["get", "focused"], "#ffffff",
            ["!", ["get", "selected"]], SKIPPED_ROW_COLOR,
            [
              "match",
              ["get", "status"],
              "new", IMPORT_STATUS_COLORS.new,
              "conflict", IMPORT_STATUS_COLORS.conflict,
              "error", IMPORT_STATUS_COLORS.error,
              IMPORT_STATUS_COLORS.invalid,
            ],
          ],
          "line-width": ["case", ["get", "focused"], 4, ["get", "selected"], 2, 1],
        },
      });
      map.addLayer({
        id: "import-label",
        type: "symbol",
        source: "import",
        layout: { "text-field": ["get", "name"], "text-size": 12 },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "#000000",
          "text-halo-width": 2,
        },
      });

      setMapReady(true);
    },
    // handleLoad only runs once; later data changes are pushed via setData below.
    [rows, existingPlots, overlappedPlotIds, focusedRowNumber],
  );

  // Fit to the import rows once, after the map is ready
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || hasFittedRef.current || rows.length === 0) return;
    const [minX, minY, maxX, maxY] = turf.bbox(importFeatureCollection(rows, null));
    map.fitBounds([[minX, minY], [maxX, maxY]], { padding: 48, duration: 0, maxZoom: 17 });
    hasFittedRef.current = true;
  }, [mapReady, rows]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || !zoomRequest) return;
    const row = rows.find((candidate) => candidate.rowNumber === zoomRequest.rowNumber);
    if (!row) return;
    const [minX, minY, maxX, maxY] = turf.bbox(row.geometry);
    map.fitBounds([[minX, minY], [maxX, maxY]], { padding: 80, duration: 600, maxZoom: 18 });
    // Only react to new requests, not to row edits
  }, [mapReady, zoomRequest]);

  useEffect(() => {
    const source = mapRef.current?.getMap().getSource("import");
    if (source instanceof maplibregl.GeoJSONSource) {
      source.setData(importFeatureCollection(rows, focusedRowNumber));
    }
  }, [mapReady, rows, focusedRowNumber]);

  useEffect(() => {
    const source = mapRef.current?.getMap().getSource("existing");
    if (source instanceof maplibregl.GeoJSONSource) {
      source.setData(existingFeatureCollection(existingPlots, overlappedPlotIds));
    }
  }, [mapReady, existingPlots, overlappedPlotIds]);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!mapReady || !map) return;
    map.setLayoutProperty("satellite-layer", "visibility", activeLayer === "satellite" ? "visible" : "none");
    map.setLayoutProperty("pixelkarte-layer", "visibility", activeLayer === "pixelkarte" ? "visible" : "none");
  }, [mapReady, activeLayer]);

  return (
    <div className="relative h-[calc(100vh-200px)] min-h-[480px] w-full overflow-hidden rounded-lg border">
      <Map
        ref={mapRef}
        initialViewState={{ longitude: 8.23, latitude: 46.8, zoom: 7 }}
        mapStyle={EMPTY_STYLE}
        onLoad={handleLoad}
        attributionControl={false}
        interactiveLayerIds={["import-fill", "import-conflict-fill"]}
        onMouseMove={(event) => {
          const map = mapRef.current?.getMap();
          if (map) map.getCanvas().style.cursor = event.features?.length ? "pointer" : "";
        }}
        onClick={(event) => {
          const rowNumber = event.features?.[0]?.properties?.rowNumber;
          if (typeof rowNumber === "number") onPick(rowNumber);
        }}
        style={{ width: "100%", height: "100%" }}
      >
        <NavigationControl position="top-left" />
        <AttributionControl compact={false} position="bottom-right" />
      </Map>

      <div className="absolute right-2 top-2 z-10">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setActiveLayer((prev) => (prev === "satellite" ? "pixelkarte" : "satellite"))}
        >
          <Layers className="size-4" />
        </Button>
      </div>

      {overlay && (
        <div className="absolute right-2 top-14 bottom-8 z-10 w-72 max-w-[calc(100%-4rem)] max-sm:top-auto max-sm:h-[45%]">
          {overlay}
        </div>
      )}

      <div className="absolute left-2 bottom-8 z-10 rounded-md bg-background/90 p-2 text-xs shadow space-y-1">
        <LegendItem color={IMPORT_STATUS_COLORS.new} label={t("fieldCalendar.plots.import.legend.new")} />
        <LegendItem color={IMPORT_STATUS_COLORS.conflict} striped label={t("fieldCalendar.plots.import.legend.conflict")} />
        <LegendItem color={IMPORT_STATUS_COLORS.error} label={t("fieldCalendar.plots.import.legend.error")} />
        <LegendItem color={SKIPPED_ROW_COLOR} label={t("fieldCalendar.plots.import.legend.skipped")} />
        <LegendItem color={EXISTING_PLOT_COLOR} label={t("fieldCalendar.plots.import.legend.existing")} />
      </div>
    </div>
  );
}

function LegendItem({ color, label, striped = false }: { color: string; label: string; striped?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-block size-3 rounded-sm border"
        style={{
          borderColor: color,
          background: striped
            ? `repeating-linear-gradient(135deg, ${color} 0 2px, transparent 2px 5px)`
            : color,
        }}
      />
      <span>{label}</span>
    </div>
  );
}
