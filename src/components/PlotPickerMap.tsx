import { useCallback, useEffect, useRef, useState } from "react";
import Map, {
  Marker,
  NavigationControl,
  type MapRef,
} from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import * as turf from "@turf/turf";
import "maplibre-gl/dist/maplibre-gl.css";
import { Home, Layers } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { farmQueryOptions } from "@/api/farm.queries";
import { Button } from "@/components/ui/button";
import { PlotColorModeToggle } from "@/components/PlotColorModeToggle";
import { resolvePlotColor, type PlotColorMode } from "@/lib/plotColor";
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

function toFeatureCollection(
  plots: Plot[],
  selectedIds: string[],
  colorMode: PlotColorMode,
): GeoJSON.FeatureCollection {
  const selected = new Set(selectedIds);
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

/**
 * A read-only map of all plots — the same swisstopo base map and controls as the
 * plots overview. Clicking a plot polygon calls `onPick` with its id (the caller
 * decides whether that means "select" or "toggle").
 */
export function PlotPickerMap({
  plots,
  selectedIds,
  onPick,
}: {
  plots: Plot[];
  selectedIds: string[];
  onPick: (plotId: string) => void;
}) {
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

  const farm = useQuery(farmQueryOptions()).data;

  const handleLoad = useCallback(
    (event: maplibregl.MapLibreEvent) => {
      const map = event.target;

      map.addSource("satellite", {
        type: "raster",
        tiles: [SWISS_SATELLITE],
        tileSize: 256,
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
      });
      map.addLayer({
        id: "pixelkarte-layer",
        type: "raster",
        source: "pixelkarte",
        layout: {
          visibility: activeLayerRef.current === "pixelkarte" ? "visible" : "none",
        },
      });

      map.addSource("plots", {
        type: "geojson",
        promoteId: "id",
        data: toFeatureCollection(plots, selectedIds, colorModeRef.current),
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
      map.fitBounds([[minX, minY], [maxX, maxY]], {
        padding: 48,
        duration: 0,
        maxZoom: 17,
      });
    }
  }, [mapReady, farm, plots]);

  // Keep the "selected" highlight and colours in sync.
  useEffect(() => {
    const source = mapRef.current?.getMap().getSource("plots");
    if (source instanceof maplibregl.GeoJSONSource) {
      source.setData(toFeatureCollection(plots, selectedIds, colorMode));
    }
  }, [plots, selectedKey, colorMode]);

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

  function setHover(plotId: string | null) {
    const map = mapRef.current?.getMap();
    if (!map) return;
    if (hoveredIdRef.current) {
      map.setFeatureState({ source: "plots", id: hoveredIdRef.current }, { hover: false });
    }
    hoveredIdRef.current = plotId;
    if (plotId) {
      map.setFeatureState({ source: "plots", id: plotId }, { hover: true });
    }
    map.getCanvas().style.cursor = plotId ? "pointer" : "";
  }

  return (
    <div className="relative h-[75vh] w-full overflow-hidden rounded-lg border">
      <Map
        ref={mapRef}
        initialViewState={{ longitude: 8.23, latitude: 46.8, zoom: 7 }}
        mapStyle={EMPTY_STYLE}
        onLoad={handleLoad}
        interactiveLayerIds={["plots-fill"]}
        onMouseMove={(event) =>
          setHover(
            event.features?.[0]?.properties?.id
              ? String(event.features[0].properties.id)
              : null,
          )
        }
        onMouseLeave={() => setHover(null)}
        onClick={(event) => {
          const feature = event.features?.[0];
          if (feature?.properties?.id) onPick(String(feature.properties.id));
        }}
        style={{ width: "100%", height: "100%" }}
      >
        <NavigationControl position="top-left" />
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
            setActiveLayer((prev) => (prev === "satellite" ? "pixelkarte" : "satellite"))
          }
        >
          <Layers className="size-4" />
        </Button>
        <PlotColorModeToggle value={colorMode} onChange={setColorMode} />
      </div>
    </div>
  );
}
