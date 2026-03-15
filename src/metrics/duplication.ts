import type { FileNode, FuncInfo } from "../types/core.js";

export interface DuplicationResult {
  readonly ratio: number;
  readonly groups: ReadonlyArray<{
    readonly bodyHash: string;
    readonly functions: ReadonlyArray<{ readonly file: string; readonly name: string }>;
  }>;
}

export function computeDuplication(
  files: readonly FileNode[],
): DuplicationResult {
  const hashMap = new Map<string, Array<{ file: string; name: string }>>();
  let totalFunctions = 0;

  for (const file of files) {
    for (const fn of file.sa?.functions ?? []) {
      totalFunctions++;
      const existing = hashMap.get(fn.bodyHash);
      if (existing) {
        existing.push({ file: file.path, name: fn.name });
      } else {
        hashMap.set(fn.bodyHash, [{ file: file.path, name: fn.name }]);
      }
    }
  }

  let duplicatedCount = 0;
  const groups: Array<{
    bodyHash: string;
    functions: Array<{ file: string; name: string }>;
  }> = [];

  for (const [bodyHash, fns] of hashMap) {
    if (fns.length >= 2) {
      duplicatedCount += fns.length;
      groups.push({ bodyHash, functions: fns });
    }
  }

  const ratio = totalFunctions === 0 ? 0 : duplicatedCount / totalFunctions;
  return { ratio, groups };
}

/** @deprecated Use computeDuplication instead */
export function computeDuplicationRatio(functions: readonly FuncInfo[]): number {
  if (functions.length === 0) return 0;

  const hashCounts = new Map<string, number>();
  for (const fn of functions) {
    hashCounts.set(fn.bodyHash, (hashCounts.get(fn.bodyHash) ?? 0) + 1);
  }

  let duplicatedCount = 0;
  for (const count of hashCounts.values()) {
    if (count >= 2) {
      duplicatedCount += count;
    }
  }

  return duplicatedCount / functions.length;
}
