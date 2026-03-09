import { useEffect, useRef, useState } from "react";
import Map, { Marker, NavigationControl } from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import * as turf from "@turf/turf";
import "maplibre-gl/dist/maplibre-gl.css";
import { Pause, Play, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { components } from "@/api/schema";

type FieldEvent =
  components["schemas"]["GetV1FarmFieldEventsPositiveResponse"]["data"]["result"][number];

type ActiveLabel = {
  key: string; // unique per animation instance
  lng: number;
  lat: number;
  plotName: string;
  action: string;
  type: FieldEvent["type"];
};

const EMPTY_MAP_STYLE: maplibregl.StyleSpecification = { version: 8, sources: {}, layers: [] };

// Color per event type — used both for map layer and label badge
const TYPE_COLORS: Record<FieldEvent["type"], string> = {
  harvest: "#4ade80",
  fertilizerApplication: "#60a5fa",
  cropProtectionApplication: "#f97316",
  tillage: "#a78bfa",
};


// Ms between events during playback
const PLAYBACK_INTERVAL_MS = 1800;

// How long a label floats before being removed from state
const LABEL_LIFETIME_MS = 5000;

const EMPTY_GEOJSON: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

export function FieldworkMap({
  events,
  farmLocation,
}: {
  events: FieldEvent[];
  farmLocation: [number, number] | null;
}) {
  const { t } = useTranslation();
  const mapRef = useRef<MapRef>(null);
  const [mapReady, setMapReady] = useState(false);

  // Accumulated features shown on the map
  const [playedFeatures, setPlayedFeatures] = useState<GeoJSON.Feature[]>([]);
  // Labels currently animating
  const [activeLabels, setActiveLabels] = useState<ActiveLabel[]>([]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sorted once
  const sortedEvents = useRef(
    [...events].sort((a, b) => a.date.localeCompare(b.date)),
  );

  // Keep ref for use inside interval closure
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  const playedFeaturesRef = useRef(playedFeatures);
  playedFeaturesRef.current = playedFeatures;

  const mapReadyRef = useRef(mapReady);
  mapReadyRef.current = mapReady;

  function reset() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setIsPlaying(false);
    setCurrentIndex(0);
    setPlayedFeatures([]);
    setActiveLabels([]);
  }

  function stepEvent(index: number) {
    const ev = sortedEvents.current[index];
    if (!ev) return;

    const center = turf.centerOfMass({
      type: "Feature",
      geometry: ev.geometry,
      properties: {},
    });
    const [lng, lat] = center.geometry.coordinates;

    // Fly to the plot center
    mapRef.current?.flyTo({ center: [lng, lat], zoom: 16, duration: 900 });

    // Add polygon feature to the map
    const feature: GeoJSON.Feature = {
      type: "Feature",
      id: `${ev.id}-${index}`,
      properties: { type: ev.type, color: TYPE_COLORS[ev.type] },
      geometry: ev.geometry,
    };
    setPlayedFeatures((prev) => [...prev, feature]);

    // Spawn floating label
    const labelKey = `${ev.id}-${index}-${Date.now()}`;
    setActiveLabels((prev) => [
      ...prev,
      { key: labelKey, lng, lat, plotName: ev.plotName, action: ev.action, type: ev.type },
    ]);
    // Remove label after animation completes
    setTimeout(() => {
      setActiveLabels((prev) => prev.filter((l) => l.key !== labelKey));
    }, LABEL_LIFETIME_MS);
  }

  function play() {
    if (currentIndexRef.current >= sortedEvents.current.length) return;
    setIsPlaying(true);
    intervalRef.current = setInterval(() => {
      const idx = currentIndexRef.current;
      if (idx >= sortedEvents.current.length) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        setIsPlaying(false);
        return;
      }
      stepEvent(idx);
      setCurrentIndex(idx + 1);
    }, PLAYBACK_INTERVAL_MS);
  }

  function pause() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setIsPlaying(false);
  }

  // Stop interval on unmount
  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  // Push accumulated features into MapLibre source
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const source = mapRef.current.getMap().getSource("fieldwork");
    if (source instanceof maplibregl.GeoJSONSource) {
      source.setData({ type: "FeatureCollection", features: playedFeatures });
    }
  }, [mapReady, playedFeatures]);

  const handleMapLoad = (e: maplibregl.MapLibreEvent) => {
    const map = e.target;
    map.addSource("satellite", {
      type: "raster",
      tiles: ["https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg"],
      tileSize: 256,
    });
    map.addLayer({ id: "satellite-layer", type: "raster", source: "satellite" });

    map.addSource("fieldwork", { type: "geojson", data: EMPTY_GEOJSON });
    map.addLayer({
      id: "fieldwork-fill",
      type: "fill",
      source: "fieldwork",
      paint: {
        "fill-color": ["get", "color"],
        "fill-opacity": 0.45,
      },
    });
    map.addLayer({
      id: "fieldwork-line",
      type: "line",
      source: "fieldwork",
      paint: {
        "line-color": ["get", "color"],
        "line-width": 1.5,
        "line-opacity": 0.8,
      },
    });
    setMapReady(true);
  };

  // Initial center on farm
  useEffect(() => {
    if (!mapReady || !farmLocation || !mapRef.current) return;
    mapRef.current.flyTo({ center: farmLocation, zoom: 14, duration: 800 });
  }, [mapReady, farmLocation]);

  const done = currentIndex >= sortedEvents.current.length && sortedEvents.current.length > 0;
  const progress = sortedEvents.current.length > 0
    ? Math.round((currentIndex / sortedEvents.current.length) * 100)
    : 0;

  return (
    <>
      {/* Inject keyframe animation for floating labels */}
      <style>{`
        @keyframes fieldworkLabelFloat {
          0%   { opacity: 0; transform: translateY(0px) scale(0.7); }
          12%  { opacity: 1; transform: translateY(-12px) scale(1.1); }
          30%  { opacity: 1; transform: translateY(-24px) scale(1); }
          100% { opacity: 0; transform: translateY(-90px) scale(0.75); }
        }
        .fieldwork-label {
          animation: fieldworkLabelFloat ${LABEL_LIFETIME_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
          pointer-events: none;
          white-space: nowrap;
        }
      `}</style>

      <div className="bg-white rounded-xl border overflow-hidden" style={{ height: 480 }}>
        <Map
          ref={mapRef}
          initialViewState={{ longitude: 8.2, latitude: 46.8, zoom: 8 }}
          mapStyle={EMPTY_MAP_STYLE}
          onLoad={handleMapLoad}
          style={{ width: "100%", height: "100%" }}
        >
          <NavigationControl position="top-left" />

          {/* Floating event labels */}
          {activeLabels.map((label) => (
            <Marker key={label.key} longitude={label.lng} latitude={label.lat} anchor="bottom">
              <div className="fieldwork-label">
                <div
                  className="rounded-lg px-2.5 py-1 text-xs font-semibold shadow-lg text-white flex flex-col items-center gap-0.5"
                  style={{ backgroundColor: TYPE_COLORS[label.type] }}
                >
                  <span>{label.plotName}</span>
                  <span className="opacity-80 font-normal">{label.action}</span>
                </div>
                {/* Small triangle pointer */}
                <div
                  className="w-0 h-0 mx-auto"
                  style={{
                    borderLeft: "5px solid transparent",
                    borderRight: "5px solid transparent",
                    borderTop: `6px solid ${TYPE_COLORS[label.type]}`,
                  }}
                />
              </div>
            </Marker>
          ))}
        </Map>

        {/* Legend — bottom left, above controls */}
        <div className="absolute bottom-14 left-3 z-10 flex flex-col gap-1">
          {(Object.entries(TYPE_COLORS) as [FieldEvent["type"], string][]).map(([type, color]) => (
            <span key={type} className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
              <span className="text-white text-xs drop-shadow">
                {t(`nav.${type}s`, { defaultValue: type })}
              </span>
            </span>
          ))}
        </div>

        {/* Controls overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center gap-3 bg-gradient-to-t from-black/50 to-transparent">
          {done ? (
            <Button size="icon" variant="secondary" onClick={reset}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          ) : isPlaying ? (
            <Button size="icon" variant="secondary" onClick={pause}>
              <Pause className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="icon" variant="secondary" onClick={play}>
              <Play className="h-4 w-4" />
            </Button>
          )}

          {/* Progress bar */}
          <div className="flex-1 h-1.5 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-white text-xs tabular-nums">
            {currentIndex}/{sortedEvents.current.length}
          </span>

        </div>
      </div>
    </>
  );
}
