import { describe, it, expect } from "vitest";
import { getFormatter } from "./index.js";
import type { HealthReport } from "../../types/metrics.js";

const stubReport: HealthReport = {
  dimensions: {
    cycles: { name: "cycles", rawValue: 0, grade: "A" },
    coupling: { name: "coupling", rawValue: 0.1, grade: "A" },
    depth: { name: "depth", rawValue: 2, grade: "A" },
    godFiles: { name: "godFiles", rawValue: 0, grade: "A" },
    complexFn: { name: "complexFn", rawValue: 0, grade: "A" },
    levelization: { name: "levelization", rawValue: 0.9, grade: "A" },
    blastRadius: { name: "blastRadius", rawValue: 0.05, grade: "A" },
  },
  compositeGrade: "A",
  fileCount: 5,
  scanDurationMs: 42,
};

describe("getFormatter", () => {
  it("returns a formatter for 'table' that produces a string containing 'archana'", () => {
    const formatter = getFormatter("table");
    const output = formatter.format(stubReport);

    expect(output).toContain("archana");
    expect(output).toContain("Dimension");
  });

  it("returns a formatter for 'json' that produces valid JSON with compositeGrade", () => {
    const formatter = getFormatter("json");
    const output = formatter.format(stubReport);
    const parsed: unknown = JSON.parse(output);

    expect(parsed).toHaveProperty("compositeGrade", "A");
    expect(parsed).toHaveProperty("dimensions");
  });

  it("throws an error for unknown format names", () => {
    expect(() => getFormatter("xml")).toThrow(
      'Unknown format "xml". Available formats: table, json',
    );
  });
});
