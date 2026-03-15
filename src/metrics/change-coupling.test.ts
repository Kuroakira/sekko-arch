import { describe, it, expect } from "vitest";
import { computeChangeCoupling } from "./change-coupling.js";
import type { GitHistory, GitCommitInfo } from "../git/types.js";

function makeGitHistory(commits: readonly GitCommitInfo[]): GitHistory {
  return {
    fileChurns: new Map(),
    commits,
    fileAuthors: new Map(),
    fileLastModified: new Map(),
  };
}

function makeCommit(files: readonly string[]): GitCommitInfo {
  return {
    hash: "abc",
    author: "test",
    date: new Date("2025-01-01"),
    files,
  };
}

describe("computeChangeCoupling", () => {
  it("returns rawValue=0 when gitHistory is undefined", () => {
    const result = computeChangeCoupling(undefined);
    expect(result.rawValue).toBe(0);
    expect(result.pairs).toHaveLength(0);
  });

  it("returns rawValue=0 when commits are empty", () => {
    const result = computeChangeCoupling(makeGitHistory([]));
    expect(result.rawValue).toBe(0);
    expect(result.pairs).toHaveLength(0);
  });

  it("returns rawValue=0 when no pairs reach threshold", () => {
    // 4 commits with (a, b) together — below default threshold of 5
    const commits = Array.from({ length: 4 }, () => makeCommit(["a.ts", "b.ts"]));
    const result = computeChangeCoupling(makeGitHistory(commits));
    expect(result.rawValue).toBe(0);
    expect(result.pairs).toHaveLength(0);
  });

  it("detects pair co-occurring exactly threshold times", () => {
    // Exactly 5 commits with (a, b) together — meets default threshold
    const commits = Array.from({ length: 5 }, () => makeCommit(["a.ts", "b.ts"]));
    const result = computeChangeCoupling(makeGitHistory(commits));
    expect(result.rawValue).toBe(1);
    expect(result.pairs).toHaveLength(1);
    expect(result.pairs[0]).toEqual({ fileA: "a.ts", fileB: "b.ts", count: 5 });
  });

  it("computes rawValue as ratio of files in high-coupling pairs to total files", () => {
    // 5 commits with (a, b) together, plus file c appearing alone in each
    const commits = Array.from({ length: 5 }, () =>
      makeCommit(["a.ts", "b.ts", "c.ts"]),
    );
    const result = computeChangeCoupling(makeGitHistory(commits));
    // a and b form a high-coupling pair; c pairs with a and b each appear 5 times too
    // (a,b)=5, (a,c)=5, (b,c)=5 — all reach threshold
    // All 3 files are in high-coupling pairs → 3/3 = 1.0
    expect(result.rawValue).toBe(1);
    expect(result.pairs).toHaveLength(3);
  });

  it("computes correct ratio when only some files are in high-coupling pairs", () => {
    // 5 commits with (a, b), plus 1 commit with c
    const commits = [
      ...Array.from({ length: 5 }, () => makeCommit(["a.ts", "b.ts"])),
      makeCommit(["c.ts"]),
    ];
    const result = computeChangeCoupling(makeGitHistory(commits));
    // (a,b) = 5 → high coupling. Files in pairs: {a, b}. Total files: {a, b, c} = 3
    // rawValue = 2/3
    expect(result.rawValue).toBeCloseTo(2 / 3);
    expect(result.pairs).toHaveLength(1);
  });

  it("supports custom threshold", () => {
    const commits = Array.from({ length: 3 }, () => makeCommit(["a.ts", "b.ts"]));
    // Default threshold=5: not detected
    expect(computeChangeCoupling(makeGitHistory(commits)).pairs).toHaveLength(0);
    // Custom threshold=3: detected
    const result = computeChangeCoupling(makeGitHistory(commits), 3);
    expect(result.pairs).toHaveLength(1);
    expect(result.pairs[0].count).toBe(3);
  });

  it("sorts pairs by count descending", () => {
    // a-b co-occur 6 times, a-c co-occur 5 times
    const commits = [
      ...Array.from({ length: 5 }, () => makeCommit(["a.ts", "b.ts", "c.ts"])),
      makeCommit(["a.ts", "b.ts"]),
    ];
    const result = computeChangeCoupling(makeGitHistory(commits));
    expect(result.pairs[0].count).toBe(6); // a-b
    expect(result.pairs[1].count).toBe(5); // a-c or b-c
  });

  it("uses canonical ordering for pairs (alphabetically sorted)", () => {
    // Ensure (b, a) is stored as (a, b)
    const commits = Array.from({ length: 5 }, () => makeCommit(["b.ts", "a.ts"]));
    const result = computeChangeCoupling(makeGitHistory(commits));
    expect(result.pairs[0].fileA).toBe("a.ts");
    expect(result.pairs[0].fileB).toBe("b.ts");
  });
});
