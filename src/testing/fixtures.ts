import type {
  DimensionName,
  DimensionResult,
  DimensionGrades,
  Grade,
  HealthReport,
  FileNode,
  FuncInfo,
  ImportEdge,
  Snapshot,
} from "../types/index.js";

export function makeDimension(
  name: DimensionName,
  rawValue: number,
  grade: Grade = "A",
  details?: Record<string, unknown>,
): DimensionResult {
  return { name, rawValue, grade, details };
}

export function makeAllDimensionGrades(
  grade: Grade,
): DimensionGrades {
  return {
    cycles: makeDimension("cycles", 0, grade),
    coupling: makeDimension("coupling", 0, grade),
    depth: makeDimension("depth", 0, grade),
    godFiles: makeDimension("godFiles", 0, grade),
    complexFn: makeDimension("complexFn", 0, grade),
    levelization: makeDimension("levelization", 0, grade),
    blastRadius: makeDimension("blastRadius", 0, grade),
  };
}

export function makeHealth(
  overrides?: Partial<HealthReport>,
): HealthReport {
  return {
    dimensions: {
      cycles: makeDimension("cycles", 0, "A"),
      coupling: makeDimension("coupling", 0.15, "A"),
      depth: makeDimension("depth", 3, "A"),
      godFiles: makeDimension("godFiles", 0, "A"),
      complexFn: makeDimension("complexFn", 0.02, "A"),
      levelization: makeDimension("levelization", 0, "A"),
      blastRadius: makeDimension("blastRadius", 0.08, "A"),
    },
    compositeGrade: "A",
    fileCount: 42,
    scanDurationMs: 150,
    ...overrides,
  };
}

export function makeAdj(
  edges: [string, string][],
): ReadonlyMap<string, readonly string[]> {
  const adj = new Map<string, string[]>();
  for (const [from, to] of edges) {
    if (!adj.has(from)) adj.set(from, []);
    if (!adj.has(to)) adj.set(to, []);
    adj.get(from)?.push(to);
  }
  return adj;
}

export function makeRevAdj(
  edges: [string, string][],
): ReadonlyMap<string, readonly string[]> {
  const rev = new Map<string, string[]>();
  for (const [from, to] of edges) {
    if (!rev.has(from)) rev.set(from, []);
    if (!rev.has(to)) rev.set(to, []);
    rev.get(to)?.push(from);
  }
  return rev;
}

export function makeFileNode(
  overrides: Partial<FileNode> & { path?: string } = {},
): FileNode {
  const path = overrides.path ?? "src/example.ts";
  return {
    path,
    name: overrides.name ?? (path.split("/").pop() ?? path),
    isDir: false,
    lines: 10,
    logic: 8,
    comments: 1,
    blanks: 1,
    funcs: 0,
    lang: "ts",
    sa: undefined,
    ...overrides,
  };
}

export function makeFileNodeWithImports(
  path: string,
  imports: { specifier: string; resolved: string | null }[],
): FileNode {
  return makeFileNode({
    path,
    sa: {
      functions: [],
      classes: [],
      imports,
    },
    funcs: 0,
  });
}

export function makeFuncInfo(
  overrides: Partial<FuncInfo> & { name?: string } = {},
): FuncInfo {
  return {
    name: "fn",
    startLine: 1,
    endLine: 10,
    lineCount: 10,
    cc: 1,
    paramCount: 1,
    ...overrides,
  };
}

export function makeSnapshot(
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
    root: files[0] ?? makeFileNode({ path: "root" }),
    files,
    totalFiles: files.length,
    totalLines,
    importGraph: { edges, adjacency, reverseAdjacency },
  };
}
