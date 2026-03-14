import type { FuncInfo } from "../types/index.js";
import { COMPLEXITY_CC_THRESHOLD } from "../constants.js";

const ENTRY_POINT_PATTERNS = [/\/index\.tsx?$/, /\/main\.tsx?$/];

export function computeComplexFnRatio(functions: readonly FuncInfo[]): number {
  if (functions.length === 0) return 0;

  const complexCount = functions.filter(
    (fn) => fn.cc > COMPLEXITY_CC_THRESHOLD,
  ).length;
  return complexCount / functions.length;
}

export function detectEntryPoints(filePaths: readonly string[]): Set<string> {
  const entryPoints = new Set<string>();
  for (const filePath of filePaths) {
    if (ENTRY_POINT_PATTERNS.some((p) => p.test(filePath))) {
      entryPoints.add(filePath);
    }
  }
  return entryPoints;
}
