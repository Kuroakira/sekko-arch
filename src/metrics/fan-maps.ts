import type { ImportEdge } from "../types/snapshot.js";

export interface FanMaps {
  readonly fanIn: ReadonlyMap<string, number>;
  readonly fanOut: ReadonlyMap<string, number>;
}

export function computeFanMaps(edges: readonly ImportEdge[]): FanMaps {
  const fanIn = new Map<string, number>();
  const fanOut = new Map<string, number>();

  const ensureFile = (file: string): void => {
    if (!fanIn.has(file)) fanIn.set(file, 0);
    if (!fanOut.has(file)) fanOut.set(file, 0);
  };

  for (const edge of edges) {
    ensureFile(edge.fromFile);
    ensureFile(edge.toFile);
    fanOut.set(edge.fromFile, (fanOut.get(edge.fromFile) ?? 0) + 1);
    fanIn.set(edge.toFile, (fanIn.get(edge.toFile) ?? 0) + 1);
  }

  return { fanIn, fanOut };
}
