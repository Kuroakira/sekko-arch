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
import { DIMENSION_NAMES } from "../dimensions.js";

export function makeDimension(
  name: DimensionName,
  rawValue: number,
  grade: Grade = "A",
  details?: Record<string, unknown>,
): DimensionResult {
  return { name, rawValue, grade, details };
}

const DEFAULT_RAW_VALUES: Readonly<Record<DimensionName, number>> = {
  cycles: 0,
  coupling: 0.15,
  depth: 3,
  godFiles: 0,
  complexFn: 0.02,
  levelization: 0,
  blastRadius: 0.08,
  cohesion: 0.2,
  entropy: 0.3,
  cognitiveComplexity: 0.01,
  hotspots: 0,
  longFunctions: 0.03,
  largeFiles: 0.03,
  highParams: 0.02,
  duplication: 0.005,
  deadCode: 0.02,
  comments: 0.85,
  distanceFromMainSeq: 0.15,
  attackSurface: 0.25,
};

export function makeAllDimensionGrades(
  grade: Grade,
): DimensionGrades {
  const result = {} as Record<DimensionName, DimensionResult>;
  for (const name of DIMENSION_NAMES) {
    result[name] = makeDimension(name, 0, grade);
  }
  return result as DimensionGrades;
}

export function makeHealth(
  overrides?: Partial<HealthReport>,
): HealthReport {
  const dimensions = {} as Record<DimensionName, DimensionResult>;
  for (const name of DIMENSION_NAMES) {
    dimensions[name] = makeDimension(name, DEFAULT_RAW_VALUES[name], "A");
  }
  return {
    dimensions: dimensions as DimensionGrades,
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
    bodyHash: "default-hash",
    cognitiveComplexity: 0,
    ...overrides,
  };
}

export function makeImportEdge(
  overrides?: Partial<ImportEdge>,
): ImportEdge {
  return {
    fromFile: "src/module-a/file1.ts",
    toFile: "src/module-b/file2.ts",
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
