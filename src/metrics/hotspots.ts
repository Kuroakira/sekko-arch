import type { FanMaps } from "./fan-maps.js";
import { HOTSPOT_SCORE_THRESHOLD } from "../constants.js";

export function computeHotspotRatio(fanMaps: FanMaps): number {
  const allFiles = new Set<string>([
    ...fanMaps.fanIn.keys(),
    ...fanMaps.fanOut.keys(),
  ]);
  if (allFiles.size === 0) return 0;

  let hotspotCount = 0;
  for (const file of allFiles) {
    const fanIn = fanMaps.fanIn.get(file) ?? 0;
    const fanOut = fanMaps.fanOut.get(file) ?? 0;
    const total = fanIn + fanOut;
    const instability = total === 0 ? 0 : fanOut / total;
    const score = fanIn * instability;
    if (score >= HOTSPOT_SCORE_THRESHOLD) {
      hotspotCount++;
    }
  }

  return hotspotCount / allFiles.size;
}
