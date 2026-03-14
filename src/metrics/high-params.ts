import type { FuncInfo } from "../types/core.js";
import { HIGH_PARAMS_THRESHOLD } from "./thresholds.js";

export function computeHighParamsRatio(
  functions: readonly FuncInfo[],
): number {
  if (functions.length === 0) return 0;
  const highParamsCount = functions.filter(
    (fn) => fn.paramCount > HIGH_PARAMS_THRESHOLD,
  ).length;
  return highParamsCount / functions.length;
}
