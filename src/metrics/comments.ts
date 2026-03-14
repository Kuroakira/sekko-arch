import type { FileNode } from "../types/index.js";

export function computeCommentRawValue(files: readonly FileNode[]): number {
  const totalLines = files.reduce((sum, f) => sum + f.lines, 0);
  if (totalLines === 0) return 1.0;

  const totalCommentLines = files.reduce((sum, f) => sum + f.comments, 0);
  const commentRatio = totalCommentLines / totalLines;
  return 1 - commentRatio;
}
