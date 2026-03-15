import picomatch from "picomatch";

/**
 * Filter out paths matching any of the ignore patterns.
 * Uses picomatch for glob matching (picomatch is micromatch's core).
 */
export function filterByIgnorePatterns(
  paths: readonly string[],
  patterns: readonly string[],
): string[] {
  if (patterns.length === 0) return [...paths];

  const isMatch = picomatch([...patterns]);
  return paths.filter((p) => !isMatch(p));
}
