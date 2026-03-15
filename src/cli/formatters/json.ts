import type { HealthReport } from "../../types/metrics.js";
import { DIMENSION_REGISTRY } from "../../dimensions.js";

export function formatJson(report: HealthReport): string {
  const dimensions: Record<
    string,
    { rawValue: number; grade: string; details: Record<string, unknown> }
  > = {};
  for (const config of DIMENSION_REGISTRY) {
    const dim = report.dimensions[config.name];
    dimensions[config.name] = {
      rawValue: dim.rawValue,
      grade: dim.grade,
      details: dim.details ?? {},
    };
  }

  const output = {
    dimensions,
    compositeGrade: report.compositeGrade,
    metadata: {
      fileCount: report.fileCount,
      scanDurationMs: report.scanDurationMs,
    },
  };

  return JSON.stringify(output, null, 2);
}
