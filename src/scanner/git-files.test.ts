import { describe, it, expect, vi } from "vitest";
import { gitListFiles } from "./git-files.js";
import * as childProcess from "node:child_process";

vi.mock("node:child_process");

const mockExecSync = vi.mocked(childProcess.execSync);

describe("gitListFiles", () => {
  it("returns ts and tsx files from git ls-files output", () => {
    mockExecSync.mockReturnValue(
      [
        "src/index.ts",
        "src/utils/helper.ts",
        "src/components/App.tsx",
        "package.json",
        "README.md",
        "src/styles/main.css",
      ].join("\n"),
    );

    const result = gitListFiles("/project");

    expect(result).toEqual([
      "src/index.ts",
      "src/utils/helper.ts",
      "src/components/App.tsx",
    ]);
  });

  it("returns empty array when no ts/tsx files found", () => {
    mockExecSync.mockReturnValue("package.json\nREADME.md\n");

    const result = gitListFiles("/project");

    expect(result).toEqual([]);
  });

  it("handles empty git output", () => {
    mockExecSync.mockReturnValue("");

    const result = gitListFiles("/project");

    expect(result).toEqual([]);
  });

  it("returns null for non-git directories", () => {
    mockExecSync.mockImplementation(() => {
      throw new Error("fatal: not a git repository");
    });

    const result = gitListFiles("/not-a-repo");

    expect(result).toBeNull();
  });

  it("filters out blank lines from output", () => {
    mockExecSync.mockReturnValue("src/index.ts\n\nsrc/app.tsx\n\n");

    const result = gitListFiles("/project");

    expect(result).toEqual(["src/index.ts", "src/app.tsx"]);
  });

  it("passes the correct cwd option to execSync", () => {
    mockExecSync.mockReturnValue("");

    gitListFiles("/my/project");

    expect(childProcess.execSync).toHaveBeenCalledWith("git ls-files", {
      cwd: "/my/project",
      encoding: "utf-8",
    });
  });
});
