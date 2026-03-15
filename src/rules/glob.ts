/**
 * Match a path against a glob pattern.
 * Supports: exact match, * (single segment), ** (any depth),
 * prefix match (directory as prefix).
 */
export function globMatch(pattern: string, path: string): boolean {
  if (pattern === path) {
    return true;
  }

  // ** patterns: match any depth
  if (pattern.includes("**")) {
    return matchDoubleWildcard(pattern, path);
  }

  // * patterns: match single segment
  if (pattern.includes("*")) {
    return matchSingleWildcard(pattern, path);
  }

  // Prefix match: pattern is a directory prefix
  return path.startsWith(pattern + "/");
}

function matchDoubleWildcard(pattern: string, path: string): boolean {
  const parts = pattern.split("**");

  if (parts.length !== 2) {
    return false;
  }

  const prefix = parts[0];
  const suffix = parts[1];

  if (prefix && !path.startsWith(prefix)) {
    return false;
  }

  if (!suffix || suffix === "/") {
    return true;
  }

  // suffix like "/*.ts" — match extension on the last segment
  const remaining = path.slice(prefix.length);
  const suffixPattern = suffix.startsWith("/") ? suffix.slice(1) : suffix;

  if (suffixPattern.includes("*")) {
    return matchSingleWildcard(suffixPattern, remaining.split("/").pop() ?? "");
  }

  return remaining.endsWith(suffixPattern);
}

function matchSingleWildcard(pattern: string, path: string): boolean {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, "[^/]*");
  const regex = new RegExp(`^${escaped}$`);
  return regex.test(path);
}
