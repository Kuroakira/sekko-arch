export interface GitCommitInfo {
  readonly hash: string;
  readonly author: string;
  readonly date: Date;
  readonly files: readonly string[];
}

export interface FileChurn {
  readonly added: number;
  readonly deleted: number;
}

export interface GitHistory {
  readonly fileChurns: ReadonlyMap<string, FileChurn>;
  readonly commits: readonly GitCommitInfo[];
  readonly fileAuthors: ReadonlyMap<string, ReadonlySet<string>>;
  readonly fileLastModified: ReadonlyMap<string, Date>;
}
