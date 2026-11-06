import * as turf from "@turf/turf";
import type { Plot } from "@/api/types";

/** The part of a plot covered by a drawn polygon, replacing the plot's geometry and size. */
export type DrawnArea = {
  geometry: { type: "MultiPolygon"; coordinates: number[][][][] };
  // m²
  size: number;
  // the drawn outline this area was cut from, kept so the drawing can be edited
  drawnRing: [number, number][];
};

/** Stable empty default, so effects depending on drawn areas don't rerun every render. */
export const NO_DRAWN_AREAS: Record<string, DrawnArea> = {};

// A drawing covering at least this share of a plot counts as the whole plot,
// so a slightly too large drawing doesn't leave a separate partial area behind
const WHOLE_PLOT_SHARE = 0.995;

/**
 * Intersects a drawn polygon with every plot. Returns the touched plots with the
 * covered part as their area; a fully covered plot gets its own geometry and size.
 * Slivers that round to 0 m² are left out.
 */
export function intersectDrawing(
  plots: Plot[],
  drawnRing: [number, number][],
): { plotId: string; area: DrawnArea }[] {
  if (drawnRing.length < 3) return [];
  const drawnPolygon = turf.polygon([[...drawnRing, drawnRing[0]]]);
  const touched: { plotId: string; area: DrawnArea }[] = [];
  for (const plot of plots) {
    const plotFeature = turf.multiPolygon(plot.geometry.coordinates);
    let intersection: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> | null;
    try {
      intersection = turf.intersect(
        turf.featureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon>([plotFeature, drawnPolygon]),
      );
    } catch {
      // a self-crossing drawing can't be intersected, it selects nothing
      return [];
    }
    if (!intersection) continue;
    const size = Math.round(turf.area(intersection));
    if (size === 0) continue;
    // fully covered plots keep the drawing too, so editing it can deselect them again
    if (size >= turf.area(plotFeature) * WHOLE_PLOT_SHARE) {
      touched.push({ plotId: plot.id, area: { geometry: plot.geometry, size: plot.size, drawnRing } });
      continue;
    }
    const coordinates =
      intersection.geometry.type === "Polygon"
        ? [intersection.geometry.coordinates]
        : intersection.geometry.coordinates;
    touched.push({
      plotId: plot.id,
      area: { geometry: { type: "MultiPolygon", coordinates }, size, drawnRing },
    });
  }
  return touched;
}

function sameRing(first: [number, number][], second: [number, number][]): boolean {
  return (
    first.length === second.length &&
    first.every(([lng, lat], index) => lng === second[index][0] && lat === second[index][1])
  );
}

/**
 * Applies a new or edited drawing to a selection. Every plot the drawing touches is
 * selected with the covered part as its area. When an existing drawing
 * (`editedRing`) was changed, plots it no longer touches lose their area and are
 * deselected again.
 */
export function applyDrawing({
  plots,
  plotIds,
  drawnAreas,
  drawnRing,
  editedRing,
}: {
  plots: Plot[];
  plotIds: string[];
  drawnAreas: Record<string, DrawnArea>;
  drawnRing: [number, number][];
  editedRing: [number, number][] | null;
}): { plotIds: string[]; drawnAreas: Record<string, DrawnArea> } {
  const touched = intersectDrawing(plots, drawnRing);
  const touchedIds = new Set(touched.map((entry) => entry.plotId));
  const nextAreas = { ...drawnAreas };
  let nextPlotIds = [...plotIds];
  if (editedRing) {
    for (const [plotId, area] of Object.entries(drawnAreas)) {
      if (sameRing(area.drawnRing, editedRing) && !touchedIds.has(plotId)) {
        delete nextAreas[plotId];
        nextPlotIds = nextPlotIds.filter((selectedId) => selectedId !== plotId);
      }
    }
  }
  for (const { plotId, area } of touched) {
    // a new drawing over a plot replaces its previous drawn area
    nextAreas[plotId] = area;
  }
  return { plotIds: [...new Set([...nextPlotIds, ...touchedIds])], drawnAreas: nextAreas };
}

/** The plot with its drawn area (if any) in place of its full geometry and size. */
export function withDrawnArea(plot: Plot, drawnAreas: Record<string, DrawnArea>): Plot {
  const drawnArea = drawnAreas[plot.id];
  return drawnArea ? { ...plot, geometry: drawnArea.geometry, size: drawnArea.size } : plot;
}

/** Selected plots with drawn areas in place of their full geometry and size. */
export function applyDrawnAreas(plots: Plot[], drawnAreas: Record<string, DrawnArea>): Plot[] {
  return plots.map((plot) => withDrawnArea(plot, drawnAreas));
}
