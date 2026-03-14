import type { LayerConfig, ImportEdge, RuleViolation } from "../types/index.js";
import { globMatch } from "../utils/glob.js";

function findLayer(
  layers: readonly LayerConfig[],
  file: string,
): LayerConfig | undefined {
  return layers.find((layer) =>
    layer.paths.some((pattern) => globMatch(pattern, file)),
  );
}

export function checkLayers(
  layers: readonly LayerConfig[],
  edges: readonly ImportEdge[],
): RuleViolation[] {
  const violations: RuleViolation[] = [];

  for (const edge of edges) {
    const fromLayer = findLayer(layers, edge.fromFile);
    const toLayer = findLayer(layers, edge.toFile);

    if (fromLayer === undefined || toLayer === undefined) {
      continue;
    }

    if (fromLayer.order > toLayer.order) {
      violations.push({
        rule: "layer_violation",
        severity: "error",
        message: `"${fromLayer.name}" (order ${String(fromLayer.order)}) imports from "${toLayer.name}" (order ${String(toLayer.order)}): ${edge.fromFile} -> ${edge.toFile}`,
        affectedFiles: [edge.fromFile, edge.toFile],
      });
    }
  }

  return violations;
}
