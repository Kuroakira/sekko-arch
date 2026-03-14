export interface DepthResult {
  readonly maxDepth: number;
  readonly deepestPath: readonly string[];
}

export function computeMaxDepth(
  adjacency: ReadonlyMap<string, readonly string[]>,
): DepthResult {
  if (adjacency.size === 0) return { maxDepth: 0, deepestPath: [] };

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

  // Iterative DFS with memoization and cycle detection
  const memo = new Map<string, number>();
  const bestChild = new Map<string, string | null>();

  for (const seed of seeds) {
    if (memo.has(seed)) continue;

    // Stack frames: [node, neighborIndex, currentMaxDepth, currentBestChild]
    const stack: [string, number, number, string | null][] = [
      [seed, 0, 0, null],
    ];
    const visiting = new Set<string>();
    visiting.add(seed);

    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      const [node, , ,] = frame;
      const neighbors = adjacency.get(node) ?? [];

      if (frame[1] < neighbors.length) {
        const neighbor = neighbors[frame[1]];
        frame[1]++;

        if (memo.has(neighbor)) {
          // Already computed — use cached value
          const childDepth = 1 + (memo.get(neighbor) ?? 0);
          if (childDepth > frame[2]) {
            frame[2] = childDepth;
            frame[3] = neighbor;
          }
        } else if (visiting.has(neighbor)) {
          // Cycle detected — skip (depth contribution = 0)
        } else {
          // Push new frame for unvisited neighbor
          visiting.add(neighbor);
          stack.push([neighbor, 0, 0, null]);
        }
      } else {
        // All neighbors processed — pop and propagate
        stack.pop();
        const depth = Math.min(frame[2], nodeCount); // cap for pathological cases
        memo.set(node, depth);
        bestChild.set(node, frame[3]);
        visiting.delete(node);

        // Propagate to parent
        if (stack.length > 0) {
          const parent = stack[stack.length - 1];
          const childDepth = 1 + depth;
          if (childDepth > parent[2]) {
            parent[2] = childDepth;
            parent[3] = node;
          }
        }
      }
    }
  }

  // Find the seed with maximum depth
  let maxDepth = 0;
  let maxSeed = seeds[0];
  for (const seed of seeds) {
    const depth = memo.get(seed) ?? 0;
    if (depth > maxDepth) {
      maxDepth = depth;
      maxSeed = seed;
    }
  }

  // Reconstruct deepest path (with visited check to handle cycles)
  const deepestPath: string[] = [];
  const visited = new Set<string>();
  let current: string | null = maxSeed ?? null;
  while (current !== null && !visited.has(current)) {
    visited.add(current);
    deepestPath.push(current);
    current = bestChild.get(current) ?? null;
  }

  return { maxDepth, deepestPath };
}
