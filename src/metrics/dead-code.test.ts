import { describe, it, expect } from "vitest";
import { computeDeadCodeRatio } from "./dead-code.js";
import { makeFileNode, makeFuncInfo } from "../testing/fixtures.js";

describe("computeDeadCodeRatio", () => {
  it("returns 0 for empty files", () => {
    const result = computeDeadCodeRatio(
      new Map(),
      new Set(),
      [],
    );
    expect(result).toBe(0);
  });

  it("returns 0 when all files are referenced", () => {
    const fileA = makeFileNode({
      path: "src/a.ts",
      sa: { functions: [makeFuncInfo(), makeFuncInfo()], classes: [], imports: [] },
    });
    const reverseAdj = new Map([["src/a.ts", ["src/b.ts"]]]);

    const result = computeDeadCodeRatio(reverseAdj, new Set(), [fileA]);
    expect(result).toBe(0);
  });

  it("returns correct ratio for unreferenced files", () => {
    const fileA = makeFileNode({
      path: "src/a.ts",
      sa: { functions: [makeFuncInfo(), makeFuncInfo()], classes: [], imports: [] },
    });
    const fileB = makeFileNode({
      path: "src/b.ts",
      sa: { functions: [makeFuncInfo()], classes: [], imports: [] },
    });
    const reverseAdj = new Map<string, readonly string[]>([
      ["src/a.ts", ["src/b.ts"]],
      ["src/b.ts", []],
    ]);

    const result = computeDeadCodeRatio(reverseAdj, new Set(), [fileA, fileB]);
    expect(result).toBeCloseTo(1 / 3);
  });

  it("excludes entry points from dead code", () => {
    const fileIndex = makeFileNode({
      path: "src/index.ts",
      sa: { functions: [makeFuncInfo()], classes: [], imports: [] },
    });
    const fileA = makeFileNode({
      path: "src/a.ts",
      sa: { functions: [makeFuncInfo()], classes: [], imports: [] },
    });
    const reverseAdj = new Map<string, readonly string[]>([
      ["src/index.ts", []],
      ["src/a.ts", []],
    ]);
    const entryPoints = new Set(["src/index.ts"]);

    const result = computeDeadCodeRatio(reverseAdj, entryPoints, [fileIndex, fileA]);
    expect(result).toBe(1 / 2);
  });

  it("returns 0 when files have no functions", () => {
    const fileA = makeFileNode({ path: "src/a.ts" });
    const fileB = makeFileNode({
      path: "src/b.ts",
      sa: { functions: [], classes: [], imports: [] },
    });

    const result = computeDeadCodeRatio(new Map(), new Set(), [fileA, fileB]);
    expect(result).toBe(0);
  });
});
