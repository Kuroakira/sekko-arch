import type { FileNode } from "../types/core.js";
import type { FanMaps } from "./fan-maps.js";

/**
 * Computes Distance from Main Sequence per Robert C. Martin.
 * D = |A + I - 1| where:
 *   A = abstractness = (interfaces + type-aliases) / total classes per module
 *   I = instability = fanOut / (fanIn + fanOut) per module
 * Returns maximum D across all modules.
 */
export interface DistanceResult {
  readonly maxDistance: number;
  readonly worstModule: string;
}

export function computeDistanceFromMainSeq(
  files: readonly FileNode[],
  fanMaps: FanMaps,
  moduleAssignments: ReadonlyMap<string, string>,
): DistanceResult {
  const moduleFiles = new Map<string, FileNode[]>();
  for (const file of files) {
    const mod = moduleAssignments.get(file.path);
    if (mod) {
      const existing = moduleFiles.get(mod);
      if (existing) {
        existing.push(file);
      } else {
        moduleFiles.set(mod, [file]);
      }
    }
  }

  let maxDistance = 0;
  let worstModule = "";

  for (const [mod, moduleFileList] of moduleFiles) {
    let abstractCount = 0;
    let totalClasses = 0;

    for (const file of moduleFileList) {
      if (file.sa?.classes) {
        for (const cls of file.sa.classes) {
          totalClasses++;
          if (cls.kind === "interface" || cls.kind === "type-alias") {
            abstractCount++;
          }
        }
      }
    }

    // Skip modules with no classes — metric is not applicable to pure-function modules
    if (totalClasses === 0) continue;

    const abstractness = abstractCount / totalClasses;

    let fanIn = 0;
    let fanOut = 0;
    for (const file of moduleFileList) {
      fanIn += fanMaps.fanIn.get(file.path) ?? 0;
      fanOut += fanMaps.fanOut.get(file.path) ?? 0;
    }

    const total = fanIn + fanOut;
    const instability = total === 0 ? 0 : fanOut / total;

    const distance = Math.abs(abstractness + instability - 1);
    if (distance > maxDistance) {
      maxDistance = distance;
      worstModule = mod;
    }
  }

  return { maxDistance, worstModule };
}
