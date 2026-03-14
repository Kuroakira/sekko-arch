import type { DimensionGrades, Grade, GradeValue } from "../types/metrics.js";
import { gradeToValue, valueToGrade } from "./thresholds.js";

const VALID_GRADE_VALUES: readonly GradeValue[] = [0, 1, 2, 3, 4];

function clampToGradeValue(n: number): GradeValue {
  const clamped = Math.max(0, Math.min(4, n));
  const found = VALID_GRADE_VALUES.find((v) => v === clamped);
  if (found === undefined) {
    throw new Error(`Cannot convert ${String(n)} to a valid GradeValue`);
  }
  return found;
}

/**
 * Composite grade formula:
 *   composite = min(floor(mean(all_dimension_values)), worst_dimension + 1)
 *
 * This ensures a single terrible dimension drags the overall grade down,
 * while the mean reflects general health across all dimensions.
 */
export function computeCompositeGrade(dimensions: DimensionGrades): Grade {
  const values: readonly GradeValue[] = [
    gradeToValue(dimensions.cycles.grade),
    gradeToValue(dimensions.coupling.grade),
    gradeToValue(dimensions.depth.grade),
    gradeToValue(dimensions.godFiles.grade),
    gradeToValue(dimensions.complexFn.grade),
    gradeToValue(dimensions.levelization.grade),
    gradeToValue(dimensions.blastRadius.grade),
  ];

  let sum = 0;
  for (const v of values) {
    sum += v;
  }
  const mean = Math.floor(sum / values.length);
  const worst = Math.min(...values);
  const worstPlusOne = worst + 1;

  const composite = Math.min(mean, worstPlusOne);

  return valueToGrade(clampToGradeValue(composite));
}
