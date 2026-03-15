import { describe, it, expect, vi } from "vitest";
import { healthToolDefinition, handleHealth } from "./health.js";

vi.mock("../../cli/scan.js", () => ({
  executePipeline: vi.fn(() => ({
    snapshot: {
      totalFiles: 5,
      totalLines: 500,
      files: [],
      importGraph: {
        edges: [],
        adjacency: {},
        reverseAdjacency: {},
      },
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
        complexFn: {
          name: "complexFn",
          rawValue: 0,
          grade: "A",
          details: {},
        },
        levelization: {
          name: "levelization",
          rawValue: 0,
          grade: "A",
          details: {},
        },
        blastRadius: {
          name: "blastRadius",
          rawValue: 0.05,
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

describe("healthToolDefinition", () => {
  it("has name 'health'", () => {
    expect(healthToolDefinition.name).toBe("health");
  });

  it("has inputSchema with required path", () => {
    expect(healthToolDefinition.inputSchema.required).toContain("path");
  });
});

describe("handleHealth", () => {
  it("returns summary with compositeGrade and per-dimension grades", async () => {
    const result = await handleHealth({ path: "/tmp/test" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.compositeGrade).toBe("B");
    expect(parsed.fileCount).toBe(5);
    expect(Object.keys(parsed.dimensions)).toHaveLength(19);
    expect(parsed.dimensions.cycles).toBe("A");
  });

  it("does not include rawValue or details in output", async () => {
    const result = await handleHealth({ path: "/tmp/test" });
    const parsed = JSON.parse(result.content[0].text);
    expect(typeof parsed.dimensions.cycles).toBe("string");
  });

  it("passes include to executePipeline", async () => {
    const { executePipeline } = await import("../../cli/scan.js");
    await handleHealth({ path: "/tmp/test", include: ["src/api"] });
    expect(executePipeline).toHaveBeenCalledWith("/tmp/test", {
      include: ["src/api"],
    });
  });

  it("returns error for invalid path", async () => {
    const { executePipeline } = await import("../../cli/scan.js");
    vi.mocked(executePipeline).mockImplementationOnce(() => {
      throw new Error("ENOENT");
    });
    const result = await handleHealth({ path: "/nonexistent" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBeDefined();
  });
});
