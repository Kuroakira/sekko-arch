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
    expect(computeMaxDepth(new Map())).toBe(0);
  });

  it("returns 0 for single node with no edges", () => {
    const adj = new Map([["a", [] as string[]]]);
    expect(computeMaxDepth(adj)).toBe(0);
  });

  it("returns correct depth for linear chain", () => {
    const adj = makeAdj([
      ["a", "b"],
      ["b", "c"],
    ]);
    expect(computeMaxDepth(adj)).toBe(2);
  });

  it("returns correct depth for tree", () => {
    const adj = makeAdj([
      ["a", "b"],
      ["a", "c"],
      ["b", "d"],
    ]);
    expect(computeMaxDepth(adj)).toBe(2);
  });

  it("handles diamond graph", () => {
    const adj = makeAdj([
      ["a", "b"],
      ["a", "c"],
      ["b", "d"],
      ["c", "d"],
    ]);
    expect(computeMaxDepth(adj)).toBe(2);
  });

  it("handles cycle without infinite loop", () => {
    const adj = makeAdj([
      ["a", "b"],
      ["b", "c"],
      ["c", "a"],
    ]);
    const depth = computeMaxDepth(adj);
    expect(depth).toBeLessThanOrEqual(3);
    expect(depth).toBeGreaterThanOrEqual(0);
  });

  it("handles long chain", () => {
    const edges: [string, string][] = [];
    for (let i = 0; i < 9; i++) {
      edges.push([`n${i}`, `n${i + 1}`]);
    }
    const adj = makeAdj(edges);
    expect(computeMaxDepth(adj)).toBe(9);
  });
});
