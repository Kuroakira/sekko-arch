import { describe, it, expect } from "vitest";
import { computeHighParamsRatio } from "./high-params.js";
import { makeFuncInfo } from "../testing/fixtures.js";

describe("computeHighParamsRatio", () => {
  it("returns 0 for empty array", () => {
    expect(computeHighParamsRatio([])).toBe(0);
  });

  it("returns 0 when all functions have few params", () => {
    const fns = [
      makeFuncInfo({ paramCount: 1 }),
      makeFuncInfo({ paramCount: 3 }),
      makeFuncInfo({ paramCount: 4 }),
    ];
    expect(computeHighParamsRatio(fns)).toBe(0);
  });

  it("returns correct ratio", () => {
    const fns = [
      makeFuncInfo({ paramCount: 2 }),
      makeFuncInfo({ paramCount: 5 }),
      makeFuncInfo({ paramCount: 8 }),
    ];
    expect(computeHighParamsRatio(fns)).toBeCloseTo(2 / 3);
  });

  it("returns 1 when all functions have many params", () => {
    const fns = [
      makeFuncInfo({ paramCount: 5 }),
      makeFuncInfo({ paramCount: 10 }),
    ];
    expect(computeHighParamsRatio(fns)).toBe(1);
  });
});
