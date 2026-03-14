import { execSync } from "node:child_process";

const TS_EXTENSIONS = new Set([".ts", ".tsx"]);
const TEST_FILE_PATTERN = /\.test\.tsx?$/;
const EXCLUDED_DIR_SEGMENTS = /(^|\/)(testing|fixtures)\//;

function hasTypeScriptExtension(filePath: string): boolean {
  const dotIndex = filePath.lastIndexOf(".");
  if (dotIndex === -1) return false;
  return TS_EXTENSIONS.has(filePath.slice(dotIndex));
}

function isTestFile(filePath: string): boolean {
  return TEST_FILE_PATTERN.test(filePath);
}

/**
 * List tracked TypeScript files using git ls-files.
 * Returns null if the directory is not a git repository.
 */
export function gitListFiles(cwd: string): string[] | null {
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
          hasTypeScriptExtension(line) &&
          !isTestFile(line) &&
          !EXCLUDED_DIR_SEGMENTS.test(line),
      );
  } catch {
    return null;
  }
}
