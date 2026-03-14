export function computeMaxDepth(
  adjacency: ReadonlyMap<string, readonly string[]>,
): number {
  if (adjacency.size === 0) return 0;

  const nodeCount = adjacency.size;

  // Find all nodes that are targets (have incoming edges)
  const hasIncoming = new Set<string>();
  for (const neighbors of adjacency.values()) {
    for (const n of neighbors) {
      hasIncoming.add(n);
    }
  }

  // Seed nodes: nodes with fan-in = 0
  let seeds = [...adjacency.keys()].filter((n) => !hasIncoming.has(n));

  // If no roots (all in cycles), use all nodes
  if (seeds.length === 0) {
    seeds = [...adjacency.keys()];
  }

  // Memoized longest path with cycle detection
  const memo = new Map<string, number>();
  const visiting = new Set<string>();

  function longestPath(node: string): number {
    const cached = memo.get(node);
    if (cached !== undefined) return cached;
    if (visiting.has(node)) return 0; // cycle detected, stop

    visiting.add(node);

    const neighbors = adjacency.get(node) ?? [];
    let maxChild = 0;
    for (const neighbor of neighbors) {
      maxChild = Math.max(maxChild, 1 + longestPath(neighbor));
      // Cap at node count to prevent pathological cases
      if (maxChild >= nodeCount) {
        maxChild = nodeCount;
        break;
      }
    }

    visiting.delete(node);
    memo.set(node, maxChild);
    return maxChild;
  }

  let maxDepth = 0;
  for (const seed of seeds) {
    maxDepth = Math.max(maxDepth, longestPath(seed));
  }

  return maxDepth;
}
