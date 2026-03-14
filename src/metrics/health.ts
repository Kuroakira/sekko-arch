import type { Snapshot } from "../types/snapshot.js";
import type {
  DimensionName,
  DimensionGrades,
  DimensionResult,
  HealthReport,
} from "../types/metrics.js";
import { computeCompositeGrade } from "../grading/grade.js";
import { buildMetricContext } from "./context.js";
import { METRIC_COMPUTATIONS } from "./registry.js";

export function computeHealth(snapshot: Snapshot): HealthReport {
  const startTime = performance.now();

  const ctx = buildMetricContext(snapshot);

  const dimensions = {} as Record<DimensionName, DimensionResult>;
  for (const metric of METRIC_COMPUTATIONS) {
    dimensions[metric.name] = metric.compute(ctx);
  }

  const compositeGrade = computeCompositeGrade(
    dimensions as DimensionGrades,
  );
  const scanDurationMs = performance.now() - startTime;

  return {
    dimensions: dimensions as DimensionGrades,
    compositeGrade,
    fileCount: snapshot.totalFiles,
    scanDurationMs,
  };
}
