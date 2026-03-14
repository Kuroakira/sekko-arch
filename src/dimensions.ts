import type { DimensionName, Grade } from "./types/metrics.js";

export type ThresholdEntry = readonly [number, Grade];

export interface DimensionConfig {
  readonly name: DimensionName;
  readonly label: string;
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
  {
    name: "cycles",
    label: "Cycles",
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
    name: "depth",
    label: "Depth",
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
    name: "godFiles",
    label: "God Files",
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
    name: "levelization",
    label: "Levelization",
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
    isInteger: false,
    thresholds: [
      [0.1, "A"],
      [0.2, "B"],
      [0.35, "C"],
      [0.5, "D"],
      [Infinity, "F"],
    ],
  },
  // Inverted metrics: rawValue = 1 - actualRatio, so lower rawValue = better score.
  // cohesion: rawValue = 1 - minCohesion (high cohesion → low rawValue → A)
  {
    name: "cohesion",
    label: "Cohesion",
    isInteger: false,
    thresholds: [
      [0.3, "A"],
      [0.5, "B"],
      [0.7, "C"],
      [0.9, "D"],
      [Infinity, "F"],
    ],
  },
  {
    name: "entropy",
    label: "Entropy",
    isInteger: false,
    thresholds: [
      [0.4, "A"],
      [0.55, "B"],
      [0.7, "C"],
      [0.9, "D"],
      [Infinity, "F"],
    ],
  },
  {
    name: "cognitiveComplexity",
    label: "Cognitive Complexity",
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
    name: "hotspots",
    label: "Hotspots",
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
    name: "longFunctions",
    label: "Long Functions",
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
    isInteger: false,
    thresholds: [
      [0.92, "A"],
      [0.95, "B"],
      [0.97, "C"],
      [0.99, "D"],
      [Infinity, "F"],
    ],
  },
  {
    name: "distanceFromMainSeq",
    label: "Distance from Main Seq",
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
    name: "attackSurface",
    label: "Attack Surface",
    isInteger: false,
    thresholds: [
      [0.3, "A"],
      [0.45, "B"],
      [0.6, "C"],
      [0.8, "D"],
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
