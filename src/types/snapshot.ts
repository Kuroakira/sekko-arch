import type { FileNode } from "./core.js";

export interface ImportEdge {
  readonly fromFile: string;
  readonly toFile: string;
}

export interface ImportGraph {
  readonly edges: readonly ImportEdge[];
  readonly adjacency: ReadonlyMap<string, readonly string[]>;
  readonly reverseAdjacency: ReadonlyMap<string, readonly string[]>;
}

export interface Snapshot {
  readonly root: FileNode;
  readonly files: readonly FileNode[];
  readonly totalFiles: number;
  readonly totalLines: number;
  readonly importGraph: ImportGraph;
}
