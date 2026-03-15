import { describe, it, expect } from "vitest";
import { computeBusFactor } from "./bus-factor.js";
import type { GitHistory } from "../git/types.js";

function makeGitHistory(
  fileAuthors: ReadonlyMap<string, ReadonlySet<string>>,
): GitHistory {
  return {
    fileChurns: new Map(),
    commits: [],
    fileAuthors,
    fileLastModified: new Map(),
  };
}

describe("computeBusFactor", () => {
  it("returns rawValue=0 and empty files when gitHistory is undefined", () => {
    const result = computeBusFactor(undefined);
    expect(result.rawValue).toBe(0);
    expect(result.files).toHaveLength(0);
  });

  it("returns rawValue=0 and empty files when fileAuthors is empty", () => {
    const history = makeGitHistory(new Map());
    const result = computeBusFactor(history);
    expect(result.rawValue).toBe(0);
    expect(result.files).toHaveLength(0);
  });

  it("returns rawValue=0 when all files have multiple authors", () => {
    const history = makeGitHistory(
      new Map([
        ["a.ts", new Set(["alice", "bob"])],
        ["b.ts", new Set(["alice", "carol"])],
      ]),
    );
    const result = computeBusFactor(history);
    expect(result.rawValue).toBe(0);
    expect(result.files).toHaveLength(0);
  });

  it("returns rawValue=1.0 when all files have a single author", () => {
    const history = makeGitHistory(
      new Map([
        ["a.ts", new Set(["alice"])],
        ["b.ts", new Set(["bob"])],
      ]),
    );
    const result = computeBusFactor(history);
    expect(result.rawValue).toBe(1.0);
    expect(result.files).toHaveLength(2);
  });

  it("returns correct ratio for mixed single and multi-author files", () => {
    const history = makeGitHistory(
      new Map([
        ["a.ts", new Set(["alice"])],
        ["b.ts", new Set(["alice", "bob"])],
        ["c.ts", new Set(["carol"])],
        ["d.ts", new Set(["alice", "bob", "carol"])],
      ]),
    );
    const result = computeBusFactor(history);
    expect(result.rawValue).toBe(0.5);
  });

  it("files list contains only single-author files with authorCount=1", () => {
    const history = makeGitHistory(
      new Map([
        ["a.ts", new Set(["alice"])],
        ["b.ts", new Set(["alice", "bob"])],
        ["c.ts", new Set(["carol"])],
      ]),
    );
    const result = computeBusFactor(history);
    expect(result.files).toHaveLength(2);

    const filePaths = result.files.map((f) => f.file).sort();
    expect(filePaths).toEqual(["a.ts", "c.ts"]);

    for (const f of result.files) {
      expect(f.authorCount).toBe(1);
    }
  });
});
