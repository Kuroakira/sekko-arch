import { describe, it, expect, vi, beforeEach } from "vitest";
import type { EvolutionConfig } from "../types/rules.js";
import type { GitHistory } from "./types.js";

vi.mock("node:child_process", () => ({
  execSync: vi.fn(),
}));

import { execSync } from "node:child_process";
import { collectGitHistory } from "./collector.js";

const mockExecSync = vi.mocked(execSync);

beforeEach(() => {
  vi.clearAllMocks();
});

function expectDefined(value: GitHistory | undefined): GitHistory {
  expect(value).toBeDefined();
  return value as GitHistory;
}

describe("collectGitHistory", () => {
  const SEPARATOR = "---COMMIT_SEPARATOR---";
  const FIELD_SEP = "---FIELD_SEPARATOR---";

  function makeGitLogOutput(
    commits: Array<{
      hash: string;
      author: string;
      date: string;
      numstat?: string;
    }>,
  ): string {
    return commits
      .map(
        (c) =>
          `${SEPARATOR}\n${c.hash}${FIELD_SEP}${c.author}${FIELD_SEP}${c.date}\n${c.numstat ?? ""}`,
      )
      .join("\n");
  }

  it("parses git log output with commit info, file churns, authors, and last modified dates", () => {
    const output = makeGitLogOutput([
      {
        hash: "abc123",
        author: "alice",
        date: "2025-06-01T10:00:00+00:00",
        numstat: "10\t5\tsrc/foo.ts\n3\t1\tsrc/bar.ts",
      },
      {
        hash: "def456",
        author: "bob",
        date: "2025-05-15T10:00:00+00:00",
        numstat: "20\t10\tsrc/foo.ts",
      },
    ]);
    mockExecSync.mockReturnValue(output);

    const history = expectDefined(collectGitHistory("/test/repo"));

    expect(history.commits).toHaveLength(2);
    expect(history.commits[0].hash).toBe("abc123");
    expect(history.commits[0].author).toBe("alice");
    expect(history.commits[0].files).toEqual(["src/foo.ts", "src/bar.ts"]);
    expect(history.commits[1].hash).toBe("def456");

    const fooChurn = history.fileChurns.get("src/foo.ts");
    expect(fooChurn).toEqual({ added: 30, deleted: 15 });
    const barChurn = history.fileChurns.get("src/bar.ts");
    expect(barChurn).toEqual({ added: 3, deleted: 1 });

    expect(history.fileAuthors.get("src/foo.ts")).toEqual(
      new Set(["alice", "bob"]),
    );
    expect(history.fileAuthors.get("src/bar.ts")).toEqual(new Set(["alice"]));

    expect(history.fileLastModified.get("src/foo.ts")).toEqual(
      new Date("2025-06-01T10:00:00+00:00"),
    );
    expect(history.fileLastModified.get("src/bar.ts")).toEqual(
      new Date("2025-06-01T10:00:00+00:00"),
    );
  });

  it("generates correct --since parameter from EvolutionConfig.days", () => {
    mockExecSync.mockReturnValue("");

    const config: EvolutionConfig = { days: 30 };
    collectGitHistory("/test/repo", config);

    const call = mockExecSync.mock.calls[0];
    const cmd = call[0] as string;
    expect(cmd).toContain("--since=30.days.ago");
  });

  it("defaults to 90 days when no config provided", () => {
    mockExecSync.mockReturnValue("");

    collectGitHistory("/test/repo");

    const call = mockExecSync.mock.calls[0];
    const cmd = call[0] as string;
    expect(cmd).toContain("--since=90.days.ago");
  });

  it("returns undefined when git is not available", () => {
    mockExecSync.mockImplementation(() => {
      throw new Error("git: command not found");
    });

    const result = collectGitHistory("/test/repo");

    expect(result).toBeUndefined();
  });

  it("returns empty GitHistory for empty repository (no commits)", () => {
    mockExecSync.mockReturnValue("");

    const result = expectDefined(collectGitHistory("/test/repo"));

    expect(result.commits).toHaveLength(0);
    expect(result.fileChurns.size).toBe(0);
    expect(result.fileAuthors.size).toBe(0);
    expect(result.fileLastModified.size).toBe(0);
  });

  it("excludes binary files from numstat (shown as - - in git output)", () => {
    const output = makeGitLogOutput([
      {
        hash: "abc123",
        author: "alice",
        date: "2025-06-01T10:00:00+00:00",
        numstat: "10\t5\tsrc/foo.ts\n-\t-\timage.png",
      },
    ]);
    mockExecSync.mockReturnValue(output);

    const history = expectDefined(collectGitHistory("/test/repo"));

    expect(history.fileChurns.has("image.png")).toBe(false);
    expect(history.commits[0].files).toEqual(["src/foo.ts"]);
  });

  it("handles rename notation in numstat (e.g. {old => new})", () => {
    const output = makeGitLogOutput([
      {
        hash: "abc123",
        author: "alice",
        date: "2025-06-01T10:00:00+00:00",
        numstat: "5\t3\tsrc/{old.ts => new.ts}",
      },
    ]);
    mockExecSync.mockReturnValue(output);

    const history = expectDefined(collectGitHistory("/test/repo"));

    expect(history.fileChurns.has("src/{old.ts => new.ts}")).toBe(false);
    expect(history.commits[0].files).toHaveLength(0);
  });

  it("uses --no-merges flag to exclude merge commits", () => {
    mockExecSync.mockReturnValue("");

    collectGitHistory("/test/repo");

    const call = mockExecSync.mock.calls[0];
    const cmd = call[0] as string;
    expect(cmd).toContain("--no-merges");
  });

  it("uses --numstat flag to get line statistics", () => {
    mockExecSync.mockReturnValue("");

    collectGitHistory("/test/repo");

    const call = mockExecSync.mock.calls[0];
    const cmd = call[0] as string;
    expect(cmd).toContain("--numstat");
  });

  it("handles multiple authors for the same file", () => {
    const output = makeGitLogOutput([
      {
        hash: "abc",
        author: "alice",
        date: "2025-06-01T10:00:00+00:00",
        numstat: "10\t0\tsrc/shared.ts",
      },
      {
        hash: "def",
        author: "bob",
        date: "2025-05-01T10:00:00+00:00",
        numstat: "5\t2\tsrc/shared.ts",
      },
      {
        hash: "ghi",
        author: "charlie",
        date: "2025-04-01T10:00:00+00:00",
        numstat: "3\t1\tsrc/shared.ts",
      },
    ]);
    mockExecSync.mockReturnValue(output);

    const history = expectDefined(collectGitHistory("/test/repo"));

    expect(history.fileAuthors.get("src/shared.ts")).toEqual(
      new Set(["alice", "bob", "charlie"]),
    );
    expect(history.fileLastModified.get("src/shared.ts")).toEqual(
      new Date("2025-06-01T10:00:00+00:00"),
    );
  });
});
