import * as turf from "@turf/turf";
import { describe, expect, test } from "vitest";
import type { Plot } from "@/api/types";
import {
  applyDrawing,
  applyDrawnAreas,
  drawnRingAt,
  intersectDrawing,
  isSelfCrossing,
} from "./drawnAreas";

// a square plot of about 76 m × 111 m near 8° E / 47° N
const squareCoordinates = [
  [
    [
      [8, 47],
      [8.001, 47],
      [8.001, 47.001],
      [8, 47.001],
      [8, 47],
    ],
  ],
];
const squareSize = Math.round(turf.area(turf.multiPolygon(squareCoordinates)));

function plot(
  id: string,
  coordinates: number[][][][] = squareCoordinates,
): Plot {
  return {
    id,
    farmId: "farm",
    name: `Plot ${id}`,
    localId: null,
    usage: null,
    cuttingDate: null,
    geometry: { type: "MultiPolygon", coordinates },
    size: Math.round(turf.area(turf.multiPolygon(coordinates))),
    additionalNotes: null,
    archivedAt: null,
    currentCropRotation: null,
  };
}

// the left half of the plot
const leftHalf: [number, number][] = [
  [8, 47],
  [8.0005, 47],
  [8.0005, 47.001],
  [8, 47.001],
];
// the right quarter of the plot, not touching the left half
const rightQuarter: [number, number][] = [
  [8.00075, 47],
  [8.001, 47],
  [8.001, 47.001],
  [8.00075, 47.001],
];
// a "bow tie": the outline crosses itself in the middle
const bowTie: [number, number][] = [
  [8, 47],
  [8.001, 47.001],
  [8.001, 47],
  [8, 47.001],
];
// outside every plot
const farAway: [number, number][] = [
  [9, 46],
  [9.001, 46],
  [9.001, 46.001],
];

describe("intersectDrawing", () => {
  test("keeps the covered part of a plot", () => {
    const [touched] = intersectDrawing(
      [plot("a")],
      [
        [8, 47],
        [8.0005, 47],
        [8.0005, 47.001],
        [8, 47.001],
      ],
    );
    expect(touched.plotId).toBe("a");
    expect(touched.area.geometry.type).toBe("MultiPolygon");
    // about half of the plot
    expect(touched.area.size / squareSize).toBeCloseTo(0.5, 2);
  });

  test("treats a drawing around the whole plot as the whole plot", () => {
    const [touched] = intersectDrawing(
      [plot("a")],
      [
        [7.999, 46.999],
        [8.002, 46.999],
        [8.002, 47.002],
        [7.999, 47.002],
      ],
    );
    expect(touched.plotId).toBe("a");
    expect(touched.area.size).toBe(squareSize);
    expect(touched.area.geometry.coordinates).toEqual(squareCoordinates);
  });

  test("a self-crossing drawing selects nothing", () => {
    expect(isSelfCrossing(bowTie)).toBe(true);
    expect(isSelfCrossing(leftHalf)).toBe(false);
    expect(intersectDrawing([plot("a")], bowTie)).toEqual([]);
  });

  test("leaves out a neighbour the drawing only overlaps by a sliver", () => {
    // the left half, reaching 0.5 m into the neighbour to the right
    const overlappingEdge: [number, number][] = [
      [8, 47],
      [8.001006, 47],
      [8.001006, 47.001],
      [8, 47.001],
    ];
    const neighbour = plot("b", [
      [
        [
          [8.001, 47],
          [8.002, 47],
          [8.002, 47.001],
          [8.001, 47.001],
          [8.001, 47],
        ],
      ],
    ]);
    const touched = intersectDrawing([plot("a"), neighbour], overlappingEdge);
    expect(touched.map((entry) => entry.plotId)).toEqual(["a"]);
  });

  test("ignores plots outside the drawing and drawings with fewer than 3 points", () => {
    expect(
      intersectDrawing(
        [plot("a")],
        [
          [9, 46],
          [9.001, 46],
          [9.001, 46.001],
        ],
      ),
    ).toEqual([]);
    expect(
      intersectDrawing(
        [plot("a")],
        [
          [8, 47],
          [8.001, 47],
        ],
      ),
    ).toEqual([]);
  });
});

describe("applyDrawnAreas", () => {
  test("replaces geometry and size only for plots with a drawn area", () => {
    const [withArea, withoutArea] = applyDrawnAreas([plot("a"), plot("b")], {
      a: {
        geometry: { type: "MultiPolygon", coordinates: squareCoordinates },
        size: 1234,
        drawnRings: [
          [
            [8, 47],
            [8.0005, 47],
            [8.0005, 47.001],
          ],
        ],
      },
    });
    expect(withArea.size).toBe(1234);
    expect(withoutArea.size).toBe(squareSize);
  });
});

describe("applyDrawing", () => {
  test("selects the touched plots and keeps the drawing for editing", () => {
    const next = applyDrawing({
      plots: [plot("a")],
      plotIds: [],
      drawnAreas: {},
      drawnRing: leftHalf,
      editedRing: null,
    });
    expect(next.applied).toBe(true);
    expect(next.plotIds).toEqual(["a"]);
    expect(next.drawnAreas.a.drawnRings).toEqual([leftHalf]);
  });

  test("a new drawing that touches no plot or crosses itself isn't applied", () => {
    for (const drawnRing of [farAway, bowTie]) {
      const next = applyDrawing({
        plots: [plot("a")],
        plotIds: [],
        drawnAreas: {},
        drawnRing,
        editedRing: null,
      });
      expect(next.applied).toBe(false);
      expect(next.plotIds).toEqual([]);
      expect(next.drawnAreas).toEqual({});
    }
  });

  test("a plot already selected as a whole stays whole", () => {
    const next = applyDrawing({
      plots: [plot("a")],
      plotIds: ["a"],
      drawnAreas: {},
      drawnRing: leftHalf,
      editedRing: null,
    });
    expect(next.applied).toBe(true);
    expect(next.plotIds).toEqual(["a"]);
    expect(next.drawnAreas).toEqual({});
  });

  test("a second drawing on a plot adds to its area, editing one keeps the other", () => {
    const first = applyDrawing({
      plots: [plot("a")],
      plotIds: [],
      drawnAreas: {},
      drawnRing: leftHalf,
      editedRing: null,
    });
    const second = applyDrawing({
      plots: [plot("a")],
      plotIds: first.plotIds,
      drawnAreas: first.drawnAreas,
      drawnRing: rightQuarter,
      editedRing: null,
    });
    expect(second.drawnAreas.a.drawnRings).toEqual([leftHalf, rightQuarter]);
    expect(second.drawnAreas.a.size / squareSize).toBeCloseTo(0.75, 2);
    // clicking inside the right strip reopens that drawing
    expect(drawnRingAt(second.drawnAreas.a, [8.0009, 47.0005])).toEqual(
      rightQuarter,
    );

    // the right strip is moved away: only the left half is left
    const edited = applyDrawing({
      plots: [plot("a")],
      plotIds: second.plotIds,
      drawnAreas: second.drawnAreas,
      drawnRing: farAway,
      editedRing: rightQuarter,
    });
    expect(edited.applied).toBe(true);
    expect(edited.plotIds).toEqual(["a"]);
    expect(edited.drawnAreas.a.drawnRings).toEqual([leftHalf]);
    expect(edited.drawnAreas.a.size / squareSize).toBeCloseTo(0.5, 2);
  });

  test("an edited drawing that no longer touches a plot deselects it", () => {
    const first = applyDrawing({
      plots: [plot("a")],
      plotIds: ["b"],
      drawnAreas: {},
      drawnRing: leftHalf,
      editedRing: null,
    });
    // the drawing is moved away from plot a
    const moved = farAway;
    const edited = applyDrawing({
      plots: [plot("a")],
      plotIds: first.plotIds,
      drawnAreas: first.drawnAreas,
      drawnRing: moved,
      editedRing: leftHalf,
    });
    expect(edited.plotIds).toEqual(["b"]);
    expect(edited.drawnAreas).toEqual({});
  });

  test("an edited drawing that grows over the whole plot gives it its full size", () => {
    const first = applyDrawing({
      plots: [plot("a")],
      plotIds: [],
      drawnAreas: {},
      drawnRing: leftHalf,
      editedRing: null,
    });
    const grown: [number, number][] = [
      [7.999, 46.999],
      [8.002, 46.999],
      [8.002, 47.002],
      [7.999, 47.002],
    ];
    const edited = applyDrawing({
      plots: [plot("a")],
      plotIds: first.plotIds,
      drawnAreas: first.drawnAreas,
      drawnRing: grown,
      editedRing: leftHalf,
    });
    expect(edited.plotIds).toEqual(["a"]);
    expect(edited.drawnAreas.a.size).toBe(squareSize);
    expect(edited.drawnAreas.a.drawnRings).toEqual([grown]);
  });
});
