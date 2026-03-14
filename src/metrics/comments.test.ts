import { describe, it, expect } from "vitest";
import { computeCommentRawValue } from "./comments.js";
import { makeFileNode } from "../testing/fixtures.js";

describe("computeCommentRawValue", () => {
  it("returns 0 for empty array (no files to analyze)", () => {
    expect(computeCommentRawValue([])).toBe(0);
  });

  it("returns 0.92 for 8% comment ratio", () => {
    const files = [makeFileNode({ lines: 100, comments: 8 })];
    expect(computeCommentRawValue(files)).toBe(0.92);
  });

  it("returns 1.0 for 0% comment ratio", () => {
    const files = [makeFileNode({ lines: 100, comments: 0 })];
    expect(computeCommentRawValue(files)).toBe(1.0);
  });

  it("returns 0.5 for 50% comment ratio", () => {
    const files = [makeFileNode({ lines: 100, comments: 50 })];
    expect(computeCommentRawValue(files)).toBe(0.5);
  });

  it("aggregates across multiple files", () => {
    const files = [
      makeFileNode({ lines: 100, comments: 10 }),
      makeFileNode({ lines: 100, comments: 20 }),
    ];
    expect(computeCommentRawValue(files)).toBe(0.85);
  });
});
