import { describe, it, expect } from "vitest";
import { detectCycles } from "./cycles.js";

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

describe("detectCycles", () => {
  it("returns 0 cycles for empty graph", () => {
    const result = detectCycles(new Map());
    expect(result.cycleCount).toBe(0);
    expect(result.cycles).toHaveLength(0);
  });

  it("returns 0 cycles for acyclic graph", () => {
    const adj = makeAdj([
      ["a", "b"],
      ["b", "c"],
    ]);
    const result = detectCycles(adj);
    expect(result.cycleCount).toBe(0);
  });

  it("detects a single cycle", () => {
    const adj = makeAdj([
      ["a", "b"],
      ["b", "c"],
      ["c", "a"],
    ]);
    const result = detectCycles(adj);
    expect(result.cycleCount).toBe(1);
    expect(result.cycles[0]).toHaveLength(3);
    expect(result.cycles[0]).toContain("a");
    expect(result.cycles[0]).toContain("b");
    expect(result.cycles[0]).toContain("c");
  });

  it("detects multiple independent cycles", () => {
    const adj = makeAdj([
      ["a", "b"],
      ["b", "a"],
      ["c", "d"],
      ["d", "c"],
    ]);
    const result = detectCycles(adj);
    expect(result.cycleCount).toBe(2);
  });

  it("does not count self-loops as cycles", () => {
    const adj = makeAdj([["a", "a"]]);
    const result = detectCycles(adj);
    expect(result.cycleCount).toBe(0);
  });

  it("handles disconnected components with one cycle", () => {
    const adj = makeAdj([
      ["a", "b"],
      ["b", "a"],
      ["c", "d"],
    ]);
    const result = detectCycles(adj);
    expect(result.cycleCount).toBe(1);
    expect(result.cycles[0]).toContain("a");
    expect(result.cycles[0]).toContain("b");
  });

  it("handles complex graph with nested structure", () => {
    // a→b→c→a (cycle 1), c→d→e→c (cycle 2, shares c with cycle 1)
    // Tarjan will merge these into one SCC since they share node c
    const adj = makeAdj([
      ["a", "b"],
      ["b", "c"],
      ["c", "a"],
      ["c", "d"],
      ["d", "e"],
      ["e", "c"],
    ]);
    const result = detectCycles(adj);
    expect(result.cycleCount).toBe(1);
    expect(result.cycles[0]).toHaveLength(5);
  });
});
