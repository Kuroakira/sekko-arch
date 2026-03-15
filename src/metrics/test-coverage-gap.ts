import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ImportGraph } from "../types/snapshot.js";
import type { Language } from "../types/core.js";
import { parseFile } from "../parser/ts-grammar.js";
import { extractImports } from "../parser/import-extractors.js";
import { resolveImports } from "../graph/resolver.js";

const DTS_PATTERN = /\.d\.tsx?$/;
const BARREL_PATTERN = /\/index\.tsx?$/;
const ENTRY_POINT_PATTERN =
  /(?:^|\/)(?:main|cli\/index|bin\/index)\.tsx?$/;

export interface TestCoverageGapResult {
  readonly rawValue: number;
  readonly files: readonly string[];
}

function isExcludedFile(
  filePath: string,
  _graph: ImportGraph,
): boolean {
  if (DTS_PATTERN.test(filePath)) return true;
  if (ENTRY_POINT_PATTERN.test(filePath)) return true;

  // Barrel files: index.ts that only re-export (have outgoing edges but no logic)
  if (BARREL_PATTERN.test(filePath)) return true;

  return false;
}

function computeReachable(
  testFiles: readonly string[],
  testImports: ReadonlyMap<string, readonly string[]>,
  graph: ImportGraph,
): ReadonlySet<string> {
  const visited = new Set<string>();
  const queue: string[] = [];

  // Seed BFS with all source files directly imported by test files
  for (const testFile of testFiles) {
    const imports = testImports.get(testFile);
    if (!imports) continue;
    for (const imp of imports) {
      if (!visited.has(imp)) {
        visited.add(imp);
        queue.push(imp);
      }
    }
  }

  // BFS through source graph adjacency
  while (queue.length > 0) {
    const current = queue.shift() as string;
    const neighbors = graph.adjacency.get(current);
    if (!neighbors) continue;
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  return visited;
}

function detectLanguage(filePath: string): Language {
  return filePath.endsWith(".tsx") ? "tsx" : "ts";
}

/**
 * Extract resolved imports from test files using tree-sitter + oxc-resolver.
 * Returns a map of test file path -> resolved source file paths.
 */
export function extractTestImports(
  testFiles: readonly string[],
  rootDir: string,
  tsconfigPath?: string,
): ReadonlyMap<string, readonly string[]> {
  const result = new Map<string, string[]>();

  for (const testFile of testFiles) {
    let source: string;
    try {
      source = readFileSync(join(rootDir, testFile), "utf-8");
    } catch {
      continue;
    }

    const lang = detectLanguage(testFile);
    const tree = parseFile(source, lang);
    if (!tree) continue;

    const rawImports = extractImports(tree);
    const resolved = resolveImports(testFile, rawImports, rootDir, tsconfigPath);

    const resolvedPaths: string[] = [];
    for (const imp of resolved) {
      if (imp.resolved) {
        resolvedPaths.push(imp.resolved);
      }
    }

    if (resolvedPaths.length > 0) {
      result.set(testFile, resolvedPaths);
    }
  }

  return result;
}

export function computeTestCoverageGap(
  sourceFiles: readonly string[],
  testFiles: readonly string[],
  testImports: ReadonlyMap<string, readonly string[]>,
  graph: ImportGraph,
): TestCoverageGapResult {
  if (sourceFiles.length === 0 || testFiles.length === 0) {
    return { rawValue: 0, files: [] };
  }

  // Filter eligible source files (exclude .d.ts, barrels, entry points)
  const eligibleFiles = sourceFiles.filter(
    (f) => !isExcludedFile(f, graph),
  );

  if (eligibleFiles.length === 0) {
    return { rawValue: 0, files: [] };
  }

  const reachable = computeReachable(testFiles, testImports, graph);

  const unreachable = eligibleFiles.filter((f) => !reachable.has(f));

  return {
    rawValue: unreachable.length / eligibleFiles.length,
    files: unreachable,
  };
}
