import type { GitHistory } from "../git/types.js";

export interface BusFactorFile {
  readonly file: string;
  readonly authorCount: number;
}

export interface BusFactorResult {
  readonly rawValue: number;
  readonly files: readonly BusFactorFile[];
}

const EMPTY_RESULT: BusFactorResult = { rawValue: 0, files: [] };

export function computeBusFactor(
  gitHistory: GitHistory | undefined,
): BusFactorResult {
  if (!gitHistory || gitHistory.fileAuthors.size === 0) {
    return EMPTY_RESULT;
  }

  const singleAuthorFiles: BusFactorFile[] = [];

  for (const [file, authors] of gitHistory.fileAuthors) {
    if (authors.size === 1) {
      singleAuthorFiles.push({ file, authorCount: 1 });
    }
  }

  if (singleAuthorFiles.length === 0) {
    return EMPTY_RESULT;
  }

  return {
    rawValue: singleAuthorFiles.length / gitHistory.fileAuthors.size,
    files: singleAuthorFiles,
  };
}
