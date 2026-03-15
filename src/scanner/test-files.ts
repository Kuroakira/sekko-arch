import { execSync } from "node:child_process";

const TEST_FILE_PATTERN = /\.test\.tsx?$/;
const EXCLUDED_DIR_SEGMENTS = /(^|\/)(testing|fixtures)\//;

export function isTestFile(filePath: string): boolean {
  return TEST_FILE_PATTERN.test(filePath);
}

/**
 * List tracked test files using git ls-files.
 * Returns empty array if the directory is not a git repository.
 */
export function collectTestFiles(cwd: string): string[] {
  try {
    const output = execSync("git ls-files", {
      cwd,
      encoding: "utf-8",
    });

    return output
      .split("\n")
      .filter(
        (line) =>
          line.length > 0 &&
          isTestFile(line) &&
          !EXCLUDED_DIR_SEGMENTS.test(line),
      );
  } catch {
    return [];
  }
}
