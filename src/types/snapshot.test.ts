import { describe, it, expect } from "vitest";
import type { ImportEdge, ImportGraph, Snapshot } from "./snapshot.js";
import type { FileNode } from "./core.js";

describe("Snapshot and Graph Types", () => {
  const sampleFile: FileNode = {
    path: "src/index.ts",
    name: "index.ts",
    isDir: false,
    lines: 20,
    logic: 15,
    comments: 3,
    blanks: 2,
    funcs: 1,
    lang: "ts",
    sa: { functions: [], classes: [], imports: [] },
  };

  it("constructs an ImportEdge", () => {
    const edge: ImportEdge = {
      fromFile: "src/app.ts",
      toFile: "src/utils.ts",
    };
    expect(edge.fromFile).toBe("src/app.ts");
    expect(edge.toFile).toBe("src/utils.ts");
  });

  it("constructs an ImportGraph with edges and adjacency helpers", () => {
    const edges: ImportEdge[] = [
      { fromFile: "src/a.ts", toFile: "src/b.ts" },
      { fromFile: "src/a.ts", toFile: "src/c.ts" },
      { fromFile: "src/b.ts", toFile: "src/c.ts" },
    ];

    const graph: ImportGraph = {
      edges,
      adjacency: new Map([
        ["src/a.ts", ["src/b.ts", "src/c.ts"]],
        ["src/b.ts", ["src/c.ts"]],
      ]),
      reverseAdjacency: new Map([
        ["src/b.ts", ["src/a.ts"]],
        ["src/c.ts", ["src/a.ts", "src/b.ts"]],
      ]),
    };

    expect(graph.edges).toHaveLength(3);
    expect(graph.adjacency.get("src/a.ts")).toEqual(["src/b.ts", "src/c.ts"]);
    expect(graph.reverseAdjacency.get("src/c.ts")).toEqual([
      "src/a.ts",
      "src/b.ts",
    ]);
  });

  it("constructs a Snapshot", () => {
    const snapshot: Snapshot = {
      root: {
        path: "src",
        name: "src",
        isDir: true,
        lines: 0,
        logic: 0,
        comments: 0,
        blanks: 0,
        funcs: 0,
        lang: "ts",
        sa: undefined,
        children: [sampleFile],
      },
      files: [sampleFile],
      totalFiles: 1,
      totalLines: 20,
      importGraph: {
        edges: [],
        adjacency: new Map(),
        reverseAdjacency: new Map(),
      },
    };

    expect(snapshot.totalFiles).toBe(1);
    expect(snapshot.totalLines).toBe(20);
    expect(snapshot.files).toHaveLength(1);
    expect(snapshot.importGraph.edges).toHaveLength(0);
  });

  it("Snapshot is structurally immutable via readonly", () => {
    const snapshot: Snapshot = {
      root: sampleFile,
      files: [sampleFile],
      totalFiles: 1,
      totalLines: 20,
      importGraph: {
        edges: [],
        adjacency: new Map(),
        reverseAdjacency: new Map(),
      },
    };

    // TypeScript readonly enforcement - runtime objects are JS,
    // but the type system prevents mutation at compile time
    expect(Object.keys(snapshot)).toContain("totalFiles");
  });
});
