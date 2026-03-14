import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { resolveImports } from "./resolver.js";
import type { ImportInfo } from "../types/core.js";

describe("resolveImports", () => {
  let tempDir: string;

  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), "sekko-resolver-"));

    // Create fixture files
    mkdirSync(join(tempDir, "src", "auth"), { recursive: true });
    mkdirSync(join(tempDir, "src", "utils"), { recursive: true });
    writeFileSync(
      join(tempDir, "src", "auth", "login.ts"),
      'export const login = () => "ok";',
    );
    writeFileSync(
      join(tempDir, "src", "auth", "signup.ts"),
      'import { login } from "./login.js";',
    );
    writeFileSync(
      join(tempDir, "src", "utils", "helpers.ts"),
      "export const helper = 42;",
    );
    writeFileSync(
      join(tempDir, "src", "index.ts"),
      'export { login } from "./auth/login.js";',
    );
  });

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("resolves relative imports", () => {
    const imports: ImportInfo[] = [{ specifier: "./login.js", resolved: null }];
    const result = resolveImports(
      "src/auth/signup.ts",
      imports,
      tempDir,
    );

    expect(result).toHaveLength(1);
    expect(result[0].resolved).toBe("src/auth/login.ts");
  });

  it("resolves parent-relative imports", () => {
    const imports: ImportInfo[] = [
      { specifier: "../utils/helpers.js", resolved: null },
    ];
    const result = resolveImports(
      "src/auth/signup.ts",
      imports,
      tempDir,
    );

    expect(result).toHaveLength(1);
    expect(result[0].resolved).toBe("src/utils/helpers.ts");
  });

  it("filters out bare npm specifiers", () => {
    const imports: ImportInfo[] = [
      { specifier: "react", resolved: null },
      { specifier: "lodash/map", resolved: null },
      { specifier: "@types/node", resolved: null },
      { specifier: "./login.js", resolved: null },
    ];
    const result = resolveImports(
      "src/auth/signup.ts",
      imports,
      tempDir,
    );

    expect(result).toHaveLength(1);
    expect(result[0].specifier).toBe("./login.js");
  });

  it("returns null resolved for non-existent files", () => {
    const imports: ImportInfo[] = [
      { specifier: "./non-existent.js", resolved: null },
    ];
    const result = resolveImports(
      "src/auth/signup.ts",
      imports,
      tempDir,
    );

    expect(result).toHaveLength(1);
    expect(result[0].resolved).toBeNull();
  });

  it("handles empty imports array", () => {
    const result = resolveImports("src/index.ts", [], tempDir);
    expect(result).toHaveLength(0);
  });
});
