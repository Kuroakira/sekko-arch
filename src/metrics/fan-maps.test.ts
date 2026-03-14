import { describe, it, expect } from "vitest";
import { computeFanMaps } from "./fan-maps.js";
import type { ImportEdge } from "../types/index.js";

describe("computeFanMaps", () => {
  it("returns empty maps for empty edges", () => {
    const { fanIn, fanOut } = computeFanMaps([]);
    expect(fanIn.size).toBe(0);
    expect(fanOut.size).toBe(0);
  });

  it("computes correct fan-in/fan-out for a single edge", () => {
    const edges: ImportEdge[] = [{ fromFile: "a.ts", toFile: "b.ts" }];
    const { fanIn, fanOut } = computeFanMaps(edges);

    expect(fanOut.get("a.ts")).toBe(1);
    expect(fanOut.get("b.ts")).toBe(0);
    expect(fanIn.get("b.ts")).toBe(1);
    expect(fanIn.get("a.ts")).toBe(0);
  });

  it("computes correct counts for multiple edges", () => {
    const edges: ImportEdge[] = [
      { fromFile: "a.ts", toFile: "b.ts" },
      { fromFile: "a.ts", toFile: "c.ts" },
      { fromFile: "b.ts", toFile: "c.ts" },
    ];
    const { fanIn, fanOut } = computeFanMaps(edges);

    expect(fanOut.get("a.ts")).toBe(2);
    expect(fanOut.get("b.ts")).toBe(1);
    expect(fanOut.get("c.ts")).toBe(0);
    expect(fanIn.get("a.ts")).toBe(0);
    expect(fanIn.get("b.ts")).toBe(1);
    expect(fanIn.get("c.ts")).toBe(2);
  });

  it("counts duplicate edges", () => {
    const edges: ImportEdge[] = [
      { fromFile: "a.ts", toFile: "b.ts" },
      { fromFile: "a.ts", toFile: "b.ts" },
    ];
    const { fanIn, fanOut } = computeFanMaps(edges);

    expect(fanOut.get("a.ts")).toBe(2);
    expect(fanIn.get("b.ts")).toBe(2);
  });

  it("handles large fan-in scenario", () => {
    const edges: ImportEdge[] = Array.from({ length: 50 }, (_, i) => ({
      fromFile: `file${i}.ts`,
      toFile: "shared.ts",
    }));
    const { fanIn, fanOut } = computeFanMaps(edges);

    expect(fanIn.get("shared.ts")).toBe(50);
    expect(fanOut.get("shared.ts")).toBe(0);
    for (let i = 0; i < 50; i++) {
      expect(fanOut.get(`file${i}.ts`)).toBe(1);
      expect(fanIn.get(`file${i}.ts`)).toBe(0);
    }
  });

  it("includes all files in both maps", () => {
    const edges: ImportEdge[] = [{ fromFile: "a.ts", toFile: "b.ts" }];
    const { fanIn, fanOut } = computeFanMaps(edges);

    expect(fanIn.has("a.ts")).toBe(true);
    expect(fanIn.has("b.ts")).toBe(true);
    expect(fanOut.has("a.ts")).toBe(true);
    expect(fanOut.has("b.ts")).toBe(true);
  });
});
