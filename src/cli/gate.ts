import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Grade, HealthReport } from "../types/index.js";
import { executePipeline } from "./scan.js";

export interface Baseline {
  readonly couplingScore: number;
  readonly cycleCount: number;
  readonly godFileCount: number;
  readonly complexFnCount: number;
  readonly maxDepth: number;
  readonly compositeGrade: Grade;
  readonly dimensionGrades: {
    readonly cycles: Grade;
    readonly coupling: Grade;
    readonly depth: Grade;
    readonly godFiles: Grade;
    readonly complexFn: Grade;
    readonly levelization: Grade;
    readonly blastRadius: Grade;
  };
}

const VALID_GRADES: ReadonlySet<string> = new Set(["A", "B", "C", "D", "F"]);

function isGrade(value: unknown): value is Grade {
  return typeof value === "string" && VALID_GRADES.has(value);
}

function isBaseline(value: unknown): value is Baseline {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  if (
    typeof obj["couplingScore"] !== "number" ||
    typeof obj["cycleCount"] !== "number" ||
    typeof obj["godFileCount"] !== "number" ||
    typeof obj["complexFnCount"] !== "number" ||
    typeof obj["maxDepth"] !== "number"
  ) {
    return false;
  }

  if (!isGrade(obj["compositeGrade"])) {
    return false;
  }

  const dg = obj["dimensionGrades"];
  if (typeof dg !== "object" || dg === null) {
    return false;
  }

  const grades = dg as Record<string, unknown>;
  const requiredDimensions = [
    "cycles",
    "coupling",
    "depth",
    "godFiles",
    "complexFn",
    "levelization",
    "blastRadius",
  ];

  return requiredDimensions.every((key) => isGrade(grades[key]));
}

const GRADE_ORDER: readonly Grade[] = ["A", "B", "C", "D", "F"];

function gradeIndex(grade: Grade): number {
  return GRADE_ORDER.indexOf(grade);
}

function extractBaseline(health: HealthReport): Baseline {
  const d = health.dimensions;
  return {
    couplingScore: d.coupling.rawValue,
    cycleCount: d.cycles.rawValue,
    godFileCount: d.godFiles.rawValue,
    complexFnCount: d.complexFn.rawValue,
    maxDepth: d.depth.rawValue,
    compositeGrade: health.compositeGrade,
    dimensionGrades: {
      cycles: d.cycles.grade,
      coupling: d.coupling.grade,
      depth: d.depth.grade,
      godFiles: d.godFiles.grade,
      complexFn: d.complexFn.grade,
      levelization: d.levelization.grade,
      blastRadius: d.blastRadius.grade,
    },
  };
}

function baselinePath(rootDir: string): string {
  return join(resolve(rootDir), ".archana", "baseline.json");
}

export function saveBaseline(rootDir: string): void {
  const { health } = executePipeline(resolve(rootDir));
  const baseline = extractBaseline(health);

  const dir = join(resolve(rootDir), ".archana");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(baselinePath(rootDir), JSON.stringify(baseline, null, 2));
  console.log("Baseline saved to .archana/baseline.json");
}

export function compareBaseline(rootDir: string): {
  passed: boolean;
  degradations: string[];
} {
  const filePath = baselinePath(rootDir);
  if (!existsSync(filePath)) {
    throw new Error(
      "No baseline found. Run with --save to create a baseline first.",
    );
  }

  const raw = readFileSync(filePath, "utf-8");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new Error(
      `Failed to parse baseline.json: invalid JSON. Delete the file and re-run with --save.`,
    );
  }

  if (!isBaseline(parsed)) {
    throw new Error(
      `Invalid baseline: file does not match expected schema. Delete the file and re-run with --save.`,
    );
  }

  const baseline = parsed;
  const { health } = executePipeline(resolve(rootDir));
  const current = extractBaseline(health);

  const degradations: string[] = [];

  if (current.couplingScore > baseline.couplingScore + 0.05) {
    degradations.push(
      `coupling score degraded: ${baseline.couplingScore.toFixed(2)} -> ${current.couplingScore.toFixed(2)} (threshold: +0.05)`,
    );
  }

  if (current.cycleCount > baseline.cycleCount) {
    degradations.push(
      `cycle count increased: ${baseline.cycleCount} -> ${current.cycleCount}`,
    );
  }

  if (current.godFileCount > baseline.godFileCount) {
    degradations.push(
      `god file count increased: ${baseline.godFileCount} -> ${current.godFileCount}`,
    );
  }

  if (current.complexFnCount > baseline.complexFnCount) {
    degradations.push(
      `complex function count increased: ${baseline.complexFnCount} -> ${current.complexFnCount}`,
    );
  }

  if (current.maxDepth > baseline.maxDepth) {
    degradations.push(
      `max depth increased: ${baseline.maxDepth} -> ${current.maxDepth}`,
    );
  }

  if (gradeIndex(current.compositeGrade) > gradeIndex(baseline.compositeGrade)) {
    degradations.push(
      `composite grade dropped: ${baseline.compositeGrade} -> ${current.compositeGrade}`,
    );
  }

  return {
    passed: degradations.length === 0,
    degradations,
  };
}

export function runGate(
  path: string,
  options: { readonly save: boolean },
): void {
  if (options.save) {
    saveBaseline(path);
    return;
  }

  const result = compareBaseline(path);

  if (result.passed) {
    console.log("Quality gate PASSED - no degradations detected.");
    return;
  }

  console.error("Quality gate FAILED - degradations detected:");
  for (const degradation of result.degradations) {
    console.error(`  - ${degradation}`);
  }
  process.exit(1);
}
