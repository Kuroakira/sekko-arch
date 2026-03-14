import type { FuncInfo } from "../types/index.js";
import { COGNITIVE_COMPLEXITY_THRESHOLD } from "../constants.js";

export function computeCognitiveComplexityRatio(
  functions: readonly FuncInfo[],
): number {
  if (functions.length === 0) return 0;
  const complexCount = functions.filter(
    (fn) => fn.cognitiveComplexity > COGNITIVE_COMPLEXITY_THRESHOLD,
  ).length;
  return complexCount / functions.length;
}
