import { describe, it, expect } from "vitest";
import { checkConstraints } from "./constraints.js";
import type {
  ConstraintsConfig,
  DimensionGrades,
} from "../types/index.js";
import { makeDimension, makeHealth } from "../testing/fixtures.js";

function makeConstraintHealth(overrides: Partial<DimensionGrades> = {}) {
  const base = makeHealth();
  return makeHealth({
    dimensions: { ...base.dimensions, ...overrides },
    fileCount: 10,
    scanDurationMs: 100,
  });
}

describe("checkConstraints", () => {
  it("returns no violations when constraints are empty", () => {
    const result = checkConstraints({}, makeConstraintHealth());
    expect(result).toEqual([]);
  });

  describe("max_cycles", () => {
    it("passes when cycle count is within limit", () => {
      const constraints: ConstraintsConfig = { max_cycles: 2 };
      const health = makeConstraintHealth({
        cycles: makeDimension("cycles", 2),
      });
      const result = checkConstraints(constraints, health);
      expect(result).toEqual([]);
    });

    it("fails when cycle count exceeds limit", () => {
      const constraints: ConstraintsConfig = { max_cycles: 1 };
      const health = makeConstraintHealth({
        cycles: makeDimension("cycles", 3),
      });
      const result = checkConstraints(constraints, health);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        rule: "max_cycles",
        severity: "error",
        message: expect.stringContaining("3"),
      });
    });
  });

  describe("max_coupling", () => {
    it("passes when coupling is within limit", () => {
      const constraints: ConstraintsConfig = { max_coupling: 0.5 };
      const health = makeConstraintHealth({
        coupling: makeDimension("coupling", 0.5),
      });
      const result = checkConstraints(constraints, health);
      expect(result).toEqual([]);
    });

    it("fails when coupling exceeds limit", () => {
      const constraints: ConstraintsConfig = { max_coupling: 0.4 };
      const health = makeConstraintHealth({
        coupling: makeDimension("coupling", 0.6),
      });
      const result = checkConstraints(constraints, health);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        rule: "max_coupling",
        severity: "error",
        message: expect.stringContaining("0.6"),
      });
    });
  });

  describe("max_cc", () => {
    it("passes when no functions exceed CC limit", () => {
      const constraints: ConstraintsConfig = { max_cc: 10 };
      const health = makeConstraintHealth({
        complexFn: makeDimension("complexFn", 2, "A", {
          complexFunctions: [
            { name: "foo", file: "a.ts", cc: 8 },
            { name: "bar", file: "b.ts", cc: 10 },
          ],
        }),
      });
      const result = checkConstraints(constraints, health);
      expect(result).toEqual([]);
    });

    it("fails when functions exceed CC limit", () => {
      const constraints: ConstraintsConfig = { max_cc: 10 };
      const health = makeConstraintHealth({
        complexFn: makeDimension("complexFn", 3, "A", {
          complexFunctions: [
            { name: "foo", file: "a.ts", cc: 8 },
            { name: "bar", file: "b.ts", cc: 15 },
            { name: "baz", file: "c.ts", cc: 12 },
          ],
        }),
      });
      const result = checkConstraints(constraints, health);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        rule: "max_cc",
        severity: "error",
      });
      expect(result[0].affectedFiles).toContain("b.ts");
      expect(result[0].affectedFiles).toContain("c.ts");
      expect(result[0].affectedFiles).not.toContain("a.ts");
    });

    it("falls back to rawValue when details unavailable", () => {
      const constraints: ConstraintsConfig = { max_cc: 10 };
      const health = makeConstraintHealth({
        complexFn: makeDimension("complexFn", 3),
      });
      const result = checkConstraints(constraints, health);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        rule: "max_cc",
        severity: "error",
      });
    });
  });

  describe("no_god_files", () => {
    it("passes when no god files exist", () => {
      const constraints: ConstraintsConfig = { no_god_files: true };
      const health = makeConstraintHealth({
        godFiles: makeDimension("godFiles", 0, "A", { godFiles: [] }),
      });
      const result = checkConstraints(constraints, health);
      expect(result).toEqual([]);
    });

    it("fails when god files exist", () => {
      const constraints: ConstraintsConfig = { no_god_files: true };
      const health = makeConstraintHealth({
        godFiles: makeDimension("godFiles", 2, "A", {
          godFiles: ["src/big.ts", "src/huge.ts"],
        }),
      });
      const result = checkConstraints(constraints, health);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        rule: "no_god_files",
        severity: "error",
      });
      expect(result[0].affectedFiles).toEqual(["src/big.ts", "src/huge.ts"]);
    });

    it("falls back to rawValue when details unavailable", () => {
      const constraints: ConstraintsConfig = { no_god_files: true };
      const health = makeConstraintHealth({
        godFiles: makeDimension("godFiles", 2),
      });
      const result = checkConstraints(constraints, health);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        rule: "no_god_files",
        severity: "error",
      });
    });

    it("does not check when no_god_files is false", () => {
      const constraints: ConstraintsConfig = { no_god_files: false };
      const health = makeConstraintHealth({
        godFiles: makeDimension("godFiles", 2, "A", {
          godFiles: ["src/big.ts"],
        }),
      });
      const result = checkConstraints(constraints, health);
      expect(result).toEqual([]);
    });
  });
});
