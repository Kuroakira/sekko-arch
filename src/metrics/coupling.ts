import type { ImportEdge } from "../types/index.js";
import { isStable } from "./stability.js";

export interface CouplingResult {
  readonly score: number;
  readonly crossModuleEdges: number;
  readonly crossModuleToUnstable: number;
}

export function computeCoupling(
  edges: readonly ImportEdge[],
  moduleAssignments: ReadonlyMap<string, string>,
  fanIn: ReadonlyMap<string, number>,
  fanOut: ReadonlyMap<string, number>,
): CouplingResult {
  if (edges.length === 0) {
    return { score: 0, crossModuleEdges: 0, crossModuleToUnstable: 0 };
  }

  let crossModuleEdges = 0;
  let crossModuleToUnstable = 0;

  for (const edge of edges) {
    const fromModule = moduleAssignments.get(edge.fromFile);
    const toModule = moduleAssignments.get(edge.toFile);

    if (fromModule === toModule) continue;

    crossModuleEdges++;

    if (!isStable(edge.toFile, fanIn, fanOut)) {
      crossModuleToUnstable++;
    }
  }

  if (crossModuleEdges === 0) {
    return { score: 0, crossModuleEdges: 0, crossModuleToUnstable: 0 };
  }

  const score = crossModuleToUnstable / crossModuleEdges;
  return { score, crossModuleEdges, crossModuleToUnstable };
}
