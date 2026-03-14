import type { FileNode } from "../types/index.js";
import { LARGE_FILE_LINE_THRESHOLD } from "../constants.js";

export function computeLargeFileRatio(files: readonly FileNode[]): number {
  if (files.length === 0) return 0;
  const largeCount = files.filter(
    (f) => f.lines > LARGE_FILE_LINE_THRESHOLD,
  ).length;
  return largeCount / files.length;
}
