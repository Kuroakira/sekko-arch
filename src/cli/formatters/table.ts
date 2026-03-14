import type {
  HealthReport,
  DimensionName,
  DimensionResult,
} from "../../types/metrics.js";

const DIMENSION_LABELS: ReadonlyMap<DimensionName, string> = new Map([
  ["cycles", "Cycles"],
  ["coupling", "Coupling"],
  ["depth", "Depth"],
  ["godFiles", "God Files"],
  ["complexFn", "Complex Fns"],
  ["levelization", "Levelization"],
  ["blastRadius", "Blast Radius"],
]);

const INTEGER_DIMENSIONS: ReadonlySet<DimensionName> = new Set<DimensionName>([
  "cycles",
  "depth",
]);

const DIMENSION_ORDER: readonly DimensionName[] = [
  "cycles",
  "coupling",
  "depth",
  "godFiles",
  "complexFn",
  "levelization",
  "blastRadius",
];

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
  lines.push(`${indent}archana \u2014 Architecture Health Report`);
  lines.push("");

  lines.push(
    `${indent}${padRight("Dimension", dimColWidth)} ${padLeft("Value", valColWidth)} ${padLeft("Grade", gradeColWidth)}`
  );
  lines.push(separator);

  for (const name of DIMENSION_ORDER) {
    const dim = report.dimensions[name];
    const label = DIMENSION_LABELS.get(name) ?? name;
    const value = formatValue(dim);
    lines.push(
      `${indent}${padRight(label, dimColWidth)} ${padLeft(value, valColWidth)} ${padLeft(dim.grade, gradeColWidth)}`
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
