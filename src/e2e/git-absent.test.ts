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
import { DIMENSION_NAMES } from "../dimensions.js";
import type { Grade } from "../types/metrics.js";

const VALID_GRADES: readonly Grade[] = ["A", "B", "C", "D", "F"];

const GIT_EVOLUTION_DIMS = [
  "codeChurn",
  "changeCoupling",
  "busFactor",
  "codeAge",
] as const;

describe("E2E: git-absent environment", () => {
  let testDir: string;

  beforeAll(() => {
    testDir = mkdtempSync(join(tmpdir(), "sekko-no-git-"));

    // Create a minimal TypeScript project without git init
    const srcDir = join(testDir, "src");
    mkdirSync(join(srcDir, "auth"), { recursive: true });
    mkdirSync(join(srcDir, "utils"), { recursive: true });

    writeFileSync(
      join(srcDir, "index.ts"),
      `import { greet } from "./utils/greet.js";\nexport function main(): void { console.log(greet("world")); }\n`,
    );

    writeFileSync(
      join(srcDir, "utils", "greet.ts"),
      `export function greet(name: string): string { return "Hello, " + name; }\n`,
    );

    writeFileSync(
      join(srcDir, "utils", "format.ts"),
      `export function formatDate(d: Date): string { return d.toISOString(); }\n`,
    );

    writeFileSync(
      join(srcDir, "auth", "login.ts"),
      `import { greet } from "../utils/greet.js";\nexport function login(user: string): string { return greet(user); }\n`,
    );

    writeFileSync(
      join(srcDir, "auth", "session.ts"),
      `export interface Session { readonly id: string; readonly user: string; }\nexport function createSession(user: string): Session { return { id: "1", user }; }\n`,
    );
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("completes scan with all 24 dimensions graded", () => {
    const { health } = executePipeline(testDir);

    for (const name of DIMENSION_NAMES) {
      const dim = health.dimensions[name];
      expect(dim, `missing dimension: ${name}`).toBeDefined();
      expect(VALID_GRADES).toContain(dim.grade);
    }
  });

  it("git evolution metrics skip gracefully (rawValue=0, grade=A)", () => {
    const { health } = executePipeline(testDir);

    for (const name of GIT_EVOLUTION_DIMS) {
      const dim = health.dimensions[name];
      expect(
        dim.rawValue,
        `${name} should be 0 without git history`,
      ).toBe(0);
      expect(
        dim.grade,
        `${name} should be A without git history`,
      ).toBe("A");
    }
  });

  it("non-git metrics compute normally (20 dimensions)", () => {
    const { health } = executePipeline(testDir);

    const nonGitDims = DIMENSION_NAMES.filter(
      (name) => !(GIT_EVOLUTION_DIMS as readonly string[]).includes(name),
    );

    // All 20 non-git dimensions should have valid grades
    for (const name of nonGitDims) {
      const dim = health.dimensions[name];
      expect(dim.rawValue).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(dim.rawValue), `${name} rawValue is not finite`).toBe(true);
    }

    // Should find our 5 source files
    expect(health.fileCount).toBe(5);
  });

  it("has a valid composite grade", () => {
    const { health } = executePipeline(testDir);
    expect(VALID_GRADES).toContain(health.compositeGrade);
  });
});
