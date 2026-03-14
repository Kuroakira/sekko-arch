import { describe, it, expect } from "vitest";
import { computeHealth } from "./health.js";
import type { Snapshot, FileNode, ImportEdge } from "../types/index.js";

function makeFile(
  path: string,
  overrides?: Partial<Pick<FileNode, "sa" | "lines">>,
): FileNode {
  const name = path.split("/").pop() ?? path;
  return {
    path,
    name,
    isDir: false,
    lines: overrides?.lines ?? 10,
    logic: 8,
    comments: 1,
    blanks: 1,
    funcs: 0,
    lang: "ts",
    sa: overrides?.sa ?? { functions: [], classes: [], imports: [] },
  };
}

function makeSnapshot(
  files: readonly FileNode[],
  edges: readonly ImportEdge[],
): Snapshot {
  const adjacency = new Map<string, string[]>();
  const reverseAdjacency = new Map<string, string[]>();

  for (const f of files) {
    adjacency.set(f.path, []);
    reverseAdjacency.set(f.path, []);
  }

  for (const edge of edges) {
    const fwd = adjacency.get(edge.fromFile);
    if (fwd) fwd.push(edge.toFile);
    const rev = reverseAdjacency.get(edge.toFile);
    if (rev) rev.push(edge.fromFile);
  }

  const totalLines = files.reduce((sum, f) => sum + f.lines, 0);

  return {
    root: files[0] ?? makeFile("root"),
    files,
    totalFiles: files.length,
    totalLines,
    importGraph: { edges, adjacency, reverseAdjacency },
  };
}

describe("computeHealth", () => {
  it("returns a HealthReport with all 7 dimensions for a minimal snapshot", () => {
    const files = [
      makeFile("src/auth/login.ts"),
      makeFile("src/auth/signup.ts"),
      makeFile("src/utils/helpers.ts"),
    ];
    const edges: ImportEdge[] = [
      { fromFile: "src/auth/login.ts", toFile: "src/utils/helpers.ts" },
      { fromFile: "src/auth/signup.ts", toFile: "src/utils/helpers.ts" },
    ];
    const snapshot = makeSnapshot(files, edges);

    const report = computeHealth(snapshot);

    expect(report.fileCount).toBe(3);
    expect(report.compositeGrade).toMatch(/^[ABCDF]$/);
    expect(report.scanDurationMs).toBeGreaterThanOrEqual(0);

    const dimensionNames = Object.keys(report.dimensions);
    expect(dimensionNames).toContain("cycles");
    expect(dimensionNames).toContain("coupling");
    expect(dimensionNames).toContain("depth");
    expect(dimensionNames).toContain("godFiles");
    expect(dimensionNames).toContain("complexFn");
    expect(dimensionNames).toContain("levelization");
    expect(dimensionNames).toContain("blastRadius");

    for (const dim of Object.values(report.dimensions)) {
      expect(dim.grade).toMatch(/^[ABCDF]$/);
      expect(typeof dim.rawValue).toBe("number");
      expect(dim.name).toMatch(
        /^(cycles|coupling|depth|godFiles|complexFn|levelization|blastRadius)$/,
      );
    }
  });

  it("returns all A grades for an empty snapshot", () => {
    const snapshot = makeSnapshot([], []);

    const report = computeHealth(snapshot);

    expect(report.fileCount).toBe(0);
    expect(report.dimensions.cycles.rawValue).toBe(0);
    expect(report.dimensions.cycles.grade).toBe("A");
    expect(report.dimensions.coupling.rawValue).toBe(0);
    expect(report.dimensions.coupling.grade).toBe("A");
    expect(report.dimensions.depth.rawValue).toBe(0);
    expect(report.dimensions.depth.grade).toBe("A");
    expect(report.dimensions.godFiles.rawValue).toBe(0);
    expect(report.dimensions.godFiles.grade).toBe("A");
    expect(report.dimensions.complexFn.rawValue).toBe(0);
    expect(report.dimensions.complexFn.grade).toBe("A");
    expect(report.dimensions.levelization.rawValue).toBe(0);
    expect(report.dimensions.levelization.grade).toBe("A");
    expect(report.dimensions.blastRadius.rawValue).toBe(0);
    expect(report.dimensions.blastRadius.grade).toBe("A");
    expect(report.compositeGrade).toBe("A");
  });

  it("detects cycles and grades them correctly", () => {
    const files = [
      makeFile("src/a/foo.ts"),
      makeFile("src/b/bar.ts"),
      makeFile("src/c/baz.ts"),
    ];
    const edges: ImportEdge[] = [
      { fromFile: "src/a/foo.ts", toFile: "src/b/bar.ts" },
      { fromFile: "src/b/bar.ts", toFile: "src/c/baz.ts" },
      { fromFile: "src/c/baz.ts", toFile: "src/a/foo.ts" },
    ];
    const snapshot = makeSnapshot(files, edges);

    const report = computeHealth(snapshot);

    expect(report.dimensions.cycles.rawValue).toBeGreaterThan(0);
    // 1 cycle => grade B
    expect(report.dimensions.cycles.grade).toBe("B");
  });

  it("correctly gathers complex functions from file sa data", () => {
    const complexFn = {
      name: "complexOne",
      startLine: 1,
      endLine: 50,
      lineCount: 50,
      cc: 20,
      paramCount: 3,
    };
    const simpleFn = {
      name: "simpleOne",
      startLine: 1,
      endLine: 5,
      lineCount: 5,
      cc: 1,
      paramCount: 0,
    };

    const files = [
      makeFile("src/mod/a.ts", {
        sa: { functions: [complexFn], classes: [], imports: [] },
      }),
      makeFile("src/mod/b.ts", {
        sa: { functions: [simpleFn], classes: [], imports: [] },
      }),
    ];
    const snapshot = makeSnapshot(files, []);

    const report = computeHealth(snapshot);

    // 1 complex out of 2 total => ratio 0.5
    expect(report.dimensions.complexFn.rawValue).toBe(0.5);
    expect(report.dimensions.complexFn.grade).toBe("F");
  });

  it("identifies foundation files for blast radius exclusion", () => {
    // Create a highly depended-upon barrel file (index.ts) + other files
    const files = [
      makeFile("src/lib/index.ts"),
      makeFile("src/a/one.ts"),
      makeFile("src/b/two.ts"),
      makeFile("src/c/three.ts"),
    ];
    // All files depend on index.ts
    const edges: ImportEdge[] = [
      { fromFile: "src/a/one.ts", toFile: "src/lib/index.ts" },
      { fromFile: "src/b/two.ts", toFile: "src/lib/index.ts" },
      { fromFile: "src/c/three.ts", toFile: "src/lib/index.ts" },
    ];
    const snapshot = makeSnapshot(files, edges);

    const report = computeHealth(snapshot);

    // index.ts is a barrel file (foundation) and has fan-in 3, so it should be excluded
    // from blast radius max. The non-foundation files have 0 reverse reachability.
    expect(report.dimensions.blastRadius.rawValue).toBeLessThanOrEqual(0.1);
    expect(report.dimensions.blastRadius.grade).toBe("A");
  });

  it("populates details for cycles dimension", () => {
    const files = [
      makeFile("src/a/foo.ts"),
      makeFile("src/b/bar.ts"),
      makeFile("src/c/baz.ts"),
    ];
    const edges: ImportEdge[] = [
      { fromFile: "src/a/foo.ts", toFile: "src/b/bar.ts" },
      { fromFile: "src/b/bar.ts", toFile: "src/c/baz.ts" },
      { fromFile: "src/c/baz.ts", toFile: "src/a/foo.ts" },
    ];
    const snapshot = makeSnapshot(files, edges);

    const report = computeHealth(snapshot);

    expect(report.dimensions.cycles.details).toBeDefined();
    const details = report.dimensions.cycles.details as {
      cycles: string[][];
    };
    expect(details.cycles).toHaveLength(1);
    expect(details.cycles[0]).toHaveLength(3);
  });

  it("populates details for godFiles dimension", () => {
    // Create a file with fan-out > 15 (non-entry-point)
    const targets: FileNode[] = [];
    const edges: ImportEdge[] = [];
    for (let i = 0; i < 16; i++) {
      const target = makeFile(`src/lib/dep${i}.ts`);
      targets.push(target);
      edges.push({
        fromFile: "src/app/god.ts",
        toFile: target.path,
      });
    }
    const godFile = makeFile("src/app/god.ts");
    const files = [godFile, ...targets];
    const snapshot = makeSnapshot(files, edges);

    const report = computeHealth(snapshot);

    expect(report.dimensions.godFiles.details).toBeDefined();
    const details = report.dimensions.godFiles.details as {
      files: string[];
      count: number;
    };
    expect(details.files).toContain("src/app/god.ts");
    expect(details.count).toBeGreaterThanOrEqual(1);
  });

  it("populates details for all dimensions", () => {
    const files = [
      makeFile("src/auth/login.ts"),
      makeFile("src/utils/helpers.ts"),
    ];
    const edges: ImportEdge[] = [
      { fromFile: "src/auth/login.ts", toFile: "src/utils/helpers.ts" },
    ];
    const snapshot = makeSnapshot(files, edges);

    const report = computeHealth(snapshot);

    for (const dim of Object.values(report.dimensions)) {
      expect(dim.details).toBeDefined();
    }
  });

  it("populates fileCount from snapshot", () => {
    const files = [
      makeFile("src/a.ts"),
      makeFile("src/b.ts"),
      makeFile("src/c.ts"),
      makeFile("src/d.ts"),
      makeFile("src/e.ts"),
    ];
    const snapshot = makeSnapshot(files, []);

    const report = computeHealth(snapshot);

    expect(report.fileCount).toBe(5);
  });
});
