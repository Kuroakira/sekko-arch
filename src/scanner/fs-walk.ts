import { readdirSync } from "node:fs";
import { join, relative, extname } from "node:path";

const EXCLUDED_DIRS = new Set([
  "node_modules",
  "dist",
  ".git",
  "testing",
  "fixtures",
]);
const TS_EXTENSIONS = new Set([".ts", ".tsx"]);
const TEST_FILE_PATTERN = /\.test\.tsx?$/;

/**
 * Recursively walk the filesystem collecting TypeScript files.
 * Excludes node_modules, dist, and .git directories.
 * Symlinks are not followed (avoids circular link loops).
 * Unreadable directories are skipped silently.
 * Returns relative paths from the root directory.
 */
export function fsWalkFiles(rootDir: string): string[] {
  const results: string[] = [];
  walk(rootDir, rootDir, results);
  return results;
}

function walk(dir: string, rootDir: string, results: string[]): void {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) {
        walk(join(dir, entry.name), rootDir, results);
      }
    } else if (entry.isFile()) {
      if (
        TS_EXTENSIONS.has(extname(entry.name)) &&
        !TEST_FILE_PATTERN.test(entry.name)
      ) {
        results.push(relative(rootDir, join(dir, entry.name)));
      }
    }
  }
}
