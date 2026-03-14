import { describe, it, expect } from "vitest";
import { computeCompositeGrade } from "./grade.js";
import type { DimensionGrades } from "../types/metrics.js";
import { makeDimension, makeAllDimensionGrades } from "../testing/fixtures.js";

describe("computeCompositeGrade", () => {
  it("returns A when all dimensions are A", () => {
    expect(computeCompositeGrade(makeAllDimensionGrades("A"))).toBe("A");
  });

  it("returns B when all dimensions are B", () => {
    expect(computeCompositeGrade(makeAllDimensionGrades("B"))).toBe("B");
  });

  it("returns F when all dimensions are F", () => {
    expect(computeCompositeGrade(makeAllDimensionGrades("F"))).toBe("F");
  });

  it("caps composite at worst + 1 even if mean is higher", () => {
    // 6 dimensions at A (4) and 1 at F (0)
    // mean = (6*4 + 0) / 7 = 24/7 = 3.43 => floor = 3 (B)
    // worst + 1 = 0 + 1 = 1 (D)
    // min(3, 1) = 1 => D
    const grades = makeAllDimensionGrades("A");
    const withOneF: DimensionGrades = {
      ...grades,
      cycles: makeDimension("cycles", 0, "F"),
    };
    expect(computeCompositeGrade(withOneF)).toBe("D");
  });

  it("uses mean when mean is lower than worst + 1", () => {
    // All D: mean = 1, worst + 1 = 2
    // min(1, 2) = 1 => D
    expect(computeCompositeGrade(makeAllDimensionGrades("D"))).toBe("D");
  });

  it("handles mixed grades correctly", () => {
    // 3 A (4), 2 B (3), 1 C (2), 1 D (1)
    // mean = (12 + 6 + 2 + 1) / 7 = 21/7 = 3 => floor = 3 (B)
    // worst + 1 = 1 + 1 = 2 (C)
    // min(3, 2) = 2 => C
    const grades: DimensionGrades = {
      cycles: makeDimension("cycles", 0, "A"),
      coupling: makeDimension("coupling", 0, "A"),
      depth: makeDimension("depth", 0, "A"),
      godFiles: makeDimension("godFiles", 0, "B"),
      complexFn: makeDimension("complexFn", 0, "B"),
      levelization: makeDimension("levelization", 0, "C"),
      blastRadius: makeDimension("blastRadius", 0, "D"),
    };
    expect(computeCompositeGrade(grades)).toBe("C");
  });

  it("clamps composite to max of 4 (A)", () => {
    // worst + 1 for all A's = 4 + 1 = 5, but should clamp to 4
    // mean of all A's = 4, floor = 4
    // min(4, 5) = 4 => A
    expect(computeCompositeGrade(makeAllDimensionGrades("A"))).toBe("A");
  });

  it("handles a single F among mostly B grades", () => {
    // 6 B (3), 1 F (0)
    // mean = (18 + 0) / 7 = 18/7 = 2.57 => floor = 2 (C)
    // worst + 1 = 0 + 1 = 1 (D)
    // min(2, 1) = 1 => D
    const grades: DimensionGrades = {
      cycles: makeDimension("cycles", 0, "B"),
      coupling: makeDimension("coupling", 0, "B"),
      depth: makeDimension("depth", 0, "B"),
      godFiles: makeDimension("godFiles", 0, "B"),
      complexFn: makeDimension("complexFn", 0, "B"),
      levelization: makeDimension("levelization", 0, "B"),
      blastRadius: makeDimension("blastRadius", 0, "F"),
    };
    expect(computeCompositeGrade(grades)).toBe("D");
  });
});
