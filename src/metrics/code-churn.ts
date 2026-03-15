import type { GitHistory } from "../git/types.js";

export interface CodeChurnResult {
  readonly rawValue: number;
  readonly files: readonly { readonly file: string; readonly churn: number }[];
}

export function computeCodeChurn(
  gitHistory: GitHistory | undefined,
): CodeChurnResult {
  if (gitHistory === undefined || gitHistory.fileChurns.size === 0) {
    return { rawValue: 0, files: [] };
  }

  const fileChurns: { file: string; churn: number }[] = [];
  for (const [file, stats] of gitHistory.fileChurns) {
    fileChurns.push({ file, churn: stats.added + stats.deleted });
  }

  fileChurns.sort((a, b) => b.churn - a.churn);

  const totalChurn = fileChurns.reduce((sum, f) => sum + f.churn, 0);
  if (totalChurn === 0) {
    return { rawValue: 0, files: fileChurns };
  }

  const topCount = Math.max(1, Math.ceil(fileChurns.length * 0.1));
  const topChurn = fileChurns
    .slice(0, topCount)
    .reduce((sum, f) => sum + f.churn, 0);

  return {
    rawValue: topChurn / totalChurn,
    files: fileChurns,
  };
}
