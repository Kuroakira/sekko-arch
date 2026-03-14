import type {
  ConstraintsConfig,
  HealthReport,
  RuleViolation,
} from "../types/index.js";

interface ComplexFunction {
  readonly name: string;
  readonly file: string;
  readonly cc: number;
}

export function checkConstraints(
  constraints: ConstraintsConfig,
  health: HealthReport,
): RuleViolation[] {
  const violations: RuleViolation[] = [];

  if (
    constraints.max_cycles !== undefined &&
    health.dimensions.cycles.rawValue > constraints.max_cycles
  ) {
    violations.push({
      rule: "max_cycles",
      severity: "error",
      message: `Cycle count ${health.dimensions.cycles.rawValue} exceeds limit of ${constraints.max_cycles}`,
      affectedFiles: [],
    });
  }

  if (
    constraints.max_coupling !== undefined &&
    health.dimensions.coupling.rawValue > constraints.max_coupling
  ) {
    violations.push({
      rule: "max_coupling",
      severity: "error",
      message: `Coupling ${health.dimensions.coupling.rawValue} exceeds limit of ${constraints.max_coupling}`,
      affectedFiles: [],
    });
  }

  if (constraints.max_cc !== undefined) {
    const details = health.dimensions.complexFn.details;
    const complexFunctions = details?.complexFunctions as
      | readonly ComplexFunction[]
      | undefined;

    if (complexFunctions) {
      const maxCc = constraints.max_cc;
      const exceeding = complexFunctions.filter(
        (fn) => fn.cc > maxCc,
      );
      if (exceeding.length > 0) {
        violations.push({
          rule: "max_cc",
          severity: "error",
          message: `${exceeding.length} function(s) exceed cyclomatic complexity limit of ${constraints.max_cc}`,
          affectedFiles: exceeding.map((fn) => fn.file),
        });
      }
    } else if (health.dimensions.complexFn.rawValue > 0) {
      violations.push({
        rule: "max_cc",
        severity: "error",
        message: `Complex functions detected (rawValue: ${health.dimensions.complexFn.rawValue}) but details unavailable`,
        affectedFiles: [],
      });
    }
  }

  if (constraints.no_god_files === true) {
    const details = health.dimensions.godFiles.details;
    const godFiles = details?.godFiles as readonly string[] | undefined;

    if (godFiles) {
      if (godFiles.length > 0) {
        violations.push({
          rule: "no_god_files",
          severity: "error",
          message: `${godFiles.length} god file(s) detected`,
          affectedFiles: [...godFiles],
        });
      }
    } else if (health.dimensions.godFiles.rawValue > 0) {
      violations.push({
        rule: "no_god_files",
        severity: "error",
        message: `God files detected (rawValue: ${health.dimensions.godFiles.rawValue}) but details unavailable`,
        affectedFiles: [],
      });
    }
  }

  return violations;
}
