import { describe, it, expect } from "vitest";
import { computeCohesion } from "./cohesion.js";
import type { ImportEdge } from "../types/snapshot.js";

describe("computeCohesion", () => {
  it("returns 0 for empty edges", () => {
    const result = computeCohesion([], new Map());
    expect(result.rawValue).toBe(0);
    expect(result.worstModule).toBe("");
  });

  it("returns 0 when all modules have single file", () => {
    const assignments = new Map([
      ["src/a/foo.ts", "src/a"],
      ["src/b/bar.ts", "src/b"],
    ]);
    const edges: ImportEdge[] = [
      { fromFile: "src/a/foo.ts", toFile: "src/b/bar.ts" },
    ];
    expect(computeCohesion(edges, assignments).rawValue).toBe(0);
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
    const result = computeCohesion(edges, assignments);
    expect(result.rawValue).toBe(0);
    expect(result.worstCohesion).toBe(1);
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
    const result = computeCohesion(edges, assignments);
    expect(result.rawValue).toBe(1);
    expect(result.worstModule).toBe("src/a");
    expect(result.worstCohesion).toBe(0);
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
    const result = computeCohesion(edges, assignments);
    expect(result.rawValue).toBe(0.5);
    expect(result.worstModule).toBe("src/a");
    expect(result.worstCohesion).toBe(0.5);
  });
});
