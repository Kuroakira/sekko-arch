import { describe, it, expect, vi, beforeEach } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { executePipeline } from "./scan.js";

function createFixtureDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "archana-scan-test-"));

  writeFileSync(
    join(dir, "a.ts"),
    `export function greet(name: string): string {\n  return "hello " + name;\n}\n`,
  );

  writeFileSync(
    join(dir, "b.ts"),
    `import { greet } from "./a.js";\n\nexport const msg = greet("world");\n`,
  );

  return dir;
}

describe("executePipeline", () => {
  it("returns a HealthReport with correct fileCount", () => {
    const dir = createFixtureDir();
    const report = executePipeline(dir);

    expect(report.fileCount).toBe(2);
  });

  it("returns a valid compositeGrade", () => {
    const dir = createFixtureDir();
    const report = executePipeline(dir);

    expect(["A", "B", "C", "D", "F"]).toContain(report.compositeGrade);
  });

  it("returns all seven dimensions", () => {
    const dir = createFixtureDir();
    const report = executePipeline(dir);

    const dimensionNames = Object.keys(report.dimensions);
    expect(dimensionNames).toContain("cycles");
    expect(dimensionNames).toContain("coupling");
    expect(dimensionNames).toContain("depth");
    expect(dimensionNames).toContain("godFiles");
    expect(dimensionNames).toContain("complexFn");
    expect(dimensionNames).toContain("levelization");
    expect(dimensionNames).toContain("blastRadius");
  });

  it("records scanDurationMs as a positive number", () => {
    const dir = createFixtureDir();
    const report = executePipeline(dir);

    expect(report.scanDurationMs).toBeGreaterThanOrEqual(0);
  });
});

describe("runScan", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("prints table format to stdout by default", async () => {
    const { runScan } = await import("./scan.js");
    const dir = createFixtureDir();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    runScan(dir, { format: "table" });

    expect(logSpy).toHaveBeenCalledOnce();
    const output = logSpy.mock.calls[0]?.[0];
    expect(typeof output).toBe("string");
    expect(output).toContain("archana");
    expect(output).toContain("Dimension");
  });

  it("prints json format when specified", async () => {
    const { runScan } = await import("./scan.js");
    const dir = createFixtureDir();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    runScan(dir, { format: "json" });

    expect(logSpy).toHaveBeenCalledOnce();
    const output = logSpy.mock.calls[0]?.[0];
    expect(typeof output).toBe("string");
    const parsed: unknown = JSON.parse(output);
    expect(parsed).toHaveProperty("compositeGrade");
    expect(parsed).toHaveProperty("dimensions");
  });
});
