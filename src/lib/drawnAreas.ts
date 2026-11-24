import * as turf from "@turf/turf";
import type { Plot } from "@/api/types";

type Ring = [number, number][];

/** The part of a plot covered by drawn polygons, replacing the plot's geometry and size. */
export type DrawnArea = {
  geometry: { type: "MultiPolygon"; coordinates: number[][][][] };
  // m²
  size: number;
  // the drawn outlines this area was cut from (merged), kept so each drawing can be edited
  drawnRings: Ring[];
};

/** Stable empty default, so effects depending on drawn areas don't rerun every render. */
export const NO_DRAWN_AREAS: Record<string, DrawnArea> = {};

// A drawing covering at least this share of a plot counts as the whole plot,
// so a slightly too large drawing doesn't leave a separate partial area behind
const WHOLE_PLOT_SHARE = 0.995;
// A drawing covering less than this share of a plot leaves it out: a drawing traced along a
// shared boundary always overlaps the neighbours by a few m²
const MIN_PLOT_SHARE = 0.01;

/** A drawing whose outline crosses itself has no well-defined area and is rejected. */
export function isSelfCrossing(drawnRing: Ring): boolean {
  if (drawnRing.length < 3) return false;
  return (
    turf.kinks(turf.polygon([[...drawnRing, drawnRing[0]]])).features.length > 0
  );
}

/**
 * The part of a plot covered by the drawings together (overlapping drawings count once).
 * A fully covered plot gets its own geometry and size; null when the drawings cover nothing
 * or only a sliver of it.
 */
function coveredPart(plot: Plot, drawnRings: Ring[]): DrawnArea | null {
  const plotFeature = turf.multiPolygon(plot.geometry.coordinates);
  const parts: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>[] = [];
  for (const drawnRing of drawnRings) {
    if (drawnRing.length < 3) continue;
    try {
      const part = turf.intersect(
        turf.featureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon>([
          plotFeature,
          turf.polygon([[...drawnRing, drawnRing[0]]]),
        ]),
      );
      if (part) parts.push(part);
    } catch {
      // a broken plot geometry only leaves out this plot, not the whole selection
      return null;
    }
  }
  if (parts.length === 0) return null;
  let merged: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> | null =
    parts[0];
  if (parts.length > 1) {
    try {
      merged = turf.union(turf.featureCollection(parts));
    } catch {
      return null;
    }
  }
  if (!merged) return null;
  const plotArea = turf.area(plotFeature);
  const size = Math.round(turf.area(merged));
  if (size === 0 || size < plotArea * MIN_PLOT_SHARE) return null;
  // fully covered plots keep the drawings too, so editing them can deselect the plot again
  if (size >= plotArea * WHOLE_PLOT_SHARE) {
    return { geometry: plot.geometry, size: plot.size, drawnRings };
  }
  const coordinates =
    merged.geometry.type === "Polygon"
      ? [merged.geometry.coordinates]
      : merged.geometry.coordinates;
  return { geometry: { type: "MultiPolygon", coordinates }, size, drawnRings };
}

/**
 * Intersects a drawn polygon with every plot. Returns the touched plots with the covered
 * part as their area. A self-crossing drawing touches nothing.
 */
export function intersectDrawing(
  plots: Plot[],
  drawnRing: Ring,
): { plotId: string; area: DrawnArea }[] {
  if (drawnRing.length < 3 || isSelfCrossing(drawnRing)) return [];
  return plots.flatMap((plot) => {
    const area = coveredPart(plot, [drawnRing]);
    return area ? [{ plotId: plot.id, area }] : [];
  });
}

function sameRing(first: Ring, second: Ring): boolean {
  return (
    first.length === second.length &&
    first.every(
      ([lng, lat], index) =>
        lng === second[index][0] && lat === second[index][1],
    )
  );
}

/**
 * Applies a new or edited drawing to a selection. Every plot the drawing touches is
 * selected with the covered part as its area; a second drawing on a plot adds to its
 * area. Plots already selected as a whole stay whole. When an existing drawing
 * (`editedRing`) was changed, it is replaced in every plot it covered, and plots
 * that no drawing covers any more are deselected again.
 * `applied` is false when a new drawing touches no plot (or crosses itself), so the
 * caller can tell the user instead of closing the drawing silently.
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
  drawnRing: Ring;
  editedRing: Ring | null;
}): {
  plotIds: string[];
  drawnAreas: Record<string, DrawnArea>;
  applied: boolean;
} {
  if (drawnRing.length < 3 || isSelfCrossing(drawnRing)) {
    return { plotIds, drawnAreas, applied: false };
  }
  const selectedAsWhole = new Set(
    plotIds.filter((plotId) => !drawnAreas[plotId]),
  );
  const nextAreas = { ...drawnAreas };
  let nextPlotIds = [...plotIds];
  let touchesAnyPlot = false;
  for (const plot of plots) {
    const touchesPlot = coveredPart(plot, [drawnRing]) !== null;
    if (touchesPlot) touchesAnyPlot = true;
    if (selectedAsWhole.has(plot.id)) continue;

    const existingRings = drawnAreas[plot.id]?.drawnRings ?? [];
    const otherRings = editedRing
      ? existingRings.filter(
          (existingRing) => !sameRing(existingRing, editedRing),
        )
      : existingRings;
    const coveredByEditedRing = otherRings.length !== existingRings.length;
    if (!touchesPlot && !coveredByEditedRing) continue;

    const rings = touchesPlot ? [...otherRings, drawnRing] : otherRings;
    const area = coveredPart(plot, rings);
    if (area) {
      nextAreas[plot.id] = area;
      if (!nextPlotIds.includes(plot.id)) nextPlotIds.push(plot.id);
    } else {
      delete nextAreas[plot.id];
      nextPlotIds = nextPlotIds.filter((selectedId) => selectedId !== plot.id);
    }
  }
  // editing a drawing away from every plot is a valid change (it removes the drawing)
  return {
    plotIds: nextPlotIds,
    drawnAreas: nextAreas,
    applied: touchesAnyPlot || editedRing !== null,
  };
}

/** The drawing of a plot's drawn area that contains the point, else its first drawing. */
export function drawnRingAt(
  drawnArea: DrawnArea,
  lngLat: [number, number],
): Ring {
  const containing = drawnArea.drawnRings.find((drawnRing) =>
    turf.booleanPointInPolygon(
      lngLat,
      turf.polygon([[...drawnRing, drawnRing[0]]]),
    ),
  );
  return containing ?? drawnArea.drawnRings[0];
}

/** The plot with its drawn area (if any) in place of its full geometry and size. */
export function withDrawnArea(
  plot: Plot,
  drawnAreas: Record<string, DrawnArea>,
): Plot {
  const drawnArea = drawnAreas[plot.id];
  return drawnArea
    ? { ...plot, geometry: drawnArea.geometry, size: drawnArea.size }
    : plot;
}

/** Selected plots with drawn areas in place of their full geometry and size. */
export function applyDrawnAreas(
  plots: Plot[],
  drawnAreas: Record<string, DrawnArea>,
): Plot[] {
  return plots.map((plot) => withDrawnArea(plot, drawnAreas));
}
