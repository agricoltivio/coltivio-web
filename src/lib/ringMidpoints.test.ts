import { describe, expect, test } from "vitest";
import { insertVertexAfter, ringMidpoints } from "./ringMidpoints";

const triangle = [
  [0, 0],
  [2, 0],
  [2, 2],
];

describe("ringMidpoints", () => {
  test("adds a midpoint between every pair of a closed outline, including last to first", () => {
    expect(ringMidpoints(triangle, true)).toEqual([
      { afterIndex: 0, lngLat: [1, 0] },
      { afterIndex: 1, lngLat: [2, 1] },
      { afterIndex: 2, lngLat: [1, 1] },
    ]);
  });

  test("leaves out the closing midpoint for an open outline or fewer than 3 points", () => {
    expect(ringMidpoints(triangle, false)).toHaveLength(2);
    expect(ringMidpoints(triangle.slice(0, 2), true)).toEqual([{ afterIndex: 0, lngLat: [1, 0] }]);
    expect(ringMidpoints([[0, 0]], true)).toEqual([]);
  });
});

describe("insertVertexAfter", () => {
  test("inserts after the given index", () => {
    expect(insertVertexAfter(["a", "b", "c"], 0, "x")).toEqual(["a", "x", "b", "c"]);
    expect(insertVertexAfter(["a", "b", "c"], 2, "x")).toEqual(["a", "b", "c", "x"]);
  });
});
