import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Layers } from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import Map, { Layer, Marker, NavigationControl, Source } from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { farmQueryOptions } from "@/api/farm.queries";
import { plotsQueryOptions } from "@/api/plots.queries";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";

// Stable reference — changing mapStyle triggers map.setStyle() and wipes all layers.
const EMPTY_MAP_STYLE: maplibregl.StyleSpecification = { version: 8, sources: {}, layers: [] };

const searchSchema = z.object({
  lat: z.number().optional(),
  lng: z.number().optional(),
  zoom: z.number().optional(),
});

export const Route = createFileRoute("/_authed/field-calendar/plots")({
  validateSearch: searchSchema,
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(plotsQueryOptions());
    queryClient.ensureQueryData(farmQueryOptions());
  },
  component: PlotsMap,
});

type LatLngLiteral = { lat: number; lng: number };
type BaseLayer = "satellite" | "pixelkarte";

function computeCentroid(coordinates: number[][][][]): LatLngLiteral {
  let sumLat = 0;
  let sumLng = 0;
  let count = 0;
  for (const polygon of coordinates) {
    for (const ring of polygon) {
      for (const [lng, lat] of ring) {
        sumLng += lng;
        sumLat += lat;
        count++;
      }
    }
  }
  if (count === 0) return { lat: 46.8, lng: 8.2 };
  return { lat: sumLat / count, lng: sumLng / count };
}

function PlotsMap() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { lat, lng, zoom } = Route.useSearch();
  const [selectedPlotId, setSelectedPlotId] = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState<BaseLayer>("satellite");
  const mapRef = useRef<MapRef>(null);
  // mapReady gates imperative source/layer operations and the farm centering
  const [mapReady, setMapReady] = useState(false);
  // Ensure we only jump to farm location once (not on every re-render after farm loads)
  const hasCentered = useRef(false);

  const farmQuery = useQuery(farmQueryOptions());
  const plotsQuery = useQuery(plotsQueryOptions());
  const farm = farmQuery.data;
  const plots = plotsQuery.data?.result ?? [];

  const geojson = useMemo<GeoJSON.FeatureCollection>(() => ({
    type: "FeatureCollection",
    features: plots.map((plot) => ({
      type: "Feature",
      id: plot.id,
      properties: { id: plot.id, selected: plot.id === selectedPlotId },
      geometry: plot.geometry,
    })),
  }), [plots, selectedPlotId]);

  // Add plots source + layers imperatively once the map style has loaded.
  // The declarative <Source>/<Layer> approach fails when query data is already
  // cached: plots are populated before the map style is ready, so the source
  // gets registered against an unloaded style and MapLibre silently ignores it.
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
        "fill-color": ["case", ["==", ["get", "selected"], true], "#f97316", "#22c55e"],
        "fill-opacity": 0.35,
      },
    });
    map.addLayer({
      id: "plots-line",
      type: "line",
      source: "plots",
      paint: {
        "line-color": ["case", ["==", ["get", "selected"], true], "#ea580c", "#16a34a"],
        "line-width": 2,
      },
    });
  };

  // Jump to farm location at zoom 17 once the map is ready and farm data has loaded,
  // but only if the URL doesn't already have a saved viewport (i.e. user came back via back button).
  useEffect(() => {
    if (!mapReady || !mapRef.current || !farm || hasCentered.current || lng !== undefined) return;
    mapRef.current.jumpTo({
      center: [farm.location.coordinates[0], farm.location.coordinates[1]],
      zoom: 17,
    });
    hasCentered.current = true;
  }, [mapReady, farm, lng]);

  // Push updated geojson into the source whenever plots or selected plot changes
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const source = mapRef.current.getMap().getSource("plots");
    if (source instanceof maplibregl.GeoJSONSource) {
      source.setData(geojson);
    }
  }, [mapReady, geojson]);

  return (
    <PageContent title={t("fieldCalendar.plots.title")} showBackButton={false}>
      <div
        className="rounded-md border overflow-hidden relative"
        style={{ height: "calc(100vh - 200px)" }}
      >
        <Map
          ref={mapRef}
          // If search params have a saved viewport (from a previous visit / back navigation),
          // restore it. Otherwise start at Switzerland overview — farm jumpTo fires after load.
          initialViewState={{
            longitude: lng ?? 8.2,
            latitude: lat ?? 46.8,
            zoom: zoom ?? 8,
          }}
          mapStyle={EMPTY_MAP_STYLE}
          onLoad={handleMapLoad}
          onMoveEnd={(e) => {
            // Write current viewport to search params (replace: true keeps one history entry)
            // so that pressing back from plot details restores the exact viewport.
            navigate({
              search: {
                lat: e.viewState.latitude,
                lng: e.viewState.longitude,
                zoom: e.viewState.zoom,
              },
              replace: true,
            });
          }}
          onClick={(e) => {
            const features = e.features ?? [];
            const hit = features.find((f) => f.layer?.id === "plots-fill");
            if (hit) {
              const plotId = hit.properties?.id as string;
              setSelectedPlotId(plotId);
              navigate({ to: "/field-calendar/plots/$plotId", params: { plotId } });
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

          {plots.map((plot) => {
            const centroid = computeCentroid(plot.geometry.coordinates);
            return (
              <Marker key={plot.id} longitude={centroid.lng} latitude={centroid.lat} anchor="center">
                <div className="bg-white/80 rounded px-1 text-xs font-medium shadow border border-green-600 pointer-events-none">
                  {plot.name}
                </div>
              </Marker>
            );
          })}

          <NavigationControl position="top-left" />
        </Map>

        <div className="absolute top-2 right-2 z-10">
          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              setActiveLayer((prev) => prev === "satellite" ? "pixelkarte" : "satellite")
            }
            title={activeLayer === "satellite" ? "Switch to map" : "Switch to satellite"}
          >
            <Layers className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </PageContent>
  );
}
