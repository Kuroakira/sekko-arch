import type { FuncInfo } from "../types/core.js";
import { LONG_FUNCTION_LINE_THRESHOLD } from "./thresholds.js";

export function computeLongFunctionRatio(
  functions: readonly FuncInfo[],
): number {
  if (functions.length === 0) return 0;
  const longCount = functions.filter(
    (fn) => fn.lineCount > LONG_FUNCTION_LINE_THRESHOLD,
  ).length;
  return longCount / functions.length;
}
