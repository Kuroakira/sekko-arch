import type {
  HealthReport,
  DimensionResult,
  DimensionName,
} from "../../types/metrics.js";
import { DIMENSION_REGISTRY } from "../../dimensions.js";

const INTEGER_DIMENSIONS: ReadonlySet<string> = new Set(
  DIMENSION_REGISTRY.filter((d) => d.isInteger).map((d) => d.name),
);

const MAX_DETAIL_ITEMS = 5;

const PROBLEM_GRADES = new Set(["C", "D", "F"]);

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

function formatDetailItems(
  name: DimensionName,
  details: Record<string, unknown>,
): readonly string[] {
  switch (name) {
    case "cycles": {
      const cycles = details["cycles"] as string[][] | undefined;
      if (!cycles?.length) return [];
      return cycles.map((c) => c.join(" \u2192 "));
    }
    case "coupling":
      return [
        `${details["crossModuleEdges"]} cross-module edges (${details["crossModuleToUnstable"]} to unstable)`,
      ];
    case "depth": {
      const path = details["deepestPath"] as string[] | undefined;
      if (!path?.length) return [];
      return [path.join(" \u2192 ")];
    }
    case "godFiles": {
      const files = details["files"] as string[] | undefined;
      return files ?? [];
    }
    case "complexFn": {
      const fns = details["complexFunctions"] as
        | Array<{ file: string; name: string; cc: number }>
        | undefined;
      if (!fns?.length) return [];
      return fns.map((f) => `${f.file}:${f.name} (CC=${f.cc})`);
    }
    case "levelization":
      return [
        `${details["violations"]} violations in ${details["totalEdges"]} edges`,
      ];
    case "blastRadius":
      return [
        `${details["maxBlastRadiusFile"]} (radius ${details["maxBlastRadius"]}/${details["totalFiles"]})`,
      ];
    case "cognitiveComplexity": {
      const fns = details["functions"] as
        | Array<{ file: string; name: string; cognitiveComplexity: number }>
        | undefined;
      if (!fns?.length) return [];
      return fns.map(
        (f) => `${f.file}:${f.name} (CC=${f.cognitiveComplexity})`,
      );
    }
    case "hotspots": {
      const files = details["files"] as
        | Array<{ file: string; score: number }>
        | undefined;
      if (!files?.length) return [];
      return files.map((f) => `${f.file} (score=${f.score.toFixed(1)})`);
    }
    case "longFunctions": {
      const fns = details["functions"] as
        | Array<{ file: string; name: string; lineCount: number }>
        | undefined;
      if (!fns?.length) return [];
      return fns.map((f) => `${f.file}:${f.name} (${f.lineCount} lines)`);
    }
    case "largeFiles": {
      const files = details["files"] as
        | Array<{ file: string; lines: number }>
        | undefined;
      if (!files?.length) return [];
      return files.map((f) => `${f.file} (${f.lines} lines)`);
    }
    case "highParams": {
      const fns = details["functions"] as
        | Array<{ file: string; name: string; paramCount: number }>
        | undefined;
      if (!fns?.length) return [];
      return fns.map((f) => `${f.file}:${f.name} (${f.paramCount} params)`);
    }
    case "duplication": {
      const groups = details["groups"] as
        | Array<{
            bodyHash: string;
            functions: Array<{ file: string; name: string }>;
          }>
        | undefined;
      if (!groups?.length) return [];
      return groups.map(
        (g) =>
          g.functions.map((f) => `${f.file}:${f.name}`).join(", "),
      );
    }
    case "deadCode": {
      const files = details["files"] as string[] | undefined;
      return files ?? [];
    }
    case "comments": {
      const ratio = details["commentRatio"];
      if (typeof ratio !== "number") return [];
      return [`comment ratio: ${(ratio * 100).toFixed(1)}%`];
    }
    case "cohesion": {
      const worst = details["worstCohesion"];
      if (typeof worst !== "number") return [];
      return [
        `${details["worstModule"]} (cohesion=${worst.toFixed(2)})`,
      ];
    }
    case "entropy": {
      const val = details["normalizedEntropy"];
      if (typeof val !== "number") return [];
      return [`normalized entropy: ${val.toFixed(2)}`];
    }
    case "distanceFromMainSeq": {
      const dist = details["distance"];
      if (typeof dist !== "number") return [];
      return [`${details["worstModule"]} (D=${dist.toFixed(2)})`];
    }
    case "attackSurface":
      return [
        `${details["reachableCount"]}/${details["totalFiles"]} files reachable`,
      ];
    default:
      return [];
  }
}

function formatProblemAreas(report: HealthReport): readonly string[] {
  const indent = "  ";
  const itemIndent = "    ";
  const lines: string[] = [];

  let hasProblems = false;

  for (const config of DIMENSION_REGISTRY) {
    const dim = report.dimensions[config.name];
    if (!PROBLEM_GRADES.has(dim.grade)) continue;
    if (!dim.details) continue;

    if (!hasProblems) {
      lines.push(`${indent}Problem Areas`);
      lines.push("");
      hasProblems = true;
    }

    lines.push(`${indent}${config.label} [${dim.grade}]`);
    const items = formatDetailItems(config.name, dim.details);
    const shown = items.slice(0, MAX_DETAIL_ITEMS);
    for (const item of shown) {
      lines.push(`${itemIndent}${item}`);
    }
    const remaining = items.length - MAX_DETAIL_ITEMS;
    if (remaining > 0) {
      lines.push(`${itemIndent}...and ${remaining} more`);
    }
    lines.push("");
  }

  return lines;
}

export function formatTable(report: HealthReport): string {
  const indent = "  ";
  const dimColWidth = 24;
  const valColWidth = 8;
  const gradeColWidth = 5;
  const totalWidth = dimColWidth + valColWidth + gradeColWidth;
  const separator = indent + "\u2500".repeat(totalWidth + 2);

  const lines: string[] = [];

  lines.push("");
  lines.push(`${indent}sekko-arch \u2014 Architecture Health Report`);
  lines.push("");

  lines.push(
    `${indent}${padRight("Dimension", dimColWidth)} ${padLeft("Value", valColWidth)} ${padLeft("Grade", gradeColWidth)}`,
  );
  lines.push(separator);

  for (const config of DIMENSION_REGISTRY) {
    const dim = report.dimensions[config.name];
    const value = formatValue(dim);
    lines.push(
      `${indent}${padRight(config.label, dimColWidth)} ${padLeft(value, valColWidth)} ${padLeft(dim.grade, gradeColWidth)}`,
    );
  }

  lines.push(separator);
  lines.push(
    `${indent}${padRight("Composite", dimColWidth)} ${padLeft("", valColWidth)} ${padLeft(report.compositeGrade, gradeColWidth)}`,
  );

  lines.push("");
  lines.push(
    `${indent}${report.fileCount} files scanned in ${report.scanDurationMs}ms`,
  );
  lines.push("");

  const problemLines = formatProblemAreas(report);
  if (problemLines.length > 0) {
    lines.push(...problemLines);
  }

  return lines.join("\n");
}
