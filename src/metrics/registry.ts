import type { DimensionName, DimensionResult } from "../types/metrics.js";
import { gradeDimension } from "../grading/thresholds.js";
import { COMPLEXITY_CC_THRESHOLD } from "../constants.js";
import { DIMENSION_NAMES } from "../dimensions.js";
import { computeCoupling } from "./coupling.js";
import { computeMaxDepth } from "./depth.js";
import { detectGodFiles } from "./god-files.js";
import { computeComplexFnRatio } from "./complex-fns.js";
import { computeLevelization } from "./levelization.js";
import { computeBlastRadius } from "./blast-radius.js";
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

// Stub computation for dimensions not yet implemented.
// Returns rawValue 0 and grade "A". Will be replaced with real implementations in Groups C/D.
function stubComputation(name: DimensionName): MetricComputation {
  return {
    name,
    compute() {
      return makeDimensionResult(name, 0);
    },
  };
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
  // Stub computations for M2 dimensions — replaced with real implementations in Groups C/D
  stubComputation("cohesion"),
  stubComputation("entropy"),
  stubComputation("cognitiveComplexity"),
  stubComputation("hotspots"),
  stubComputation("longFunctions"),
  stubComputation("largeFiles"),
  stubComputation("highParams"),
  stubComputation("duplication"),
  stubComputation("deadCode"),
  stubComputation("comments"),
  stubComputation("distanceFromMainSeq"),
  stubComputation("attackSurface"),
];

// Validate that METRIC_COMPUTATIONS covers every DimensionName
if (METRIC_COMPUTATIONS.length !== DIMENSION_NAMES.length) {
  throw new Error(
    `METRIC_COMPUTATIONS has ${METRIC_COMPUTATIONS.length} entries but DIMENSION_NAMES has ${DIMENSION_NAMES.length}. Every dimension must have a computation.`,
  );
}
