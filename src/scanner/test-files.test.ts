import { describe, it, expect, vi } from "vitest";
import { collectTestFiles, isTestFile } from "./test-files.js";
import * as childProcess from "node:child_process";

vi.mock("node:child_process");

const mockExecSync = vi.mocked(childProcess.execSync);

describe("isTestFile", () => {
  it("returns true for .test.ts files", () => {
    expect(isTestFile("src/foo.test.ts")).toBe(true);
  });

  it("returns true for .test.tsx files", () => {
    expect(isTestFile("src/foo.test.tsx")).toBe(true);
  });

  it("returns false for regular .ts files", () => {
    expect(isTestFile("src/foo.ts")).toBe(false);
  });

  it("returns false for regular .tsx files", () => {
    expect(isTestFile("src/foo.tsx")).toBe(false);
  });
});

describe("collectTestFiles", () => {
  it("collects only .test.ts and .test.tsx files", () => {
    mockExecSync.mockReturnValue(
      "src/a.ts\nsrc/a.test.ts\nsrc/b.tsx\nsrc/b.test.tsx\nsrc/c.js\n",
    );

    const files = collectTestFiles("/some/dir");
    expect(files).toContain("src/a.test.ts");
    expect(files).toContain("src/b.test.tsx");
    expect(files).not.toContain("src/a.ts");
    expect(files).not.toContain("src/b.tsx");
    expect(files).not.toContain("src/c.js");
  });

  it("excludes testing/ and fixtures/ directories", () => {
    mockExecSync.mockReturnValue(
      "src/foo.test.ts\nsrc/testing/helpers.test.ts\nsrc/e2e/fixtures/bar.test.ts\n",
    );

    const files = collectTestFiles("/some/dir");
    expect(files).toContain("src/foo.test.ts");
    expect(files).not.toContain("src/testing/helpers.test.ts");
    expect(files).not.toContain("src/e2e/fixtures/bar.test.ts");
  });

  it("returns empty array when git is not available", () => {
    mockExecSync.mockImplementation(() => {
      throw new Error("not a git repo");
    });

    const files = collectTestFiles("/not-a-repo");
    expect(files).toEqual([]);
  });

  it("handles empty git output", () => {
    mockExecSync.mockReturnValue("");

    const files = collectTestFiles("/some/dir");
    expect(files).toEqual([]);
  });

  it("passes the correct cwd option to execSync", () => {
    mockExecSync.mockReturnValue("src/foo.test.ts\n");

    collectTestFiles("/my/project");

    expect(childProcess.execSync).toHaveBeenCalledWith("git ls-files", {
      cwd: "/my/project",
      encoding: "utf-8",
    });
  });
});
