import type {
  HealthReport,
  DimensionResult,
  DimensionName,
} from "../../types/metrics.js";
import {
  DIMENSION_REGISTRY,
  type DimensionCategory,
} from "../../dimensions.js";

const INTEGER_DIMENSIONS: ReadonlySet<string> = new Set(
  DIMENSION_REGISTRY.filter((d) => d.isInteger).map((d) => d.name),
);

const CATEGORY_LABELS: Readonly<Record<DimensionCategory, string>> = {
  "module-structure": "Module Structure",
  "file-function": "File & Function",
  architecture: "Architecture",
  evolution: "Evolution",
  "test-structure": "Test & Structure",
};

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

type DetailFormatter = (details: Record<string, unknown>) => readonly string[];

function formatStringList(key: string): DetailFormatter {
  return (details) => (details[key] as string[] | undefined) ?? [];
}

function formatFuncList(
  key: string,
  metricKey: string,
  metricLabel: string,
): DetailFormatter {
  return (details) => {
    const fns = details[key] as
      | Array<{ file: string; name: string; [k: string]: unknown }>
      | undefined;
    if (!fns?.length) return [];
    return fns.map((f) => `${f.file}:${f.name} (${metricLabel}=${f[metricKey]})`);
  };
}

const DETAIL_FORMATTERS: Readonly<Record<DimensionName, DetailFormatter>> = {
  cycles: (d) => {
    const cycles = d["cycles"] as string[][] | undefined;
    if (!cycles?.length) return [];
    return cycles.map((c) => c.join(" \u2192 "));
  },
  coupling: (d) => [
    `${d["crossModuleEdges"]} cross-module edges (${d["crossModuleToUnstable"]} to unstable)`,
  ],
  depth: (d) => {
    const path = d["deepestPath"] as string[] | undefined;
    if (!path?.length) return [];
    return [path.join(" \u2192 ")];
  },
  godFiles: formatStringList("files"),
  complexFn: formatFuncList("complexFunctions", "cc", "CC"),
  levelization: (d) => [
    `${d["violations"]} violations in ${d["totalEdges"]} edges`,
  ],
  blastRadius: (d) => [
    `${d["maxBlastRadiusFile"]} (radius ${d["maxBlastRadius"]}/${d["totalFiles"]})`,
  ],
  cognitiveComplexity: formatFuncList("functions", "cognitiveComplexity", "CC"),
  hotspots: (d) => {
    const files = d["files"] as
      | Array<{ file: string; score: number }>
      | undefined;
    if (!files?.length) return [];
    return files.map((f) => `${f.file} (score=${f.score.toFixed(1)})`);
  },
  longFunctions: (d) => {
    const fns = d["functions"] as
      | Array<{ file: string; name: string; lineCount: number }>
      | undefined;
    if (!fns?.length) return [];
    return fns.map((f) => `${f.file}:${f.name} (${f.lineCount} lines)`);
  },
  largeFiles: (d) => {
    const files = d["files"] as
      | Array<{ file: string; lines: number }>
      | undefined;
    if (!files?.length) return [];
    return files.map((f) => `${f.file} (${f.lines} lines)`);
  },
  highParams: formatFuncList("functions", "paramCount", "params"),
  duplication: (d) => {
    const groups = d["groups"] as
      | Array<{
          bodyHash: string;
          functions: Array<{ file: string; name: string }>;
        }>
      | undefined;
    if (!groups?.length) return [];
    return groups.map(
      (g) => g.functions.map((f) => `${f.file}:${f.name}`).join(", "),
    );
  },
  deadCode: formatStringList("files"),
  comments: (d) => {
    const ratio = d["commentRatio"];
    if (typeof ratio !== "number") return [];
    return [`comment ratio: ${(ratio * 100).toFixed(1)}%`];
  },
  cohesion: (d) => {
    const worst = d["worstCohesion"];
    if (typeof worst !== "number") return [];
    return [`${d["worstModule"]} (cohesion=${worst.toFixed(2)})`];
  },
  entropy: (d) => {
    const val = d["normalizedEntropy"];
    if (typeof val !== "number") return [];
    return [`normalized entropy: ${val.toFixed(2)}`];
  },
  distanceFromMainSeq: (d) => {
    const dist = d["distance"];
    if (typeof dist !== "number") return [];
    return [`${d["worstModule"]} (D=${dist.toFixed(2)})`];
  },
  attackSurface: (d) => [
    `${d["reachableCount"]}/${d["totalFiles"]} files reachable`,
  ],
  codeChurn: (d) => {
    const files = d["files"] as
      | Array<{ file: string; churn: number }>
      | undefined;
    if (!files?.length) return [];
    return files.map((f) => `${f.file} (churn=${f.churn})`);
  },
  changeCoupling: (d) => {
    const pairs = d["pairs"] as
      | Array<{ fileA: string; fileB: string; count: number }>
      | undefined;
    if (!pairs?.length) return [];
    return pairs.map((p) => `${p.fileA} <-> ${p.fileB} (${p.count}x)`);
  },
  busFactor: (d) => {
    const files = d["files"] as
      | Array<{ file: string; authorCount: number }>
      | undefined;
    if (!files?.length) return [];
    return files.map((f) => `${f.file} (${f.authorCount} author(s))`);
  },
  codeAge: (d) => {
    const files = d["files"] as
      | Array<{ file: string; daysSinceUpdate: number }>
      | undefined;
    if (!files?.length) return [];
    return files.map((f) => `${f.file} (${f.daysSinceUpdate} days)`);
  },
  testCoverageGap: formatStringList("files"),
};

function formatDetailItems(
  name: DimensionName,
  details: Record<string, unknown>,
): readonly string[] {
  const formatter = DETAIL_FORMATTERS[name];
  return formatter(details);
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

  let currentCategory: DimensionCategory | undefined;
  for (const config of DIMENSION_REGISTRY) {
    if (config.category !== currentCategory) {
      currentCategory = config.category;
      lines.push("");
      lines.push(`${indent}${CATEGORY_LABELS[currentCategory]}`);
    }
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
