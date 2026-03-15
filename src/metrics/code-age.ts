import type { GitHistory } from "../git/types.js";

export interface CodeAgeFile {
  readonly file: string;
  readonly daysSinceUpdate: number;
}

export interface CodeAgeResult {
  readonly rawValue: number;
  readonly files: readonly CodeAgeFile[];
}

const DEFAULT_THRESHOLD_DAYS = 365;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function computeCodeAge(
  gitHistory: GitHistory | undefined,
  codeAgeThresholdDays?: number,
  now?: Date,
): CodeAgeResult {
  if (gitHistory === undefined || gitHistory.fileLastModified.size === 0) {
    return { rawValue: 0, files: [] };
  }

  const threshold = codeAgeThresholdDays ?? DEFAULT_THRESHOLD_DAYS;
  const reference = now ?? new Date();

  const oldFiles: { file: string; daysSinceUpdate: number }[] = [];

  for (const [file, lastModified] of gitHistory.fileLastModified) {
    const daysSinceUpdate = Math.floor(
      (reference.getTime() - lastModified.getTime()) / MS_PER_DAY,
    );
    if (daysSinceUpdate >= threshold) {
      oldFiles.push({ file, daysSinceUpdate });
    }
  }

  oldFiles.sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate);

  const totalFiles = gitHistory.fileLastModified.size;
  const rawValue = oldFiles.length / totalFiles;

  return { rawValue, files: oldFiles };
}
