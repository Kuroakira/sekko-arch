import { describe, it, expect } from "vitest";
import type {
  Grade,
  GradeValue,
  DimensionName,
  DimensionResult,
  DimensionGrades,
  HealthReport,
} from "./metrics.js";

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

  it("DimensionName covers all 7 dimensions", () => {
    const dims: DimensionName[] = [
      "cycles",
      "coupling",
      "depth",
      "godFiles",
      "complexFn",
      "levelization",
      "blastRadius",
    ];
    expect(dims).toHaveLength(7);
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

  it("constructs DimensionGrades with all 7 dimensions", () => {
    const makeDim = (
      name: DimensionName,
      value: number,
      grade: Grade
    ): DimensionResult => ({
      name,
      rawValue: value,
      grade,
    });

    const grades: DimensionGrades = {
      cycles: makeDim("cycles", 0, "A"),
      coupling: makeDim("coupling", 0.15, "A"),
      depth: makeDim("depth", 4, "A"),
      godFiles: makeDim("godFiles", 0, "A"),
      complexFn: makeDim("complexFn", 0.01, "A"),
      levelization: makeDim("levelization", 0, "A"),
      blastRadius: makeDim("blastRadius", 0.05, "A"),
    };

    expect(grades.cycles.grade).toBe("A");
    expect(grades.coupling.rawValue).toBe(0.15);
  });

  it("constructs a HealthReport", () => {
    const makeDim = (
      name: DimensionName,
      value: number,
      grade: Grade
    ): DimensionResult => ({
      name,
      rawValue: value,
      grade,
    });

    const report: HealthReport = {
      dimensions: {
        cycles: makeDim("cycles", 1, "B"),
        coupling: makeDim("coupling", 0.4, "C"),
        depth: makeDim("depth", 6, "B"),
        godFiles: makeDim("godFiles", 0, "A"),
        complexFn: makeDim("complexFn", 0.08, "C"),
        levelization: makeDim("levelization", 0.01, "A"),
        blastRadius: makeDim("blastRadius", 0.18, "A"),
      },
      compositeGrade: "B",
      fileCount: 150,
      scanDurationMs: 1200,
    };

    expect(report.compositeGrade).toBe("B");
    expect(report.fileCount).toBe(150);
    expect(report.scanDurationMs).toBe(1200);
  });
});
