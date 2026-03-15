import { describe, it, expect } from "vitest";
import { METRIC_COMPUTATIONS } from "./registry.js";
import { DIMENSION_NAMES } from "../dimensions.js";

describe("METRIC_COMPUTATIONS", () => {
  it("has exactly one computation per DimensionName", () => {
    expect(METRIC_COMPUTATIONS.length).toBe(DIMENSION_NAMES.length);
  });

  it("covers every DimensionName", () => {
    const registeredNames = new Set(METRIC_COMPUTATIONS.map((m) => m.name));
    for (const name of DIMENSION_NAMES) {
      expect(registeredNames.has(name)).toBe(true);
    }
  });

  it("has no duplicate dimension names", () => {
    const names = METRIC_COMPUTATIONS.map((m) => m.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("each computation has a compute function", () => {
    for (const metric of METRIC_COMPUTATIONS) {
      expect(typeof metric.compute).toBe("function");
    }
  });

  it("dimension names match DIMENSION_NAMES (any order)", () => {
    const registeredNames = [...METRIC_COMPUTATIONS.map((m) => m.name)].sort();
    const expected = [...DIMENSION_NAMES].sort();
    expect(registeredNames).toEqual(expected);
  });
});
