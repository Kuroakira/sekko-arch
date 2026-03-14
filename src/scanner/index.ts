import { readFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import type { FileNode, Language } from "../types/core.js";
import { gitListFiles } from "./git-files.js";
import { fsWalkFiles } from "./fs-walk.js";
import { countLines } from "./line-counter.js";

function detectLanguage(filePath: string): Language {
  return extname(filePath) === ".tsx" ? "tsx" : "ts";
}

/**
 * Scan a directory for TypeScript files and build FileNode array.
 * Uses git ls-files if available, falls back to filesystem walk.
 * Populates path, name, lang, and line counts. sa is left undefined
 * (populated by the parser pipeline in a later phase).
 */
export function scanFiles(rootDir: string): FileNode[] {
  const relativePaths = gitListFiles(rootDir) ?? fsWalkFiles(rootDir);
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
