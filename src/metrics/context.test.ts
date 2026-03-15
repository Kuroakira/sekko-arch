import { describe, it, expect } from "vitest";
import { buildMetricContext } from "./context.js";
import { makeSnapshot } from "../testing/fixtures.js";
import type { GitHistory } from "../git/types.js";

describe("buildMetricContext", () => {
  it("builds MetricContext with 8 fields when no gitHistory provided", () => {
    const snapshot = makeSnapshot([], []);
    const ctx = buildMetricContext(snapshot);

    expect(ctx.snapshot).toBe(snapshot);
    expect(ctx.filePaths).toEqual([]);
    expect(ctx.fanMaps).toBeDefined();
    expect(ctx.moduleAssignments).toBeDefined();
    expect(ctx.entryPoints).toBeDefined();
    expect(ctx.foundationFiles).toBeDefined();
    expect(ctx.allFunctions).toEqual([]);
    expect(ctx.cycleResult).toBeDefined();
    expect(ctx.gitHistory).toBeUndefined();
  });

  it("includes gitHistory in MetricContext when provided", () => {
    const snapshot = makeSnapshot([], []);
    const gitHistory: GitHistory = {
      fileChurns: new Map(),
      commits: [],
      fileAuthors: new Map(),
      fileLastModified: new Map(),
    };

    const ctx = buildMetricContext(snapshot, gitHistory);

    expect(ctx.gitHistory).toBe(gitHistory);
    expect(ctx.gitHistory?.commits).toHaveLength(0);
  });

  it("preserves all existing fields when gitHistory is provided", () => {
    const snapshot = makeSnapshot([], []);
    const gitHistory: GitHistory = {
      fileChurns: new Map([["src/a.ts", { added: 10, deleted: 5 }]]),
      commits: [
        {
          hash: "abc",
          author: "alice",
          date: new Date("2025-01-01"),
          files: ["src/a.ts"],
        },
      ],
      fileAuthors: new Map([["src/a.ts", new Set(["alice"])]]),
      fileLastModified: new Map([["src/a.ts", new Date("2025-01-01")]]),
    };

    const ctx = buildMetricContext(snapshot, gitHistory);

    expect(ctx.snapshot).toBe(snapshot);
    expect(ctx.fanMaps).toBeDefined();
    expect(ctx.moduleAssignments).toBeDefined();
    expect(ctx.entryPoints).toBeDefined();
    expect(ctx.foundationFiles).toBeDefined();
    expect(ctx.allFunctions).toBeDefined();
    expect(ctx.cycleResult).toBeDefined();
    expect(ctx.gitHistory).toBe(gitHistory);
  });
});
