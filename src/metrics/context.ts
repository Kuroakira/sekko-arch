import type { Snapshot, FuncInfo } from "../types/index.js";
import { computeFanMaps } from "./fan-maps.js";
import type { FanMaps } from "./fan-maps.js";
import { computeModuleAssignments } from "./module-boundary.js";
import { detectEntryPoints } from "./complex-fns.js";
import { detectCycles } from "./cycles.js";
import type { CycleResult } from "./cycles.js";
import { isStable } from "./stability.js";

const BARREL_FILE_PATTERN = /\/index\.tsx?$/;

function isFoundationFile(
  file: string,
  fanIn: ReadonlyMap<string, number>,
  fanOut: ReadonlyMap<string, number>,
): boolean {
  if (BARREL_FILE_PATTERN.test(file)) return true;
  return isStable(file, fanIn, fanOut);
}

function buildFoundationFiles(
  filePaths: readonly string[],
  fanIn: ReadonlyMap<string, number>,
  fanOut: ReadonlyMap<string, number>,
): ReadonlySet<string> {
  const foundation = new Set<string>();
  for (const filePath of filePaths) {
    if (isFoundationFile(filePath, fanIn, fanOut)) {
      foundation.add(filePath);
    }
  }
  return foundation;
}

function collectAllFunctions(snapshot: Snapshot): readonly FuncInfo[] {
  const allFunctions: FuncInfo[] = [];
  for (const file of snapshot.files) {
    if (file.sa) {
      for (const fn of file.sa.functions) {
        allFunctions.push(fn);
      }
    }
  }
  return allFunctions;
}

export interface MetricContext {
  readonly snapshot: Snapshot;
  readonly filePaths: readonly string[];
  readonly fanMaps: FanMaps;
  readonly moduleAssignments: ReadonlyMap<string, string>;
  readonly entryPoints: ReadonlySet<string>;
  readonly foundationFiles: ReadonlySet<string>;
  readonly allFunctions: readonly FuncInfo[];
  readonly cycleResult: CycleResult;
}

export function buildMetricContext(snapshot: Snapshot): MetricContext {
  const { importGraph, files } = snapshot;
  const filePaths = files.map((f) => f.path);

  const fanMaps = computeFanMaps(importGraph.edges);
  const moduleAssignments = computeModuleAssignments(filePaths);
  const entryPoints = detectEntryPoints(filePaths);
  const foundationFiles = buildFoundationFiles(
    filePaths,
    fanMaps.fanIn,
    fanMaps.fanOut,
  );
  const allFunctions = collectAllFunctions(snapshot);
  const cycleResult = detectCycles(importGraph.adjacency);

  return {
    snapshot,
    filePaths,
    fanMaps,
    moduleAssignments,
    entryPoints,
    foundationFiles,
    allFunctions,
    cycleResult,
  };
}
