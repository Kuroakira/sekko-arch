import { describe, it, expect } from "vitest";
import {
  STABILITY_INSTABILITY_THRESHOLD,
  STABILITY_FAN_IN_THRESHOLD,
  GOD_FILE_FAN_OUT_THRESHOLD,
  COMPLEXITY_CC_THRESHOLD,
} from "./constants.js";

describe("constants", () => {
  it("exports stability instability threshold as 0.15", () => {
    expect(STABILITY_INSTABILITY_THRESHOLD).toBe(0.15);
  });

  it("exports stability fan-in threshold as 3", () => {
    expect(STABILITY_FAN_IN_THRESHOLD).toBe(3);
  });

  it("exports god file fan-out threshold as 15", () => {
    expect(GOD_FILE_FAN_OUT_THRESHOLD).toBe(15);
  });

  it("exports complexity cyclomatic complexity threshold as 15", () => {
    expect(COMPLEXITY_CC_THRESHOLD).toBe(15);
  });
});
