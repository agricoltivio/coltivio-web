import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import * as turf from "@turf/turf";
import Fuse from "fuse.js";
import { Home, Layers, List, X } from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import Map, { Layer, Marker, NavigationControl, Source } from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import { useTranslation } from "react-i18next";
import { farmQueryOptions } from "@/api/farm.queries";
import { plotsQueryOptions } from "@/api/plots.queries";
import type { Plot } from "@/api/types";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

// Stable reference — changing mapStyle triggers map.setStyle() and wipes all layers.
const EMPTY_MAP_STYLE: maplibregl.StyleSpecification = { version: 8, sources: {}, layers: [] };

// sessionStorage key for persisting the map viewport across back-navigation.
const VIEWPORT_STORAGE_KEY = "plots-map-viewport";

type SavedViewport = { lng: number; lat: number; zoom: number };

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
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 33) ^ id.charCodeAt(i);
  }
  // Golden angle in degrees ≈ 137.508
  const hue = Math.abs(hash % 360) * 137.508;
  // Convert HSL(hue, 70%, 45%) to hex
  const h = hue / 360;
  const s = 0.7;
  const l = 0.45;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
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
  const [selectedPlotId, setSelectedPlotId] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // Read once on mount — sessionStorage has the last viewport if user came back via back button.
  const savedViewport = useMemo(() => readSavedViewport(), []);

  const farmQuery = useQuery(farmQueryOptions());
  const plotsQuery = useQuery(plotsQueryOptions());
  const farm = farmQuery.data;
  const plots = plotsQuery.data?.result ?? [];

  const selectedPlot = useMemo(
    () => (selectedPlotId ? plots.find((p) => p.id === selectedPlotId) ?? null : null),
    [selectedPlotId, plots],
  );

  // Build GeoJSON with color + selected properties for data-driven styling.
  // Recomputes when plots or selectedPlotId changes so the selected property stays current.
  const geojson = useMemo<GeoJSON.FeatureCollection>(() => ({
    type: "FeatureCollection",
    features: plots.map((plot) => ({
      type: "Feature",
      id: plot.id,
      properties: {
        id: plot.id,
        name: plot.name,
        color: plotIdToColor(plot.id),
        selected: plot.id === selectedPlotId ? 1 : 0,
      },
      geometry: plot.geometry,
    })),
  }), [plots, selectedPlotId]);

  // Fly to a plot's center of mass when selected.
  useEffect(() => {
    if (!selectedPlotId || !mapRef.current) return;
    const plot = plots.find((p) => p.id === selectedPlotId);
    if (!plot) return;
    const center = turf.centerOfMass({
      type: "Feature",
      geometry: plot.geometry,
      properties: {},
    });
    const [lng, lat] = center.geometry.coordinates;
    mapRef.current.flyTo({ center: [lng, lat], duration: 800 });
  }, [selectedPlotId, plots]);

  // Add plots source + layers imperatively once the map style has loaded.
  const handleMapLoad = () => {
    if (!mapRef.current) return;
    setMapReady(true);
    const map = mapRef.current.getMap();
    map.addSource("plots", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
    map.addLayer({
      id: "plots-fill",
      type: "fill",
      source: "plots",
      paint: {
        "fill-color": ["case", ["==", ["get", "selected"], 1], "#4ade80", ["get", "color"]],
        "fill-opacity": 0.5,
      },
    });
    map.addLayer({
      id: "plots-line",
      type: "line",
      source: "plots",
      paint: {
        "line-color": ["case", ["==", ["get", "selected"], 1], "#facc15", "#ffffff"],
        "line-width": ["case", ["==", ["get", "selected"], 1], 3, 1],
      },
    });
    map.addLayer({
      id: "plots-label",
      type: "symbol",
      source: "plots",
      layout: {
        "text-field": ["get", "name"],
        "text-size": 13,
      },
      paint: {
        "text-color": "#ffffff",
        "text-halo-color": "#000000",
        "text-halo-width": 2,
        // Fade in only at zoom >= 14 to avoid clutter at low zoom levels
        "text-opacity": ["step", ["zoom"], 0, 14, 1],
      },
    });
  };

  // Jump to farm location at zoom 17 once ready — skipped if a saved viewport exists.
  useEffect(() => {
    if (!mapReady || !mapRef.current || !farm || hasCentered.current || savedViewport) return;
    mapRef.current.jumpTo({
      center: [farm.location.coordinates[0], farm.location.coordinates[1]],
      zoom: 17,
    });
    hasCentered.current = true;
  }, [mapReady, farm, savedViewport]);

  // Push updated geojson into the source whenever plots or selection changes.
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const source = mapRef.current.getMap().getSource("plots");
    if (source instanceof maplibregl.GeoJSONSource) {
      source.setData(geojson);
    }
  }, [mapReady, geojson]);

  const fuse = useMemo(
    () => new Fuse(plots, { keys: ["name", "localId"], threshold: 0.4 }),
    [plots],
  );

  const filteredPlots = useMemo<Plot[]>(() => {
    if (!searchQuery.trim()) return plots;
    return fuse.search(searchQuery).map((r) => r.item);
  }, [fuse, searchQuery, plots]);

  function selectPlotAndFly(plotId: string) {
    setSelectedPlotId(plotId);
    setListOpen(false);
  }

  return (
    <PageContent title={t("fieldCalendar.plots.title")} showBackButton={false}>
      <div
        className="rounded-md border overflow-hidden relative"
        style={{ height: "calc(100vh - 200px)" }}
      >
        <Map
          ref={mapRef}
          initialViewState={{
            longitude: savedViewport?.lng ?? 8.2,
            latitude: savedViewport?.lat ?? 46.8,
            zoom: savedViewport?.zoom ?? 8,
          }}
          mapStyle={EMPTY_MAP_STYLE}
          onLoad={handleMapLoad}
          onMoveEnd={(e) => {
            sessionStorage.setItem(
              VIEWPORT_STORAGE_KEY,
              JSON.stringify({
                lng: e.viewState.longitude,
                lat: e.viewState.latitude,
                zoom: e.viewState.zoom,
              }),
            );
          }}
          onClick={(e) => {
            const features = e.features ?? [];
            const hit = features.find((f) => f.layer?.id === "plots-fill");
            if (hit) {
              const plotId = hit.properties?.id as string;
              // Toggle selection: clicking the same plot deselects it
              setSelectedPlotId((prev) => (prev === plotId ? null : plotId));
            } else {
              // Click on empty area deselects
              setSelectedPlotId(null);
            }
          }}
          interactiveLayerIds={["plots-fill"]}
          style={{ width: "100%", height: "100%" }}
        >
          {/* Tile layers — always mounted, visibility toggled via layout prop */}
          <Source
            id="satellite"
            type="raster"
            tiles={["https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg"]}
            tileSize={256}
          >
            <Layer
              id="satellite-layer"
              type="raster"
              layout={{ visibility: activeLayer === "satellite" ? "visible" : "none" }}
            />
          </Source>
          <Source
            id="pixelkarte"
            type="raster"
            tiles={["https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg"]}
            tileSize={256}
          >
            <Layer
              id="pixelkarte-layer"
              type="raster"
              layout={{ visibility: activeLayer === "pixelkarte" ? "visible" : "none" }}
            />
          </Source>

          {farm && (
            <Marker
              longitude={farm.location.coordinates[0]}
              latitude={farm.location.coordinates[1]}
              anchor="center"
            >
              <div className="bg-white rounded-full p-1.5 shadow-md border border-gray-300 pointer-events-none">
                <Home className="h-4 w-4 text-gray-700" />
              </div>
            </Marker>
          )}

          <NavigationControl position="top-left" />
        </Map>

        {/* Layer toggle button */}
        <div className="absolute top-2 right-2 z-10">
          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              setActiveLayer((prev) => (prev === "satellite" ? "pixelkarte" : "satellite"))
            }
            title={activeLayer === "satellite" ? "Switch to map" : "Switch to satellite"}
          >
            <Layers className="h-4 w-4" />
          </Button>
        </div>

        {/* Plot list button — bottom-left */}
        <div className="absolute bottom-6 left-2 z-10">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setListOpen(true)}
            title="Plot list"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>

        {/* Right-side detail panel — slides in when a plot is selected */}
        <div
          className={`absolute top-0 right-0 h-full w-72 bg-background/95 backdrop-blur-sm border-l shadow-lg z-10 transition-transform duration-300 flex flex-col ${selectedPlot ? "translate-x-0" : "translate-x-full"}`}
        >
          {selectedPlot && (
            <PlotDetailPanel
              plot={selectedPlot}
              onClose={() => setSelectedPlotId(null)}
            />
          )}
        </div>
      </div>

      {/* Searchable plot list sheet */}
      <Sheet open={listOpen} onOpenChange={setListOpen}>
        <SheetContent side="left" className="w-80 flex flex-col gap-0 p-0">
          <SheetHeader className="p-4 pb-2">
            <SheetTitle>{t("fieldCalendar.plots.title")}</SheetTitle>
            <Input
              placeholder={t("common.search")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mt-2"
              autoFocus
            />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1">
            {filteredPlots.map((plot) => (
              <button
                key={plot.id}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-accent transition-colors"
                onClick={() => selectPlotAndFly(plot.id)}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: plotIdToColor(plot.id) }}
                  />
                  <span className="font-medium text-sm truncate">{plot.name}</span>
                </div>
                <div className="text-xs text-muted-foreground ml-5">
                  {(plot.size / 100).toFixed(2)} Xa
                  {plot.currentCropRotation && ` · ${plot.currentCropRotation.crop.name}`}
                </div>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </PageContent>
  );
}

function PlotDetailPanel({ plot, onClose }: { plot: Plot; onClose: () => void }) {
  const { t } = useTranslation();

  const navLinks = [
    { label: t("fieldCalendar.cropRotations.title"), to: "/field-calendar/crop-rotations" as const },
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
            <div>{(plot.size / 100).toFixed(2)} Xa</div>
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

        <div className="border-t pt-3 space-y-1">
          {navLinks.map(({ label, to }) => (
            <Link
              key={to}
              to={to}
              search={{ plotId: plot.id }}
              className="block px-2 py-1.5 rounded hover:bg-accent text-sm transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>

        <Link
          to="/field-calendar/plots/$plotId"
          params={{ plotId: plot.id }}
          className="block w-full"
        >
          <Button className="w-full" size="sm">
            {t("fieldCalendar.plots.viewDetails")}
          </Button>
        </Link>
      </div>
    </>
  );
}
