import type { DimensionName, Grade, GradeValue } from "../types/metrics.js";
import { getDimensionConfig } from "../dimensions.js";

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

export function gradeDimension(name: DimensionName, rawValue: number): Grade {
  const config = getDimensionConfig(name);
  for (const [upperBound, grade] of config.thresholds) {
    if (rawValue <= upperBound) {
      return grade;
    }
  }
  return "F";
}
