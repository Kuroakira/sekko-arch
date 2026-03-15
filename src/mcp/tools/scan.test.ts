import { describe, it, expect, vi } from "vitest";
import { scanToolDefinition, handleScan } from "./scan.js";

vi.mock("../../cli/scan.js", () => ({
  executePipeline: vi.fn(() => ({
    snapshot: {
      totalFiles: 5,
      totalLines: 500,
      files: [],
      importGraph: { edges: [], adjacency: {}, reverseAdjacency: {} },
    },
    health: {
      compositeGrade: "B",
      fileCount: 5,
      scanDurationMs: 42,
      dimensions: {
        cycles: { name: "cycles", rawValue: 0, grade: "A", details: {} },
        coupling: { name: "coupling", rawValue: 0.1, grade: "A", details: {} },
        depth: { name: "depth", rawValue: 3, grade: "A", details: {} },
        godFiles: { name: "godFiles", rawValue: 0, grade: "A", details: {} },
        complexFn: { name: "complexFn", rawValue: 0, grade: "A", details: {} },
        levelization: {
          name: "levelization",
          rawValue: 0,
          grade: "A",
          details: {},
        },
        blastRadius: {
          name: "blastRadius",
          rawValue: 0,
          grade: "A",
          details: {},
        },
        cohesion: { name: "cohesion", rawValue: 0, grade: "A", details: {} },
        entropy: { name: "entropy", rawValue: 0, grade: "A", details: {} },
        cognitiveComplexity: {
          name: "cognitiveComplexity",
          rawValue: 0,
          grade: "A",
          details: {},
        },
        hotspots: { name: "hotspots", rawValue: 0, grade: "A", details: {} },
        longFunctions: {
          name: "longFunctions",
          rawValue: 0,
          grade: "A",
          details: {},
        },
        largeFiles: {
          name: "largeFiles",
          rawValue: 0,
          grade: "A",
          details: {},
        },
        highParams: {
          name: "highParams",
          rawValue: 0,
          grade: "A",
          details: {},
        },
        duplication: {
          name: "duplication",
          rawValue: 0,
          grade: "A",
          details: {},
        },
        deadCode: { name: "deadCode", rawValue: 0, grade: "A", details: {} },
        comments: {
          name: "comments",
          rawValue: 0.92,
          grade: "A",
          details: {},
        },
        distanceFromMainSeq: {
          name: "distanceFromMainSeq",
          rawValue: 0,
          grade: "A",
          details: {},
        },
        attackSurface: {
          name: "attackSurface",
          rawValue: 0,
          grade: "A",
          details: {},
        },
      },
    },
  })),
}));

describe("scanToolDefinition", () => {
  it("has name 'scan'", () => {
    expect(scanToolDefinition.name).toBe("scan");
  });

  it("has a non-empty description", () => {
    expect(scanToolDefinition.description).toBe(
      "Scan a TypeScript project and return architecture health scores across 19 dimensions",
    );
  });

  it("has inputSchema with path required, dimensions and include optional", () => {
    const schema = scanToolDefinition.inputSchema;
    expect(schema.properties).toHaveProperty("path");
    expect(schema.properties).toHaveProperty("dimensions");
    expect(schema.properties).toHaveProperty("include");
    expect(schema.required).toContain("path");
  });
});

describe("handleScan", () => {
  it("returns full scan results with all 19 dimensions", async () => {
    const result = await handleScan({ path: "/tmp/test" });
    const parsed = JSON.parse(result.content[0].text) as Record<
      string,
      unknown
    >;
    expect(parsed.compositeGrade).toBe("B");
    expect(Object.keys(parsed.dimensions as object)).toHaveLength(19);
  });

  it("filters dimensions when specified", async () => {
    const result = await handleScan({
      path: "/tmp/test",
      dimensions: ["cycles", "coupling"],
    });
    const parsed = JSON.parse(result.content[0].text) as Record<
      string,
      unknown
    >;
    const dims = parsed.dimensions as Record<string, unknown>;
    expect(Object.keys(dims)).toHaveLength(2);
    expect(dims).toHaveProperty("cycles");
    expect(dims).toHaveProperty("coupling");
  });

  it("passes include to executePipeline", async () => {
    const { executePipeline } = await import("../../cli/scan.js");
    await handleScan({ path: "/tmp/test", include: ["src/api"] });
    expect(executePipeline).toHaveBeenCalledWith("/tmp/test", {
      include: ["src/api"],
    });
  });

  it("returns error object when executePipeline throws", async () => {
    const { executePipeline } = await import("../../cli/scan.js");
    vi.mocked(executePipeline).mockImplementationOnce(() => {
      throw new Error("ENOENT");
    });
    const result = await handleScan({ path: "/nonexistent" });
    const parsed = JSON.parse(result.content[0].text) as Record<
      string,
      unknown
    >;
    expect(parsed.error).toBe("ENOENT");
  });
});
