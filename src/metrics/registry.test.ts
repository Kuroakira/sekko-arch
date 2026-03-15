import { describe, it, expect } from "vitest";
import { METRIC_COMPUTATIONS } from "./registry.js";
import { DIMENSION_NAMES } from "../dimensions.js";
import { buildMetricContext } from "./context.js";
import { makeFileNode, makeSnapshot } from "../testing/fixtures.js";
import { makeImportEdge } from "../testing/fixtures.js";

describe("METRIC_COMPUTATIONS", () => {
  it("has exactly one computation per DimensionName", () => {
    expect(METRIC_COMPUTATIONS.length).toBe(DIMENSION_NAMES.length);
  });

  it("covers every DimensionName", () => {
    const registeredNames = new Set(METRIC_COMPUTATIONS.map((m) => m.name));
    for (const name of DIMENSION_NAMES) {
      expect(registeredNames.has(name)).toBe(true);
    }
  });

  it("has no duplicate dimension names", () => {
    const names = METRIC_COMPUTATIONS.map((m) => m.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("each computation has a compute function", () => {
    for (const metric of METRIC_COMPUTATIONS) {
      expect(typeof metric.compute).toBe("function");
    }
  });

  it("dimension names match DIMENSION_NAMES (any order)", () => {
    const registeredNames = [...METRIC_COMPUTATIONS.map((m) => m.name)].sort();
    const expected = [...DIMENSION_NAMES].sort();
    expect(registeredNames).toEqual(expected);
  });

  describe("graceful degradation without gitHistory", () => {
    const files = [
      makeFileNode({ path: "src/a.ts", lines: 10 }),
      makeFileNode({ path: "src/b.ts", lines: 20 }),
    ];
    const edges = [makeImportEdge({ fromFile: "src/a.ts", toFile: "src/b.ts" })];
    const snapshot = makeSnapshot(files, edges);
    const ctx = buildMetricContext(snapshot, undefined, undefined);

    const evolutionMetrics = [
      "codeChurn",
      "changeCoupling",
      "busFactor",
      "codeAge",
    ] as const;

    for (const name of evolutionMetrics) {
      it(`${name} returns rawValue=0 when gitHistory is undefined`, () => {
        const computation = METRIC_COMPUTATIONS.find((m) => m.name === name);
        expect(computation).toBeDefined();
        if (!computation) return;
        const result = computation.compute(ctx);
        expect(result.rawValue).toBe(0);
        expect(result.grade).toBe("A");
      });
    }
  });
});
