import { describe, it, expect } from "vitest";
import { isStable, computeInstability } from "./stability.js";

describe("isStable", () => {
  it("returns false when fanIn is below threshold", () => {
    const fanIn = new Map([["a.ts", 2]]);
    const fanOut = new Map([["a.ts", 0]]);
    expect(isStable("a.ts", fanIn, fanOut)).toBe(false);
  });

  it("returns true when high fanIn and low instability", () => {
    const fanIn = new Map([["a.ts", 10]]);
    const fanOut = new Map([["a.ts", 1]]);
    expect(isStable("a.ts", fanIn, fanOut)).toBe(true);
  });

  it("returns false when high fanIn but high instability", () => {
    const fanIn = new Map([["a.ts", 3]]);
    const fanOut = new Map([["a.ts", 10]]);
    expect(isStable("a.ts", fanIn, fanOut)).toBe(false);
  });

  it("returns true when total is 0", () => {
    const fanIn = new Map([["a.ts", 3]]);
    const fanOut = new Map<string, number>();
    expect(isStable("a.ts", fanIn, fanOut)).toBe(true);
  });

  it("returns false for unknown file", () => {
    expect(isStable("x.ts", new Map(), new Map())).toBe(false);
  });
});

describe("computeInstability", () => {
  it("returns 0 when total is 0", () => {
    expect(computeInstability(0, 0)).toBe(0);
  });

  it("returns 0 when fanOut is 0", () => {
    expect(computeInstability(5, 0)).toBe(0);
  });

  it("returns 1 when fanIn is 0", () => {
    expect(computeInstability(0, 5)).toBe(1);
  });

  it("returns correct ratio", () => {
    expect(computeInstability(6, 4)).toBeCloseTo(0.4);
  });
});
