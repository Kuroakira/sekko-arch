import type { DimensionName, DimensionResult } from "../types/metrics.js";
import {
  COMPLEXITY_CC_THRESHOLD,
  COGNITIVE_COMPLEXITY_THRESHOLD,
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
      return makeDimensionResult("complexFn", ratio, {
        totalFunctions: ctx.allFunctions.length,
        complexCount: ctx.allFunctions.filter(
          (fn) => fn.cc > COMPLEXITY_CC_THRESHOLD,
        ).length,
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
      return makeDimensionResult("blastRadius", result.maxBlastRadiusRatio, {
        maxBlastRadius: result.maxBlastRadius,
        totalFiles: ctx.snapshot.totalFiles,
      });
    },
  },
  {
    name: "cognitiveComplexity",
    compute(ctx) {
      const ratio = computeCognitiveComplexityRatio(ctx.allFunctions);
      return makeDimensionResult("cognitiveComplexity", ratio, {
        totalFunctions: ctx.allFunctions.length,
        complexCount: ctx.allFunctions.filter(
          (fn) => fn.cognitiveComplexity > COGNITIVE_COMPLEXITY_THRESHOLD,
        ).length,
      });
    },
  },
  {
    name: "hotspots",
    compute(ctx) {
      const ratio = computeHotspotRatio(ctx.fanMaps);
      return makeDimensionResult("hotspots", ratio);
    },
  },
  {
    name: "longFunctions",
    compute(ctx) {
      const ratio = computeLongFunctionRatio(ctx.allFunctions);
      return makeDimensionResult("longFunctions", ratio);
    },
  },
  {
    name: "largeFiles",
    compute(ctx) {
      const ratio = computeLargeFileRatio(ctx.snapshot.files);
      return makeDimensionResult("largeFiles", ratio);
    },
  },
  {
    name: "highParams",
    compute(ctx) {
      const ratio = computeHighParamsRatio(ctx.allFunctions);
      return makeDimensionResult("highParams", ratio);
    },
  },
  {
    name: "duplication",
    compute(ctx) {
      const ratio = computeDuplicationRatio(ctx.allFunctions);
      return makeDimensionResult("duplication", ratio);
    },
  },
  {
    name: "deadCode",
    compute(ctx) {
      const ratio = computeDeadCodeRatio(
        ctx.snapshot.importGraph.reverseAdjacency,
        ctx.entryPoints,
        ctx.snapshot.files,
      );
      return makeDimensionResult("deadCode", ratio);
    },
  },
  {
    name: "comments",
    compute(ctx) {
      const rawValue = computeCommentRawValue(ctx.snapshot.files);
      return makeDimensionResult("comments", rawValue);
    },
  },
  {
    name: "cohesion",
    compute(ctx) {
      const rawValue = computeCohesion(
        ctx.snapshot.importGraph.edges,
        ctx.moduleAssignments,
      );
      return makeDimensionResult("cohesion", rawValue);
    },
  },
  {
    name: "entropy",
    compute(ctx) {
      const rawValue = computeEntropy(
        ctx.snapshot.importGraph.edges,
        ctx.moduleAssignments,
      );
      return makeDimensionResult("entropy", rawValue);
    },
  },
  {
    name: "distanceFromMainSeq",
    compute(ctx) {
      const rawValue = computeDistanceFromMainSeq(
        ctx.snapshot.files,
        ctx.fanMaps,
        ctx.moduleAssignments,
      );
      return makeDimensionResult("distanceFromMainSeq", rawValue);
    },
  },
  {
    name: "attackSurface",
    compute(ctx) {
      const rawValue = computeAttackSurface(
        ctx.snapshot.importGraph.adjacency,
        ctx.entryPoints,
        ctx.snapshot.totalFiles,
      );
      return makeDimensionResult("attackSurface", rawValue);
    },
  },
];

// Validate that METRIC_COMPUTATIONS covers every DimensionName
if (METRIC_COMPUTATIONS.length !== DIMENSION_NAMES.length) {
  throw new Error(
    `METRIC_COMPUTATIONS has ${METRIC_COMPUTATIONS.length} entries but DIMENSION_NAMES has ${DIMENSION_NAMES.length}. Every dimension must have a computation.`,
  );
}
