import type { ImportEdge } from "../types/snapshot.js";

/**
 * Computes module cohesion as 1 - minCohesion across all modules.
 * Cohesion per module = intra-module edges / (N - 1) where N = file count.
 * High cohesion (many internal imports) → low rawValue → A.
 */
export function computeCohesion(
  edges: readonly ImportEdge[],
  moduleAssignments: ReadonlyMap<string, string>,
): number {
  const moduleFiles = new Map<string, Set<string>>();
  for (const [file, mod] of moduleAssignments) {
    const existing = moduleFiles.get(mod);
    if (existing) {
      existing.add(file);
    } else {
      moduleFiles.set(mod, new Set([file]));
    }
  }

  let minCohesion = 1.0;
  let hasMultiFileModule = false;

  for (const [mod, files] of moduleFiles) {
    if (files.size < 2) continue;
    // Skip root-level modules (no "/" in module name) — these contain
    // unrelated files (e.g., constants.ts, index.ts) that share a directory
    // but aren't conceptually a cohesive module.
    if (!mod.includes("/")) continue;
    hasMultiFileModule = true;

    let intraEdges = 0;
    for (const edge of edges) {
      if (
        moduleAssignments.get(edge.fromFile) === mod &&
        moduleAssignments.get(edge.toFile) === mod
      ) {
        intraEdges++;
      }
    }

    const cohesion = intraEdges / (files.size - 1);
    minCohesion = Math.min(minCohesion, cohesion);
  }

  if (!hasMultiFileModule) return 0;
  return 1 - minCohesion;
}
