import { describe, it, expect } from "vitest";
import { computeHotspotRatio } from "./hotspots.js";
import type { FanMaps } from "./fan-maps.js";

describe("computeHotspotRatio", () => {
  it("returns 0 for empty maps", () => {
    const fanMaps: FanMaps = {
      fanIn: new Map(),
      fanOut: new Map(),
    };
    expect(computeHotspotRatio(fanMaps)).toBe(0);
  });

  it("returns 0 when no hotspots", () => {
    const fanMaps: FanMaps = {
      fanIn: new Map([["a", 2]]),
      fanOut: new Map([["a", 2]]),
    };
    // I = 2/(2+2) = 0.5, score = 2 * 0.5 = 1.0 < 5.0
    expect(computeHotspotRatio(fanMaps)).toBe(0);
  });

  it("detects hotspot when fanIn * instability >= 5.0", () => {
    const fanMaps: FanMaps = {
      fanIn: new Map([["a", 10]]),
      fanOut: new Map([["a", 10]]),
    };
    // I = 10/(10+10) = 0.5, score = 10 * 0.5 = 5.0 >= 5.0
    expect(computeHotspotRatio(fanMaps)).toBe(1);
  });

  it("returns correct ratio with mixed files", () => {
    const fanMaps: FanMaps = {
      fanIn: new Map([
        ["a", 10],
        ["b", 2],
      ]),
      fanOut: new Map([
        ["a", 10],
        ["b", 2],
      ]),
    };
    // a: I=0.5, score=5.0 (hotspot); b: I=0.5, score=1.0 (not hotspot)
    expect(computeHotspotRatio(fanMaps)).toBe(0.5);
  });

  it("handles file with zero total", () => {
    const fanMaps: FanMaps = {
      fanIn: new Map([["a", 0]]),
      fanOut: new Map([["a", 0]]),
    };
    // total=0, I=0, score=0 → not hotspot
    expect(computeHotspotRatio(fanMaps)).toBe(0);
  });
});
