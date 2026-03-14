import { describe, it, expect } from "vitest";
import { computeDuplicationRatio } from "./duplication.js";
import { makeFuncInfo } from "../testing/fixtures.js";

describe("computeDuplicationRatio", () => {
  it("returns 0 for empty array", () => {
    expect(computeDuplicationRatio([])).toBe(0);
  });

  it("returns 0 when all functions are unique", () => {
    const fns = [
      makeFuncInfo({ bodyHash: "a" }),
      makeFuncInfo({ bodyHash: "b" }),
      makeFuncInfo({ bodyHash: "c" }),
    ];
    expect(computeDuplicationRatio(fns)).toBe(0);
  });

  it("returns correct ratio when 2 functions share hash", () => {
    const fns = [
      makeFuncInfo({ bodyHash: "a" }),
      makeFuncInfo({ bodyHash: "a" }),
      makeFuncInfo({ bodyHash: "b" }),
    ];
    expect(computeDuplicationRatio(fns)).toBe(2 / 3);
  });

  it("returns correct ratio when 3 functions share hash", () => {
    const fns = [
      makeFuncInfo({ bodyHash: "x" }),
      makeFuncInfo({ bodyHash: "x" }),
      makeFuncInfo({ bodyHash: "x" }),
      makeFuncInfo({ bodyHash: "y" }),
    ];
    expect(computeDuplicationRatio(fns)).toBe(3 / 4);
  });

  it("handles multiple duplicate groups", () => {
    const fns = [
      makeFuncInfo({ bodyHash: "a" }),
      makeFuncInfo({ bodyHash: "a" }),
      makeFuncInfo({ bodyHash: "b" }),
      makeFuncInfo({ bodyHash: "b" }),
    ];
    expect(computeDuplicationRatio(fns)).toBe(1);
  });
});
