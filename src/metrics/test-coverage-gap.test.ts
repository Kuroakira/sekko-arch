import { describe, it, expect } from "vitest";
import { computeTestCoverageGap } from "./test-coverage-gap.js";
import type { ImportGraph } from "../types/snapshot.js";

function makeImportGraph(
  adjacencyEntries: readonly [string, readonly string[]][],
): ImportGraph {
  const adjacency = new Map<string, readonly string[]>(adjacencyEntries);
  const reverseAdjacency = new Map<string, string[]>();
  const edges: { fromFile: string; toFile: string }[] = [];

  for (const [from, tos] of adjacencyEntries) {
    if (!reverseAdjacency.has(from)) reverseAdjacency.set(from, []);
    for (const to of tos) {
      if (!reverseAdjacency.has(to)) reverseAdjacency.set(to, []);
      const rev = reverseAdjacency.get(to);
      if (rev) rev.push(from);
      edges.push({ fromFile: from, toFile: to });
    }
  }

  return { edges, adjacency, reverseAdjacency };
}

describe("computeTestCoverageGap", () => {
  it("returns rawValue=0 when all source files are reachable from tests", () => {
    const sourceFiles = ["src/a.ts", "src/b.ts"];
    const testFiles = ["src/a.test.ts"];
    const testImports = new Map([["src/a.test.ts", ["src/a.ts"]]]);
    const graph = makeImportGraph([["src/a.ts", ["src/b.ts"]]]);

    const result = computeTestCoverageGap(
      sourceFiles,
      testFiles,
      testImports,
      graph,
    );
    expect(result.rawValue).toBe(0);
    expect(result.files).toHaveLength(0);
  });

  it("returns correct ratio for partially unreachable files", () => {
    const sourceFiles = ["src/a.ts", "src/b.ts", "src/c.ts"];
    const testFiles = ["src/a.test.ts"];
    const testImports = new Map([["src/a.test.ts", ["src/a.ts"]]]);
    const graph = makeImportGraph([
      ["src/a.ts", []],
      ["src/b.ts", []],
      ["src/c.ts", []],
    ]);

    const result = computeTestCoverageGap(
      sourceFiles,
      testFiles,
      testImports,
      graph,
    );
    // b.ts and c.ts are unreachable: 2/3
    expect(result.rawValue).toBeCloseTo(2 / 3, 5);
    expect(result.files).toContain("src/b.ts");
    expect(result.files).toContain("src/c.ts");
  });

  it("follows transitive imports through the graph", () => {
    const sourceFiles = ["src/a.ts", "src/b.ts", "src/c.ts"];
    const testFiles = ["src/a.test.ts"];
    const testImports = new Map([["src/a.test.ts", ["src/a.ts"]]]);
    // a -> b -> c (transitive chain)
    const graph = makeImportGraph([
      ["src/a.ts", ["src/b.ts"]],
      ["src/b.ts", ["src/c.ts"]],
      ["src/c.ts", []],
    ]);

    const result = computeTestCoverageGap(
      sourceFiles,
      testFiles,
      testImports,
      graph,
    );
    expect(result.rawValue).toBe(0);
    expect(result.files).toHaveLength(0);
  });

  it("excludes .d.ts files from gap calculation", () => {
    const sourceFiles = ["src/a.ts", "src/types.d.ts"];
    const testFiles = ["src/a.test.ts"];
    const testImports = new Map([["src/a.test.ts", ["src/a.ts"]]]);
    const graph = makeImportGraph([
      ["src/a.ts", []],
      ["src/types.d.ts", []],
    ]);

    const result = computeTestCoverageGap(
      sourceFiles,
      testFiles,
      testImports,
      graph,
    );
    // types.d.ts is excluded, only a.ts counts and is reachable
    expect(result.rawValue).toBe(0);
  });

  it("excludes barrel files (index.ts with re-exports only) from gap calculation", () => {
    const sourceFiles = ["src/a.ts", "src/index.ts"];
    const testFiles = ["src/a.test.ts"];
    const testImports = new Map([["src/a.test.ts", ["src/a.ts"]]]);
    const graph = makeImportGraph([
      ["src/a.ts", []],
      ["src/index.ts", ["src/a.ts"]],
    ]);

    const result = computeTestCoverageGap(
      sourceFiles,
      testFiles,
      testImports,
      graph,
    );
    // index.ts is excluded as barrel file
    expect(result.rawValue).toBe(0);
  });

  it("excludes entry points from gap calculation", () => {
    const sourceFiles = ["src/a.ts", "src/cli/index.ts", "src/main.ts"];
    const testFiles = ["src/a.test.ts"];
    const testImports = new Map([["src/a.test.ts", ["src/a.ts"]]]);
    const graph = makeImportGraph([
      ["src/a.ts", []],
      ["src/cli/index.ts", ["src/a.ts"]],
      ["src/main.ts", ["src/a.ts"]],
    ]);

    const result = computeTestCoverageGap(
      sourceFiles,
      testFiles,
      testImports,
      graph,
    );
    // cli/index.ts and main.ts are entry points, excluded
    expect(result.rawValue).toBe(0);
  });

  it("returns rawValue=0 when no test files exist", () => {
    const sourceFiles = ["src/a.ts", "src/b.ts"];
    const testFiles: string[] = [];
    const testImports = new Map<string, string[]>();
    const graph = makeImportGraph([
      ["src/a.ts", []],
      ["src/b.ts", []],
    ]);

    const result = computeTestCoverageGap(
      sourceFiles,
      testFiles,
      testImports,
      graph,
    );
    // No tests = rawValue 0 to avoid noise
    expect(result.rawValue).toBe(0);
    expect(result.files).toHaveLength(0);
  });

  it("returns rawValue=0 when source files list is empty", () => {
    const result = computeTestCoverageGap(
      [],
      [],
      new Map(),
      makeImportGraph([]),
    );
    expect(result.rawValue).toBe(0);
    expect(result.files).toHaveLength(0);
  });

  it("handles test files importing multiple source files", () => {
    const sourceFiles = ["src/a.ts", "src/b.ts", "src/c.ts"];
    const testFiles = ["src/a.test.ts"];
    const testImports = new Map([
      ["src/a.test.ts", ["src/a.ts", "src/b.ts"]],
    ]);
    const graph = makeImportGraph([
      ["src/a.ts", []],
      ["src/b.ts", []],
      ["src/c.ts", []],
    ]);

    const result = computeTestCoverageGap(
      sourceFiles,
      testFiles,
      testImports,
      graph,
    );
    // Only c.ts is unreachable: 1/3
    expect(result.rawValue).toBeCloseTo(1 / 3, 5);
    expect(result.files).toEqual(["src/c.ts"]);
  });
});
