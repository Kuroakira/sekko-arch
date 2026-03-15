export interface LevelizationResult {
  readonly levels: ReadonlyMap<string, number>;
  readonly violations: number;
  readonly totalEdges: number;
  readonly violationRatio: number;
}

/**
 * Map each node to its SCC representative.
 * Nodes not in any cycle map to themselves.
 */
function buildSccMap(
  cycles: readonly (readonly string[])[],
): ReadonlyMap<string, string> {
  const sccMap = new Map<string, string>();
  for (const cycle of cycles) {
    const rep = cycle[0];
    for (const node of cycle) {
      sccMap.set(node, rep);
    }
  }
  return sccMap;
}

/**
 * Build the SCC DAG: collapse each cycle into its representative node,
 * remove intra-SCC edges.
 */
function buildSccDag(
  adjacency: ReadonlyMap<string, readonly string[]>,
  sccMap: ReadonlyMap<string, string>,
): ReadonlyMap<string, ReadonlySet<string>> {
  const getRepr = (node: string): string => sccMap.get(node) ?? node;

  const sccNodes = new Set<string>();
  for (const node of adjacency.keys()) {
    sccNodes.add(getRepr(node));
  }

  const sccAdj = new Map<string, Set<string>>();
  for (const node of sccNodes) {
    sccAdj.set(node, new Set());
  }

  for (const [from, neighbors] of adjacency) {
    const fromRepr = getRepr(from);
    for (const to of neighbors) {
      const toRepr = getRepr(to);
      if (fromRepr !== toRepr) {
        sccAdj.get(fromRepr)?.add(toRepr);
      }
    }
  }

  return sccAdj;
}

/**
 * Assign levels via reverse Kahn's algorithm on the SCC DAG.
 * Level 0 = leaf nodes (no outgoing edges).
 */
function assignLevels(
  sccAdj: ReadonlyMap<string, ReadonlySet<string>>,
): ReadonlyMap<string, number> {
  const reverseAdj = new Map<string, Set<string>>();
  const outDegree = new Map<string, number>();

  for (const node of sccAdj.keys()) {
    reverseAdj.set(node, new Set());
    outDegree.set(node, 0);
  }

  for (const [from, targets] of sccAdj) {
    outDegree.set(from, targets.size);
    for (const to of targets) {
      reverseAdj.get(to)?.add(from);
    }
  }

  const queue: string[] = [];
  const sccLevels = new Map<string, number>();

  for (const [node, degree] of outDegree) {
    if (degree === 0) {
      queue.push(node);
      sccLevels.set(node, 0);
    }
  }

  let qi = 0;
  while (qi < queue.length) {
    const node = queue[qi++];
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

  return sccLevels;
}

/**
 * Count levelization violations: edges from lower level to higher/equal level,
 * plus intra-SCC edges.
 */
function countViolations(
  adjacency: ReadonlyMap<string, readonly string[]>,
  levels: ReadonlyMap<string, number>,
  sccMap: ReadonlyMap<string, string>,
): { violations: number; totalEdges: number } {
  const getRepr = (node: string): string => sccMap.get(node) ?? node;
  let violations = 0;
  let totalEdges = 0;

  for (const [from, neighbors] of adjacency) {
    for (const to of neighbors) {
      totalEdges++;
      const fromRepr = getRepr(from);
      const toRepr = getRepr(to);

      if (fromRepr === toRepr && sccMap.has(from)) {
        violations++;
      } else {
        const fromLevel = levels.get(from) ?? 0;
        const toLevel = levels.get(to) ?? 0;
        if (fromLevel <= toLevel && fromRepr !== toRepr) {
          violations++;
        }
      }
    }
  }

  return { violations, totalEdges };
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

  const sccMap = buildSccMap(cycles);
  const sccAdj = buildSccDag(adjacency, sccMap);
  const sccLevels = assignLevels(sccAdj);

  // Map SCC levels back to individual nodes
  const getRepr = (node: string): string => sccMap.get(node) ?? node;
  const levels = new Map<string, number>();
  for (const node of adjacency.keys()) {
    levels.set(node, sccLevels.get(getRepr(node)) ?? 0);
  }

  const { violations, totalEdges } = countViolations(adjacency, levels, sccMap);
  const violationRatio = totalEdges === 0 ? 0 : violations / totalEdges;

  return { levels, violations, totalEdges, violationRatio };
}
