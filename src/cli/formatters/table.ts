import type { HealthReport, DimensionResult } from "../../types/metrics.js";
import { DIMENSION_REGISTRY } from "../../dimensions.js";

const INTEGER_DIMENSIONS: ReadonlySet<string> = new Set(
  DIMENSION_REGISTRY.filter((d) => d.isInteger).map((d) => d.name),
);

function padRight(str: string, width: number): string {
  const padding = width - str.length;
  return padding > 0 ? str + " ".repeat(padding) : str;
}

function padLeft(str: string, width: number): string {
  const padding = width - str.length;
  return padding > 0 ? " ".repeat(padding) + str : str;
}

function formatValue(dim: DimensionResult): string {
  if (INTEGER_DIMENSIONS.has(dim.name)) {
    return String(Math.round(dim.rawValue));
  }
  return dim.rawValue.toFixed(2);
}

export function formatTable(report: HealthReport): string {
  const indent = "  ";
  const dimColWidth = 16;
  const valColWidth = 8;
  const gradeColWidth = 5;
  const totalWidth = dimColWidth + valColWidth + gradeColWidth;
  const separator = indent + "\u2500".repeat(totalWidth + 2);

  const lines: string[] = [];

  lines.push("");
  lines.push(`${indent}sekko-arch \u2014 Architecture Health Report`);
  lines.push("");

  lines.push(
    `${indent}${padRight("Dimension", dimColWidth)} ${padLeft("Value", valColWidth)} ${padLeft("Grade", gradeColWidth)}`
  );
  lines.push(separator);

  for (const config of DIMENSION_REGISTRY) {
    const dim = report.dimensions[config.name];
    const value = formatValue(dim);
    lines.push(
      `${indent}${padRight(config.label, dimColWidth)} ${padLeft(value, valColWidth)} ${padLeft(dim.grade, gradeColWidth)}`
    );
  }

  lines.push(separator);
  lines.push(
    `${indent}${padRight("Composite", dimColWidth)} ${padLeft("", valColWidth)} ${padLeft(report.compositeGrade, gradeColWidth)}`
  );

  lines.push("");
  lines.push(
    `${indent}${report.fileCount} files scanned in ${report.scanDurationMs}ms`
  );
  lines.push("");

  return lines.join("\n");
}
