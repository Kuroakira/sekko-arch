export type Grade = "A" | "B" | "C" | "D" | "F";

export type GradeValue = 0 | 1 | 2 | 3 | 4;

export type DimensionName =
  | "cycles"
  | "coupling"
  | "depth"
  | "godFiles"
  | "complexFn"
  | "levelization"
  | "blastRadius";

export interface DimensionResult {
  readonly name: DimensionName;
  readonly rawValue: number;
  readonly grade: Grade;
  readonly details?: Record<string, unknown>;
}

export interface DimensionGrades {
  readonly cycles: DimensionResult;
  readonly coupling: DimensionResult;
  readonly depth: DimensionResult;
  readonly godFiles: DimensionResult;
  readonly complexFn: DimensionResult;
  readonly levelization: DimensionResult;
  readonly blastRadius: DimensionResult;
}

export interface HealthReport {
  readonly dimensions: DimensionGrades;
  readonly compositeGrade: Grade;
  readonly fileCount: number;
  readonly scanDurationMs: number;
}
