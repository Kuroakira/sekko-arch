import type { FileNode } from "../types/core.js";

export function computeCommentRawValue(files: readonly FileNode[]): number {
  if (files.length === 0) return 0;
  const totalLines = files.reduce((sum, f) => sum + f.lines, 0);
  if (totalLines === 0) return 0;

  const totalCommentLines = files.reduce((sum, f) => sum + f.comments, 0);
  const commentRatio = totalCommentLines / totalLines;
  return 1 - commentRatio;
}
