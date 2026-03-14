import { readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import type { FileNode, Snapshot, HealthReport } from "../types/index.js";
import { scanFiles } from "../scanner/index.js";
import { parseAndExtract } from "../parser/index.js";
import { buildImportGraph } from "../graph/index.js";
import { computeHealth } from "../metrics/index.js";
import { formatTable } from "./formatters/table.js";
import { formatJson } from "./formatters/json.js";

export function executePipeline(rootDir: string): HealthReport {
  const absoluteRoot = resolve(rootDir);

  const files = scanFiles(absoluteRoot);

  const parsedFiles: FileNode[] = files.map((file) => {
    const source = readFileSync(join(absoluteRoot, file.path), "utf-8");
    return parseAndExtract(file, source);
  });

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

  return computeHealth(snapshot);
}

export function runScan(
  path: string,
  options: { readonly format: string },
): void {
  const absolutePath = resolve(path);
  const report = executePipeline(absolutePath);

  const output =
    options.format === "json" ? formatJson(report) : formatTable(report);

  console.log(output);
}
