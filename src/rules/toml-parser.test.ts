import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseRulesFile } from "./toml-parser.js";
import type { RulesConfig } from "../types/rules.js";

function makeTempDir(): string {
  return mkdtempSync(join(tmpdir(), "archana-toml-test-"));
}

function writeRulesToml(configDir: string, content: string): void {
  const archanaDir = join(configDir, ".archana");
  mkdirSync(archanaDir, { recursive: true });
  writeFileSync(join(archanaDir, "rules.toml"), content, "utf-8");
}

describe("parseRulesFile", () => {
  it("returns null when file does not exist", () => {
    const tmpDir = makeTempDir();
    try {
      const result = parseRulesFile(tmpDir);
      expect(result).toBeNull();
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("parses valid TOML with all three sections", () => {
    const tmpDir = makeTempDir();
    try {
      writeRulesToml(
        tmpDir,
        `
[constraints]
max_cycles = 0
max_coupling = 10
max_cc = 15
no_god_files = true

[[layers]]
name = "domain"
paths = ["src/domain"]
order = 1

[[layers]]
name = "infra"
paths = ["src/infra", "src/db"]
order = 2

[[boundaries]]
from = "domain"
to = "infra"
reason = "domain must not depend on infra"
`,
      );

      const result = parseRulesFile(tmpDir);
      expect(result).not.toBeNull();
      const config = result as RulesConfig;

      expect(config.constraints?.max_cycles).toBe(0);
      expect(config.constraints?.max_coupling).toBe(10);
      expect(config.constraints?.max_cc).toBe(15);
      expect(config.constraints?.no_god_files).toBe(true);

      expect(config.layers).toHaveLength(2);
      expect(config.layers?.[0]?.name).toBe("domain");
      expect(config.layers?.[0]?.paths).toEqual(["src/domain"]);
      expect(config.layers?.[0]?.order).toBe(1);
      expect(config.layers?.[1]?.name).toBe("infra");
      expect(config.layers?.[1]?.paths).toEqual(["src/infra", "src/db"]);

      expect(config.boundaries).toHaveLength(1);
      expect(config.boundaries?.[0]?.from).toBe("domain");
      expect(config.boundaries?.[0]?.to).toBe("infra");
      expect(config.boundaries?.[0]?.reason).toBe(
        "domain must not depend on infra",
      );
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("throws descriptive error on invalid TOML", () => {
    const tmpDir = makeTempDir();
    try {
      writeRulesToml(tmpDir, "this is [not valid = toml {{{}}}");

      expect(() => parseRulesFile(tmpDir)).toThrow(/rules\.toml/i);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("parses partial config with only constraints", () => {
    const tmpDir = makeTempDir();
    try {
      writeRulesToml(
        tmpDir,
        `
[constraints]
max_cycles = 3
`,
      );

      const result = parseRulesFile(tmpDir);
      expect(result).not.toBeNull();
      const config = result as RulesConfig;

      expect(config.constraints?.max_cycles).toBe(3);
      expect(config.layers).toBeUndefined();
      expect(config.boundaries).toBeUndefined();
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
