import type { ImportEdge } from "../types/snapshot.js";

/**
 * Computes normalized Shannon entropy of dependency distribution across modules.
 * H = -Σ(p_i * log2(p_i)) / log2(N)
 * Low entropy = dependencies concentrated (good). High = scattered (bad).
 */
export function computeEntropy(
  edges: readonly ImportEdge[],
  moduleAssignments: ReadonlyMap<string, string>,
): number {
  const moduleEdgeCount = new Map<string, number>();
  let totalEdges = 0;

  for (const edge of edges) {
    const toModule = moduleAssignments.get(edge.toFile);
    if (toModule) {
      moduleEdgeCount.set(toModule, (moduleEdgeCount.get(toModule) ?? 0) + 1);
      totalEdges++;
    }
  }

  if (totalEdges === 0 || moduleEdgeCount.size < 2) return 0;

  let entropy = 0;
  for (const count of moduleEdgeCount.values()) {
    const p = count / totalEdges;
    entropy -= p * Math.log2(p);
  }

  const maxEntropy = Math.log2(moduleEdgeCount.size);
  if (maxEntropy === 0) return 0;

  return entropy / maxEntropy;
}
