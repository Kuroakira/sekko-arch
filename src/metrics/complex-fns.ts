import type { FileNode, FuncInfo } from "../types/core.js";
import { COMPLEXITY_CC_THRESHOLD } from "./thresholds.js";

export interface ComplexFnResult {
  readonly ratio: number;
  readonly totalFunctions: number;
  readonly complexCount: number;
  readonly complexFunctions: ReadonlyArray<{
    readonly file: string;
    readonly name: string;
    readonly cc: number;
  }>;
}

export function computeComplexFns(files: readonly FileNode[]): ComplexFnResult {
  const complexFunctions: Array<{ file: string; name: string; cc: number }> =
    [];
  let totalFunctions = 0;

  for (const file of files) {
    for (const fn of file.sa?.functions ?? []) {
      totalFunctions++;
      if (fn.cc > COMPLEXITY_CC_THRESHOLD) {
        complexFunctions.push({ file: file.path, name: fn.name, cc: fn.cc });
      }
    }
  }

  const ratio = totalFunctions === 0 ? 0 : complexFunctions.length / totalFunctions;
  return { ratio, totalFunctions, complexCount: complexFunctions.length, complexFunctions };
}

/** @deprecated Use computeComplexFns instead */
export function computeComplexFnRatio(functions: readonly FuncInfo[]): number {
  if (functions.length === 0) return 0;
  const complexCount = functions.filter(
    (fn) => fn.cc > COMPLEXITY_CC_THRESHOLD,
  ).length;
  return complexCount / functions.length;
}

const ENTRY_POINT_PATTERNS = [/\/index\.tsx?$/, /\/main\.tsx?$/];

export function detectEntryPoints(filePaths: readonly string[]): Set<string> {
  const entryPoints = new Set<string>();
  for (const filePath of filePaths) {
    if (ENTRY_POINT_PATTERNS.some((p) => p.test(filePath))) {
      entryPoints.add(filePath);
    }
  }
  return entryPoints;
}
