import type { FileNode } from "../types/core.js";

export interface DeadCodeResult {
  readonly ratio: number;
  readonly deadFiles: readonly string[];
}

export function computeDeadCodeRatio(
  reverseAdjacency: ReadonlyMap<string, readonly string[]>,
  entryPoints: ReadonlySet<string>,
  files: readonly FileNode[],
): DeadCodeResult {
  let totalFunctions = 0;
  let deadFunctions = 0;
  const deadFiles: string[] = [];

  for (const file of files) {
    const funcCount = file.sa?.functions.length ?? 0;
    totalFunctions += funcCount;

    if (entryPoints.has(file.path)) continue;

    const importers = reverseAdjacency.get(file.path);
    const inDegree = importers?.length ?? 0;
    if (inDegree === 0) {
      deadFunctions += funcCount;
      if (funcCount > 0) {
        deadFiles.push(file.path);
      }
    }
  }

  if (totalFunctions === 0) return { ratio: 0, deadFiles: [] };
  return { ratio: deadFunctions / totalFunctions, deadFiles };
}
