import type { DimensionName, DimensionResult } from "../types/metrics.js";
import {
  COMPLEXITY_CC_THRESHOLD,
  COGNITIVE_COMPLEXITY_THRESHOLD,
  LONG_FUNCTION_LINE_THRESHOLD,
  LARGE_FILE_LINE_THRESHOLD,
  HIGH_PARAMS_THRESHOLD,
} from "./thresholds.js";
import { DIMENSION_NAMES, gradeDimension } from "../dimensions.js";
import { computeCoupling } from "./coupling.js";
import { computeMaxDepth } from "./depth.js";
import { detectGodFiles } from "./god-files.js";
import { computeComplexFnRatio } from "./complex-fns.js";
import { computeLevelization } from "./levelization.js";
import { computeBlastRadius } from "./blast-radius.js";
import { computeCognitiveComplexityRatio } from "./cognitive-complexity.js";
import { computeHotspotRatio } from "./hotspots.js";
import { computeLongFunctionRatio } from "./long-functions.js";
import { computeLargeFileRatio } from "./large-files.js";
import { computeHighParamsRatio } from "./high-params.js";
import { computeDuplicationRatio } from "./duplication.js";
import { computeDeadCodeRatio } from "./dead-code.js";
import { computeCommentRawValue } from "./comments.js";
import { computeCohesion } from "./cohesion.js";
import { computeEntropy } from "./entropy.js";
import { computeDistanceFromMainSeq } from "./distance-main-seq.js";
import { computeAttackSurface } from "./attack-surface.js";
import type { MetricContext } from "./context.js";

function makeDimensionResult(
  name: DimensionName,
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

export interface MetricComputation {
  readonly name: DimensionName;
  readonly compute: (ctx: MetricContext) => DimensionResult;
}

export const METRIC_COMPUTATIONS: readonly MetricComputation[] = [
  {
    name: "cycles",
    compute(ctx) {
      return makeDimensionResult("cycles", ctx.cycleResult.cycleCount, {
        cycles: ctx.cycleResult.cycles,
      });
    },
  },
  {
    name: "coupling",
    compute(ctx) {
      const result = computeCoupling(
        ctx.snapshot.importGraph.edges,
        ctx.moduleAssignments,
        ctx.fanMaps.fanIn,
        ctx.fanMaps.fanOut,
      );
      return makeDimensionResult("coupling", result.score, {
        crossModuleEdges: result.crossModuleEdges,
        crossModuleToUnstable: result.crossModuleToUnstable,
      });
    },
  },
  {
    name: "depth",
    compute(ctx) {
      const result = computeMaxDepth(ctx.snapshot.importGraph.adjacency);
      return makeDimensionResult("depth", result.maxDepth, {
        deepestPath: result.deepestPath,
      });
    },
  },
  {
    name: "godFiles",
    compute(ctx) {
      const result = detectGodFiles(ctx.fanMaps.fanOut, ctx.entryPoints);
      return makeDimensionResult("godFiles", result.ratio, {
        files: result.godFiles,
        count: result.count,
      });
    },
  },
  {
    name: "complexFn",
    compute(ctx) {
      const ratio = computeComplexFnRatio(ctx.allFunctions);
      const complexFunctions: Array<{
        file: string;
        name: string;
        cc: number;
      }> = [];
      for (const file of ctx.snapshot.files) {
        for (const fn of file.sa?.functions ?? []) {
          if (fn.cc > COMPLEXITY_CC_THRESHOLD) {
            complexFunctions.push({
              file: file.path,
              name: fn.name,
              cc: fn.cc,
            });
          }
        }
      }
      return makeDimensionResult("complexFn", ratio, {
        totalFunctions: ctx.allFunctions.length,
        complexCount: complexFunctions.length,
        complexFunctions,
      });
    },
  },
  {
    name: "levelization",
    compute(ctx) {
      const result = computeLevelization(
        ctx.snapshot.importGraph.adjacency,
        ctx.cycleResult.cycles,
      );
      return makeDimensionResult("levelization", result.violationRatio, {
        violations: result.violations,
        totalEdges: result.totalEdges,
      });
    },
  },
  {
    name: "blastRadius",
    compute(ctx) {
      const result = computeBlastRadius(
        ctx.snapshot.importGraph.reverseAdjacency,
        ctx.foundationFiles,
      );
      let maxBlastRadiusFile = "";
      let maxRadius = 0;
      for (const [file, radius] of result.perFile) {
        if (!ctx.foundationFiles.has(file) && radius > maxRadius) {
          maxRadius = radius;
          maxBlastRadiusFile = file;
        }
      }
      return makeDimensionResult("blastRadius", result.maxBlastRadiusRatio, {
        maxBlastRadius: result.maxBlastRadius,
        totalFiles: ctx.snapshot.totalFiles,
        maxBlastRadiusFile,
      });
    },
  },
  {
    name: "cognitiveComplexity",
    compute(ctx) {
      const ratio = computeCognitiveComplexityRatio(ctx.allFunctions);
      const functions: Array<{
        file: string;
        name: string;
        cognitiveComplexity: number;
      }> = [];
      for (const file of ctx.snapshot.files) {
        for (const fn of file.sa?.functions ?? []) {
          if (fn.cognitiveComplexity > COGNITIVE_COMPLEXITY_THRESHOLD) {
            functions.push({
              file: file.path,
              name: fn.name,
              cognitiveComplexity: fn.cognitiveComplexity,
            });
          }
        }
      }
      return makeDimensionResult("cognitiveComplexity", ratio, {
        totalFunctions: ctx.allFunctions.length,
        complexCount: functions.length,
        functions,
      });
    },
  },
  {
    name: "hotspots",
    compute(ctx) {
      const result = computeHotspotRatio(ctx.fanMaps);
      return makeDimensionResult("hotspots", result.ratio, {
        files: result.hotspotFiles,
      });
    },
  },
  {
    name: "longFunctions",
    compute(ctx) {
      const ratio = computeLongFunctionRatio(ctx.allFunctions);
      const functions: Array<{
        file: string;
        name: string;
        lineCount: number;
      }> = [];
      for (const file of ctx.snapshot.files) {
        for (const fn of file.sa?.functions ?? []) {
          if (fn.lineCount > LONG_FUNCTION_LINE_THRESHOLD) {
            functions.push({
              file: file.path,
              name: fn.name,
              lineCount: fn.lineCount,
            });
          }
        }
      }
      return makeDimensionResult("longFunctions", ratio, { functions });
    },
  },
  {
    name: "largeFiles",
    compute(ctx) {
      const ratio = computeLargeFileRatio(ctx.snapshot.files);
      const files: Array<{ file: string; lines: number }> = [];
      for (const file of ctx.snapshot.files) {
        if (file.lines > LARGE_FILE_LINE_THRESHOLD) {
          files.push({ file: file.path, lines: file.lines });
        }
      }
      return makeDimensionResult("largeFiles", ratio, { files });
    },
  },
  {
    name: "highParams",
    compute(ctx) {
      const ratio = computeHighParamsRatio(ctx.allFunctions);
      const functions: Array<{
        file: string;
        name: string;
        paramCount: number;
      }> = [];
      for (const file of ctx.snapshot.files) {
        for (const fn of file.sa?.functions ?? []) {
          if (fn.paramCount > HIGH_PARAMS_THRESHOLD) {
            functions.push({
              file: file.path,
              name: fn.name,
              paramCount: fn.paramCount,
            });
          }
        }
      }
      return makeDimensionResult("highParams", ratio, { functions });
    },
  },
  {
    name: "duplication",
    compute(ctx) {
      const ratio = computeDuplicationRatio(ctx.allFunctions);
      const hashMap = new Map<
        string,
        Array<{ file: string; name: string }>
      >();
      for (const file of ctx.snapshot.files) {
        for (const fn of file.sa?.functions ?? []) {
          const existing = hashMap.get(fn.bodyHash);
          if (existing) {
            existing.push({ file: file.path, name: fn.name });
          } else {
            hashMap.set(fn.bodyHash, [{ file: file.path, name: fn.name }]);
          }
        }
      }
      const groups: Array<{
        bodyHash: string;
        functions: Array<{ file: string; name: string }>;
      }> = [];
      for (const [bodyHash, fns] of hashMap) {
        if (fns.length >= 2) {
          groups.push({ bodyHash, functions: fns });
        }
      }
      return makeDimensionResult("duplication", ratio, { groups });
    },
  },
  {
    name: "deadCode",
    compute(ctx) {
      const result = computeDeadCodeRatio(
        ctx.snapshot.importGraph.reverseAdjacency,
        ctx.entryPoints,
        ctx.snapshot.files,
      );
      return makeDimensionResult("deadCode", result.ratio, {
        files: result.deadFiles,
      });
    },
  },
  {
    name: "comments",
    compute(ctx) {
      const rawValue = computeCommentRawValue(ctx.snapshot.files);
      const totalLines = ctx.snapshot.files.reduce(
        (sum, f) => sum + f.lines,
        0,
      );
      const totalCommentLines = ctx.snapshot.files.reduce(
        (sum, f) => sum + f.comments,
        0,
      );
      const commentRatio = totalLines === 0 ? 0 : totalCommentLines / totalLines;
      return makeDimensionResult("comments", rawValue, { commentRatio });
    },
  },
  {
    name: "cohesion",
    compute(ctx) {
      const result = computeCohesion(
        ctx.snapshot.importGraph.edges,
        ctx.moduleAssignments,
      );
      return makeDimensionResult("cohesion", result.rawValue, {
        worstModule: result.worstModule,
        worstCohesion: result.worstCohesion,
      });
    },
  },
  {
    name: "entropy",
    compute(ctx) {
      const rawValue = computeEntropy(
        ctx.snapshot.importGraph.edges,
        ctx.moduleAssignments,
      );
      return makeDimensionResult("entropy", rawValue, {
        normalizedEntropy: rawValue,
      });
    },
  },
  {
    name: "distanceFromMainSeq",
    compute(ctx) {
      const result = computeDistanceFromMainSeq(
        ctx.snapshot.files,
        ctx.fanMaps,
        ctx.moduleAssignments,
      );
      return makeDimensionResult("distanceFromMainSeq", result.maxDistance, {
        worstModule: result.worstModule,
        distance: result.maxDistance,
      });
    },
  },
  {
    name: "attackSurface",
    compute(ctx) {
      const result = computeAttackSurface(
        ctx.snapshot.importGraph.adjacency,
        ctx.entryPoints,
        ctx.snapshot.totalFiles,
      );
      return makeDimensionResult("attackSurface", result.ratio, {
        reachableCount: result.reachableCount,
        totalFiles: ctx.snapshot.totalFiles,
      });
    },
  },
];

// Validate that METRIC_COMPUTATIONS covers every DimensionName
if (METRIC_COMPUTATIONS.length !== DIMENSION_NAMES.length) {
  throw new Error(
    `METRIC_COMPUTATIONS has ${METRIC_COMPUTATIONS.length} entries but DIMENSION_NAMES has ${DIMENSION_NAMES.length}. Every dimension must have a computation.`,
  );
}
