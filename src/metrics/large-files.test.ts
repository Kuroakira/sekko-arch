import { describe, it, expect } from "vitest";
import { computeLargeFileRatio } from "./large-files.js";
import { makeFileNode } from "../testing/fixtures.js";

describe("computeLargeFileRatio", () => {
  it("returns 0 for empty array", () => {
    expect(computeLargeFileRatio([])).toBe(0);
  });

  it("returns 0 when all files are small", () => {
    const files = [
      makeFileNode({ lines: 100 }),
      makeFileNode({ lines: 300 }),
      makeFileNode({ lines: 500 }),
    ];
    expect(computeLargeFileRatio(files)).toBe(0);
  });

  it("returns correct ratio for large files", () => {
    const files = [
      makeFileNode({ lines: 100 }),
      makeFileNode({ lines: 501 }),
      makeFileNode({ lines: 1000 }),
    ];
    expect(computeLargeFileRatio(files)).toBeCloseTo(2 / 3);
  });

  it("returns 1 when all files are large", () => {
    const files = [
      makeFileNode({ lines: 501 }),
      makeFileNode({ lines: 1000 }),
    ];
    expect(computeLargeFileRatio(files)).toBe(1);
  });
});
