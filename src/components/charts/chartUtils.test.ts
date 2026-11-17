import { describe, expect, it } from "vitest";
import { pickDisplayUnit, toBaseAmount } from "./chartUtils";

describe("pickDisplayUnit", () => {
  it("shows large volumes in m³, e.g. slurry", () => {
    const { value } = toBaseAmount(300, "m3");
    expect(pickDisplayUnit(value, "l")).toEqual({ divisor: 1000, label: "m³" });
  });

  it("keeps hl, l and ml below 1000 l", () => {
    expect(pickDisplayUnit(424, "l")).toEqual({ divisor: 100, label: "hl" });
    expect(pickDisplayUnit(5, "l")).toEqual({ divisor: 1, label: "l" });
    expect(pickDisplayUnit(0.5, "l")).toEqual({ divisor: 0.001, label: "ml" });
  });
});
