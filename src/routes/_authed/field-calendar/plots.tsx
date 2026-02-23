import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  APIProvider,
  AdvancedMarker,
  Map,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { plotsQueryOptions } from "@/api/plots.queries";
import type { Plot } from "@/api/types";
import { PageContent } from "@/components/PageContent";

export const Route = createFileRoute("/_authed/field-calendar/plots")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(plotsQueryOptions());
  },
  component: PlotsMap,
});

type LatLngLiteral = { lat: number; lng: number };

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

function multiPolygonToPaths(coordinates: number[][][][]): LatLngLiteral[][] {
  return coordinates.map((polygon) =>
    polygon[0].map(([lng, lat]) => ({ lat, lng })),
  );
}

type PlotPolygonsProps = {
  plot: Plot;
  isSelected: boolean;
  onClick: () => void;
};

function PlotPolygons({ plot, isSelected, onClick }: PlotPolygonsProps) {
  const map = useMap();
  // useMapsLibrary returns the typed maps library once loaded
  const mapsLib = useMapsLibrary("maps");
  const polygonsRef = useRef<{ setMap: (m: unknown) => void }[]>([]);

  useEffect(() => {
    if (!map || !mapsLib) return;

    polygonsRef.current.forEach((p) => p.setMap(null));
    polygonsRef.current = [];

    const paths = multiPolygonToPaths(plot.geometry.coordinates);
    paths.forEach((path) => {
      const polygon = new mapsLib.Polygon({
        paths: path,
        fillColor: isSelected ? "#f97316" : "#22c55e",
        fillOpacity: 0.35,
        strokeColor: isSelected ? "#ea580c" : "#16a34a",
        strokeWeight: 2,
        map,
        clickable: true,
      });
      polygon.addListener("click", onClick);
      polygonsRef.current.push(polygon);
    });

    return () => {
      polygonsRef.current.forEach((p) => p.setMap(null));
      polygonsRef.current = [];
    };
  }, [map, mapsLib, plot, isSelected, onClick]);

  return null;
}

function PlotsMapInner() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedPlotId, setSelectedPlotId] = useState<string | null>(null);
  const plotsQuery = useQuery(plotsQueryOptions());
  const plots = plotsQuery.data?.result ?? [];

  const center =
    plots.length > 0
      ? computeCentroid(plots.flatMap((p) => p.geometry.coordinates))
      : { lat: 46.8, lng: 8.2 };

  return (
    <PageContent title={t("fieldCalendar.plots.title")} showBackButton={false}>
      <div
        className="rounded-md border overflow-hidden"
        style={{ height: "calc(100vh - 200px)" }}
      >
        <Map
          defaultCenter={center}
          defaultZoom={13}
          mapId="plots-map"
          gestureHandling="greedy"
        >
          {plots.map((plot) => {
            const centroid = computeCentroid(plot.geometry.coordinates);
            return (
              <div key={plot.id}>
                <PlotPolygons
                  plot={plot}
                  isSelected={selectedPlotId === plot.id}
                  onClick={() => {
                    setSelectedPlotId(plot.id);
                    navigate({
                      to: "/field-calendar/plots/$plotId",
                      params: { plotId: plot.id },
                    });
                  }}
                />
                <AdvancedMarker position={centroid}>
                  <div className="bg-white/80 rounded px-1 text-xs font-medium shadow border border-green-600 pointer-events-none">
                    {plot.name}
                  </div>
                </AdvancedMarker>
              </div>
            );
          })}
        </Map>
      </div>
    </PageContent>
  );
}

function PlotsMap() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;
  return (
    <APIProvider apiKey={apiKey ?? ""}>
      <PlotsMapInner />
    </APIProvider>
  );
}
