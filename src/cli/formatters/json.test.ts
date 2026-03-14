import { describe, it, expect } from "vitest";
import type {
  DimensionName,
  DimensionResult,
  Grade,
  HealthReport,
} from "../../types/metrics.js";
import { formatJson } from "./json.js";

function makeDim(
  name: DimensionName,
  rawValue: number,
  grade: Grade
): DimensionResult {
  return { name, rawValue, grade };
}

function makeReport(overrides?: Partial<HealthReport>): HealthReport {
  return {
    dimensions: {
      cycles: makeDim("cycles", 0, "A"),
      coupling: makeDim("coupling", 0.15, "A"),
      depth: makeDim("depth", 3, "A"),
      godFiles: makeDim("godFiles", 0, "A"),
      complexFn: makeDim("complexFn", 0.02, "A"),
      levelization: makeDim("levelization", 0, "A"),
      blastRadius: makeDim("blastRadius", 0.08, "A"),
    },
    compositeGrade: "A",
    fileCount: 42,
    scanDurationMs: 150,
    ...overrides,
  };
}

describe("formatJson", () => {
  it("returns valid JSON", () => {
    const result = formatJson(makeReport());
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it("includes all 7 dimensions with rawValue and grade", () => {
    const report = makeReport();
    const parsed = JSON.parse(formatJson(report)) as Record<string, unknown>;
    const dimensions = parsed["dimensions"] as Record<
      string,
      Record<string, unknown>
    >;

    const expectedDimensions: DimensionName[] = [
      "cycles",
      "coupling",
      "depth",
      "godFiles",
      "complexFn",
      "levelization",
      "blastRadius",
    ];

    for (const dim of expectedDimensions) {
      expect(dimensions[dim]).toBeDefined();
      expect(dimensions[dim]["rawValue"]).toBe(
        report.dimensions[dim].rawValue
      );
      expect(dimensions[dim]["grade"]).toBe(report.dimensions[dim].grade);
    }
  });

  it("includes compositeGrade", () => {
    const report = makeReport({ compositeGrade: "C" });
    const parsed = JSON.parse(formatJson(report)) as Record<string, unknown>;

    expect(parsed["compositeGrade"]).toBe("C");
  });

  it("includes metadata with fileCount and scanDurationMs", () => {
    const report = makeReport({ fileCount: 99, scanDurationMs: 500 });
    const parsed = JSON.parse(formatJson(report)) as Record<string, unknown>;
    const metadata = parsed["metadata"] as Record<string, unknown>;

    expect(metadata["fileCount"]).toBe(99);
    expect(metadata["scanDurationMs"]).toBe(500);
  });

  it("uses 2-space indentation", () => {
    const result = formatJson(makeReport());
    const lines = result.split("\n");

    expect(lines[0]).toBe("{");
    expect(lines[1]).toMatch(/^ {2}"/);
  });

  it("preserves numeric precision for rawValues", () => {
    const report = makeReport();
    const parsed = JSON.parse(formatJson(report)) as Record<string, unknown>;
    const dimensions = parsed["dimensions"] as Record<
      string,
      Record<string, unknown>
    >;

    expect(dimensions["coupling"]["rawValue"]).toBe(0.15);
    expect(dimensions["blastRadius"]["rawValue"]).toBe(0.08);
  });

  it("does not include dimension details in output", () => {
    const report = makeReport();
    const reportWithDetails: HealthReport = {
      ...report,
      dimensions: {
        ...report.dimensions,
        cycles: {
          ...report.dimensions.cycles,
          details: { sccs: [["a.ts", "b.ts"]] },
        },
      },
    };

    const parsed = JSON.parse(formatJson(reportWithDetails)) as Record<
      string,
      unknown
    >;
    const dimensions = parsed["dimensions"] as Record<
      string,
      Record<string, unknown>
    >;

    expect(dimensions["cycles"]["details"]).toBeUndefined();
  });

  it("only contains dimensions, compositeGrade, and metadata keys at top level", () => {
    const parsed = JSON.parse(formatJson(makeReport())) as Record<
      string,
      unknown
    >;
    const keys = Object.keys(parsed).sort();

    expect(keys).toEqual(["compositeGrade", "dimensions", "metadata"]);
  });
});
