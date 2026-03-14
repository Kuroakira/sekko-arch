export type Language = "ts" | "tsx";

export type ClassKind = "class" | "interface" | "type-alias";

export interface FuncInfo {
  readonly name: string;
  readonly startLine: number;
  readonly endLine: number;
  readonly lineCount: number;
  readonly cc: number;
  readonly paramCount: number;
}

export interface ClassInfo {
  readonly name: string;
  readonly methods: readonly string[];
  readonly bases: readonly string[];
  readonly kind: ClassKind;
}

export interface ImportInfo {
  readonly specifier: string;
  readonly resolved: string | null;
}

export interface StructuralAnalysis {
  readonly functions: readonly FuncInfo[];
  readonly classes: readonly ClassInfo[];
  readonly imports: readonly ImportInfo[];
}

export interface FileNode {
  readonly path: string;
  readonly name: string;
  readonly isDir: boolean;
  readonly lines: number;
  readonly logic: number;
  readonly comments: number;
  readonly blanks: number;
  readonly funcs: number;
  readonly lang: Language;
  readonly sa: StructuralAnalysis | undefined;
  readonly children?: readonly FileNode[];
}
