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
