export { detectCycles } from "./cycles.js";
export type { CycleResult } from "./cycles.js";

export { computeCoupling } from "./coupling.js";
export type { CouplingResult } from "./coupling.js";

export { computeMaxDepth } from "./depth.js";
export type { DepthResult } from "./depth.js";

export { detectGodFiles } from "./god-files.js";
export type { GodFilesResult } from "./god-files.js";

export { computeComplexFnRatio, detectEntryPoints } from "./complex-fns.js";

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
} from "./module-boundary.js";

export { buildMetricContext } from "./context.js";
export type { MetricContext } from "./context.js";

export { METRIC_COMPUTATIONS } from "./registry.js";
export type { MetricComputation } from "./registry.js";

export { computeCohesion } from "./cohesion.js";
export { computeEntropy } from "./entropy.js";
export { computeCognitiveComplexityRatio } from "./cognitive-complexity.js";
export { computeHotspotRatio } from "./hotspots.js";
export { computeLongFunctionRatio } from "./long-functions.js";
export { computeLargeFileRatio } from "./large-files.js";
export { computeHighParamsRatio } from "./high-params.js";
export { computeDuplicationRatio } from "./duplication.js";
export { computeDeadCodeRatio } from "./dead-code.js";
export { computeCommentRawValue } from "./comments.js";
export { computeDistanceFromMainSeq } from "./distance-main-seq.js";
export { computeAttackSurface } from "./attack-surface.js";

export { computeHealth } from "./health.js";
