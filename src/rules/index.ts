import type {
  RulesConfig,
  HealthReport,
  ImportEdge,
  RuleCheckResult,
} from "../types/index.js";
import { checkConstraints } from "./constraints.js";
import { checkLayers } from "./layers.js";
import { checkBoundaries } from "./boundaries.js";

export { parseRulesFile } from "./toml-parser.js";

export function checkRules(
  config: RulesConfig,
  health: HealthReport,
  edges: readonly ImportEdge[],
): RuleCheckResult {
  let rulesChecked = 0;
  const allViolations = [];

  if (config.constraints) {
    const constraintCount = Object.keys(config.constraints).length;
    rulesChecked += constraintCount;
    allViolations.push(...checkConstraints(config.constraints, health));
  }

  if (config.layers && config.layers.length > 0) {
    rulesChecked += 1;
    allViolations.push(...checkLayers(config.layers, edges));
  }

  if (config.boundaries && config.boundaries.length > 0) {
    rulesChecked += config.boundaries.length;
    allViolations.push(...checkBoundaries(config.boundaries, edges));
  }

  return {
    passed: allViolations.length === 0,
    violations: allViolations,
    rulesChecked,
  };
}
