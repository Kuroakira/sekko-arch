import { describe, it, expect } from "vitest";
import { computeCohesion } from "./cohesion.js";
import type { ImportEdge } from "../types/snapshot.js";

describe("computeCohesion", () => {
  it("returns 0 for empty edges", () => {
    expect(computeCohesion([], new Map())).toBe(0);
  });

  it("returns 0 when all modules have single file", () => {
    const assignments = new Map([
      ["src/a/foo.ts", "src/a"],
      ["src/b/bar.ts", "src/b"],
    ]);
    const edges: ImportEdge[] = [
      { fromFile: "src/a/foo.ts", toFile: "src/b/bar.ts" },
    ];
    expect(computeCohesion(edges, assignments)).toBe(0);
  });

  it("returns 0 (perfect) when all intra-module edges exist", () => {
    const assignments = new Map([
      ["src/a/foo.ts", "src/a"],
      ["src/a/bar.ts", "src/a"],
    ]);
    const edges: ImportEdge[] = [
      { fromFile: "src/a/foo.ts", toFile: "src/a/bar.ts" },
    ];
    // cohesion = 1 / (2-1) = 1.0 → rawValue = 1 - 1 = 0
    expect(computeCohesion(edges, assignments)).toBe(0);
  });

  it("returns high value when no intra-module edges", () => {
    const assignments = new Map([
      ["src/a/foo.ts", "src/a"],
      ["src/a/bar.ts", "src/a"],
      ["src/b/baz.ts", "src/b"],
    ]);
    const edges: ImportEdge[] = [
      { fromFile: "src/a/foo.ts", toFile: "src/b/baz.ts" },
    ];
    // cohesion for src/a = 0 / (2-1) = 0 → rawValue = 1 - 0 = 1
    expect(computeCohesion(edges, assignments)).toBe(1);
  });

  it("returns partial cohesion for mixed modules", () => {
    const assignments = new Map([
      ["src/a/foo.ts", "src/a"],
      ["src/a/bar.ts", "src/a"],
      ["src/a/baz.ts", "src/a"],
    ]);
    const edges: ImportEdge[] = [
      { fromFile: "src/a/foo.ts", toFile: "src/a/bar.ts" },
    ];
    // cohesion = 1 / (3-1) = 0.5 → rawValue = 1 - 0.5 = 0.5
    expect(computeCohesion(edges, assignments)).toBe(0.5);
  });
});
