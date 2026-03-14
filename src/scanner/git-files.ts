import { execSync } from "node:child_process";

const TS_EXTENSIONS = new Set([".ts", ".tsx"]);

function hasTypeScriptExtension(filePath: string): boolean {
  const dotIndex = filePath.lastIndexOf(".");
  if (dotIndex === -1) return false;
  return TS_EXTENSIONS.has(filePath.slice(dotIndex));
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
      .filter((line) => line.length > 0 && hasTypeScriptExtension(line));
  } catch {
    return null;
  }
}
