import { describe, it, expect, vi } from "vitest";
import {
  cyclesDetailToolDefinition,
  handleCyclesDetail,
} from "./cycles-detail.js";

vi.mock("../../cli/scan.js", () => ({
  executePipeline: vi.fn(() => ({
    snapshot: { totalFiles: 3 },
    health: {
      compositeGrade: "B",
      fileCount: 3,
      scanDurationMs: 10,
      dimensions: {
        cycles: {
          name: "cycles",
          rawValue: 2,
          grade: "B",
          details: { cyclePaths: [["a.ts", "b.ts", "a.ts"]] },
        },
        coupling: {
          name: "coupling",
          rawValue: 0.1,
          grade: "A",
          details: {},
        },
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

describe("cyclesDetailToolDefinition", () => {
  it("has name 'cycles_detail'", () => {
    expect(cyclesDetailToolDefinition.name).toBe("cycles_detail");
  });

  it("has inputSchema with required path", () => {
    expect(cyclesDetailToolDefinition.inputSchema.required).toContain("path");
  });
});

describe("handleCyclesDetail", () => {
  it("returns cycles dimension details", async () => {
    const result = await handleCyclesDetail({ path: "/tmp/test" });
    const parsed = JSON.parse(result.content[0].text) as Record<
      string,
      unknown
    >;
    expect(parsed.grade).toBe("B");
    expect(parsed.rawValue).toBe(2);
    expect(
      (parsed.details as Record<string, unknown>).cyclePaths,
    ).toHaveLength(1);
  });

  it("returns error for invalid path", async () => {
    const { executePipeline } = await import("../../cli/scan.js");
    vi.mocked(executePipeline).mockImplementationOnce(() => {
      throw new Error("ENOENT");
    });
    const result = await handleCyclesDetail({ path: "/nonexistent" });
    const parsed = JSON.parse(result.content[0].text) as Record<
      string,
      unknown
    >;
    expect(parsed.error).toBeDefined();
  });
});
