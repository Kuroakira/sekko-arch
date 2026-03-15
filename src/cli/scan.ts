import { readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import type { FileNode } from "../types/core.js";
import type { Snapshot } from "../types/snapshot.js";
import type { HealthReport } from "../types/metrics.js";
import { scanFiles } from "../scanner/index.js";
import type { ScanOptions } from "../scanner/index.js";
import { parseAndExtract } from "../parser/index.js";
import { buildImportGraph } from "../graph/index.js";
import { computeHealth } from "../metrics/health.js";
import { collectGitHistory } from "../git/index.js";
import { parseRulesFile } from "../rules/toml-parser.js";
import { getFormatter } from "./formatters/index.js";

export interface PipelineResult {
  readonly snapshot: Snapshot;
  readonly health: HealthReport;
}

export function executePipeline(
  rootDir: string,
  scanOptions?: ScanOptions,
): PipelineResult {
  const absoluteRoot = resolve(rootDir);

  const files = scanFiles(absoluteRoot, scanOptions);

  const parsedFiles: FileNode[] = [];
  for (const file of files) {
    let source: string;
    try {
      source = readFileSync(join(absoluteRoot, file.path), "utf-8");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`Warning: skipping ${file.path}: ${msg}`);
      continue;
    }
    try {
      parsedFiles.push(parseAndExtract(file, source));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`Warning: parse failed for ${file.path}: ${msg}`);
      parsedFiles.push(file);
    }
  }

  const graph = buildImportGraph(parsedFiles, absoluteRoot);

  const snapshot: Snapshot = {
    root: {
      path: absoluteRoot,
      name: basename(absoluteRoot),
      isDir: true,
      lines: 0,
      logic: 0,
      comments: 0,
      blanks: 0,
      funcs: 0,
      lang: "ts",
      sa: undefined,
    },
    files: parsedFiles,
    totalFiles: parsedFiles.length,
    totalLines: parsedFiles.reduce((sum, f) => sum + f.lines, 0),
    importGraph: graph,
  };

  const rulesConfig = parseRulesFile(absoluteRoot);
  const gitHistory = collectGitHistory(
    absoluteRoot,
    rulesConfig?.evolution,
  );

  const health = computeHealth(snapshot, gitHistory);
  return { snapshot, health };
}

export function runScan(
  path: string,
  options: { readonly format: string; readonly include?: readonly string[] },
): void {
  const absolutePath = resolve(path);
  const scanOptions: ScanOptions | undefined = options.include?.length
    ? { include: options.include }
    : undefined;
  const { health } = executePipeline(absolutePath, scanOptions);

  const output = getFormatter(options.format).format(health);

  console.log(output);
}
