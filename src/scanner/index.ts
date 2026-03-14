import { readFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import type { FileNode, Language } from "../types/core.js";
import { gitListFiles } from "./git-files.js";
import { fsWalkFiles } from "./fs-walk.js";
import { countLines } from "./line-counter.js";
import { filterByIgnorePatterns } from "./ignore-filter.js";
import { parseRulesFile } from "../rules/toml-parser.js";

export interface ScanOptions {
  readonly include?: readonly string[];
  readonly ignorePatterns?: readonly string[];
}

function detectLanguage(filePath: string): Language {
  return extname(filePath) === ".tsx" ? "tsx" : "ts";
}

/**
 * Filter paths to only those under the specified include directories.
 * If includes is empty or undefined, all paths pass through.
 */
function filterByInclude(
  paths: readonly string[],
  includes: readonly string[],
): string[] {
  if (includes.length === 0) return [...paths];

  const normalized = includes.map((dir) =>
    dir.endsWith("/") ? dir : `${dir}/`,
  );
  return paths.filter((p) =>
    normalized.some((prefix) => p.startsWith(prefix)),
  );
}

/**
 * Scan a directory for TypeScript files and build FileNode array.
 * Uses git ls-files if available, falls back to filesystem walk.
 * Populates path, name, lang, and line counts. sa is left undefined
 * (populated by the parser pipeline in a later phase).
 *
 * Filter order: file collection → --include filter → [ignore] filter → scan
 */
export function scanFiles(rootDir: string, options?: ScanOptions): FileNode[] {
  let relativePaths = gitListFiles(rootDir) ?? fsWalkFiles(rootDir);

  // Apply --include filter first (additive: keep only matching dirs)
  if (options?.include && options.include.length > 0) {
    relativePaths = filterByInclude(relativePaths, options.include);
  }

  // Apply [ignore] filter (subtractive: remove matching patterns)
  const ignorePatterns =
    options?.ignorePatterns ??
    parseRulesFile(rootDir)?.ignore?.patterns ??
    [];
  if (ignorePatterns.length > 0) {
    relativePaths = filterByIgnorePatterns(relativePaths, ignorePatterns);
  }

  const results: FileNode[] = [];

  for (const relPath of relativePaths) {
    const absolutePath = join(rootDir, relPath);
    let source: string;
    try {
      source = readFileSync(absolutePath, "utf-8");
    } catch {
      // Skip unreadable files (deleted, permission denied, race condition)
      continue;
    }
    const counts = countLines(source);

    results.push({
      path: relPath,
      name: basename(relPath),
      isDir: false,
      lines: counts.lines,
      logic: counts.logic,
      comments: counts.comments,
      blanks: counts.blanks,
      funcs: 0,
      lang: detectLanguage(relPath),
      sa: undefined,
    });
  }

  return results;
}
