import { describe, it, expect, vi, beforeEach } from "vitest";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type {
  HealthReport,
  DimensionGrades,
  Grade,
} from "../types/index.js";
import { makeDimension, makeFileNode, makeHealth } from "../testing/fixtures.js";
import { DIMENSION_NAMES } from "../dimensions.js";

function makeGateHealth(overrides?: {
  coupling?: number;
  couplingGrade?: Grade;
  cycles?: number;
  godFiles?: number;
  complexFn?: number;
  depth?: number;
  compositeGrade?: Grade;
}): HealthReport {
  const o = overrides ?? {};
  const base = makeHealth();
  const dimensions: DimensionGrades = {
    ...base.dimensions,
    cycles: makeDimension("cycles", o.cycles ?? 0, "A"),
    coupling: makeDimension("coupling", o.coupling ?? 0.1, o.couplingGrade ?? "A"),
    depth: makeDimension("depth", o.depth ?? 3, "A"),
    godFiles: makeDimension("godFiles", o.godFiles ?? 0, "A"),
    complexFn: makeDimension("complexFn", o.complexFn ?? 0, "A"),
    levelization: makeDimension("levelization", 0.8, "A"),
    blastRadius: makeDimension("blastRadius", 0.1, "A"),
  };
  return {
    dimensions,
    compositeGrade: o.compositeGrade ?? "A",
    fileCount: 10,
    scanDurationMs: 50,
  };
}

vi.mock("./scan.js", () => {
  return {
    executePipeline: vi.fn(),
  };
});

import { executePipeline } from "./scan.js";
import type { PipelineResult } from "./scan.js";
import { saveBaseline, compareBaseline } from "./gate.js";
import type { Baseline } from "./gate.js";

const mockExecutePipeline = vi.mocked(executePipeline);

function makePipelineResult(health: HealthReport): PipelineResult {
  return {
    snapshot: {
      root: makeFileNode({ path: "/fake", name: "fake", isDir: true, lines: 0, logic: 0, comments: 0, blanks: 0, funcs: 0 }),
      files: [],
      totalFiles: 0,
      totalLines: 0,
      importGraph: {
        edges: [],
        adjacency: new Map(),
        reverseAdjacency: new Map(),
      },
    },
    health,
  };
}

describe("saveBaseline", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "sekko-gate-test-"));
    vi.restoreAllMocks();
  });

  it("creates .sekko-arch/baseline.json with correct structure", () => {
    const health = makeGateHealth({
      coupling: 0.15,
      cycles: 2,
      godFiles: 1,
      complexFn: 3,
      depth: 5,
      compositeGrade: "B",
    });
    mockExecutePipeline.mockReturnValue(makePipelineResult(health));

    saveBaseline(tmpDir);

    const baselinePath = join(tmpDir, ".sekko-arch", "baseline.json");
    const raw = readFileSync(baselinePath, "utf-8");
    const baseline: Baseline = JSON.parse(raw);

    expect(baseline.couplingScore).toBe(0.15);
    expect(baseline.cycleCount).toBe(2);
    expect(baseline.godFileRatio).toBe(1);
    expect(baseline.complexFnRatio).toBe(3);
    expect(baseline.maxDepth).toBe(5);
    expect(baseline.compositeGrade).toBe("B");
    expect(baseline.dimensionGrades).toHaveProperty("cycles");
    expect(baseline.dimensionGrades).toHaveProperty("coupling");
    expect(baseline.dimensionGrades).toHaveProperty("depth");
    expect(baseline.dimensionGrades).toHaveProperty("godFiles");
    expect(baseline.dimensionGrades).toHaveProperty("complexFn");
    expect(baseline.dimensionGrades).toHaveProperty("levelization");
    expect(baseline.dimensionGrades).toHaveProperty("blastRadius");
  });
});

describe("compareBaseline", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "sekko-gate-test-"));
    vi.restoreAllMocks();
  });

  function writeBaseline(overrides?: Parameters<typeof makeGateHealth>[0]): void {
    const health = makeGateHealth(overrides);
    const dimensionGrades: Record<string, Grade> = {};
    for (const name of DIMENSION_NAMES) {
      dimensionGrades[name] = health.dimensions[name].grade;
    }
    const baseline: Baseline = {
      couplingScore: health.dimensions.coupling.rawValue,
      cycleCount: health.dimensions.cycles.rawValue,
      godFileRatio: health.dimensions.godFiles.rawValue,
      complexFnRatio: health.dimensions.complexFn.rawValue,
      maxDepth: health.dimensions.depth.rawValue,
      compositeGrade: health.compositeGrade,
      dimensionGrades,
    };
    const dir = join(tmpDir, ".sekko-arch");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "baseline.json"), JSON.stringify(baseline));
  }

  it("passes when metrics have not degraded", () => {
    writeBaseline({ coupling: 0.15, cycles: 2, godFiles: 1, complexFn: 3, depth: 5 });
    const health = makeGateHealth({ coupling: 0.15, cycles: 2, godFiles: 1, complexFn: 3, depth: 5 });
    mockExecutePipeline.mockReturnValue(makePipelineResult(health));

    const result = compareBaseline(tmpDir);

    expect(result.passed).toBe(true);
    expect(result.degradations).toHaveLength(0);
  });

  it("detects coupling degradation when exceeding baseline + 0.05", () => {
    writeBaseline({ coupling: 0.15 });
    const health = makeGateHealth({ coupling: 0.21 });
    mockExecutePipeline.mockReturnValue(makePipelineResult(health));

    const result = compareBaseline(tmpDir);

    expect(result.passed).toBe(false);
    expect(result.degradations.length).toBeGreaterThanOrEqual(1);
    const couplingDeg = result.degradations.find((d) => d.includes("coupling"));
    expect(couplingDeg).toBeDefined();
  });

  it("does not flag coupling within threshold", () => {
    writeBaseline({ coupling: 0.15 });
    const health = makeGateHealth({ coupling: 0.19 });
    mockExecutePipeline.mockReturnValue(makePipelineResult(health));

    const result = compareBaseline(tmpDir);

    const couplingDeg = result.degradations.find((d) => d.includes("coupling"));
    expect(couplingDeg).toBeUndefined();
  });

  it("detects cycle count increase", () => {
    writeBaseline({ cycles: 2 });
    const health = makeGateHealth({ cycles: 3 });
    mockExecutePipeline.mockReturnValue(makePipelineResult(health));

    const result = compareBaseline(tmpDir);

    expect(result.passed).toBe(false);
    const cycleDeg = result.degradations.find((d) => d.includes("cycle"));
    expect(cycleDeg).toBeDefined();
  });

  it("detects grade drop", () => {
    writeBaseline({ compositeGrade: "B" });
    const health = makeGateHealth({ compositeGrade: "C" });
    mockExecutePipeline.mockReturnValue(makePipelineResult(health));

    const result = compareBaseline(tmpDir);

    expect(result.passed).toBe(false);
    const gradeDeg = result.degradations.find((d) => d.includes("grade"));
    expect(gradeDeg).toBeDefined();
  });

  it("fails when no baseline exists", () => {
    const health = makeGateHealth();
    mockExecutePipeline.mockReturnValue(makePipelineResult(health));

    expect(() => compareBaseline(tmpDir)).toThrow(/baseline/i);
  });

  it("throws descriptive error when baseline file contains invalid JSON", () => {
    const dir = join(tmpDir, ".sekko-arch");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "baseline.json"), "not valid json {{{");

    expect(() => compareBaseline(tmpDir)).toThrow(
      /failed to parse.*baseline\.json.*invalid JSON/i,
    );
  });

  it("throws descriptive error when baseline file has wrong shape", () => {
    const dir = join(tmpDir, ".sekko-arch");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "baseline.json"),
      JSON.stringify({ someUnrelatedField: 42 }),
    );

    expect(() => compareBaseline(tmpDir)).toThrow(
      /invalid baseline.*does not match expected schema/i,
    );
  });

  it("throws descriptive error when baseline has wrong field types", () => {
    const dir = join(tmpDir, ".sekko-arch");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "baseline.json"),
      JSON.stringify({
        couplingScore: "not-a-number",
        cycleCount: 0,
        godFileRatio: 0,
        complexFnRatio: 0,
        maxDepth: 0,
        compositeGrade: "A",
        dimensionGrades: {
          cycles: "A",
          coupling: "A",
          depth: "A",
          godFiles: "A",
          complexFn: "A",
          levelization: "A",
          blastRadius: "A",
        },
      }),
    );

    expect(() => compareBaseline(tmpDir)).toThrow(
      /invalid baseline.*does not match expected schema/i,
    );
  });

  it("throws descriptive error when dimensionGrades is missing a field", () => {
    const dir = join(tmpDir, ".sekko-arch");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "baseline.json"),
      JSON.stringify({
        couplingScore: 0.1,
        cycleCount: 0,
        godFileRatio: 0,
        complexFnRatio: 0,
        maxDepth: 3,
        compositeGrade: "A",
        dimensionGrades: {
          cycles: "A",
          coupling: "A",
          // depth missing
          godFiles: "A",
          complexFn: "A",
          levelization: "A",
          blastRadius: "A",
        },
      }),
    );

    expect(() => compareBaseline(tmpDir)).toThrow(
      /invalid baseline.*does not match expected schema/i,
    );
  });
});
