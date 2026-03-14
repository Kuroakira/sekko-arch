import { describe, it, expect } from "vitest";
import { checkConstraints } from "./constraints.js";
import type {
  ConstraintsConfig,
  HealthReport,
  DimensionGrades,
  DimensionResult,
} from "../types/index.js";

function makeDimension(
  name: DimensionResult["name"],
  rawValue: number,
  details?: Record<string, unknown>,
): DimensionResult {
  return { name, rawValue, grade: "A", details };
}

function makeHealth(overrides: Partial<DimensionGrades> = {}): HealthReport {
  const defaults: DimensionGrades = {
    cycles: makeDimension("cycles", 0),
    coupling: makeDimension("coupling", 0.3),
    depth: makeDimension("depth", 4),
    godFiles: makeDimension("godFiles", 0),
    complexFn: makeDimension("complexFn", 0),
    levelization: makeDimension("levelization", 0.8),
    blastRadius: makeDimension("blastRadius", 0.1),
  };
  return {
    dimensions: { ...defaults, ...overrides },
    compositeGrade: "A",
    fileCount: 10,
    scanDurationMs: 100,
  };
}

describe("checkConstraints", () => {
  it("returns no violations when constraints are empty", () => {
    const result = checkConstraints({}, makeHealth());
    expect(result).toEqual([]);
  });

  describe("max_cycles", () => {
    it("passes when cycle count is within limit", () => {
      const constraints: ConstraintsConfig = { max_cycles: 2 };
      const health = makeHealth({
        cycles: makeDimension("cycles", 2),
      });
      const result = checkConstraints(constraints, health);
      expect(result).toEqual([]);
    });

    it("fails when cycle count exceeds limit", () => {
      const constraints: ConstraintsConfig = { max_cycles: 1 };
      const health = makeHealth({
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
      const health = makeHealth({
        coupling: makeDimension("coupling", 0.5),
      });
      const result = checkConstraints(constraints, health);
      expect(result).toEqual([]);
    });

    it("fails when coupling exceeds limit", () => {
      const constraints: ConstraintsConfig = { max_coupling: 0.4 };
      const health = makeHealth({
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
      const health = makeHealth({
        complexFn: makeDimension("complexFn", 2, {
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
      const health = makeHealth({
        complexFn: makeDimension("complexFn", 3, {
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
      const health = makeHealth({
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
      const health = makeHealth({
        godFiles: makeDimension("godFiles", 0, { godFiles: [] }),
      });
      const result = checkConstraints(constraints, health);
      expect(result).toEqual([]);
    });

    it("fails when god files exist", () => {
      const constraints: ConstraintsConfig = { no_god_files: true };
      const health = makeHealth({
        godFiles: makeDimension("godFiles", 2, {
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
      const health = makeHealth({
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
      const health = makeHealth({
        godFiles: makeDimension("godFiles", 2, {
          godFiles: ["src/big.ts"],
        }),
      });
      const result = checkConstraints(constraints, health);
      expect(result).toEqual([]);
    });
  });
});
