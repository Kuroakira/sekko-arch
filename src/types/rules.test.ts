import { describe, it, expect } from "vitest";
import type { Severity, RuleViolation, RuleCheckResult } from "./rules.js";

describe("Rules Types", () => {
  it("Severity type accepts all levels", () => {
    const levels: Severity[] = ["error", "warning"];
    expect(levels).toHaveLength(2);
  });

  it("constructs a RuleViolation", () => {
    const violation: RuleViolation = {
      rule: "max_cycles",
      severity: "error",
      message: "Cycle count 5 exceeds maximum 2",
      affectedFiles: ["src/a.ts", "src/b.ts", "src/c.ts"],
    };
    expect(violation.severity).toBe("error");
    expect(violation.affectedFiles).toHaveLength(3);
  });

  it("constructs a passing RuleCheckResult", () => {
    const result: RuleCheckResult = {
      passed: true,
      violations: [],
      rulesChecked: 4,
    };
    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it("constructs a failing RuleCheckResult", () => {
    const result: RuleCheckResult = {
      passed: false,
      violations: [
        {
          rule: "no_god_files",
          severity: "error",
          message: "God file detected: src/app.ts (fan-out: 22)",
          affectedFiles: ["src/app.ts"],
        },
        {
          rule: "layer_direction",
          severity: "warning",
          message: "Layer violation: ui imports from data",
          affectedFiles: ["src/ui/form.ts"],
        },
      ],
      rulesChecked: 6,
    };
    expect(result.passed).toBe(false);
    expect(result.violations).toHaveLength(2);
    expect(result.rulesChecked).toBe(6);
  });
});
