import { describe, it, expect } from "vitest";
import { computeLongFunctionRatio } from "./long-functions.js";
import { makeFuncInfo } from "../testing/fixtures.js";

describe("computeLongFunctionRatio", () => {
  it("returns 0 for empty array", () => {
    expect(computeLongFunctionRatio([])).toBe(0);
  });

  it("returns 0 when all functions are short", () => {
    const fns = [
      makeFuncInfo({ name: "a", lineCount: 10 }),
      makeFuncInfo({ name: "b", lineCount: 30 }),
      makeFuncInfo({ name: "c", lineCount: 50 }),
    ];
    expect(computeLongFunctionRatio(fns)).toBe(0);
  });

  it("returns correct ratio for long functions", () => {
    const fns = [
      makeFuncInfo({ name: "a", lineCount: 10 }),
      makeFuncInfo({ name: "b", lineCount: 51 }),
      makeFuncInfo({ name: "c", lineCount: 100 }),
    ];
    expect(computeLongFunctionRatio(fns)).toBeCloseTo(2 / 3);
  });

  it("returns 1 when all functions are long", () => {
    const fns = [
      makeFuncInfo({ name: "a", lineCount: 51 }),
      makeFuncInfo({ name: "b", lineCount: 200 }),
    ];
    expect(computeLongFunctionRatio(fns)).toBe(1);
  });
});
