export { detectCycles } from "./cycles.js";
export type { CycleResult } from "./cycles.js";

export { computeCoupling } from "./coupling.js";
export type { CouplingResult } from "./coupling.js";

export { computeMaxDepth } from "./depth.js";
export type { DepthResult } from "./depth.js";

export { detectGodFiles } from "./god-files.js";
export type { GodFilesResult } from "./god-files.js";

export {
  computeComplexFns,
  computeComplexFnRatio,
  detectEntryPoints,
} from "./complex-fns.js";
export type { ComplexFnResult } from "./complex-fns.js";

export { computeLevelization } from "./levelization.js";
export type { LevelizationResult } from "./levelization.js";

export { computeBlastRadius } from "./blast-radius.js";
export type { BlastRadiusResult } from "./blast-radius.js";

export { computeFanMaps } from "./fan-maps.js";
export type { FanMaps } from "./fan-maps.js";

export {
  computeModuleAssignments,
  detectDegenerateCases,
  isSameModule,
  moduleOf,
} from "./module-boundary.js";

export { buildMetricContext } from "./context.js";
export type { MetricContext } from "./context.js";

export { METRIC_COMPUTATIONS } from "./registry.js";
export type { MetricComputation } from "./registry.js";

export { computeCohesion } from "./cohesion.js";
export { computeEntropy } from "./entropy.js";
export {
  computeCognitiveComplexity,
  computeCognitiveComplexityRatio,
} from "./cognitive-complexity.js";
export type { CognitiveComplexityResult } from "./cognitive-complexity.js";
export { computeHotspotRatio } from "./hotspots.js";
export {
  computeLongFunctions,
  computeLongFunctionRatio,
} from "./long-functions.js";
export type { LongFunctionResult } from "./long-functions.js";
export {
  computeLargeFiles,
  computeLargeFileRatio,
} from "./large-files.js";
export type { LargeFileResult } from "./large-files.js";
export {
  computeHighParams,
  computeHighParamsRatio,
} from "./high-params.js";
export type { HighParamsResult } from "./high-params.js";
export {
  computeDuplication,
  computeDuplicationRatio,
} from "./duplication.js";
export type { DuplicationResult } from "./duplication.js";
export { computeDeadCodeRatio } from "./dead-code.js";
export {
  computeComments,
  computeCommentRawValue,
} from "./comments.js";
export type { CommentResult } from "./comments.js";
export { computeDistanceFromMainSeq } from "./distance-main-seq.js";
export { computeAttackSurface } from "./attack-surface.js";

export { computeHealth } from "./health.js";
