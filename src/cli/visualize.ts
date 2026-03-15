import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { executePipeline } from "./scan.js";
import { generateReportHtml } from "./html-generator.js";

export interface VisualizeOptions {
  readonly output: string;
  readonly include?: readonly string[];
}

export function runVisualize(path: string, options: VisualizeOptions): void {
  const absolutePath = resolve(path);
  const scanOptions = options.include?.length
    ? { include: options.include }
    : undefined;
  const result = executePipeline(absolutePath, scanOptions);
  const html = generateReportHtml(result);

  writeFileSync(options.output, html, "utf-8");
  console.log(`Report written to ${options.output}`);
}
