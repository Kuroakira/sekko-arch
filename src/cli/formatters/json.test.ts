import { describe, it, expect } from "vitest";
import type { HealthReport } from "../../types/metrics.js";
import { formatJson } from "./json.js";
import { makeHealth } from "../../testing/fixtures.js";
import { DIMENSION_NAMES } from "../../dimensions.js";

describe("formatJson", () => {
  it("returns valid JSON", () => {
    const result = formatJson(makeHealth());
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it("includes all 19 dimensions with rawValue and grade", () => {
    const report = makeHealth();
    const parsed = JSON.parse(formatJson(report)) as Record<string, unknown>;
    const dimensions = parsed["dimensions"] as Record<
      string,
      Record<string, unknown>
    >;

    for (const dim of DIMENSION_NAMES) {
      expect(dimensions[dim]).toBeDefined();
      expect(dimensions[dim]["rawValue"]).toBe(
        report.dimensions[dim].rawValue
      );
      expect(dimensions[dim]["grade"]).toBe(report.dimensions[dim].grade);
    }
  });

  it("includes compositeGrade", () => {
    const report = makeHealth({ compositeGrade: "C" });
    const parsed = JSON.parse(formatJson(report)) as Record<string, unknown>;

    expect(parsed["compositeGrade"]).toBe("C");
  });

  it("includes metadata with fileCount and scanDurationMs", () => {
    const report = makeHealth({ fileCount: 99, scanDurationMs: 500 });
    const parsed = JSON.parse(formatJson(report)) as Record<string, unknown>;
    const metadata = parsed["metadata"] as Record<string, unknown>;

    expect(metadata["fileCount"]).toBe(99);
    expect(metadata["scanDurationMs"]).toBe(500);
  });

  it("uses 2-space indentation", () => {
    const result = formatJson(makeHealth());
    const lines = result.split("\n");

    expect(lines[0]).toBe("{");
    expect(lines[1]).toMatch(/^ {2}"/);
  });

  it("preserves numeric precision for rawValues", () => {
    const report = makeHealth();
    const parsed = JSON.parse(formatJson(report)) as Record<string, unknown>;
    const dimensions = parsed["dimensions"] as Record<
      string,
      Record<string, unknown>
    >;

    expect(dimensions["coupling"]["rawValue"]).toBe(0.15);
    expect(dimensions["blastRadius"]["rawValue"]).toBe(0.08);
  });

  it("includes dimension details in output", () => {
    const report = makeHealth();
    const reportWithDetails: HealthReport = {
      ...report,
      dimensions: {
        ...report.dimensions,
        cycles: {
          ...report.dimensions.cycles,
          details: { cycles: [["a.ts", "b.ts"]] },
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

    expect(dimensions["cycles"]["details"]).toEqual({
      cycles: [["a.ts", "b.ts"]],
    });
  });

  it("outputs empty object for dimensions without details", () => {
    const report = makeHealth();
    const parsed = JSON.parse(formatJson(report)) as Record<string, unknown>;
    const dimensions = parsed["dimensions"] as Record<
      string,
      Record<string, unknown>
    >;

    for (const dim of DIMENSION_NAMES) {
      expect(dimensions[dim]["details"]).toEqual({});
    }
  });

  it("only contains dimensions, compositeGrade, and metadata keys at top level", () => {
    const parsed = JSON.parse(formatJson(makeHealth())) as Record<
      string,
      unknown
    >;
    const keys = Object.keys(parsed).sort();

    expect(keys).toEqual(["compositeGrade", "dimensions", "metadata"]);
  });
});
