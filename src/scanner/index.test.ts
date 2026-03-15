import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { scanFiles } from "./index.js";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

describe("scanFiles", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sekko-scan-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function createFile(relativePath: string, content: string): void {
    const fullPath = path.join(tmpDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }

  it("returns FileNode array with line counts populated", () => {
    createFile(
      "src/index.ts",
      `// Main entry
import { foo } from "./foo";

export function main() {
  return foo();
}
`,
    );
    createFile(
      "src/foo.ts",
      `export function foo() {
  return 42;
}
`,
    );

    const result = scanFiles(tmpDir);

    expect(result).toHaveLength(2);

    const sorted = [...result].sort((a, b) => a.path.localeCompare(b.path));

    // src/foo.ts
    expect(sorted[0].path).toBe("src/foo.ts");
    expect(sorted[0].name).toBe("foo.ts");
    expect(sorted[0].lang).toBe("ts");
    expect(sorted[0].isDir).toBe(false);
    expect(sorted[0].lines).toBe(3);
    expect(sorted[0].logic).toBe(3);
    expect(sorted[0].comments).toBe(0);
    expect(sorted[0].blanks).toBe(0);
    expect(sorted[0].sa).toBeUndefined(); // parser not wired yet

    // src/index.ts
    expect(sorted[1].path).toBe("src/index.ts");
    expect(sorted[1].name).toBe("index.ts");
    expect(sorted[1].lines).toBe(6);
    expect(sorted[1].logic).toBe(4);
    expect(sorted[1].comments).toBe(1);
    expect(sorted[1].blanks).toBe(1);
  });

  it("detects language from extension", () => {
    createFile("src/app.tsx", "const App = () => <div />;\n");
    createFile("src/util.ts", "export const x = 1;\n");

    const result = scanFiles(tmpDir);
    const sorted = [...result].sort((a, b) => a.path.localeCompare(b.path));

    expect(sorted[0].lang).toBe("tsx");
    expect(sorted[1].lang).toBe("ts");
  });

  it("excludes non-typescript files", () => {
    createFile("src/index.ts", "const x = 1;\n");
    createFile("src/styles.css", "body { color: red; }");
    createFile("README.md", "# Hello");

    const result = scanFiles(tmpDir);

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe("src/index.ts");
  });

  it("returns empty array for directory with no ts files", () => {
    createFile("README.md", "# Hello");

    const result = scanFiles(tmpDir);

    expect(result).toEqual([]);
  });

  it("sets funcs to 0 and sa to undefined (parser not wired)", () => {
    createFile("src/index.ts", "const x = 1;\n");

    const result = scanFiles(tmpDir);

    expect(result[0].funcs).toBe(0);
    expect(result[0].sa).toBeUndefined();
  });

  it("excludes test files (.test.ts and .test.tsx)", () => {
    createFile("src/index.ts", "export const x = 1;\n");
    createFile("src/index.test.ts", 'import { x } from "./index";\n');
    createFile("src/app.tsx", "const App = () => <div />;\n");
    createFile("src/app.test.tsx", "it('works', () => {});\n");

    const result = scanFiles(tmpDir);

    expect(result).toHaveLength(2);
    const paths = result.map((f) => f.path).sort();
    expect(paths).toEqual(["src/app.tsx", "src/index.ts"]);
  });

  describe("ScanOptions", () => {
    it("filters by --include (single directory)", () => {
      createFile("src/api/handler.ts", "export const h = 1;\n");
      createFile("src/models/user.ts", "export const u = 1;\n");
      createFile("src/utils/helper.ts", "export const x = 1;\n");

      const result = scanFiles(tmpDir, { include: ["src/api"] });
      const paths = result.map((f) => f.path);
      expect(paths).toEqual(["src/api/handler.ts"]);
    });

    it("filters by --include (multiple directories)", () => {
      createFile("src/api/handler.ts", "export const h = 1;\n");
      createFile("src/models/user.ts", "export const u = 1;\n");
      createFile("src/utils/helper.ts", "export const x = 1;\n");

      const result = scanFiles(tmpDir, {
        include: ["src/api", "src/models"],
      });
      const paths = result.map((f) => f.path).sort();
      expect(paths).toEqual(["src/api/handler.ts", "src/models/user.ts"]);
    });

    it("normalizes trailing slash in --include", () => {
      createFile("src/api/handler.ts", "export const h = 1;\n");
      createFile("src/models/user.ts", "export const u = 1;\n");

      const result = scanFiles(tmpDir, { include: ["src/api/"] });
      const paths = result.map((f) => f.path);
      expect(paths).toEqual(["src/api/handler.ts"]);
    });

    it("returns all files when --include is undefined", () => {
      createFile("src/api/handler.ts", "export const h = 1;\n");
      createFile("src/models/user.ts", "export const u = 1;\n");

      const result = scanFiles(tmpDir, {});
      expect(result).toHaveLength(2);
    });

    it("filters by ignorePatterns", () => {
      createFile("src/index.ts", "export const x = 1;\n");
      createFile("src/generated/types.ts", "export type T = string;\n");
      createFile("src/generated/api.ts", "export const api = {};\n");

      const result = scanFiles(tmpDir, {
        ignorePatterns: ["src/generated/**"],
      });
      const paths = result.map((f) => f.path);
      expect(paths).toEqual(["src/index.ts"]);
    });

    it("does not fall back to TOML when ignorePatterns is empty array", () => {
      createFile("src/index.ts", "export const x = 1;\n");
      createFile("src/generated/types.ts", "export type T = string;\n");

      // Explicit empty array means "ignore nothing" — TOML fallback is NOT used
      const result = scanFiles(tmpDir, { ignorePatterns: [] });
      expect(result).toHaveLength(2);
    });

    it("applies --include before [ignore] (combined)", () => {
      createFile("src/api/handler.ts", "export const h = 1;\n");
      createFile("src/api/generated.ts", "export const g = 1;\n");
      createFile("src/models/user.ts", "export const u = 1;\n");

      const result = scanFiles(tmpDir, {
        include: ["src/api"],
        ignorePatterns: ["**/*generated*"],
      });
      const paths = result.map((f) => f.path);
      expect(paths).toEqual(["src/api/handler.ts"]);
    });
  });
});
