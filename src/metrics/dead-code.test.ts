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
    expect(result.ratio).toBe(0);
    expect(result.deadFiles).toHaveLength(0);
  });

  it("returns 0 when all files are referenced", () => {
    const fileA = makeFileNode({
      path: "src/a.ts",
      sa: { functions: [makeFuncInfo(), makeFuncInfo()], classes: [], imports: [] },
    });
    const reverseAdj = new Map([["src/a.ts", ["src/b.ts"]]]);

    const result = computeDeadCodeRatio(reverseAdj, new Set(), [fileA]);
    expect(result.ratio).toBe(0);
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
    expect(result.ratio).toBeCloseTo(1 / 3);
    expect(result.deadFiles).toContain("src/b.ts");
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
    expect(result.ratio).toBe(1 / 2);
    expect(result.deadFiles).toContain("src/a.ts");
    expect(result.deadFiles).not.toContain("src/index.ts");
  });

  it("returns 0 when files have no functions", () => {
    const fileA = makeFileNode({ path: "src/a.ts" });
    const fileB = makeFileNode({
      path: "src/b.ts",
      sa: { functions: [], classes: [], imports: [] },
    });

    const result = computeDeadCodeRatio(new Map(), new Set(), [fileA, fileB]);
    expect(result.ratio).toBe(0);
  });
});
