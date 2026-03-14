import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ImportEdge } from "../types/snapshot.js";
import { makeHealth } from "../testing/fixtures.js";

vi.mock("./scan.js", () => ({
  executePipeline: vi.fn(),
}));

vi.mock("../rules/index.js", () => ({
  parseRulesFile: vi.fn(),
  checkRules: vi.fn(),
}));

import { executePipeline } from "./scan.js";
import { parseRulesFile, checkRules } from "../rules/index.js";
import { runCheck } from "./check.js";

const mockExecutePipeline = vi.mocked(executePipeline);
const mockParseRulesFile = vi.mocked(parseRulesFile);
const mockCheckRules = vi.mocked(checkRules);

function makeMockHealth() {
  return makeHealth({
    fileCount: 10,
    scanDurationMs: 50,
  });
}

const mockEdges: readonly ImportEdge[] = [
  { fromFile: "src/a.ts", toFile: "src/b.ts" },
];

describe("runCheck", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
  });

  it("exits 0 when all rules pass", () => {
    const health = makeMockHealth();
    mockExecutePipeline.mockReturnValue({
      snapshot: {
        root: { path: "/test", name: "test", isDir: true, lines: 0, logic: 0, comments: 0, blanks: 0, funcs: 0, lang: "ts", sa: undefined },
        files: [],
        totalFiles: 0,
        totalLines: 0,
        importGraph: { edges: [...mockEdges], adjacency: new Map(), reverseAdjacency: new Map() },
      },
      health,
    });
    mockParseRulesFile.mockReturnValue({ constraints: { max_cycles: 5 } });
    mockCheckRules.mockReturnValue({
      passed: true,
      violations: [],
      rulesChecked: 1,
    });

    runCheck("/test");

    expect(mockCheckRules).toHaveBeenCalled();
    expect(process.exit).not.toHaveBeenCalled();
  });

  it("exits 1 when rules have violations", () => {
    const health = makeMockHealth();
    mockExecutePipeline.mockReturnValue({
      snapshot: {
        root: { path: "/test", name: "test", isDir: true, lines: 0, logic: 0, comments: 0, blanks: 0, funcs: 0, lang: "ts", sa: undefined },
        files: [],
        totalFiles: 0,
        totalLines: 0,
        importGraph: { edges: [...mockEdges], adjacency: new Map(), reverseAdjacency: new Map() },
      },
      health,
    });
    mockParseRulesFile.mockReturnValue({ constraints: { max_cycles: 0 } });
    mockCheckRules.mockReturnValue({
      passed: false,
      violations: [
        {
          rule: "max_cycles",
          severity: "error",
          message: "Cycle count 3 exceeds limit of 0",
          affectedFiles: [],
        },
      ],
      rulesChecked: 1,
    });

    runCheck("/test");

    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it("exits 1 with message when rules.toml is missing", () => {
    const health = makeMockHealth();
    mockExecutePipeline.mockReturnValue({
      snapshot: {
        root: { path: "/test", name: "test", isDir: true, lines: 0, logic: 0, comments: 0, blanks: 0, funcs: 0, lang: "ts", sa: undefined },
        files: [],
        totalFiles: 0,
        totalLines: 0,
        importGraph: { edges: [], adjacency: new Map(), reverseAdjacency: new Map() },
      },
      health,
    });
    mockParseRulesFile.mockReturnValue(null);

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    runCheck("/test");

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("rules.toml"),
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it("prints violation details to stderr", () => {
    const health = makeMockHealth();
    mockExecutePipeline.mockReturnValue({
      snapshot: {
        root: { path: "/test", name: "test", isDir: true, lines: 0, logic: 0, comments: 0, blanks: 0, funcs: 0, lang: "ts", sa: undefined },
        files: [],
        totalFiles: 0,
        totalLines: 0,
        importGraph: { edges: [], adjacency: new Map(), reverseAdjacency: new Map() },
      },
      health,
    });
    mockParseRulesFile.mockReturnValue({ constraints: { max_cycles: 0 } });
    mockCheckRules.mockReturnValue({
      passed: false,
      violations: [
        {
          rule: "max_cycles",
          severity: "error",
          message: "Cycle count 3 exceeds limit of 0",
          affectedFiles: ["src/a.ts"],
        },
      ],
      rulesChecked: 1,
    });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    runCheck("/test");

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("max_cycles"),
    );
  });
});
