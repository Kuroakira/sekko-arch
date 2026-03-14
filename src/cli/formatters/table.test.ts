import { describe, it, expect } from "vitest";
import { formatTable } from "./table.js";
import { makeDimension, makeHealth } from "../../testing/fixtures.js";

describe("formatTable", () => {
  it("includes the report header", () => {
    const output = formatTable(makeHealth());
    expect(output).toContain("sekko-arch");
    expect(output).toContain("Architecture Health Report");
  });

  it("includes column headers", () => {
    const output = formatTable(makeHealth());
    expect(output).toContain("Dimension");
    expect(output).toContain("Value");
    expect(output).toContain("Grade");
  });

  it("displays all 19 dimensions with human-readable names", () => {
    const output = formatTable(makeHealth());
    expect(output).toContain("Cycles");
    expect(output).toContain("Coupling");
    expect(output).toContain("Depth");
    expect(output).toContain("God Files");
    expect(output).toContain("Complex Fns");
    expect(output).toContain("Levelization");
    expect(output).toContain("Blast Radius");
    expect(output).toContain("Cohesion");
    expect(output).toContain("Entropy");
    expect(output).toContain("Cognitive Complexity");
    expect(output).toContain("Hotspots");
    expect(output).toContain("Long Functions");
    expect(output).toContain("Large Files");
    expect(output).toContain("High Params");
    expect(output).toContain("Duplication");
    expect(output).toContain("Dead Code");
    expect(output).toContain("Comments");
    expect(output).toContain("Distance from Main Seq");
    expect(output).toContain("Attack Surface");
  });

  it("formats integer dimensions without decimal places", () => {
    const output = formatTable(makeHealth());
    const cyclesLine = output.split("\n").find((l) => l.includes("Cycles"));
    expect(cyclesLine).toBeDefined();
    expect(cyclesLine).toContain("0");
    expect(cyclesLine).not.toContain("0.");

    const depthLine = output.split("\n").find((l) => l.includes("Depth"));
    expect(depthLine).toBeDefined();
    expect(depthLine).toContain("3");
    expect(depthLine).not.toContain("3.");
  });

  it("formats ratio dimensions with 2 decimal places", () => {
    const output = formatTable(makeHealth());
    const couplingLine = output.split("\n").find((l) => l.includes("Coupling"));
    expect(couplingLine).toContain("0.15");

    const complexLine = output
      .split("\n")
      .find((l) => l.includes("Complex Fns"));
    expect(complexLine).toContain("0.02");
  });

  it("shows each dimension grade", () => {
    const report = makeHealth({
      dimensions: {
        ...makeHealth().dimensions,
        cycles: makeDimension("cycles", 3, "D"),
        coupling: makeDimension("coupling", 0.5, "C"),
        depth: makeDimension("depth", 8, "F"),
        godFiles: makeDimension("godFiles", 0, "A"),
        complexFn: makeDimension("complexFn", 0.02, "A"),
        levelization: makeDimension("levelization", 0.1, "B"),
        blastRadius: makeDimension("blastRadius", 0.3, "C"),
      },
      compositeGrade: "C",
    });
    const output = formatTable(report);
    const cyclesLine = output.split("\n").find((l) => l.includes("Cycles"));
    expect(cyclesLine).toContain("D");

    const depthLine = output.split("\n").find((l) => l.includes("Depth"));
    expect(depthLine).toContain("F");
  });

  it("shows composite grade separated from dimensions", () => {
    const output = formatTable(makeHealth());
    expect(output).toContain("Composite");
    const compositeLine = output
      .split("\n")
      .find((l) => l.includes("Composite"));
    expect(compositeLine).toContain("A");
  });

  it("includes file count and scan duration in summary", () => {
    const output = formatTable(makeHealth());
    expect(output).toContain("42 files scanned in 150ms");
  });

  it("handles large numbers", () => {
    const report = makeHealth({
      dimensions: {
        ...makeHealth().dimensions,
        cycles: makeDimension("cycles", 100, "F"),
        coupling: makeDimension("coupling", 0.99, "F"),
        depth: makeDimension("depth", 25, "F"),
        godFiles: makeDimension("godFiles", 12.5, "F"),
        complexFn: makeDimension("complexFn", 0.55, "F"),
        levelization: makeDimension("levelization", 0.88, "F"),
        blastRadius: makeDimension("blastRadius", 0.95, "F"),
      },
      compositeGrade: "F",
      fileCount: 10000,
      scanDurationMs: 55000,
    });
    const output = formatTable(report);
    expect(output).toContain("100");
    expect(output).toContain("10000 files scanned in 55000ms");
    expect(output).toContain("F");
  });

  it("handles zero values", () => {
    const report = makeHealth({
      compositeGrade: "A",
      fileCount: 0,
      scanDurationMs: 0,
    });
    const output = formatTable(report);
    expect(output).toContain("0 files scanned in 0ms");
  });

  it("produces aligned columns", () => {
    const output = formatTable(makeHealth());
    const lines = output.split("\n").filter((l) => l.trim().length > 0);
    const dimensionLines = lines.filter(
      (l) =>
        l.includes("Cycles") ||
        l.includes("Coupling") ||
        l.includes("Blast Radius")
    );
    expect(dimensionLines.length).toBeGreaterThanOrEqual(3);

    const gradePositions = dimensionLines.map((l) => {
      const match = /[ABCDF]\s*$/.exec(l.trimEnd());
      return match ? l.trimEnd().length - 1 : -1;
    });
    const uniquePositions = new Set(gradePositions);
    expect(uniquePositions.size).toBe(1);
  });

  it("includes separator lines", () => {
    const output = formatTable(makeHealth());
    const separatorLines = output
      .split("\n")
      .filter((l) => l.includes("\u2500"));
    expect(separatorLines.length).toBeGreaterThanOrEqual(2);
  });
});
