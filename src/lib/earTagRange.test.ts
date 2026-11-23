import { describe, expect, test } from "vitest";
import { buildEarTagRange } from "./earTagRange";

describe("buildEarTagRange", () => {
  test("numbers with a free text prefix, zero padded to the first number", () => {
    const range = buildEarTagRange("CH 120.", "0098", "4");
    expect(range).toMatchObject({
      prefix: "CH 120.",
      fromDigits: "0098",
      toDigits: "0101",
      fromNumber: "CH 120.0098",
      toNumber: "CH 120.0101",
      amount: 4,
    });
  });

  test("contains only exact matches with the same prefix", () => {
    const range = buildEarTagRange("CH", "100", "10");
    expect(range?.contains("CH105")).toBe(true);
    expect(range?.contains("CH0105")).toBe(false);
    expect(range?.contains("DE105")).toBe(false);
    expect(range?.contains("CH111")).toBe(false);
  });

  test("without a prefix", () => {
    expect(buildEarTagRange("", "201231", "2")?.toNumber).toBe("201232");
  });

  test("incomplete or invalid input gives no range", () => {
    expect(buildEarTagRange("CH", "CH100", "5")).toBeNull();
    expect(buildEarTagRange("CH", "100", "0")).toBeNull();
    expect(buildEarTagRange("CH", "", "5")).toBeNull();
  });
});
