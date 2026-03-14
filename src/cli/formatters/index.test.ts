import { describe, it, expect } from "vitest";
import { getFormatter } from "./index.js";
import { makeHealth } from "../../testing/fixtures.js";

const stubReport = makeHealth({
  fileCount: 5,
  scanDurationMs: 42,
});

describe("getFormatter", () => {
  it("returns a formatter for 'table' that produces a string containing 'sekko-arch'", () => {
    const formatter = getFormatter("table");
    const output = formatter.format(stubReport);

    expect(output).toContain("sekko-arch");
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
