import { describe, it, expect } from "vitest";
import type {
  Grade,
  GradeValue,
  DimensionName,
  DimensionResult,
  DimensionGrades,
  HealthReport,
} from "./metrics.js";
import { makeAllDimensionGrades, makeHealth } from "../testing/fixtures.js";

describe("Metrics Types", () => {
  it("Grade type accepts A-F", () => {
    const grades: Grade[] = ["A", "B", "C", "D", "F"];
    expect(grades).toHaveLength(5);
  });

  it("GradeValue maps correctly", () => {
    const values: Record<Grade, GradeValue> = {
      A: 4,
      B: 3,
      C: 2,
      D: 1,
      F: 0,
    };
    expect(values.A).toBe(4);
    expect(values.F).toBe(0);
  });

  it("DimensionName covers all 24 dimensions", () => {
    const dims: DimensionName[] = [
      "cycles",
      "coupling",
      "depth",
      "godFiles",
      "complexFn",
      "levelization",
      "blastRadius",
      "cohesion",
      "entropy",
      "cognitiveComplexity",
      "hotspots",
      "longFunctions",
      "largeFiles",
      "highParams",
      "duplication",
      "deadCode",
      "comments",
      "distanceFromMainSeq",
      "attackSurface",
      "codeChurn",
      "changeCoupling",
      "busFactor",
      "codeAge",
      "testCoverageGap",
    ];
    expect(dims).toHaveLength(24);
  });

  it("constructs a DimensionResult", () => {
    const result: DimensionResult = {
      name: "cycles",
      rawValue: 2,
      grade: "C",
      details: { sccs: [["a.ts", "b.ts"]] },
    };
    expect(result.grade).toBe("C");
    expect(result.rawValue).toBe(2);
  });

  it("constructs DimensionGrades with all 24 dimensions", () => {
    const grades: DimensionGrades = makeAllDimensionGrades("A");

    expect(grades.cycles.grade).toBe("A");
    expect(Object.keys(grades)).toHaveLength(24);
  });

  it("constructs a HealthReport", () => {
    const report: HealthReport = makeHealth({
      compositeGrade: "B",
      fileCount: 150,
      scanDurationMs: 1200,
    });

    expect(report.compositeGrade).toBe("B");
    expect(report.fileCount).toBe(150);
    expect(report.scanDurationMs).toBe(1200);
  });
});
