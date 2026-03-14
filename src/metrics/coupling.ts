import type { ImportEdge } from "../types/index.js";
import {
  STABILITY_INSTABILITY_THRESHOLD,
  STABILITY_FAN_IN_THRESHOLD,
} from "../constants.js";

export interface CouplingResult {
  readonly score: number;
  readonly crossModuleEdges: number;
  readonly crossModuleToUnstable: number;
}

function isStable(
  file: string,
  fanIn: ReadonlyMap<string, number>,
  fanOut: ReadonlyMap<string, number>,
): boolean {
  const fi = fanIn.get(file) ?? 0;
  const fo = fanOut.get(file) ?? 0;
  if (fi < STABILITY_FAN_IN_THRESHOLD) return false;
  const total = fi + fo;
  if (total === 0) return true;
  const instability = fo / total;
  return instability <= STABILITY_INSTABILITY_THRESHOLD;
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
