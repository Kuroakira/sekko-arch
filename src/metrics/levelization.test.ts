import { describe, it, expect } from "vitest";
import { computeLevelization } from "./levelization.js";
import { makeAdj } from "../testing/fixtures.js";

describe("computeLevelization", () => {
  it("returns 0 violations for empty graph", () => {
    const result = computeLevelization(new Map(), []);
    expect(result.violationRatio).toBe(0);
    expect(result.levels.size).toBe(0);
  });

  it("assigns levels correctly for clean DAG", () => {
    // a→b→c: c=level 0, b=level 1, a=level 2
    const adj = makeAdj([
      ["a", "b"],
      ["b", "c"],
    ]);
    const result = computeLevelization(adj, []);
    expect(result.levels.get("c")).toBe(0);
    expect(result.levels.get("b")).toBe(1);
    expect(result.levels.get("a")).toBe(2);
    expect(result.violationRatio).toBe(0);
  });

  it("detects upward violations from cycles", () => {
    const adj = makeAdj([
      ["a", "b"],
      ["b", "c"],
      ["c", "a"],
    ]);
    // All in one SCC
    const cycles = [["a", "b", "c"]];
    const result = computeLevelization(adj, cycles);
    expect(result.violations).toBeGreaterThan(0);
  });

  it("handles diamond DAG without violations", () => {
    const adj = makeAdj([
      ["a", "b"],
      ["a", "c"],
      ["b", "d"],
      ["c", "d"],
    ]);
    const result = computeLevelization(adj, []);
    expect(result.levels.get("d")).toBe(0);
    expect(result.levels.get("b")).toBe(1);
    expect(result.levels.get("c")).toBe(1);
    expect(result.levels.get("a")).toBe(2);
    expect(result.violationRatio).toBe(0);
  });

  it("handles mixed graph with cycle and acyclic parts", () => {
    const adj = makeAdj([
      ["a", "b"],
      ["b", "a"],
      ["a", "c"],
    ]);
    const cycles = [["a", "b"]];
    const result = computeLevelization(adj, cycles);
    expect(result.levels.size).toBeGreaterThan(0);
  });
});
