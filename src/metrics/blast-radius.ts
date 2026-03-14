export interface BlastRadiusResult {
  readonly maxBlastRadius: number;
  readonly maxBlastRadiusRatio: number;
  readonly perFile: ReadonlyMap<string, number>;
}

/**
 * Compute blast radius via reverse BFS.
 * For each file, count how many files are transitively reachable
 * through reverse edges (dependents).
 */
export function computeBlastRadius(
  reverseAdjacency: ReadonlyMap<string, readonly string[]>,
  foundationFiles: ReadonlySet<string>,
): BlastRadiusResult {
  const totalFiles = reverseAdjacency.size;
  if (totalFiles === 0) {
    return { maxBlastRadius: 0, maxBlastRadiusRatio: 0, perFile: new Map() };
  }

  const perFile = new Map<string, number>();

  for (const file of reverseAdjacency.keys()) {
    // BFS from this file through reverse edges
    const visited = new Set<string>();
    const queue = [file];
    visited.add(file);

    while (queue.length > 0) {
      const current = queue.shift();
      if (current === undefined) break;
      const dependents = reverseAdjacency.get(current) ?? [];
      for (const dep of dependents) {
        if (!visited.has(dep)) {
          visited.add(dep);
          queue.push(dep);
        }
      }
    }

    // Blast radius = reachable files minus the file itself
    perFile.set(file, visited.size - 1);
  }

  // Find max excluding foundation files
  let maxBlastRadius = 0;
  for (const [file, radius] of perFile) {
    if (!foundationFiles.has(file) && radius > maxBlastRadius) {
      maxBlastRadius = radius;
    }
  }

  const maxBlastRadiusRatio = maxBlastRadius / totalFiles;
  return { maxBlastRadius, maxBlastRadiusRatio, perFile };
}
