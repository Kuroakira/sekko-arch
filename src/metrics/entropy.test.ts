import { describe, it, expect } from "vitest";
import { computeEntropy } from "./entropy.js";
import type { ImportEdge } from "../types/snapshot.js";

describe("computeEntropy", () => {
  it("returns 0 for empty edges", () => {
    expect(computeEntropy([], new Map())).toBe(0);
  });

  it("returns 0 when all edges go to single module", () => {
    const assignments = new Map([
      ["src/a/foo.ts", "src/a"],
      ["src/b/bar.ts", "src/b"],
    ]);
    const edges: ImportEdge[] = [
      { fromFile: "src/a/foo.ts", toFile: "src/b/bar.ts" },
    ];
    // Only 1 destination module → entropy = 0
    expect(computeEntropy(edges, assignments)).toBe(0);
  });

  it("returns 1.0 for perfectly uniform distribution", () => {
    const assignments = new Map([
      ["src/a/foo.ts", "src/a"],
      ["src/b/bar.ts", "src/b"],
      ["src/c/baz.ts", "src/c"],
    ]);
    const edges: ImportEdge[] = [
      { fromFile: "src/a/foo.ts", toFile: "src/b/bar.ts" },
      { fromFile: "src/a/foo.ts", toFile: "src/c/baz.ts" },
    ];
    // 2 dest modules, equal distribution → H/Hmax = 1.0
    expect(computeEntropy(edges, assignments)).toBeCloseTo(1.0, 5);
  });

  it("returns value between 0 and 1 for skewed distribution", () => {
    const assignments = new Map([
      ["src/a/foo.ts", "src/a"],
      ["src/a/bar.ts", "src/a"],
      ["src/b/baz.ts", "src/b"],
      ["src/c/qux.ts", "src/c"],
    ]);
    const edges: ImportEdge[] = [
      { fromFile: "src/a/foo.ts", toFile: "src/b/baz.ts" },
      { fromFile: "src/a/foo.ts", toFile: "src/b/baz.ts" },
      { fromFile: "src/a/bar.ts", toFile: "src/b/baz.ts" },
      { fromFile: "src/a/bar.ts", toFile: "src/c/qux.ts" },
    ];
    const result = computeEntropy(edges, assignments);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(1);
  });
});
