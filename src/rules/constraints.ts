import type { ConstraintsConfig, RuleViolation } from "../types/rules.js";
import type { HealthReport } from "../types/metrics.js";

interface ComplexFunction {
  readonly name: string;
  readonly file: string;
  readonly cc: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isComplexFunction(value: unknown): value is ComplexFunction {
  if (!isRecord(value)) return false;
  return (
    typeof value["name"] === "string" &&
    typeof value["file"] === "string" &&
    typeof value["cc"] === "number"
  );
}

function parseComplexFunctions(
  details: Record<string, unknown> | undefined,
): readonly ComplexFunction[] {
  const raw = details?.complexFunctions;
  if (!Array.isArray(raw)) return [];
  return raw.filter(isComplexFunction);
}

function parseGodFiles(
  details: Record<string, unknown> | undefined,
): readonly string[] {
  const raw = details?.godFiles;
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === "string");
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
    const complexFnDetails = health.dimensions.complexFn.details;
    const complexFunctions = parseComplexFunctions(complexFnDetails);

    if (complexFnDetails !== undefined) {
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
    const godFileDetails = health.dimensions.godFiles.details;
    const godFiles = parseGodFiles(godFileDetails);

    if (godFileDetails !== undefined) {
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
