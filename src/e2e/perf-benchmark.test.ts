import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { join } from "node:path";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { executePipeline } from "../cli/scan.js";

// Design doc target: 5,000 files in 15 seconds on 4 cores (single-threaded)
const FILE_COUNT = 5000;
const TIME_BUDGET_MS = 15000;

const MODULES = [
  "auth",
  "api",
  "utils",
  "core",
  "db",
  "services",
  "handlers",
  "middleware",
  "config",
  "models",
];

function generateFixture(rootDir: string): void {
  const srcDir = join(rootDir, "src");

  for (const mod of MODULES) {
    mkdirSync(join(srcDir, mod), { recursive: true });
  }

  for (let i = 0; i < FILE_COUNT; i++) {
    const mod = MODULES[i % MODULES.length];
    const filePath = join(srcDir, mod, `file${i}.ts`);

    const isComplex = i % 50 === 0;
    const hasImport = i % 10 === 0;

    let content = "";

    if (hasImport && i > 0) {
      const targetIdx = i - 1;
      const targetMod = MODULES[targetIdx % MODULES.length];
      content += `import { fn${targetIdx} } from "../${targetMod}/file${targetIdx}.js";\n\n`;
    }

    if (isComplex) {
      content += `export function complexFn${i}(a: number, b: string, c: boolean): string {\n`;
      content += `  if (a > 0) {\n`;
      content += `    if (b === "x") return "x";\n`;
      content += `    if (b === "y") return "y";\n`;
      content += `    if (b === "z") return "z";\n`;
      content += `    if (c && a > 10) return "c10";\n`;
      content += `    if (c || a > 20) return "c20";\n`;
      content += `    if (a > 30 && b.length > 0) return "30";\n`;
      content += `    if (a > 40 || c) return "40";\n`;
      content += `    if (a > 50) return "50";\n`;
      content += `    if (a > 60) return "60";\n`;
      content += `    if (a > 70) return "70";\n`;
      content += `    if (a > 80) return "80";\n`;
      content += `    if (a > 90) return "90";\n`;
      content += `    switch (b) {\n`;
      content += `      case "a": return "sa";\n`;
      content += `      case "b": return "sb";\n`;
      content += `      case "c": return "sc";\n`;
      content += `      default: return "sd";\n`;
      content += `    }\n`;
      content += `  }\n`;
      content += `  return c ? "true" : "false";\n`;
      content += `}\n\n`;
    }

    content += `export function fn${i}(): string {\n`;
    content += `  return "file${i}";\n`;
    content += `}\n`;

    if (i % 5 === 0) {
      content += `\nexport interface Type${i} {\n`;
      content += `  readonly id: number;\n`;
      content += `  readonly name: string;\n`;
      content += `}\n`;
    }

    writeFileSync(filePath, content);
  }
}

describe("Performance: scan benchmark", () => {
  let fixtureDir: string;

  beforeAll(() => {
    fixtureDir = mkdtempSync(join(tmpdir(), "sekko-perf-"));
    generateFixture(fixtureDir);
  }, 60000);

  afterAll(() => {
    rmSync(fixtureDir, { recursive: true, force: true });
  });

  it(`scans ${FILE_COUNT} files within ${TIME_BUDGET_MS / 1000}s time budget`, () => {
    const start = performance.now();
    const { health, snapshot } = executePipeline(fixtureDir);
    const elapsed = performance.now() - start;

    // Correctness: all files scanned, all dimensions graded
    expect(snapshot.totalFiles).toBe(FILE_COUNT);
    expect(health.fileCount).toBe(FILE_COUNT);
    expect(health.compositeGrade).toMatch(/^[A-DF]$/);

    const dims = health.dimensions;
    expect(dims.cycles.grade).toMatch(/^[A-DF]$/);
    expect(dims.coupling.grade).toMatch(/^[A-DF]$/);
    expect(dims.depth.grade).toMatch(/^[A-DF]$/);
    expect(dims.godFiles.grade).toMatch(/^[A-DF]$/);
    expect(dims.complexFn.grade).toMatch(/^[A-DF]$/);
    expect(dims.levelization.grade).toMatch(/^[A-DF]$/);
    expect(dims.blastRadius.grade).toMatch(/^[A-DF]$/);

    // Scan duration recorded in health report
    expect(health.scanDurationMs).toBeGreaterThanOrEqual(1);
    expect(health.scanDurationMs).toBeLessThan(TIME_BUDGET_MS);

    // Performance gate
    console.log(
      `\n  Performance: ${FILE_COUNT} files in ${elapsed.toFixed(0)}ms (budget: ${TIME_BUDGET_MS}ms)`,
    );

    expect(elapsed).toBeLessThan(TIME_BUDGET_MS);
  }, 60000);
});
