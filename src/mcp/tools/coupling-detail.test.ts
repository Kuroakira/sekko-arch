import { describe, it, expect, vi } from "vitest";
import {
  couplingDetailToolDefinition,
  handleCouplingDetail,
} from "./coupling-detail.js";

vi.mock("../../cli/scan.js", () => ({
  executePipeline: vi.fn(() => ({
    snapshot: { totalFiles: 3 },
    health: {
      compositeGrade: "B",
      fileCount: 3,
      scanDurationMs: 10,
      dimensions: {
        cycles: { name: "cycles", rawValue: 0, grade: "A", details: {} },
        coupling: {
          name: "coupling",
          rawValue: 0.3,
          grade: "B",
          details: {
            topCoupledFiles: [{ file: "src/a.ts", score: 0.8 }],
          },
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

describe("couplingDetailToolDefinition", () => {
  it("has name 'coupling_detail'", () => {
    expect(couplingDetailToolDefinition.name).toBe("coupling_detail");
  });

  it("has inputSchema with required path", () => {
    expect(couplingDetailToolDefinition.inputSchema.required).toContain("path");
  });
});

describe("handleCouplingDetail", () => {
  it("returns coupling dimension details", async () => {
    const result = await handleCouplingDetail({ path: "/tmp/test" });
    const parsed = JSON.parse(result.content[0].text) as Record<
      string,
      unknown
    >;
    expect(parsed.grade).toBe("B");
    expect(parsed.rawValue).toBe(0.3);
    expect(parsed.details).toBeDefined();
  });

  it("returns error for invalid path", async () => {
    const { executePipeline } = await import("../../cli/scan.js");
    vi.mocked(executePipeline).mockImplementationOnce(() => {
      throw new Error("ENOENT");
    });
    const result = await handleCouplingDetail({ path: "/nonexistent" });
    const parsed = JSON.parse(result.content[0].text) as Record<
      string,
      unknown
    >;
    expect(parsed.error).toBeDefined();
  });
});
