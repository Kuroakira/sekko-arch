import { describe, it, expect } from "vitest";
import { computeCodeAge } from "./code-age.js";
import type { GitHistory } from "../git/types.js";

function makeGitHistory(
  fileLastModified: ReadonlyMap<string, Date>,
): GitHistory {
  return {
    fileChurns: new Map(),
    commits: [],
    fileAuthors: new Map(),
    fileLastModified,
  };
}

const NOW = new Date("2025-06-15");

describe("computeCodeAge", () => {
  it("returns rawValue=0 and empty files when gitHistory is undefined", () => {
    const result = computeCodeAge(undefined, undefined, NOW);
    expect(result.rawValue).toBe(0);
    expect(result.files).toHaveLength(0);
  });

  it("returns rawValue=0 and empty files when fileLastModified is empty", () => {
    const history = makeGitHistory(new Map());
    const result = computeCodeAge(history, undefined, NOW);
    expect(result.rawValue).toBe(0);
    expect(result.files).toHaveLength(0);
  });

  it("returns rawValue=0 when all files are recently updated", () => {
    const history = makeGitHistory(
      new Map([
        ["src/a.ts", new Date("2025-06-01")],
        ["src/b.ts", new Date("2025-05-01")],
        ["src/c.ts", new Date("2025-01-01")],
      ]),
    );
    const result = computeCodeAge(history, undefined, NOW);
    expect(result.rawValue).toBe(0);
    expect(result.files).toHaveLength(0);
  });

  it("returns rawValue=1.0 when all files are old", () => {
    const history = makeGitHistory(
      new Map([
        ["src/a.ts", new Date("2023-01-01")],
        ["src/b.ts", new Date("2022-06-01")],
      ]),
    );
    const result = computeCodeAge(history, undefined, NOW);
    expect(result.rawValue).toBe(1.0);
    expect(result.files).toHaveLength(2);
  });

  it("returns correct ratio for mixed old and new files", () => {
    const history = makeGitHistory(
      new Map([
        ["src/new1.ts", new Date("2025-06-01")],
        ["src/new2.ts", new Date("2025-03-01")],
        ["src/old.ts", new Date("2023-01-01")],
      ]),
    );
    const result = computeCodeAge(history, undefined, NOW);
    expect(result.rawValue).toBeCloseTo(1 / 3, 5);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].file).toBe("src/old.ts");
  });

  it("uses custom threshold when provided", () => {
    const history = makeGitHistory(
      new Map([
        ["src/recent.ts", new Date("2025-06-10")],
        ["src/month-old.ts", new Date("2025-05-01")],
        ["src/two-months.ts", new Date("2025-04-01")],
      ]),
    );
    const result = computeCodeAge(history, 30, NOW);
    // 30-day threshold: recent.ts is 5 days old (not old),
    // month-old.ts is 45 days old (old), two-months.ts is 75 days old (old)
    expect(result.rawValue).toBeCloseTo(2 / 3, 5);
    expect(result.files).toHaveLength(2);
  });

  it("returns old files sorted by daysSinceUpdate descending", () => {
    const history = makeGitHistory(
      new Map([
        ["src/newer-old.ts", new Date("2024-03-01")],
        ["src/oldest.ts", new Date("2022-01-01")],
        ["src/older.ts", new Date("2023-06-01")],
        ["src/recent.ts", new Date("2025-06-01")],
      ]),
    );
    const result = computeCodeAge(history, undefined, NOW);
    expect(result.files.length).toBe(3);
    expect(result.files[0].file).toBe("src/oldest.ts");
    expect(result.files[1].file).toBe("src/older.ts");
    expect(result.files[2].file).toBe("src/newer-old.ts");
    for (let i = 1; i < result.files.length; i++) {
      expect(result.files[i].daysSinceUpdate).toBeLessThanOrEqual(
        result.files[i - 1].daysSinceUpdate,
      );
    }
  });
});
