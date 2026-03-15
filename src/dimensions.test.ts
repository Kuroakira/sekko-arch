import { describe, it, expect } from "vitest";
import {
  DIMENSION_REGISTRY,
  DIMENSION_NAMES,
  getDimensionConfig,
} from "./dimensions.js";
import type { DimensionCategory } from "./dimensions.js";

describe("DIMENSION_REGISTRY", () => {
  it("has 24 entries", () => {
    expect(DIMENSION_REGISTRY).toHaveLength(24);
  });

  it("every entry has a category", () => {
    for (const config of DIMENSION_REGISTRY) {
      expect(config.category).toBeDefined();
    }
  });

  it("category values are valid", () => {
    const validCategories: ReadonlySet<DimensionCategory> = new Set([
      "module-structure",
      "file-function",
      "architecture",
      "evolution",
      "test-structure",
    ]);
    for (const config of DIMENSION_REGISTRY) {
      expect(validCategories.has(config.category)).toBe(true);
    }
  });

  it("module-structure contains cycles, coupling, cohesion, entropy", () => {
    const moduleStructure = DIMENSION_REGISTRY.filter(
      (d) => d.category === "module-structure",
    ).map((d) => d.name);
    expect(moduleStructure).toContain("cycles");
    expect(moduleStructure).toContain("coupling");
    expect(moduleStructure).toContain("cohesion");
    expect(moduleStructure).toContain("entropy");
  });

  it("evolution contains codeChurn, changeCoupling, busFactor, codeAge", () => {
    const evolution = DIMENSION_REGISTRY.filter(
      (d) => d.category === "evolution",
    ).map((d) => d.name);
    expect(evolution).toContain("codeChurn");
    expect(evolution).toContain("changeCoupling");
    expect(evolution).toContain("busFactor");
    expect(evolution).toContain("codeAge");
  });

  it("test-structure contains testCoverageGap", () => {
    const testStructure = DIMENSION_REGISTRY.filter(
      (d) => d.category === "test-structure",
    ).map((d) => d.name);
    expect(testStructure).toContain("testCoverageGap");
  });
});

describe("DIMENSION_NAMES", () => {
  it("has 24 entries", () => {
    expect(DIMENSION_NAMES).toHaveLength(24);
  });

  it("includes the 5 new dimension names", () => {
    expect(DIMENSION_NAMES).toContain("codeChurn");
    expect(DIMENSION_NAMES).toContain("changeCoupling");
    expect(DIMENSION_NAMES).toContain("busFactor");
    expect(DIMENSION_NAMES).toContain("codeAge");
    expect(DIMENSION_NAMES).toContain("testCoverageGap");
  });
});

describe("getDimensionConfig", () => {
  it("returns config for new dimensions", () => {
    const churn = getDimensionConfig("codeChurn");
    expect(churn.label).toBe("Code Churn");
    expect(churn.category).toBe("evolution");

    const gap = getDimensionConfig("testCoverageGap");
    expect(gap.label).toBe("Test Coverage Gap");
    expect(gap.category).toBe("test-structure");
  });

  it("returns correct thresholds for codeChurn", () => {
    const config = getDimensionConfig("codeChurn");
    expect(config.thresholds[0]).toEqual([0.5, "A"]);
    expect(config.thresholds[1]).toEqual([0.6, "B"]);
  });

  it("returns correct thresholds for changeCoupling", () => {
    const config = getDimensionConfig("changeCoupling");
    expect(config.thresholds[0]).toEqual([0, "A"]);
  });

  it("returns correct thresholds for busFactor", () => {
    const config = getDimensionConfig("busFactor");
    expect(config.thresholds[0]).toEqual([0.2, "A"]);
  });

  it("returns correct thresholds for codeAge", () => {
    const config = getDimensionConfig("codeAge");
    expect(config.thresholds[0]).toEqual([0.1, "A"]);
  });

  it("returns correct thresholds for testCoverageGap", () => {
    const config = getDimensionConfig("testCoverageGap");
    expect(config.thresholds[0]).toEqual([0.1, "A"]);
  });
});
