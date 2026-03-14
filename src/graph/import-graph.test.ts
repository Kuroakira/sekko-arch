import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildImportGraph } from "./import-graph.js";
import type { FileNode } from "../types/index.js";
import { makeFileNode, makeFileNodeWithImports } from "../testing/fixtures.js";

describe("buildImportGraph", () => {
  let tempDir: string;

  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), "archana-graph-"));
    mkdirSync(join(tempDir, "src", "auth"), { recursive: true });
    mkdirSync(join(tempDir, "src", "utils"), { recursive: true });
    writeFileSync(join(tempDir, "src", "auth", "login.ts"), "export const a = 1;");
    writeFileSync(join(tempDir, "src", "auth", "signup.ts"), "export const b = 2;");
    writeFileSync(join(tempDir, "src", "utils", "helpers.ts"), "export const c = 3;");
    writeFileSync(join(tempDir, "src", "index.ts"), "export const d = 4;");
  });

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("builds edges from resolved imports", () => {
    const files: FileNode[] = [
      makeFileNodeWithImports("src/auth/signup.ts", [
        { specifier: "./login.js", resolved: null },
      ]),
      makeFileNodeWithImports("src/auth/login.ts", []),
    ];

    const graph = buildImportGraph(files, tempDir);

    expect(graph.edges.length).toBeGreaterThanOrEqual(1);
    const edge = graph.edges.find(
      (e) => e.fromFile === "src/auth/signup.ts" && e.toFile === "src/auth/login.ts",
    );
    expect(edge).toBeDefined();
  });

  it("builds adjacency and reverse adjacency", () => {
    const files: FileNode[] = [
      makeFileNodeWithImports("src/auth/signup.ts", [
        { specifier: "./login.js", resolved: null },
      ]),
      makeFileNodeWithImports("src/auth/login.ts", []),
    ];

    const graph = buildImportGraph(files, tempDir);

    expect(graph.adjacency.get("src/auth/signup.ts")).toContain("src/auth/login.ts");
    expect(graph.reverseAdjacency.get("src/auth/login.ts")).toContain("src/auth/signup.ts");
  });

  it("excludes self-edges", () => {
    const files: FileNode[] = [
      makeFileNodeWithImports("src/index.ts", [
        { specifier: "./index.js", resolved: null },
      ]),
    ];

    const graph = buildImportGraph(files, tempDir);
    const selfEdge = graph.edges.find(
      (e) => e.fromFile === e.toFile,
    );
    expect(selfEdge).toBeUndefined();
  });

  it("deduplicates edges", () => {
    const files: FileNode[] = [
      makeFileNodeWithImports("src/auth/signup.ts", [
        { specifier: "./login.js", resolved: null },
        { specifier: "./login.js", resolved: null },
      ]),
      makeFileNodeWithImports("src/auth/login.ts", []),
    ];

    const graph = buildImportGraph(files, tempDir);
    const matchingEdges = graph.edges.filter(
      (e) => e.fromFile === "src/auth/signup.ts" && e.toFile === "src/auth/login.ts",
    );
    expect(matchingEdges).toHaveLength(1);
  });

  it("skips files without structural analysis", () => {
    const file = makeFileNode({ path: "src/broken.ts" });

    const graph = buildImportGraph([file], tempDir);
    expect(graph.edges).toHaveLength(0);
  });

  it("handles empty file list", () => {
    const graph = buildImportGraph([], tempDir);
    expect(graph.edges).toHaveLength(0);
    expect(graph.adjacency.size).toBe(0);
  });
});
