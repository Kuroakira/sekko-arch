import { describe, it, expect } from "vitest";
import { computeDistanceFromMainSeq } from "./distance-main-seq.js";
import { makeFileNode } from "../testing/fixtures.js";
import type { FanMaps } from "./fan-maps.js";

function makeFanMaps(
  fanIn: Record<string, number>,
  fanOut: Record<string, number>,
): FanMaps {
  return {
    fanIn: new Map(Object.entries(fanIn)),
    fanOut: new Map(Object.entries(fanOut)),
  };
}

describe("computeDistanceFromMainSeq", () => {
  it("returns 0 for empty files", () => {
    const fanMaps = makeFanMaps({}, {});
    const result = computeDistanceFromMainSeq([], fanMaps, new Map());
    expect(result.maxDistance).toBe(0);
    expect(result.worstModule).toBe("");
  });

  it("returns 0 for ideal main sequence (A + I = 1)", () => {
    // Module with all abstracts (A=1) and stable (I=0): D = |1+0-1| = 0
    const files = [
      makeFileNode({
        path: "src/types/core.ts",
        sa: {
          functions: [],
          classes: [{ name: "Foo", methods: [], bases: [], kind: "interface" }],
          imports: [],
        },
      }),
    ];
    const assignments = new Map([["src/types/core.ts", "src/types"]]);
    const fanMaps = makeFanMaps(
      { "src/types/core.ts": 5 },
      { "src/types/core.ts": 0 },
    );

    const result = computeDistanceFromMainSeq(files, fanMaps, assignments);
    expect(result.maxDistance).toBe(0);
  });

  it("returns 1 for worst case (concrete + stable)", () => {
    // Module with all concrete classes (A=0) and stable (I=0): D = |0+0-1| = 1
    const files = [
      makeFileNode({
        path: "src/impl/service.ts",
        sa: {
          functions: [],
          classes: [{ name: "Svc", methods: [], bases: [], kind: "class" }],
          imports: [],
        },
      }),
    ];
    const assignments = new Map([["src/impl/service.ts", "src/impl"]]);
    const fanMaps = makeFanMaps(
      { "src/impl/service.ts": 5 },
      { "src/impl/service.ts": 0 },
    );

    const result = computeDistanceFromMainSeq(files, fanMaps, assignments);
    expect(result.maxDistance).toBe(1);
    expect(result.worstModule).toBe("src/impl");
  });

  it("skips modules with no classes (metric not applicable)", () => {
    const files = [
      makeFileNode({
        path: "src/utils/helper.ts",
        sa: { functions: [], classes: [], imports: [] },
      }),
    ];
    const assignments = new Map([["src/utils/helper.ts", "src/utils"]]);
    const fanMaps = makeFanMaps(
      { "src/utils/helper.ts": 1 },
      { "src/utils/helper.ts": 1 },
    );
    expect(computeDistanceFromMainSeq(files, fanMaps, assignments).maxDistance).toBe(0);
  });
});
