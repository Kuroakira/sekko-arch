import type { BoundaryConfig, RuleViolation } from "../types/rules.js";
import type { ImportEdge } from "../types/snapshot.js";
import { globMatch } from "../utils/glob.js";

export function checkBoundaries(
  boundaries: readonly BoundaryConfig[],
  edges: readonly ImportEdge[],
): RuleViolation[] {
  const violations: RuleViolation[] = [];

  for (const edge of edges) {
    for (const boundary of boundaries) {
      const fromMatches = globMatch(boundary.from, edge.fromFile);
      const toMatches = globMatch(boundary.to, edge.toFile);

      if (fromMatches && toMatches) {
        const reason = boundary.reason
          ? `: ${boundary.reason}`
          : "";
        violations.push({
          rule: "boundary_violation",
          severity: "error",
          message: `Import from "${boundary.from}" to "${boundary.to}" is forbidden${reason}: ${edge.fromFile} -> ${edge.toFile}`,
          affectedFiles: [edge.fromFile, edge.toFile],
        });
      }
    }
  }

  return violations;
}
