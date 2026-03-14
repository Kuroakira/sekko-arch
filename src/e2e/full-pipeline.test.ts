import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve, join } from "node:path";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";

const FIXTURE_SRC = resolve(
  import.meta.dirname,
  "fixtures/sample-project",
);

const CLI_ENTRY = resolve(import.meta.dirname, "../cli/index.ts");

let testDir: string;

interface CliResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
}

function runCli(...args: string[]): CliResult {
  const result = spawnSync(
    "npx",
    ["tsx", CLI_ENTRY, ...args],
    {
      cwd: testDir,
      encoding: "utf-8",
      timeout: 30000,
    },
  );
  if (result.error) {
    throw new Error(`Failed to spawn CLI: ${result.error.message}`);
  }
  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    exitCode: result.status ?? 1,
  };
}

function runCliFrom(cwd: string, ...args: string[]): CliResult {
  const result = spawnSync(
    "npx",
    ["tsx", CLI_ENTRY, ...args],
    {
      cwd,
      encoding: "utf-8",
      timeout: 30000,
    },
  );
  if (result.error) {
    throw new Error(`Failed to spawn CLI: ${result.error.message}`);
  }
  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    exitCode: result.status ?? 1,
  };
}

interface ScanJson {
  readonly compositeGrade: string;
  readonly dimensions: Record<
    string,
    { readonly rawValue: number; readonly grade: string }
  >;
  readonly metadata: { readonly fileCount: number; readonly scanDurationMs: number };
}

function scanJson(): ScanJson {
  const { stdout, exitCode } = runCli("--format", "json", "scan", ".");
  expect(exitCode).toBe(0);
  return JSON.parse(stdout) as ScanJson;
}

describe("E2E: full pipeline", () => {
  beforeAll(() => {
    // Copy fixture to temp dir outside git repo so fsWalkFiles is used
    testDir = mkdtempSync(join(tmpdir(), "archana-e2e-"));
    cpSync(FIXTURE_SRC, testDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe("scan command", () => {
    it("produces table output with all 7 dimensions", () => {
      const { stdout, exitCode } = runCli("scan", ".");

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Cycles");
      expect(stdout).toContain("Coupling");
      expect(stdout).toContain("Depth");
      expect(stdout).toContain("God Files");
      expect(stdout).toContain("Complex Fns");
      expect(stdout).toContain("Levelization");
      expect(stdout).toContain("Blast Radius");
    });

    it("scans exactly 10 fixture files", () => {
      const { stdout } = runCli("scan", ".");

      const match = stdout.match(/(\d+) files scanned/);
      expect(match).not.toBeNull();
      expect(Number(match?.[1] ?? "0")).toBe(10);
    });

    it("produces valid JSON with all dimensions and correct file count", () => {
      const result = scanJson();

      expect(result.compositeGrade).toMatch(/^[A-DF]$/);
      expect(result.metadata.fileCount).toBe(10);

      const dimensionNames = [
        "cycles",
        "coupling",
        "depth",
        "godFiles",
        "complexFn",
        "levelization",
        "blastRadius",
      ];
      for (const name of dimensionNames) {
        expect(result.dimensions).toHaveProperty(name);
        expect(result.dimensions[name]).toHaveProperty("rawValue");
        expect(result.dimensions[name]).toHaveProperty("grade");
        expect(result.dimensions[name].grade).toMatch(/^[A-DF]$/);
      }
    });

    it("detects exactly 1 cycle (login <-> session)", () => {
      const result = scanJson();
      expect(result.dimensions["cycles"].rawValue).toBe(1);
    });

    it("detects complex functions in router.ts (CC > 15)", () => {
      const result = scanJson();
      // handleRequest has high CC; complexFn is ratio of CC>15 fns / total fns
      // Fixture has ~15 functions total, 1 with CC>15 → ratio > 0
      expect(result.dimensions["complexFn"].rawValue).toBeGreaterThanOrEqual(0.05);
    });
  });

  describe("check command", () => {
    it("detects rule violations and exits 1", () => {
      const { stderr, exitCode } = runCli("check", ".");

      expect(exitCode).toBe(1);
      expect(stderr).toContain("violation");
    });

    it("reports max_cycles violation", () => {
      const { stderr } = runCli("check", ".");
      expect(stderr).toContain("max_cycles");
    });
  });

  describe("gate command", () => {
    it("saves baseline with --save and produces valid JSON", () => {
      const { stdout, exitCode } = runCli("gate", "--save", ".");

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Baseline saved");

      const baselinePath = join(testDir, ".archana", "baseline.json");
      expect(existsSync(baselinePath)).toBe(true);

      const raw = readFileSync(baselinePath, "utf-8");
      const baseline = JSON.parse(raw) as Record<string, unknown>;
      expect(baseline).toHaveProperty("compositeGrade");
      expect(baseline).toHaveProperty("couplingScore");
      expect(baseline).toHaveProperty("cycleCount");
      expect(baseline).toHaveProperty("dimensionGrades");
    });

    it("passes gate when no degradation after baseline save", () => {
      // Save fresh baseline
      runCli("gate", "--save", ".");

      const { stdout, exitCode } = runCli("gate", ".");

      expect(exitCode).toBe(0);
      expect(stdout).toContain("PASSED");
    });

    it("fails gate when baseline is missing", () => {
      const baselinePath = join(testDir, ".archana", "baseline.json");
      if (existsSync(baselinePath)) {
        rmSync(baselinePath);
      }

      const { stderr, exitCode } = runCli("gate", ".");

      expect(exitCode).toBe(1);
      expect(stderr).toContain("No baseline found");
    });
  });

  describe("edge cases", () => {
    it("scan exits 0 for directory with no TS files", () => {
      const emptyDir = mkdtempSync(join(tmpdir(), "archana-empty-"));

      try {
        const { exitCode, stdout } = runCliFrom(emptyDir, "scan", ".");
        expect(exitCode).toBe(0);
        expect(stdout).toContain("0 files scanned");
      } finally {
        rmSync(emptyDir, { recursive: true, force: true });
      }
    });

    it("check exits 1 when rules.toml is missing", () => {
      const noRulesDir = mkdtempSync(join(tmpdir(), "archana-norules-"));
      writeFileSync(join(noRulesDir, "index.ts"), "export const x = 1;\n");

      try {
        const { stderr, exitCode } = runCliFrom(noRulesDir, "check", ".");
        expect(exitCode).toBe(1);
        expect(stderr).toContain("rules.toml");
      } finally {
        rmSync(noRulesDir, { recursive: true, force: true });
      }
    });

    it("check exits 1 when rules.toml contains invalid TOML", () => {
      const badTomlDir = mkdtempSync(join(tmpdir(), "archana-badtoml-"));
      writeFileSync(join(badTomlDir, "index.ts"), "export const x = 1;\n");
      mkdirSync(join(badTomlDir, ".archana"), { recursive: true });
      writeFileSync(
        join(badTomlDir, ".archana", "rules.toml"),
        "[invalid toml = = =",
      );

      try {
        const { stderr, exitCode } = runCliFrom(badTomlDir, "check", ".");
        expect(exitCode).toBe(1);
        expect(stderr).toContain("rules.toml");
      } finally {
        rmSync(badTomlDir, { recursive: true, force: true });
      }
    });

    it("scan exits 0 with 0 files for nonexistent directory", () => {
      const { exitCode, stdout } = runCliFrom(
        testDir,
        "scan",
        "/nonexistent/path/to/project",
      );
      // Currently exits 0 with 0 files — Task 40 may add explicit error
      expect(exitCode).toBe(0);
      expect(stdout).toContain("0 files scanned");
    });
  });
});
