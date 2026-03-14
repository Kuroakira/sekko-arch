import { describe, it, expect, vi, beforeEach } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { executePipeline } from "./scan.js";

function createFixtureDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "sekko-scan-test-"));

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
  it("returns PipelineResult with health and snapshot", () => {
    const dir = createFixtureDir();
    const result = executePipeline(dir);

    expect(result).toHaveProperty("health");
    expect(result).toHaveProperty("snapshot");
  });

  it("returns a HealthReport with correct fileCount", () => {
    const dir = createFixtureDir();
    const { health } = executePipeline(dir);

    expect(health.fileCount).toBe(2);
  });

  it("returns a valid compositeGrade", () => {
    const dir = createFixtureDir();
    const { health } = executePipeline(dir);

    expect(["A", "B", "C", "D", "F"]).toContain(health.compositeGrade);
  });

  it("returns all 19 dimensions", () => {
    const dir = createFixtureDir();
    const { health } = executePipeline(dir);

    const dimensionNames = Object.keys(health.dimensions);
    expect(dimensionNames).toHaveLength(19);
    expect(dimensionNames).toContain("cycles");
    expect(dimensionNames).toContain("coupling");
    expect(dimensionNames).toContain("cohesion");
    expect(dimensionNames).toContain("attackSurface");
  });

  it("records scanDurationMs as a positive number", () => {
    const dir = createFixtureDir();
    const { health } = executePipeline(dir);

    expect(health.scanDurationMs).toBeGreaterThanOrEqual(0);
  });

  it("returns snapshot with files and importGraph", () => {
    const dir = createFixtureDir();
    const { snapshot } = executePipeline(dir);

    expect(snapshot.files).toHaveLength(2);
    expect(snapshot.importGraph).toHaveProperty("edges");
    expect(snapshot.importGraph).toHaveProperty("adjacency");
    expect(snapshot.importGraph).toHaveProperty("reverseAdjacency");
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
    expect(output).toContain("sekko-arch");
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
