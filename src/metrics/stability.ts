import {
  STABILITY_INSTABILITY_THRESHOLD,
  STABILITY_FAN_IN_THRESHOLD,
} from "../constants.js";

export function isStable(
  file: string,
  fanIn: ReadonlyMap<string, number>,
  fanOut: ReadonlyMap<string, number>,
): boolean {
  const fi = fanIn.get(file) ?? 0;
  if (fi < STABILITY_FAN_IN_THRESHOLD) return false;

  const fo = fanOut.get(file) ?? 0;
  const total = fi + fo;
  if (total === 0) return true;

  const instability = fo / total;
  return instability <= STABILITY_INSTABILITY_THRESHOLD;
}

export function computeInstability(
  fanIn: number,
  fanOut: number,
): number {
  const total = fanIn + fanOut;
  if (total === 0) return 0;
  return fanOut / total;
}
