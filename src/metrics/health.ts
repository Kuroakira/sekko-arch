import type {
  Snapshot,
  FuncInfo,
  DimensionGrades,
  DimensionResult,
  HealthReport,
} from "../types/index.js";
import { gradeDimension } from "../grading/thresholds.js";
import { computeCompositeGrade } from "../grading/grade.js";
import { computeFanMaps } from "./fan-maps.js";
import { computeModuleAssignments } from "./module-boundary.js";
import { detectCycles } from "./cycles.js";
import { computeCoupling } from "./coupling.js";
import { computeMaxDepth } from "./depth.js";
import { detectGodFiles } from "./god-files.js";
import { computeComplexFnRatio, detectEntryPoints } from "./complex-fns.js";
import { computeLevelization } from "./levelization.js";
import { computeBlastRadius } from "./blast-radius.js";

const STABLE_INSTABILITY_THRESHOLD = 0.15;
const STABLE_FAN_IN_THRESHOLD = 3;

const BARREL_FILE_PATTERN = /\/index\.tsx?$/;

function isFoundationFile(
  file: string,
  fanIn: ReadonlyMap<string, number>,
  fanOut: ReadonlyMap<string, number>,
): boolean {
  if (BARREL_FILE_PATTERN.test(file)) return true;

  const fi = fanIn.get(file) ?? 0;
  if (fi < STABLE_FAN_IN_THRESHOLD) return false;

  const fo = fanOut.get(file) ?? 0;
  const total = fi + fo;
  if (total === 0) return true;

  const instability = fo / total;
  return instability <= STABLE_INSTABILITY_THRESHOLD;
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

function makeDimensionResult(
  name: DimensionResult["name"],
  rawValue: number,
  details?: Record<string, unknown>,
): DimensionResult {
  return {
    name,
    rawValue,
    grade: gradeDimension(name, rawValue),
    details,
  };
}

export function computeHealth(snapshot: Snapshot): HealthReport {
  const startTime = performance.now();

  const { importGraph, files } = snapshot;
  const filePaths = files.map((f) => f.path);

  const fanMaps = computeFanMaps(importGraph.edges);
  const moduleAssignments = computeModuleAssignments(filePaths);
  const entryPoints = detectEntryPoints(filePaths);

  const cycleResult = detectCycles(importGraph.adjacency);
  const couplingResult = computeCoupling(
    importGraph.edges,
    moduleAssignments,
    fanMaps.fanIn,
    fanMaps.fanOut,
  );
  const depthResult = computeMaxDepth(importGraph.adjacency);
  const godFilesResult = detectGodFiles(fanMaps.fanOut, entryPoints);
  const allFunctions = collectAllFunctions(snapshot);
  const complexFnRatio = computeComplexFnRatio(allFunctions);
  const levelizationResult = computeLevelization(
    importGraph.adjacency,
    cycleResult.cycles,
  );
  const foundationFiles = buildFoundationFiles(
    filePaths,
    fanMaps.fanIn,
    fanMaps.fanOut,
  );
  const blastRadiusResult = computeBlastRadius(
    importGraph.reverseAdjacency,
    foundationFiles,
  );

  const dimensions: DimensionGrades = {
    cycles: makeDimensionResult("cycles", cycleResult.cycleCount, {
      cycles: cycleResult.cycles,
    }),
    coupling: makeDimensionResult("coupling", couplingResult.score, {
      crossModuleEdges: couplingResult.crossModuleEdges,
      crossModuleToUnstable: couplingResult.crossModuleToUnstable,
    }),
    depth: makeDimensionResult("depth", depthResult.maxDepth, {
      deepestPath: depthResult.deepestPath,
    }),
    godFiles: makeDimensionResult("godFiles", godFilesResult.ratio, {
      files: godFilesResult.godFiles,
      count: godFilesResult.count,
    }),
    complexFn: makeDimensionResult("complexFn", complexFnRatio, {
      totalFunctions: allFunctions.length,
      complexCount: allFunctions.filter((fn) => fn.cc > 15).length,
    }),
    levelization: makeDimensionResult(
      "levelization",
      levelizationResult.violationRatio,
      {
        violations: levelizationResult.violations,
        totalEdges: levelizationResult.totalEdges,
      },
    ),
    blastRadius: makeDimensionResult(
      "blastRadius",
      blastRadiusResult.maxBlastRadiusRatio,
      {
        maxBlastRadius: blastRadiusResult.maxBlastRadius,
        totalFiles: snapshot.totalFiles,
      },
    ),
  };

  const compositeGrade = computeCompositeGrade(dimensions);
  const scanDurationMs = performance.now() - startTime;

  return {
    dimensions,
    compositeGrade,
    fileCount: snapshot.totalFiles,
    scanDurationMs,
  };
}
