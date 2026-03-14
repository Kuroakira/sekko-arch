import { describe, it, expect } from "vitest";
import { checkRules } from "./index.js";
import type {
  RulesConfig,
  HealthReport,
  ImportEdge,
} from "../types/index.js";
import { makeDimension, makeHealth as makeSharedHealth } from "../testing/fixtures.js";

function makeHealth(overrides: Partial<HealthReport> = {}) {
  return makeSharedHealth({
    fileCount: 10,
    scanDurationMs: 100,
    ...overrides,
  });
}

describe("checkRules", () => {
  it("returns passed with no violations when all rules pass", () => {
    const config: RulesConfig = {
      constraints: { max_cycles: 5, max_coupling: 0.5 },
    };
    const health = makeHealth();
    const edges: ImportEdge[] = [];

    const result = checkRules(config, health, edges);

    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
    expect(result.rulesChecked).toBeGreaterThan(0);
  });

  it("returns failed with violations when constraints are violated", () => {
    const config: RulesConfig = {
      constraints: { max_cycles: 0 },
    };
    const health = makeHealth({
      dimensions: {
        ...makeHealth().dimensions,
        cycles: makeDimension("cycles", 3),
      },
    });
    const edges: ImportEdge[] = [];

    const result = checkRules(config, health, edges);

    expect(result.passed).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.violations[0].rule).toBe("max_cycles");
  });

  it("checks layer violations from edges", () => {
    const config: RulesConfig = {
      layers: [
        { name: "controllers", paths: ["src/controllers/**"], order: 0 },
        { name: "services", paths: ["src/services/**"], order: 1 },
      ],
    };
    const health = makeHealth();
    const edges: ImportEdge[] = [
      {
        fromFile: "src/services/user.ts",
        toFile: "src/controllers/handler.ts",
      },
    ];

    const result = checkRules(config, health, edges);

    expect(result.passed).toBe(false);
    expect(result.violations.some((v) => v.rule === "layer_violation")).toBe(
      true,
    );
  });

  it("checks boundary violations from edges", () => {
    const config: RulesConfig = {
      boundaries: [
        { from: "src/ui/**", to: "src/db/**", reason: "UI must not access DB" },
      ],
    };
    const health = makeHealth();
    const edges: ImportEdge[] = [
      { fromFile: "src/ui/page.ts", toFile: "src/db/query.ts" },
    ];

    const result = checkRules(config, health, edges);

    expect(result.passed).toBe(false);
    expect(
      result.violations.some((v) => v.rule === "boundary_violation"),
    ).toBe(true);
  });

  it("aggregates violations from all rule types", () => {
    const config: RulesConfig = {
      constraints: { max_cycles: 0 },
      boundaries: [{ from: "src/a/**", to: "src/b/**" }],
    };
    const health = makeHealth({
      dimensions: {
        ...makeHealth().dimensions,
        cycles: makeDimension("cycles", 2),
      },
    });
    const edges: ImportEdge[] = [
      { fromFile: "src/a/x.ts", toFile: "src/b/y.ts" },
    ];

    const result = checkRules(config, health, edges);

    expect(result.passed).toBe(false);
    expect(result.violations.length).toBe(2);
    expect(result.violations.map((v) => v.rule).sort()).toEqual([
      "boundary_violation",
      "max_cycles",
    ]);
  });

  it("returns passed with empty config", () => {
    const config: RulesConfig = {};
    const health = makeHealth();
    const edges: ImportEdge[] = [];

    const result = checkRules(config, health, edges);

    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
    expect(result.rulesChecked).toBe(0);
  });
});
