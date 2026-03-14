// Re-export from metrics/thresholds.ts for backward compatibility.
// The canonical location is now src/metrics/thresholds.ts.
export {
  STABILITY_INSTABILITY_THRESHOLD,
  STABILITY_FAN_IN_THRESHOLD,
  GOD_FILE_FAN_OUT_THRESHOLD,
  COMPLEXITY_CC_THRESHOLD,
  COGNITIVE_COMPLEXITY_THRESHOLD,
  LONG_FUNCTION_LINE_THRESHOLD,
  LARGE_FILE_LINE_THRESHOLD,
  HIGH_PARAMS_THRESHOLD,
  HOTSPOT_SCORE_THRESHOLD,
} from "./metrics/thresholds.js";
