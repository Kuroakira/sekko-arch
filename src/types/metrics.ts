export type Grade = "A" | "B" | "C" | "D" | "F";

export type GradeValue = 0 | 1 | 2 | 3 | 4;

export type DimensionName =
  | "cycles"
  | "coupling"
  | "depth"
  | "godFiles"
  | "complexFn"
  | "levelization"
  | "blastRadius"
  | "cohesion"
  | "entropy"
  | "cognitiveComplexity"
  | "hotspots"
  | "longFunctions"
  | "largeFiles"
  | "highParams"
  | "duplication"
  | "deadCode"
  | "comments"
  | "distanceFromMainSeq"
  | "attackSurface";

export interface DimensionResult {
  readonly name: DimensionName;
  readonly rawValue: number;
  readonly grade: Grade;
  readonly details?: Record<string, unknown>;
}

export type DimensionGrades = {
  readonly [K in DimensionName]: DimensionResult;
};

export interface HealthReport {
  readonly dimensions: DimensionGrades;
  readonly compositeGrade: Grade;
  readonly fileCount: number;
  readonly scanDurationMs: number;
}
