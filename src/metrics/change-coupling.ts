import type { GitHistory } from "../git/types.js";

export interface ChangeCouplingPair {
  readonly fileA: string;
  readonly fileB: string;
  readonly count: number;
}

export interface ChangeCouplingResult {
  readonly rawValue: number;
  readonly pairs: readonly ChangeCouplingPair[];
}

const DEFAULT_THRESHOLD = 5;

export function computeChangeCoupling(
  gitHistory: GitHistory | undefined,
  changeCouplingThreshold?: number,
): ChangeCouplingResult {
  const threshold = changeCouplingThreshold ?? DEFAULT_THRESHOLD;

  if (!gitHistory || gitHistory.commits.length === 0) {
    return { rawValue: 0, pairs: [] };
  }

  const pairCounts = new Map<string, number>();
  const allFiles = new Set<string>();

  for (const commit of gitHistory.commits) {
    const files = commit.files;
    for (const f of files) {
      allFiles.add(f);
    }

    for (let i = 0; i < files.length; i++) {
      for (let j = i + 1; j < files.length; j++) {
        const [a, b] = files[i] < files[j] ? [files[i], files[j]] : [files[j], files[i]];
        const key = `${a}\0${b}`;
        pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
      }
    }
  }

  if (allFiles.size === 0) {
    return { rawValue: 0, pairs: [] };
  }

  const highCouplingPairs: ChangeCouplingPair[] = [];
  const filesInHighCoupling = new Set<string>();

  for (const [key, count] of pairCounts) {
    if (count >= threshold) {
      const [fileA, fileB] = key.split("\0");
      highCouplingPairs.push({ fileA, fileB, count });
      filesInHighCoupling.add(fileA);
      filesInHighCoupling.add(fileB);
    }
  }

  highCouplingPairs.sort((a, b) => b.count - a.count);

  const rawValue = filesInHighCoupling.size / allFiles.size;

  return { rawValue, pairs: highCouplingPairs };
}
