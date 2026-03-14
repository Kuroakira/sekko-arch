import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
  chmodSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { executePipeline } from "../cli/scan.js";

describe("error handling: executePipeline", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "sekko-err-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("produces valid all-A report for empty directory (no TS files)", () => {
    const { health } = executePipeline(dir);

    expect(health.fileCount).toBe(0);
    expect(health.compositeGrade).toBe("A");
    expect(health.dimensions.cycles.rawValue).toBe(0);
    expect(health.dimensions.coupling.rawValue).toBe(0);
    expect(health.dimensions.comments.rawValue).toBe(0);
  });

  it("produces valid report for directory with single file", () => {
    writeFileSync(join(dir, "index.ts"), "export const x = 1;\n");

    const { health, snapshot } = executePipeline(dir);

    expect(snapshot.totalFiles).toBe(1);
    expect(health.fileCount).toBe(1);
    expect(health.compositeGrade).toMatch(/^[ABCDF]$/);
  });

  it("skips unreadable files without crashing", () => {
    writeFileSync(join(dir, "good.ts"), "export const x = 1;\n");
    writeFileSync(join(dir, "bad.ts"), "export const y = 2;\n");

    chmodSync(join(dir, "bad.ts"), 0o000);

    try {
      const { health, snapshot } = executePipeline(dir);

      expect(snapshot.totalFiles).toBe(1);
      expect(health.compositeGrade).toMatch(/^[ABCDF]$/);
      expect(snapshot.files[0].name).toBe("good.ts");
    } finally {
      chmodSync(join(dir, "bad.ts"), 0o644);
    }
  });

  it("processes two valid files successfully", () => {
    writeFileSync(join(dir, "a.ts"), "export const a = 1;\n");
    writeFileSync(join(dir, "b.ts"), "export const b = 2;\n");

    const { health } = executePipeline(dir);

    expect(health.fileCount).toBe(2);
    expect(health.compositeGrade).toMatch(/^[ABCDF]$/);
  });

  it("handles directory with only non-TS files", () => {
    writeFileSync(join(dir, "readme.md"), "# Hello\n");
    writeFileSync(join(dir, "config.json"), '{"key": "value"}\n');

    const { health } = executePipeline(dir);

    expect(health.fileCount).toBe(0);
    expect(health.compositeGrade).toBe("A");
  });

  it("handles deeply nested directory structure", () => {
    const deep = join(dir, "src", "a", "b", "c", "d");
    mkdirSync(deep, { recursive: true });
    writeFileSync(join(deep, "deep.ts"), "export const deep = true;\n");

    const { health, snapshot } = executePipeline(dir);

    expect(snapshot.totalFiles).toBe(1);
    expect(health.compositeGrade).toMatch(/^[ABCDF]$/);
  });

  it("handles files with syntax errors (parse failure with warning)", () => {
    writeFileSync(join(dir, "good.ts"), "export const x = 1;\n");
    writeFileSync(
      join(dir, "broken.ts"),
      "export function { this is not valid typescript ]]]]",
    );

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      const { health, snapshot } = executePipeline(dir);

      // Both files present — broken file has line counts but no structural analysis
      expect(snapshot.totalFiles).toBe(2);
      expect(health.compositeGrade).toMatch(/^[ABCDF]$/);

      const brokenFile = snapshot.files.find((f) => f.name === "broken.ts");
      expect(brokenFile).toBeDefined();
      expect(brokenFile?.lines).toBe(1);

      // Tree-sitter is lenient — it may produce an empty SA or warn.
      // The key invariant: pipeline doesn't crash on broken syntax.
      if (brokenFile?.sa === undefined) {
        // Parser returned null → warn was emitted
        expect(warnSpy).toHaveBeenCalled();
        const warnMsg = warnSpy.mock.calls.map((c) => String(c[0])).join("\n");
        expect(warnMsg).toContain("broken.ts");
      } else {
        // Tree-sitter produced a partial parse — no structural data extracted
        expect(brokenFile.sa.functions).toHaveLength(0);
        expect(brokenFile.sa.classes).toHaveLength(0);
      }
    } finally {
      warnSpy.mockRestore();
    }
  });
});

describe("error handling: gate baseline", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "sekko-gate-err-"));
    writeFileSync(join(dir, "index.ts"), "export const x = 1;\n");
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("saveBaseline creates .sekko-arch directory if missing", async () => {
    const { saveBaseline } = await import("../cli/gate.js");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    try {
      saveBaseline(dir);
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining("Baseline saved"),
      );
    } finally {
      logSpy.mockRestore();
    }
  });

  it("compareBaseline throws descriptive error when baseline missing", async () => {
    const { compareBaseline } = await import("../cli/gate.js");

    expect(() => compareBaseline(dir)).toThrow("No baseline found");
  });

  it("compareBaseline throws descriptive error on corrupted JSON", async () => {
    const { compareBaseline } = await import("../cli/gate.js");

    mkdirSync(join(dir, ".sekko-arch"), { recursive: true });
    writeFileSync(
      join(dir, ".sekko-arch", "baseline.json"),
      "not valid json {{{",
    );

    expect(() => compareBaseline(dir)).toThrow("invalid JSON");
  });

  it("compareBaseline throws descriptive error on invalid schema", async () => {
    const { compareBaseline } = await import("../cli/gate.js");

    mkdirSync(join(dir, ".sekko-arch"), { recursive: true });
    writeFileSync(
      join(dir, ".sekko-arch", "baseline.json"),
      JSON.stringify({ wrong: "schema" }),
    );

    expect(() => compareBaseline(dir)).toThrow("does not match expected schema");
  });
});

describe("error handling: rules parser", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "sekko-rules-err-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("returns null when rules.toml does not exist", async () => {
    const { parseRulesFile } = await import("../rules/toml-parser.js");

    const result = parseRulesFile(dir);
    expect(result).toBeNull();
  });

  it("throws descriptive error on invalid TOML", async () => {
    const { parseRulesFile } = await import("../rules/toml-parser.js");

    mkdirSync(join(dir, ".sekko-arch"), { recursive: true });
    writeFileSync(
      join(dir, ".sekko-arch", "rules.toml"),
      "[invalid = = toml syntax",
    );

    expect(() => parseRulesFile(dir)).toThrow("Failed to parse rules.toml");
  });

  it("handles empty rules.toml gracefully", async () => {
    const { parseRulesFile } = await import("../rules/toml-parser.js");

    mkdirSync(join(dir, ".sekko-arch"), { recursive: true });
    writeFileSync(join(dir, ".sekko-arch", "rules.toml"), "");

    const result = parseRulesFile(dir);
    expect(result).toEqual({});
  });

  it("handles rules.toml with only constraints", async () => {
    const { parseRulesFile } = await import("../rules/toml-parser.js");

    mkdirSync(join(dir, ".sekko-arch"), { recursive: true });
    writeFileSync(
      join(dir, ".sekko-arch", "rules.toml"),
      "[constraints]\nmax_cycles = 5\n",
    );

    const result = parseRulesFile(dir);
    expect(result).toEqual({ constraints: { max_cycles: 5 } });
  });
});
