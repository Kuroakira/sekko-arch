import { describe, it, expect } from "vitest";
import { computeCodeChurn } from "./code-churn.js";
import type { GitHistory } from "../git/types.js";

function makeGitHistory(
  fileChurns: ReadonlyMap<string, { readonly added: number; readonly deleted: number }>,
): GitHistory {
  return {
    fileChurns,
    commits: [],
    fileAuthors: new Map(),
    fileLastModified: new Map(),
  };
}

describe("computeCodeChurn", () => {
  it("returns rawValue=0 and empty files when gitHistory is undefined", () => {
    const result = computeCodeChurn(undefined);
    expect(result.rawValue).toBe(0);
    expect(result.files).toHaveLength(0);
  });

  it("returns rawValue=0 and empty files when fileChurns is empty", () => {
    const history = makeGitHistory(new Map());
    const result = computeCodeChurn(history);
    expect(result.rawValue).toBe(0);
    expect(result.files).toHaveLength(0);
  });

  it("returns rawValue=1.0 for a single file", () => {
    const history = makeGitHistory(
      new Map([["src/a.ts", { added: 50, deleted: 10 }]]),
    );
    const result = computeCodeChurn(history);
    expect(result.rawValue).toBe(1.0);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].file).toBe("src/a.ts");
    expect(result.files[0].churn).toBe(60);
  });

  it("returns rawValue close to 0.1 for evenly distributed churn across 10 files", () => {
    const entries: [string, { added: number; deleted: number }][] = [];
    for (let i = 0; i < 10; i++) {
      entries.push([`file${i}.ts`, { added: 5, deleted: 5 }]);
    }
    const history = makeGitHistory(new Map(entries));
    const result = computeCodeChurn(history);
    expect(result.rawValue).toBeCloseTo(0.1, 5);
  });

  it("returns high rawValue when churn is concentrated in top 10%", () => {
    const entries: [string, { added: number; deleted: number }][] = [];
    entries.push(["hot.ts", { added: 900, deleted: 0 }]);
    for (let i = 0; i < 9; i++) {
      entries.push([`cold${i}.ts`, { added: 5, deleted: 5 + i }]);
    }
    const history = makeGitHistory(new Map(entries));
    const result = computeCodeChurn(history);
    expect(result.rawValue).toBeGreaterThan(0.8);
  });

  it("returns files sorted by churn descending", () => {
    const history = makeGitHistory(
      new Map([
        ["low.ts", { added: 2, deleted: 1 }],
        ["high.ts", { added: 100, deleted: 50 }],
        ["mid.ts", { added: 20, deleted: 10 }],
      ]),
    );
    const result = computeCodeChurn(history);
    expect(result.files.length).toBeGreaterThan(0);
    expect(result.files[0].file).toBe("high.ts");
    for (let i = 1; i < result.files.length; i++) {
      expect(result.files[i].churn).toBeLessThanOrEqual(result.files[i - 1].churn);
    }
  });

  it("handles files with zero churn", () => {
    const history = makeGitHistory(
      new Map([
        ["zero.ts", { added: 0, deleted: 0 }],
        ["some.ts", { added: 10, deleted: 5 }],
      ]),
    );
    const result = computeCodeChurn(history);
    expect(result.rawValue).toBe(1.0);
  });
});
