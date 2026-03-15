import type { FileNode, FuncInfo } from "../types/core.js";
import { COGNITIVE_COMPLEXITY_THRESHOLD } from "./thresholds.js";

export interface CognitiveComplexityResult {
  readonly ratio: number;
  readonly totalFunctions: number;
  readonly complexCount: number;
  readonly functions: ReadonlyArray<{
    readonly file: string;
    readonly name: string;
    readonly cognitiveComplexity: number;
  }>;
}

export function computeCognitiveComplexity(
  files: readonly FileNode[],
): CognitiveComplexityResult {
  const functions: Array<{
    file: string;
    name: string;
    cognitiveComplexity: number;
  }> = [];
  let totalFunctions = 0;

  for (const file of files) {
    for (const fn of file.sa?.functions ?? []) {
      totalFunctions++;
      if (fn.cognitiveComplexity > COGNITIVE_COMPLEXITY_THRESHOLD) {
        functions.push({
          file: file.path,
          name: fn.name,
          cognitiveComplexity: fn.cognitiveComplexity,
        });
      }
    }
  }

  const ratio = totalFunctions === 0 ? 0 : functions.length / totalFunctions;
  return { ratio, totalFunctions, complexCount: functions.length, functions };
}

/** @deprecated Use computeCognitiveComplexity instead */
export function computeCognitiveComplexityRatio(
  functions: readonly FuncInfo[],
): number {
  if (functions.length === 0) return 0;
  const complexCount = functions.filter(
    (fn) => fn.cognitiveComplexity > COGNITIVE_COMPLEXITY_THRESHOLD,
  ).length;
  return complexCount / functions.length;
}
