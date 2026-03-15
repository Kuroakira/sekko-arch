import { describe, it, expect } from "vitest";
import type { GitCommitInfo, FileChurn, GitHistory } from "./types.js";

describe("GitHistory types", () => {
  it("constructs a GitCommitInfo", () => {
    const commit: GitCommitInfo = {
      hash: "abc123",
      author: "alice",
      date: new Date("2025-01-01"),
      files: ["src/foo.ts", "src/bar.ts"],
    };
    expect(commit.hash).toBe("abc123");
    expect(commit.files).toHaveLength(2);
  });

  it("constructs a FileChurn", () => {
    const churn: FileChurn = { added: 50, deleted: 10 };
    expect(churn.added).toBe(50);
    expect(churn.deleted).toBe(10);
  });

  it("constructs a GitHistory", () => {
    const history: GitHistory = {
      fileChurns: new Map([
        ["src/a.ts", { added: 100, deleted: 20 }],
      ]),
      commits: [
        {
          hash: "abc",
          author: "alice",
          date: new Date("2025-01-01"),
          files: ["src/a.ts"],
        },
      ],
      fileAuthors: new Map([
        ["src/a.ts", new Set(["alice", "bob"])],
      ]),
      fileLastModified: new Map([
        ["src/a.ts", new Date("2025-06-01")],
      ]),
    };
    expect(history.commits).toHaveLength(1);
    expect(history.fileChurns.get("src/a.ts")?.added).toBe(100);
    expect(history.fileAuthors.get("src/a.ts")?.size).toBe(2);
  });
});
