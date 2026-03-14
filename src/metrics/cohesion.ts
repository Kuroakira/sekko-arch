import type { ImportEdge } from "../types/snapshot.js";

export interface CohesionResult {
  readonly rawValue: number;
  readonly worstModule: string;
  readonly worstCohesion: number;
}

/**
 * Computes module cohesion as 1 - minCohesion across all modules.
 * Cohesion per module = intra-module edges / (N - 1) where N = file count.
 * High cohesion (many internal imports) → low rawValue → A.
 */
export function computeCohesion(
  edges: readonly ImportEdge[],
  moduleAssignments: ReadonlyMap<string, string>,
): CohesionResult {
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
  let worstModule = "";
  let hasMultiFileModule = false;

  for (const [mod, files] of moduleFiles) {
    if (files.size < 2) continue;
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

    // Clamp to 1.0 — intraEdges can exceed N-1 in directed graphs
    const cohesion = Math.min(intraEdges / (files.size - 1), 1.0);
    if (cohesion < minCohesion) {
      minCohesion = cohesion;
      worstModule = mod;
    }
  }

  if (!hasMultiFileModule) return { rawValue: 0, worstModule: "", worstCohesion: 0 };
  return { rawValue: 1 - minCohesion, worstModule, worstCohesion: minCohesion };
}
