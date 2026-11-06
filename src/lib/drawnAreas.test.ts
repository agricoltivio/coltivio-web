import * as turf from "@turf/turf";
import { describe, expect, test } from "vitest";
import type { Plot } from "@/api/types";
import { applyDrawing, applyDrawnAreas, intersectDrawing } from "./drawnAreas";

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

function plot(id: string): Plot {
  return {
    id,
    farmId: "farm",
    name: `Plot ${id}`,
    localId: null,
    usage: null,
    cuttingDate: null,
    geometry: { type: "MultiPolygon", coordinates: squareCoordinates },
    size: squareSize,
    additionalNotes: null,
    archivedAt: null,
    currentCropRotation: null,
  };
}

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

  test("doesn't throw on a self-crossing drawing", () => {
    // a "bow tie": the outline crosses itself in the middle
    const bowTie: [number, number][] = [
      [8, 47],
      [8.001, 47.001],
      [8.001, 47],
      [8, 47.001],
    ];
    expect(() => intersectDrawing([plot("a")], bowTie)).not.toThrow();
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
        drawnRing: [
          [8, 47],
          [8.0005, 47],
          [8.0005, 47.001],
        ],
      },
    });
    expect(withArea.size).toBe(1234);
    expect(withoutArea.size).toBe(squareSize);
  });
});

// the left half of the plot
const leftHalf: [number, number][] = [
  [8, 47],
  [8.0005, 47],
  [8.0005, 47.001],
  [8, 47.001],
];

describe("applyDrawing", () => {
  test("selects the touched plots and keeps the drawing for editing", () => {
    const next = applyDrawing({
      plots: [plot("a")],
      plotIds: [],
      drawnAreas: {},
      drawnRing: leftHalf,
      editedRing: null,
    });
    expect(next.plotIds).toEqual(["a"]);
    expect(next.drawnAreas.a.drawnRing).toEqual(leftHalf);
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
    const moved: [number, number][] = [
      [9, 46],
      [9.001, 46],
      [9.001, 46.001],
    ];
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
    expect(edited.drawnAreas.a.drawnRing).toEqual(grown);
  });
});
