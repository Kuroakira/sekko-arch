import type { DimensionName, Grade, GradeValue } from "../types/metrics.js";

const GRADE_TO_VALUE: ReadonlyMap<Grade, GradeValue> = new Map([
  ["A", 4],
  ["B", 3],
  ["C", 2],
  ["D", 1],
  ["F", 0],
]);

const VALUE_TO_GRADE: ReadonlyMap<GradeValue, Grade> = new Map([
  [4, "A"],
  [3, "B"],
  [2, "C"],
  [1, "D"],
  [0, "F"],
]);

export function gradeToValue(grade: Grade): GradeValue {
  const value = GRADE_TO_VALUE.get(grade);
  if (value === undefined) {
    throw new Error(`Unknown grade: ${String(grade)}`);
  }
  return value;
}

export function valueToGrade(value: GradeValue): Grade {
  const grade = VALUE_TO_GRADE.get(value);
  if (grade === undefined) {
    throw new Error(`Unknown grade value: ${String(value)}`);
  }
  return grade;
}

/**
 * Each threshold entry is [upperBound, grade].
 * Entries are checked in order; the first entry where rawValue <= upperBound wins.
 * The final entry uses Infinity to catch everything above.
 *
 * For dimensions where A requires exactly 0 (cycles, godFiles, levelization),
 * the first threshold is [0, "A"].
 */
type ThresholdEntry = readonly [number, Grade];

const THRESHOLDS: Readonly<Record<DimensionName, readonly ThresholdEntry[]>> = {
  cycles: [
    [0, "A"],
    [1, "B"],
    [3, "C"],
    [6, "D"],
    [Infinity, "F"],
  ],
  coupling: [
    [0.2, "A"],
    [0.35, "B"],
    [0.5, "C"],
    [0.7, "D"],
    [Infinity, "F"],
  ],
  depth: [
    [5, "A"],
    [8, "B"],
    [10, "C"],
    [15, "D"],
    [Infinity, "F"],
  ],
  godFiles: [
    [0, "A"],
    [0.01, "B"],
    [0.03, "C"],
    [0.05, "D"],
    [Infinity, "F"],
  ],
  complexFn: [
    [0.02, "A"],
    [0.05, "B"],
    [0.1, "C"],
    [0.2, "D"],
    [Infinity, "F"],
  ],
  levelization: [
    [0, "A"],
    [0.02, "B"],
    [0.05, "C"],
    [0.1, "D"],
    [Infinity, "F"],
  ],
  blastRadius: [
    [0.1, "A"],
    [0.2, "B"],
    [0.35, "C"],
    [0.5, "D"],
    [Infinity, "F"],
  ],
};

export function gradeDimension(name: DimensionName, rawValue: number): Grade {
  const entries = THRESHOLDS[name];
  for (const [upperBound, grade] of entries) {
    if (rawValue <= upperBound) {
      return grade;
    }
  }
  // Unreachable due to Infinity sentinel, but satisfies the type checker
  return "F";
}
