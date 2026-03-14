import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { fsWalkFiles } from "./fs-walk.js";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

describe("fsWalkFiles", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sekko-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function createFile(relativePath: string, content = ""): void {
    const fullPath = path.join(tmpDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }

  it("finds ts and tsx files recursively", () => {
    createFile("src/index.ts");
    createFile("src/app.tsx");
    createFile("src/utils/helper.ts");

    const result = fsWalkFiles(tmpDir);

    expect(result.sort()).toEqual([
      "src/app.tsx",
      "src/index.ts",
      "src/utils/helper.ts",
    ]);
  });

  it("excludes non-typescript files", () => {
    createFile("src/index.ts");
    createFile("src/styles.css");
    createFile("package.json");
    createFile("README.md");

    const result = fsWalkFiles(tmpDir);

    expect(result).toEqual(["src/index.ts"]);
  });

  it("excludes node_modules directory", () => {
    createFile("src/index.ts");
    createFile("node_modules/lib/index.ts");

    const result = fsWalkFiles(tmpDir);

    expect(result).toEqual(["src/index.ts"]);
  });

  it("excludes dist directory", () => {
    createFile("src/index.ts");
    createFile("dist/index.ts");

    const result = fsWalkFiles(tmpDir);

    expect(result).toEqual(["src/index.ts"]);
  });

  it("excludes .git directory", () => {
    createFile("src/index.ts");
    createFile(".git/objects/pack.ts");

    const result = fsWalkFiles(tmpDir);

    expect(result).toEqual(["src/index.ts"]);
  });

  it("returns empty array for directory with no ts files", () => {
    createFile("README.md");
    createFile("package.json");

    const result = fsWalkFiles(tmpDir);

    expect(result).toEqual([]);
  });

  it("returns empty array for empty directory", () => {
    const result = fsWalkFiles(tmpDir);

    expect(result).toEqual([]);
  });

  it("handles deeply nested directories", () => {
    createFile("src/a/b/c/d/deep.ts");

    const result = fsWalkFiles(tmpDir);

    expect(result).toEqual(["src/a/b/c/d/deep.ts"]);
  });

  it("returns relative paths from the root directory", () => {
    createFile("index.ts");

    const result = fsWalkFiles(tmpDir);

    expect(result).toEqual(["index.ts"]);
    // Ensure no absolute paths leak
    expect(result.every((p) => !p.startsWith("/"))).toBe(true);
  });
});
