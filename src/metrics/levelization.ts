export interface LevelizationResult {
  readonly levels: ReadonlyMap<string, number>;
  readonly violations: number;
  readonly totalEdges: number;
  readonly violationRatio: number;
}

/**
 * Compute levelization via Kahn's topological sort on the SCC DAG.
 * Nodes in cycles are collapsed into single SCC nodes.
 * Level 0 = leaf (no outgoing edges in DAG).
 * Upward violations = edges from lower level to higher level + intra-SCC edges.
 */
export function computeLevelization(
  adjacency: ReadonlyMap<string, readonly string[]>,
  cycles: readonly (readonly string[])[],
): LevelizationResult {
  if (adjacency.size === 0) {
    return { levels: new Map(), violations: 0, totalEdges: 0, violationRatio: 0 };
  }

  // Map each node to its SCC representative
  const sccMap = new Map<string, string>();
  for (const cycle of cycles) {
    const rep = cycle[0];
    for (const node of cycle) {
      sccMap.set(node, rep);
    }
  }

  const getRepr = (node: string): string => sccMap.get(node) ?? node;

  // Build SCC DAG
  const sccNodes = new Set<string>();
  for (const node of adjacency.keys()) {
    sccNodes.add(getRepr(node));
  }

  const sccAdj = new Map<string, Set<string>>();
  const sccInDegree = new Map<string, number>();
  for (const node of sccNodes) {
    sccAdj.set(node, new Set());
    sccInDegree.set(node, 0);
  }

  for (const [from, neighbors] of adjacency) {
    const fromRepr = getRepr(from);
    for (const to of neighbors) {
      const toRepr = getRepr(to);
      if (fromRepr === toRepr) continue; // skip intra-SCC edges in DAG
      const sccTargets = sccAdj.get(fromRepr);
      if (sccTargets && !sccTargets.has(toRepr)) {
        sccTargets.add(toRepr);
        sccInDegree.set(toRepr, (sccInDegree.get(toRepr) ?? 0) + 1);
      }
    }
  }

  // Reverse Kahn's: start from sinks (nodes with no outgoing edges in sccAdj)
  // Level 0 = nodes that don't depend on anything (leaves/sinks)
  // Build reverse DAG for Kahn's
  const reverseAdj = new Map<string, Set<string>>();
  const outDegree = new Map<string, number>();
  for (const node of sccNodes) {
    reverseAdj.set(node, new Set());
    outDegree.set(node, 0);
  }

  for (const [from, targets] of sccAdj) {
    outDegree.set(from, targets.size);
    for (const to of targets) {
      reverseAdj.get(to)?.add(from);
    }
  }

  // Kahn's on reverse: start from nodes with outDegree 0 (leaves)
  const queue: string[] = [];
  const sccLevels = new Map<string, number>();

  for (const [node, degree] of outDegree) {
    if (degree === 0) {
      queue.push(node);
      sccLevels.set(node, 0);
    }
  }

  while (queue.length > 0) {
    const node = queue.shift();
    if (node === undefined) break;
    const level = sccLevels.get(node) ?? 0;

    for (const parent of reverseAdj.get(node) ?? []) {
      const newLevel = level + 1;
      const currentLevel = sccLevels.get(parent) ?? -1;
      if (newLevel > currentLevel) {
        sccLevels.set(parent, newLevel);
      }

      const newOut = (outDegree.get(parent) ?? 1) - 1;
      outDegree.set(parent, newOut);
      if (newOut === 0) {
        queue.push(parent);
      }
    }
  }

  // Map SCC levels back to individual nodes
  const levels = new Map<string, number>();
  for (const node of adjacency.keys()) {
    levels.set(node, sccLevels.get(getRepr(node)) ?? 0);
  }

  // Count violations: edges from lower level to higher level + intra-SCC edges
  let violations = 0;
  let totalEdges = 0;

  for (const [from, neighbors] of adjacency) {
    for (const to of neighbors) {
      totalEdges++;
      const fromRepr = getRepr(from);
      const toRepr = getRepr(to);

      if (fromRepr === toRepr && sccMap.has(from)) {
        // Intra-SCC edge = violation
        violations++;
      } else {
        const fromLevel = levels.get(from) ?? 0;
        const toLevel = levels.get(to) ?? 0;
        // Upward violation: edge from lower level to same or higher level
        if (fromLevel <= toLevel && fromRepr !== toRepr) {
          violations++;
        }
      }
    }
  }

  const violationRatio = totalEdges === 0 ? 0 : violations / totalEdges;
  return { levels, violations, totalEdges, violationRatio };
}
