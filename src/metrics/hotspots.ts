import type { FanMaps } from "./fan-maps.js";
import { HOTSPOT_SCORE_THRESHOLD } from "./detection-thresholds.js";

export interface HotspotFile {
  readonly file: string;
  readonly score: number;
}

export interface HotspotResult {
  readonly ratio: number;
  readonly hotspotFiles: readonly HotspotFile[];
}

export function computeHotspotRatio(fanMaps: FanMaps): HotspotResult {
  const allFiles = new Set<string>([
    ...fanMaps.fanIn.keys(),
    ...fanMaps.fanOut.keys(),
  ]);
  if (allFiles.size === 0) return { ratio: 0, hotspotFiles: [] };

  const hotspotFiles: HotspotFile[] = [];
  for (const file of allFiles) {
    const fanIn = fanMaps.fanIn.get(file) ?? 0;
    const fanOut = fanMaps.fanOut.get(file) ?? 0;
    const total = fanIn + fanOut;
    const instability = total === 0 ? 0 : fanOut / total;
    const score = fanIn * instability;
    if (score >= HOTSPOT_SCORE_THRESHOLD) {
      hotspotFiles.push({ file, score });
    }
  }

  return { ratio: hotspotFiles.length / allFiles.size, hotspotFiles };
}
