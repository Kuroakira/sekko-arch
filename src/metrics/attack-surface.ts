/**
 * Computes attack surface as ratio of files reachable from entry points.
 * BFS from entry points through adjacency graph.
 * Wider surface = more code exposed through public entry points.
 */
export function computeAttackSurface(
  adjacency: ReadonlyMap<string, readonly string[]>,
  entryPoints: ReadonlySet<string>,
  totalFiles: number,
): number {
  if (totalFiles === 0 || entryPoints.size === 0) return 0;

  const visited = new Set<string>();
  const queue: string[] = [...entryPoints];

  while (queue.length > 0) {
    const file = queue.shift();
    if (file === undefined) break;
    if (visited.has(file)) continue;
    visited.add(file);

    const neighbors = adjacency.get(file);
    if (neighbors) {
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }
  }

  return visited.size / totalFiles;
}
