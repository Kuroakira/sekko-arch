import type { FileNode } from "../types/index.js";

export function computeDeadCodeRatio(
  reverseAdjacency: ReadonlyMap<string, readonly string[]>,
  entryPoints: ReadonlySet<string>,
  files: readonly FileNode[],
): number {
  let totalFunctions = 0;
  let deadFunctions = 0;

  for (const file of files) {
    const funcCount = file.sa?.functions.length ?? 0;
    totalFunctions += funcCount;

    if (entryPoints.has(file.path)) continue;

    const importers = reverseAdjacency.get(file.path);
    const inDegree = importers?.length ?? 0;
    if (inDegree === 0) {
      deadFunctions += funcCount;
    }
  }

  if (totalFunctions === 0) return 0;
  return deadFunctions / totalFunctions;
}
