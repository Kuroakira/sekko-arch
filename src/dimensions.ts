import type { DimensionName, Grade, GradeValue } from "./types/metrics.js";

export type ThresholdEntry = readonly [number, Grade];

export type DimensionCategory =
  | "module-structure"
  | "file-function"
  | "architecture"
  | "evolution"
  | "test-structure";

export interface DimensionConfig {
  readonly name: DimensionName;
  readonly label: string;
  readonly category: DimensionCategory;
  readonly isInteger: boolean;
  readonly thresholds: readonly ThresholdEntry[];
}

/**
 * Single source of truth for all dimension metadata.
 * To add a new dimension:
 *   1. Add to DimensionName union in types/metrics.ts
 *   2. Add a DimensionConfig entry here
 *   3. Add the compute function in metrics/
 * Everything else (thresholds, labels, formatters, gate) derives from this registry.
 */
export const DIMENSION_REGISTRY: readonly DimensionConfig[] = [
  // ── Module Structure ──
  {
    name: "cycles",
    label: "Cycles",
    category: "module-structure",
    isInteger: true,
    thresholds: [
      [0, "A"],
      [1, "B"],
      [3, "C"],
      [6, "D"],
      [Infinity, "F"],
    ],
  },
  {
    name: "coupling",
    label: "Coupling",
    category: "module-structure",
    isInteger: false,
    thresholds: [
      [0.2, "A"],
      [0.35, "B"],
      [0.5, "C"],
      [0.7, "D"],
      [Infinity, "F"],
    ],
  },
  // Inverted metrics: rawValue = 1 - actualRatio, so lower rawValue = better score.
  // cohesion: rawValue = 1 - minCohesion (high cohesion → low rawValue → A)
  {
    name: "cohesion",
    label: "Cohesion",
    category: "module-structure",
    isInteger: false,
    thresholds: [
      [0.5, "A"],
      [0.7, "B"],
      [0.85, "C"],
      [1.0, "D"],
      [Infinity, "F"],
    ],
  },
  {
    name: "entropy",
    label: "Entropy",
    category: "module-structure",
    isInteger: false,
    thresholds: [
      [0.4, "A"],
      [0.55, "B"],
      [0.7, "C"],
      [0.9, "D"],
      [Infinity, "F"],
    ],
  },
  // ── File & Function ──
  {
    name: "godFiles",
    label: "God Files",
    category: "file-function",
    isInteger: false,
    thresholds: [
      [0, "A"],
      [0.01, "B"],
      [0.03, "C"],
      [0.05, "D"],
      [Infinity, "F"],
    ],
  },
  {
    name: "complexFn",
    label: "Complex Fns",
    category: "file-function",
    isInteger: false,
    thresholds: [
      [0.02, "A"],
      [0.05, "B"],
      [0.1, "C"],
      [0.2, "D"],
      [Infinity, "F"],
    ],
  },
  {
    name: "cognitiveComplexity",
    label: "Cognitive Complexity",
    category: "file-function",
    isInteger: false,
    thresholds: [
      [0.02, "A"],
      [0.05, "B"],
      [0.1, "C"],
      [0.2, "D"],
      [Infinity, "F"],
    ],
  },
  {
    name: "longFunctions",
    label: "Long Functions",
    category: "file-function",
    isInteger: false,
    thresholds: [
      [0.05, "A"],
      [0.1, "B"],
      [0.15, "C"],
      [0.25, "D"],
      [Infinity, "F"],
    ],
  },
  {
    name: "largeFiles",
    label: "Large Files",
    category: "file-function",
    isInteger: false,
    thresholds: [
      [0.05, "A"],
      [0.1, "B"],
      [0.15, "C"],
      [0.25, "D"],
      [Infinity, "F"],
    ],
  },
  {
    name: "highParams",
    label: "High Params",
    category: "file-function",
    isInteger: false,
    thresholds: [
      [0.03, "A"],
      [0.05, "B"],
      [0.08, "C"],
      [0.15, "D"],
      [Infinity, "F"],
    ],
  },
  {
    name: "duplication",
    label: "Duplication",
    category: "file-function",
    isInteger: false,
    thresholds: [
      [0.01, "A"],
      [0.03, "B"],
      [0.05, "C"],
      [0.1, "D"],
      [Infinity, "F"],
    ],
  },
  {
    name: "deadCode",
    label: "Dead Code",
    category: "file-function",
    isInteger: false,
    thresholds: [
      [0.03, "A"],
      [0.05, "B"],
      [0.08, "C"],
      [0.15, "D"],
      [Infinity, "F"],
    ],
  },
  // comments: rawValue = 1 - commentRatio (high comment rate → low rawValue → A)
  {
    name: "comments",
    label: "Comments",
    category: "file-function",
    isInteger: false,
    thresholds: [
      [0.92, "A"],
      [0.95, "B"],
      [0.97, "C"],
      [0.99, "D"],
      [Infinity, "F"],
    ],
  },
  // ── Architecture ──
  {
    name: "depth",
    label: "Depth",
    category: "architecture",
    isInteger: true,
    thresholds: [
      [5, "A"],
      [8, "B"],
      [10, "C"],
      [15, "D"],
      [Infinity, "F"],
    ],
  },
  {
    name: "levelization",
    label: "Levelization",
    category: "architecture",
    isInteger: false,
    thresholds: [
      [0, "A"],
      [0.02, "B"],
      [0.05, "C"],
      [0.1, "D"],
      [Infinity, "F"],
    ],
  },
  {
    name: "blastRadius",
    label: "Blast Radius",
    category: "architecture",
    isInteger: false,
    thresholds: [
      [0.1, "A"],
      [0.2, "B"],
      [0.35, "C"],
      [0.5, "D"],
      [Infinity, "F"],
    ],
  },
  {
    name: "distanceFromMainSeq",
    label: "Distance from Main Seq",
    category: "architecture",
    isInteger: false,
    thresholds: [
      [0.3, "A"],
      [0.5, "B"],
      [0.7, "C"],
      [0.85, "D"],
      [Infinity, "F"],
    ],
  },
  {
    name: "attackSurface",
    label: "Attack Surface",
    category: "architecture",
    isInteger: false,
    thresholds: [
      [0.75, "A"],
      [0.85, "B"],
      [0.92, "C"],
      [0.97, "D"],
      [Infinity, "F"],
    ],
  },
  {
    name: "hotspots",
    label: "Hotspots",
    category: "architecture",
    isInteger: false,
    thresholds: [
      [0, "A"],
      [0.01, "B"],
      [0.03, "C"],
      [0.05, "D"],
      [Infinity, "F"],
    ],
  },
  // ── Evolution ──
  {
    name: "codeChurn",
    label: "Code Churn",
    category: "evolution",
    isInteger: false,
    thresholds: [
      [0.5, "A"],
      [0.6, "B"],
      [0.7, "C"],
      [0.85, "D"],
      [Infinity, "F"],
    ],
  },
  {
    name: "changeCoupling",
    label: "Change Coupling",
    category: "evolution",
    isInteger: false,
    thresholds: [
      [0, "A"],
      [0.02, "B"],
      [0.05, "C"],
      [0.1, "D"],
      [Infinity, "F"],
    ],
  },
  {
    name: "busFactor",
    label: "Bus Factor",
    category: "evolution",
    isInteger: false,
    thresholds: [
      [0.2, "A"],
      [0.35, "B"],
      [0.5, "C"],
      [0.7, "D"],
      [Infinity, "F"],
    ],
  },
  {
    name: "codeAge",
    label: "Code Age",
    category: "evolution",
    isInteger: false,
    thresholds: [
      [0.1, "A"],
      [0.2, "B"],
      [0.35, "C"],
      [0.5, "D"],
      [Infinity, "F"],
    ],
  },
  // ── Test & Structure ──
  {
    name: "testCoverageGap",
    label: "Test Coverage Gap",
    category: "test-structure",
    isInteger: false,
    thresholds: [
      [0.1, "A"],
      [0.2, "B"],
      [0.35, "C"],
      [0.5, "D"],
      [Infinity, "F"],
    ],
  },
];

export const DIMENSION_NAMES: readonly DimensionName[] =
  DIMENSION_REGISTRY.map((d) => d.name);

const configByName = new Map(DIMENSION_REGISTRY.map((d) => [d.name, d]));

export function getDimensionConfig(name: DimensionName): DimensionConfig {
  const config = configByName.get(name);
  if (!config) {
    throw new Error(`Unknown dimension: ${String(name)}`);
  }
  return config;
}

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
