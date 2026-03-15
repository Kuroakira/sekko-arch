import type { FileNode, FuncInfo } from "../types/core.js";
import { HIGH_PARAMS_THRESHOLD } from "./detection-thresholds.js";

export interface HighParamsResult {
  readonly ratio: number;
  readonly functions: ReadonlyArray<{
    readonly file: string;
    readonly name: string;
    readonly paramCount: number;
  }>;
}

export function computeHighParams(
  files: readonly FileNode[],
): HighParamsResult {
  const functions: Array<{ file: string; name: string; paramCount: number }> =
    [];
  let totalFunctions = 0;

  for (const file of files) {
    for (const fn of file.sa?.functions ?? []) {
      totalFunctions++;
      if (fn.paramCount > HIGH_PARAMS_THRESHOLD) {
        functions.push({
          file: file.path,
          name: fn.name,
          paramCount: fn.paramCount,
        });
      }
    }
  }

  const ratio = totalFunctions === 0 ? 0 : functions.length / totalFunctions;
  return { ratio, functions };
}

/** @deprecated Use computeHighParams instead */
export function computeHighParamsRatio(
  functions: readonly FuncInfo[],
): number {
  if (functions.length === 0) return 0;
  const highParamsCount = functions.filter(
    (fn) => fn.paramCount > HIGH_PARAMS_THRESHOLD,
  ).length;
  return highParamsCount / functions.length;
}
