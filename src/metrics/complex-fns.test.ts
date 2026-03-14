import { describe, it, expect } from "vitest";
import { computeComplexFnRatio, detectEntryPoints } from "./complex-fns.js";
import type { FuncInfo } from "../types/index.js";

function makeFn(name: string, cc: number): FuncInfo {
  return { name, startLine: 1, endLine: 10, lineCount: 10, cc, paramCount: 1 };
}

describe("computeComplexFnRatio", () => {
  it("returns 0 for no functions", () => {
    expect(computeComplexFnRatio([])).toBe(0);
  });

  it("returns 0 when no functions exceed threshold", () => {
    const fns = [makeFn("a", 5), makeFn("b", 10), makeFn("c", 15)];
    expect(computeComplexFnRatio(fns)).toBe(0);
  });

  it("returns correct ratio for complex functions", () => {
    const fns = [makeFn("a", 5), makeFn("b", 16), makeFn("c", 20)];
    expect(computeComplexFnRatio(fns)).toBeCloseTo(2 / 3);
  });

  it("returns 1 when all functions exceed threshold", () => {
    const fns = [makeFn("a", 16), makeFn("b", 25)];
    expect(computeComplexFnRatio(fns)).toBe(1);
  });
});

describe("detectEntryPoints", () => {
  it("detects index.ts as entry point", () => {
    const result = detectEntryPoints(["src/index.ts", "src/auth/login.ts"]);
    expect(result.has("src/index.ts")).toBe(true);
    expect(result.has("src/auth/login.ts")).toBe(false);
  });

  it("detects main.ts as entry point", () => {
    const result = detectEntryPoints(["src/main.ts"]);
    expect(result.has("src/main.ts")).toBe(true);
  });

  it("returns empty for no entry points", () => {
    const result = detectEntryPoints(["src/auth/login.ts", "src/utils/helpers.ts"]);
    expect(result.size).toBe(0);
  });
});
