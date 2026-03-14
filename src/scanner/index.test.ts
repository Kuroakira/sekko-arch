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
});
