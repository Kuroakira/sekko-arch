import type { DimensionName, DimensionResult } from "../types/metrics.js";
import { DIMENSION_NAMES, gradeDimension } from "../dimensions.js";
import { computeCoupling } from "./coupling.js";
import { computeMaxDepth } from "./depth.js";
import { detectGodFiles } from "./god-files.js";
import { computeComplexFns } from "./complex-fns.js";
import { computeLevelization } from "./levelization.js";
import { computeBlastRadius } from "./blast-radius.js";
import { computeCognitiveComplexity } from "./cognitive-complexity.js";
import { computeHotspotRatio } from "./hotspots.js";
import { computeLongFunctions } from "./long-functions.js";
import { computeLargeFiles } from "./large-files.js";
import { computeHighParams } from "./high-params.js";
import { computeDuplication } from "./duplication.js";
import { computeDeadCodeRatio } from "./dead-code.js";
import { computeComments } from "./comments.js";
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
    compute: (ctx) =>
      makeDimensionResult("cycles", ctx.cycleResult.cycleCount, {
        cycles: ctx.cycleResult.cycles,
      }),
  },
  {
    name: "coupling",
    compute(ctx) {
      const r = computeCoupling(
        ctx.snapshot.importGraph.edges,
        ctx.moduleAssignments,
        ctx.fanMaps.fanIn,
        ctx.fanMaps.fanOut,
      );
      return makeDimensionResult("coupling", r.score, {
        crossModuleEdges: r.crossModuleEdges,
        crossModuleToUnstable: r.crossModuleToUnstable,
      });
    },
  },
  {
    name: "depth",
    compute(ctx) {
      const r = computeMaxDepth(ctx.snapshot.importGraph.adjacency);
      return makeDimensionResult("depth", r.maxDepth, {
        deepestPath: r.deepestPath,
      });
    },
  },
  {
    name: "godFiles",
    compute(ctx) {
      const r = detectGodFiles(ctx.fanMaps.fanOut, ctx.entryPoints);
      return makeDimensionResult("godFiles", r.ratio, {
        files: r.godFiles,
        count: r.count,
      });
    },
  },
  {
    name: "complexFn",
    compute(ctx) {
      const r = computeComplexFns(ctx.snapshot.files);
      return makeDimensionResult("complexFn", r.ratio, {
        totalFunctions: r.totalFunctions,
        complexCount: r.complexCount,
        complexFunctions: r.complexFunctions,
      });
    },
  },
  {
    name: "levelization",
    compute(ctx) {
      const r = computeLevelization(
        ctx.snapshot.importGraph.adjacency,
        ctx.cycleResult.cycles,
      );
      return makeDimensionResult("levelization", r.violationRatio, {
        violations: r.violations,
        totalEdges: r.totalEdges,
      });
    },
  },
  {
    name: "blastRadius",
    compute(ctx) {
      const r = computeBlastRadius(
        ctx.snapshot.importGraph.reverseAdjacency,
        ctx.foundationFiles,
      );
      return makeDimensionResult("blastRadius", r.maxBlastRadiusRatio, {
        maxBlastRadius: r.maxBlastRadius,
        totalFiles: ctx.snapshot.totalFiles,
        maxBlastRadiusFile: r.maxBlastRadiusFile,
      });
    },
  },
  {
    name: "cognitiveComplexity",
    compute(ctx) {
      const r = computeCognitiveComplexity(ctx.snapshot.files);
      return makeDimensionResult("cognitiveComplexity", r.ratio, {
        totalFunctions: r.totalFunctions,
        complexCount: r.complexCount,
        functions: r.functions,
      });
    },
  },
  {
    name: "hotspots",
    compute(ctx) {
      const r = computeHotspotRatio(ctx.fanMaps);
      return makeDimensionResult("hotspots", r.ratio, {
        files: r.hotspotFiles,
      });
    },
  },
  {
    name: "longFunctions",
    compute(ctx) {
      const r = computeLongFunctions(ctx.snapshot.files);
      return makeDimensionResult("longFunctions", r.ratio, {
        functions: r.functions,
      });
    },
  },
  {
    name: "largeFiles",
    compute(ctx) {
      const r = computeLargeFiles(ctx.snapshot.files);
      return makeDimensionResult("largeFiles", r.ratio, { files: r.files });
    },
  },
  {
    name: "highParams",
    compute(ctx) {
      const r = computeHighParams(ctx.snapshot.files);
      return makeDimensionResult("highParams", r.ratio, {
        functions: r.functions,
      });
    },
  },
  {
    name: "duplication",
    compute(ctx) {
      const r = computeDuplication(ctx.snapshot.files);
      return makeDimensionResult("duplication", r.ratio, { groups: r.groups });
    },
  },
  {
    name: "deadCode",
    compute(ctx) {
      const r = computeDeadCodeRatio(
        ctx.snapshot.importGraph.reverseAdjacency,
        ctx.entryPoints,
        ctx.snapshot.files,
      );
      return makeDimensionResult("deadCode", r.ratio, {
        files: r.deadFiles,
      });
    },
  },
  {
    name: "comments",
    compute(ctx) {
      const r = computeComments(ctx.snapshot.files);
      return makeDimensionResult("comments", r.rawValue, {
        commentRatio: r.commentRatio,
      });
    },
  },
  {
    name: "cohesion",
    compute(ctx) {
      const r = computeCohesion(
        ctx.snapshot.importGraph.edges,
        ctx.moduleAssignments,
      );
      return makeDimensionResult("cohesion", r.rawValue, {
        worstModule: r.worstModule,
        worstCohesion: r.worstCohesion,
      });
    },
  },
  {
    name: "entropy",
    compute(ctx) {
      const r = computeEntropy(
        ctx.snapshot.importGraph.edges,
        ctx.moduleAssignments,
      );
      return makeDimensionResult("entropy", r, { normalizedEntropy: r });
    },
  },
  {
    name: "distanceFromMainSeq",
    compute(ctx) {
      const r = computeDistanceFromMainSeq(
        ctx.snapshot.files,
        ctx.fanMaps,
        ctx.moduleAssignments,
      );
      return makeDimensionResult("distanceFromMainSeq", r.maxDistance, {
        worstModule: r.worstModule,
        distance: r.maxDistance,
      });
    },
  },
  {
    name: "attackSurface",
    compute(ctx) {
      const r = computeAttackSurface(
        ctx.snapshot.importGraph.adjacency,
        ctx.entryPoints,
        ctx.snapshot.totalFiles,
      );
      return makeDimensionResult("attackSurface", r.ratio, {
        reachableCount: r.reachableCount,
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
