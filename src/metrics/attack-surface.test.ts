import { describe, it, expect } from "vitest";
import { computeAttackSurface } from "./attack-surface.js";

describe("computeAttackSurface", () => {
  it("returns 0 for empty graph", () => {
    expect(computeAttackSurface(new Map(), new Set(), 0)).toBe(0);
  });

  it("returns 0 when no entry points", () => {
    const adj = new Map([["a.ts", ["b.ts"]]]);
    expect(computeAttackSurface(adj, new Set(), 2)).toBe(0);
  });

  it("returns ratio of reachable files", () => {
    const adj = new Map<string, readonly string[]>([
      ["src/index.ts", ["src/a.ts"]],
      ["src/a.ts", ["src/b.ts"]],
      ["src/b.ts", []],
      ["src/isolated.ts", []],
    ]);
    const entry = new Set(["src/index.ts"]);
    // Reachable: index → a → b = 3/4
    expect(computeAttackSurface(adj, entry, 4)).toBe(0.75);
  });

  it("returns 1.0 when all files reachable", () => {
    const adj = new Map<string, readonly string[]>([
      ["src/index.ts", ["src/a.ts", "src/b.ts"]],
    ]);
    const entry = new Set(["src/index.ts"]);
    expect(computeAttackSurface(adj, entry, 3)).toBeCloseTo(1.0);
  });

  it("handles multiple entry points", () => {
    const adj = new Map<string, readonly string[]>([
      ["src/index.ts", ["src/a.ts"]],
      ["src/cli.ts", ["src/b.ts"]],
    ]);
    const entry = new Set(["src/index.ts", "src/cli.ts"]);
    // Reachable: index, a, cli, b = 4/4
    expect(computeAttackSurface(adj, entry, 4)).toBe(1.0);
  });
});
