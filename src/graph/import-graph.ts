import type { FileNode } from "../types/core.js";
import type { ImportEdge, ImportGraph } from "../types/snapshot.js";
import { resolveImports } from "./resolver.js";

export function buildImportGraph(
  files: readonly FileNode[],
  rootDir: string,
  tsconfigPath?: string,
): ImportGraph {
  const edgeSet = new Set<string>();
  const edges: ImportEdge[] = [];
  const adjacency = new Map<string, string[]>();
  const reverseAdjacency = new Map<string, string[]>();

  // Track known files to avoid phantom nodes
  const knownFiles = new Set<string>();
  for (const file of files) {
    knownFiles.add(file.path);
    adjacency.set(file.path, []);
    reverseAdjacency.set(file.path, []);
  }

  for (const file of files) {
    if (!file.sa) continue;

    const resolved = resolveImports(
      file.path,
      file.sa.imports,
      rootDir,
      tsconfigPath,
    );

    for (const imp of resolved) {
      if (!imp.resolved) continue;
      if (imp.resolved === file.path) continue; // skip self-edges
      if (!knownFiles.has(imp.resolved)) continue; // skip imports to files outside the scan

      const edgeKey = `${file.path}->${imp.resolved}`;
      if (edgeSet.has(edgeKey)) continue; // deduplicate
      edgeSet.add(edgeKey);

      edges.push({ fromFile: file.path, toFile: imp.resolved });

      const fromAdj = adjacency.get(file.path);
      if (fromAdj) fromAdj.push(imp.resolved);

      const toRevAdj = reverseAdjacency.get(imp.resolved);
      if (toRevAdj) toRevAdj.push(file.path);
    }
  }

  return { edges, adjacency, reverseAdjacency };
}
