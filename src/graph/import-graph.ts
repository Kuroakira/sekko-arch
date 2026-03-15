import type { FileNode, ImportInfo } from "../types/core.js";
import type { ImportEdge, ImportGraph } from "../types/snapshot.js";
import { resolveImports } from "./resolver.js";

interface GraphState {
  readonly edgeSet: Set<string>;
  readonly edges: ImportEdge[];
  readonly adjacency: Map<string, string[]>;
  readonly reverseAdjacency: Map<string, string[]>;
  readonly knownFiles: Set<string>;
}

function addResolvedEdges(
  filePath: string,
  resolved: readonly ImportInfo[],
  state: GraphState,
): void {
  for (const imp of resolved) {
    if (!imp.resolved) continue;
    if (imp.resolved === filePath) continue;
    if (!state.knownFiles.has(imp.resolved)) continue;

    const edgeKey = `${filePath}->${imp.resolved}`;
    if (state.edgeSet.has(edgeKey)) continue;
    state.edgeSet.add(edgeKey);

    state.edges.push({ fromFile: filePath, toFile: imp.resolved });

    const fromAdj = state.adjacency.get(filePath);
    if (fromAdj) fromAdj.push(imp.resolved);

    const toRevAdj = state.reverseAdjacency.get(imp.resolved);
    if (toRevAdj) toRevAdj.push(filePath);
  }
}

export function buildImportGraph(
  files: readonly FileNode[],
  rootDir: string,
  tsconfigPath?: string,
): ImportGraph {
  const state: GraphState = {
    edgeSet: new Set<string>(),
    edges: [],
    adjacency: new Map<string, string[]>(),
    reverseAdjacency: new Map<string, string[]>(),
    knownFiles: new Set<string>(),
  };

  for (const file of files) {
    state.knownFiles.add(file.path);
    state.adjacency.set(file.path, []);
    state.reverseAdjacency.set(file.path, []);
  }

  for (const file of files) {
    if (!file.sa) continue;

    const resolved = resolveImports(
      file.path,
      file.sa.imports,
      rootDir,
      tsconfigPath,
    );

    addResolvedEdges(file.path, resolved, state);
  }

  return {
    edges: state.edges,
    adjacency: state.adjacency,
    reverseAdjacency: state.reverseAdjacency,
  };
}
