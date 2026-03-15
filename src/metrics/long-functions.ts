import type { FileNode, FuncInfo } from "../types/core.js";
import { LONG_FUNCTION_LINE_THRESHOLD } from "./thresholds.js";

export interface LongFunctionResult {
  readonly ratio: number;
  readonly functions: ReadonlyArray<{
    readonly file: string;
    readonly name: string;
    readonly lineCount: number;
  }>;
}

export function computeLongFunctions(
  files: readonly FileNode[],
): LongFunctionResult {
  const functions: Array<{ file: string; name: string; lineCount: number }> =
    [];
  let totalFunctions = 0;

  for (const file of files) {
    for (const fn of file.sa?.functions ?? []) {
      totalFunctions++;
      if (fn.lineCount > LONG_FUNCTION_LINE_THRESHOLD) {
        functions.push({
          file: file.path,
          name: fn.name,
          lineCount: fn.lineCount,
        });
      }
    }
  }

  const ratio = totalFunctions === 0 ? 0 : functions.length / totalFunctions;
  return { ratio, functions };
}

/** @deprecated Use computeLongFunctions instead */
export function computeLongFunctionRatio(
  functions: readonly FuncInfo[],
): number {
  if (functions.length === 0) return 0;
  const longCount = functions.filter(
    (fn) => fn.lineCount > LONG_FUNCTION_LINE_THRESHOLD,
  ).length;
  return longCount / functions.length;
}
