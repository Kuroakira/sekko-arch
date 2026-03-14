import type { HealthReport } from "../../types/metrics.js";

export function formatJson(report: HealthReport): string {
  const { dimensions } = report;

  const output = {
    dimensions: {
      cycles: { rawValue: dimensions.cycles.rawValue, grade: dimensions.cycles.grade },
      coupling: { rawValue: dimensions.coupling.rawValue, grade: dimensions.coupling.grade },
      depth: { rawValue: dimensions.depth.rawValue, grade: dimensions.depth.grade },
      godFiles: { rawValue: dimensions.godFiles.rawValue, grade: dimensions.godFiles.grade },
      complexFn: { rawValue: dimensions.complexFn.rawValue, grade: dimensions.complexFn.grade },
      levelization: { rawValue: dimensions.levelization.rawValue, grade: dimensions.levelization.grade },
      blastRadius: { rawValue: dimensions.blastRadius.rawValue, grade: dimensions.blastRadius.grade },
    },
    compositeGrade: report.compositeGrade,
    metadata: {
      fileCount: report.fileCount,
      scanDurationMs: report.scanDurationMs,
    },
  };

  return JSON.stringify(output, null, 2);
}
