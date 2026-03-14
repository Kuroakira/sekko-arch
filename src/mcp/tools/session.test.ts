import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  sessionStartToolDefinition,
  sessionEndToolDefinition,
  handleSessionStart,
  handleSessionEnd,
  resetBaseline,
} from "./session.js";

let callCount = 0;

vi.mock("../../cli/scan.js", () => ({
  executePipeline: vi.fn(() => {
    callCount++;
    // Second call returns slightly different results to test diff
    const grade = callCount > 1 ? "C" : "B";
    const cycleGrade = callCount > 1 ? "C" : "A";
    const cycleRaw = callCount > 1 ? 4 : 0;
    return {
      snapshot: { totalFiles: 5 },
      health: {
        compositeGrade: grade,
        fileCount: 5,
        scanDurationMs: 42,
        dimensions: {
          cycles: { name: "cycles", rawValue: cycleRaw, grade: cycleGrade, details: {} },
          coupling: { name: "coupling", rawValue: 0.1, grade: "A", details: {} },
          depth: { name: "depth", rawValue: 3, grade: "A", details: {} },
          godFiles: { name: "godFiles", rawValue: 0, grade: "A", details: {} },
          complexFn: { name: "complexFn", rawValue: 0, grade: "A", details: {} },
          levelization: { name: "levelization", rawValue: 0, grade: "A", details: {} },
          blastRadius: { name: "blastRadius", rawValue: 0, grade: "A", details: {} },
          cohesion: { name: "cohesion", rawValue: 0, grade: "A", details: {} },
          entropy: { name: "entropy", rawValue: 0, grade: "A", details: {} },
          cognitiveComplexity: { name: "cognitiveComplexity", rawValue: 0, grade: "A", details: {} },
          hotspots: { name: "hotspots", rawValue: 0, grade: "A", details: {} },
          longFunctions: { name: "longFunctions", rawValue: 0, grade: "A", details: {} },
          largeFiles: { name: "largeFiles", rawValue: 0, grade: "A", details: {} },
          highParams: { name: "highParams", rawValue: 0, grade: "A", details: {} },
          duplication: { name: "duplication", rawValue: 0, grade: "A", details: {} },
          deadCode: { name: "deadCode", rawValue: 0, grade: "A", details: {} },
          comments: { name: "comments", rawValue: 0.92, grade: "A", details: {} },
          distanceFromMainSeq: { name: "distanceFromMainSeq", rawValue: 0, grade: "A", details: {} },
          attackSurface: { name: "attackSurface", rawValue: 0, grade: "A", details: {} },
        },
      },
    };
  }),
}));

describe("session tool definitions", () => {
  it("session_start has name", () => {
    expect(sessionStartToolDefinition.name).toBe("session_start");
  });

  it("session_end has name", () => {
    expect(sessionEndToolDefinition.name).toBe("session_end");
  });

  it("both have required path", () => {
    expect(sessionStartToolDefinition.inputSchema.required).toContain("path");
    expect(sessionEndToolDefinition.inputSchema.required).toContain("path");
  });
});

describe("handleSessionStart", () => {
  beforeEach(() => {
    callCount = 0;
    resetBaseline();
  });

  it("returns current scores", async () => {
    const result = await handleSessionStart({ path: "/tmp/test" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.compositeGrade).toBe("B");
    expect(parsed.baselineSaved).toBe(true);
  });

  it("passes include to executePipeline", async () => {
    const { executePipeline } = await import("../../cli/scan.js");
    await handleSessionStart({ path: "/tmp/test", include: ["src/api"] });
    expect(executePipeline).toHaveBeenCalledWith("/tmp/test", {
      include: ["src/api"],
    });
  });
});

describe("handleSessionEnd", () => {
  beforeEach(() => {
    callCount = 0;
    resetBaseline();
  });

  it("returns diff when baseline exists", async () => {
    await handleSessionStart({ path: "/tmp/test" });
    const result = await handleSessionEnd({ path: "/tmp/test" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.baseline).toBeDefined();
    expect(parsed.current).toBeDefined();
    expect(parsed.changes).toBeDefined();
    // cycles should show degradation (A->C)
    expect(parsed.changes.cycles).toBeDefined();
    expect(parsed.changes.cycles.from).toBe("A");
    expect(parsed.changes.cycles.to).toBe("C");
  });

  it("returns error + full scan when no baseline", async () => {
    const result = await handleSessionEnd({ path: "/tmp/test" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.warning).toContain("No baseline");
    expect(parsed.current).toBeDefined();
  });

  it("session_start double call overwrites baseline", async () => {
    await handleSessionStart({ path: "/tmp/test" });
    await handleSessionStart({ path: "/tmp/test" });
    // Both calls should succeed (second overwrites first)
    const result = await handleSessionEnd({ path: "/tmp/test" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.baseline).toBeDefined();
    expect(parsed.current).toBeDefined();
  });
});
