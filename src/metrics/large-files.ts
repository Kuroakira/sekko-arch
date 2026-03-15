import type { FileNode } from "../types/core.js";
import { LARGE_FILE_LINE_THRESHOLD } from "./thresholds.js";

export interface LargeFileResult {
  readonly ratio: number;
  readonly files: ReadonlyArray<{ readonly file: string; readonly lines: number }>;
}

export function computeLargeFiles(
  files: readonly FileNode[],
): LargeFileResult {
  if (files.length === 0) return { ratio: 0, files: [] };

  const largeFiles: Array<{ file: string; lines: number }> = [];
  for (const f of files) {
    if (f.lines > LARGE_FILE_LINE_THRESHOLD) {
      largeFiles.push({ file: f.path, lines: f.lines });
    }
  }

  return { ratio: largeFiles.length / files.length, files: largeFiles };
}

/** @deprecated Use computeLargeFiles instead */
export function computeLargeFileRatio(files: readonly FileNode[]): number {
  if (files.length === 0) return 0;
  const largeCount = files.filter(
    (f) => f.lines > LARGE_FILE_LINE_THRESHOLD,
  ).length;
  return largeCount / files.length;
}
