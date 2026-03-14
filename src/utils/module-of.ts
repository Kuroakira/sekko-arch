/**
 * Extract depth-2 module boundary from a file path.
 * The last segment is treated as a filename.
 * e.g. "src/auth/login.ts" -> "src/auth"
 *      "src/index.ts" -> "src"
 *      "index.ts" -> "index.ts"
 */
export function moduleOf(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/").replace(/\/+$/, "");
  const parts = normalized.split("/").filter(Boolean);

  if (parts.length <= 1) {
    return normalized;
  }

  if (parts.length === 2) {
    return parts[0];
  }

  // 3+ parts: return first two directory segments
  return `${parts[0]}/${parts[1]}`;
}
