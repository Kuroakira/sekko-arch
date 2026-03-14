import { describe, it, expect } from "vitest";
import { computeBlastRadius } from "./blast-radius.js";

function makeRevAdj(
  edges: [string, string][],
): ReadonlyMap<string, readonly string[]> {
  // edges are [from, to], reverse adjacency maps to→from
  const rev = new Map<string, string[]>();
  for (const [from, to] of edges) {
    if (!rev.has(from)) rev.set(from, []);
    if (!rev.has(to)) rev.set(to, []);
    rev.get(to)?.push(from);
  }
  return rev;
}

describe("computeBlastRadius", () => {
  it("returns 0 for empty graph", () => {
    const result = computeBlastRadius(new Map(), new Set());
    expect(result.maxBlastRadius).toBe(0);
    expect(result.maxBlastRadiusRatio).toBe(0);
  });

  it("returns 0 for isolated files", () => {
    const rev = new Map([
      ["a.ts", [] as string[]],
      ["b.ts", [] as string[]],
    ]);
    const result = computeBlastRadius(rev, new Set());
    expect(result.maxBlastRadius).toBe(0);
  });

  it("computes correct blast radius for linear chain", () => {
    // a→b→c: c is depended on by b and a (transitively)
    const rev = makeRevAdj([
      ["a", "b"],
      ["b", "c"],
    ]);
    const result = computeBlastRadius(rev, new Set());
    // c is depended on by b and a = blast radius 2
    // b is depended on by a = blast radius 1
    // a has no dependents = blast radius 0
    expect(result.maxBlastRadius).toBe(2);
    expect(result.perFile.get("c")).toBe(2);
    expect(result.perFile.get("b")).toBe(1);
    expect(result.perFile.get("a")).toBe(0);
  });

  it("computes correct blast radius for star topology", () => {
    // a→center, b→center, c→center
    const rev = makeRevAdj([
      ["a", "center"],
      ["b", "center"],
      ["c", "center"],
    ]);
    const result = computeBlastRadius(rev, new Set());
    expect(result.perFile.get("center")).toBe(3);
    expect(result.maxBlastRadius).toBe(3);
  });

  it("excludes foundation files from max calculation", () => {
    const rev = makeRevAdj([
      ["a", "foundation"],
      ["b", "foundation"],
      ["c", "foundation"],
      ["a", "normal"],
    ]);
    const result = computeBlastRadius(rev, new Set(["foundation"]));
    // foundation has blast radius 3 but is excluded
    // normal has blast radius 1
    expect(result.maxBlastRadius).toBe(1);
  });

  it("computes ratio correctly", () => {
    const rev = makeRevAdj([
      ["a", "b"],
      ["c", "b"],
    ]);
    const result = computeBlastRadius(rev, new Set());
    // b has 2 dependents, total 3 files
    expect(result.maxBlastRadiusRatio).toBeCloseTo(2 / 3);
  });
});
