import { describe, it, expect } from "vitest";
import { computeCognitiveComplexityRatio } from "./cognitive-complexity.js";
import { makeFuncInfo } from "../testing/fixtures.js";

describe("computeCognitiveComplexityRatio", () => {
  it("returns 0 for empty array", () => {
    expect(computeCognitiveComplexityRatio([])).toBe(0);
  });

  it("returns 0 when all below threshold", () => {
    const fns = [
      makeFuncInfo({ cognitiveComplexity: 5 }),
      makeFuncInfo({ cognitiveComplexity: 10 }),
      makeFuncInfo({ cognitiveComplexity: 15 }),
    ];
    expect(computeCognitiveComplexityRatio(fns)).toBe(0);
  });

  it("returns correct ratio", () => {
    const fns = [
      makeFuncInfo({ cognitiveComplexity: 5 }),
      makeFuncInfo({ cognitiveComplexity: 16 }),
      makeFuncInfo({ cognitiveComplexity: 30 }),
    ];
    expect(computeCognitiveComplexityRatio(fns)).toBeCloseTo(2 / 3);
  });

  it("returns 1 when all above threshold", () => {
    const fns = [
      makeFuncInfo({ cognitiveComplexity: 16 }),
      makeFuncInfo({ cognitiveComplexity: 25 }),
    ];
    expect(computeCognitiveComplexityRatio(fns)).toBe(1);
  });
});
