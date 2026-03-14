import type { FuncInfo } from "../types/core.js";

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
