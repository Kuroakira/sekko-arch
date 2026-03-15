import type { FileNode } from "../types/core.js";

export interface CommentResult {
  readonly rawValue: number;
  readonly commentRatio: number;
}

export function computeComments(files: readonly FileNode[]): CommentResult {
  if (files.length === 0) return { rawValue: 0, commentRatio: 0 };

  const totalLines = files.reduce((sum, f) => sum + f.lines, 0);
  if (totalLines === 0) return { rawValue: 0, commentRatio: 0 };

  const totalCommentLines = files.reduce((sum, f) => sum + f.comments, 0);
  const commentRatio = totalCommentLines / totalLines;
  return { rawValue: 1 - commentRatio, commentRatio };
}

/** @deprecated Use computeComments instead */
export function computeCommentRawValue(files: readonly FileNode[]): number {
  if (files.length === 0) return 0;
  const totalLines = files.reduce((sum, f) => sum + f.lines, 0);
  if (totalLines === 0) return 0;

  const totalCommentLines = files.reduce((sum, f) => sum + f.comments, 0);
  const commentRatio = totalCommentLines / totalLines;
  return 1 - commentRatio;
}
