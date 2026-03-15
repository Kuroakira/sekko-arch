import { describe, it, expect } from "vitest";
import { resolve } from "node:path";
import { executePipeline } from "../cli/scan.js";
import { DIMENSION_NAMES } from "../dimensions.js";
import type { Grade } from "../types/metrics.js";

const PROJECT_ROOT = resolve(import.meta.dirname, "../..");

const VALID_GRADES: readonly Grade[] = ["A", "B", "C", "D", "F"];

describe("E2E: self-scan", { timeout: 60000 }, () => {
  const result = executePipeline(PROJECT_ROOT);
  const { health } = result;

  it("produces a grade for all 19 dimensions", () => {
    for (const name of DIMENSION_NAMES) {
      const dim = health.dimensions[name];
      expect(dim, `missing dimension: ${name}`).toBeDefined();
      expect(VALID_GRADES).toContain(dim.grade);
    }
  });

  it("has at most 3 F grades", () => {
    const fGrades = DIMENSION_NAMES.filter(
      (name) => health.dimensions[name].grade === "F",
    );
    expect(
      fGrades.length,
      `Too many F grades (${fGrades.length}): ${fGrades.join(", ")}`,
    ).toBeLessThanOrEqual(3);
  });

  it("finds a reasonable number of TS files (>20, <500)", () => {
    expect(health.fileCount).toBeGreaterThan(20);
    expect(health.fileCount).toBeLessThan(500);
  });

  it("has a valid composite grade", () => {
    expect(VALID_GRADES).toContain(health.compositeGrade);
  });

  it("has rawValue as a finite number >= 0 for every dimension", () => {
    for (const name of DIMENSION_NAMES) {
      const dim = health.dimensions[name];
      expect(
        Number.isFinite(dim.rawValue),
        `${name} rawValue is not finite: ${dim.rawValue}`,
      ).toBe(true);
      expect(
        dim.rawValue,
        `${name} rawValue is negative: ${dim.rawValue}`,
      ).toBeGreaterThanOrEqual(0);
    }
  });

  it("completes scan in under 30 seconds", () => {
    expect(health.scanDurationMs).toBeGreaterThan(0);
    expect(health.scanDurationMs).toBeLessThan(30000);
  });

  describe("sanity checks", () => {
    it("cycles rawValue is >= 0", () => {
      expect(health.dimensions.cycles.rawValue).toBeGreaterThanOrEqual(0);
    });

    it("coupling rawValue is between 0 and 1", () => {
      expect(health.dimensions.coupling.rawValue).toBeGreaterThanOrEqual(0);
      expect(health.dimensions.coupling.rawValue).toBeLessThanOrEqual(1);
    });

    it("no dimension has rawValue of NaN or Infinity", () => {
      for (const name of DIMENSION_NAMES) {
        const val = health.dimensions[name].rawValue;
        expect(Number.isNaN(val), `${name} is NaN`).toBe(false);
        expect(
          val === Infinity || val === -Infinity,
          `${name} is Infinity`,
        ).toBe(false);
      }
    });
  });
});
