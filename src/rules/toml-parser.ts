import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parse } from "smol-toml";
import type {
  RulesConfig,
  ConstraintsConfig,
  LayerConfig,
  BoundaryConfig,
} from "../types/rules.js";

function toConstraints(
  raw: Record<string, unknown>,
): ConstraintsConfig | undefined {
  const c = raw["constraints"];
  if (c == null || typeof c !== "object") return undefined;
  const obj = c as Record<string, unknown>;
  const result: {
    max_cycles?: number;
    max_coupling?: number;
    max_cc?: number;
    no_god_files?: boolean;
  } = {};
  if (typeof obj["max_cycles"] === "number") result.max_cycles = obj.max_cycles;
  if (typeof obj["max_coupling"] === "number")
    result.max_coupling = obj.max_coupling;
  if (typeof obj["max_cc"] === "number") result.max_cc = obj.max_cc;
  if (typeof obj["no_god_files"] === "boolean")
    result.no_god_files = obj.no_god_files;
  return Object.keys(result).length > 0 ? result : undefined;
}

function toLayerConfig(item: unknown): LayerConfig | null {
  if (item == null || typeof item !== "object") return null;
  const obj = item as Record<string, unknown>;
  if (typeof obj["name"] !== "string") return null;
  if (!Array.isArray(obj["paths"])) return null;
  if (typeof obj["order"] !== "number") return null;
  return {
    name: obj.name,
    paths: obj.paths.filter((p): p is string => typeof p === "string"),
    order: obj.order,
  } satisfies LayerConfig;
}

function toBoundaryConfig(item: unknown): BoundaryConfig | null {
  if (item == null || typeof item !== "object") return null;
  const obj = item as Record<string, unknown>;
  if (typeof obj["from"] !== "string") return null;
  if (typeof obj["to"] !== "string") return null;
  const result: { from: string; to: string; reason?: string } = {
    from: obj.from,
    to: obj.to,
  };
  if (typeof obj["reason"] === "string") result.reason = obj.reason;
  return result;
}

export function parseRulesFile(configDir: string): RulesConfig | null {
  const filePath = join(configDir, ".sekko-arch", "rules.toml");

  if (!existsSync(filePath)) {
    return null;
  }

  let content: string;
  try {
    content = readFileSync(filePath, "utf-8");
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown read error";
    throw new Error(`Failed to read rules.toml: ${message}`, { cause: error });
  }

  try {
    const parsed = parse(content);

    const config: {
      constraints?: ConstraintsConfig;
      layers?: readonly LayerConfig[];
      boundaries?: readonly BoundaryConfig[];
    } = {};

    const constraints = toConstraints(parsed);
    if (constraints) config.constraints = constraints;

    const rawLayers = parsed["layers"];
    if (Array.isArray(rawLayers)) {
      const layers = rawLayers
        .map(toLayerConfig)
        .filter((l): l is LayerConfig => l !== null);
      if (layers.length > 0) config.layers = layers;
    }

    const rawBoundaries = parsed["boundaries"];
    if (Array.isArray(rawBoundaries)) {
      const boundaries = rawBoundaries
        .map(toBoundaryConfig)
        .filter((b): b is BoundaryConfig => b !== null);
      if (boundaries.length > 0) config.boundaries = boundaries;
    }

    return config;
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown parse error";
    throw new Error(`Failed to parse rules.toml: ${message}`, { cause: error });
  }
}
