import { describe, it, expect } from "vitest";
import { computeMaxDepth } from "./depth.js";

function makeAdj(
  edges: [string, string][],
): ReadonlyMap<string, readonly string[]> {
  const adj = new Map<string, string[]>();
  for (const [from, to] of edges) {
    if (!adj.has(from)) adj.set(from, []);
    if (!adj.has(to)) adj.set(to, []);
    adj.get(from)?.push(to);
  }
  return adj;
}

describe("computeMaxDepth", () => {
  it("returns 0 for empty graph", () => {
    const result = computeMaxDepth(new Map());
    expect(result.maxDepth).toBe(0);
    expect(result.deepestPath).toHaveLength(0);
  });

  it("returns 0 for single node with no edges", () => {
    const adj = new Map([["a", [] as string[]]]);
    const result = computeMaxDepth(adj);
    expect(result.maxDepth).toBe(0);
    expect(result.deepestPath).toEqual(["a"]);
  });

  it("returns correct depth for linear chain", () => {
    const adj = makeAdj([
      ["a", "b"],
      ["b", "c"],
    ]);
    const result = computeMaxDepth(adj);
    expect(result.maxDepth).toBe(2);
    expect(result.deepestPath).toEqual(["a", "b", "c"]);
  });

  it("returns correct depth for tree", () => {
    const adj = makeAdj([
      ["a", "b"],
      ["a", "c"],
      ["b", "d"],
    ]);
    const result = computeMaxDepth(adj);
    expect(result.maxDepth).toBe(2);
    expect(result.deepestPath).toEqual(["a", "b", "d"]);
  });

  it("handles diamond graph", () => {
    const adj = makeAdj([
      ["a", "b"],
      ["a", "c"],
      ["b", "d"],
      ["c", "d"],
    ]);
    const result = computeMaxDepth(adj);
    expect(result.maxDepth).toBe(2);
  });

  it("handles cycle without infinite loop", () => {
    const adj = makeAdj([
      ["a", "b"],
      ["b", "c"],
      ["c", "a"],
    ]);
    const result = computeMaxDepth(adj);
    // 3-node cycle: depth is 2 (a->b->c, then c->a is cycle-break)
    expect(result.maxDepth).toBe(2);
    // Path should have no duplicate nodes
    expect(new Set(result.deepestPath).size).toBe(result.deepestPath.length);
  });

  it("handles long chain", () => {
    const edges: [string, string][] = [];
    for (let i = 0; i < 9; i++) {
      edges.push([`n${i}`, `n${i + 1}`]);
    }
    const adj = makeAdj(edges);
    const result = computeMaxDepth(adj);
    expect(result.maxDepth).toBe(9);
    expect(result.deepestPath).toHaveLength(10);
    expect(result.deepestPath[0]).toBe("n0");
    expect(result.deepestPath[9]).toBe("n9");
  });
});
