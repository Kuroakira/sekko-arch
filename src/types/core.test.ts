import { describe, it, expect } from "vitest";
import type {
  FuncInfo,
  ClassInfo,
  ImportInfo,
  StructuralAnalysis,
  FileNode,
  Language,
} from "./core.js";

describe("Core Types", () => {
  it("constructs a FuncInfo", () => {
    const func: FuncInfo = {
      name: "handleRequest",
      startLine: 10,
      endLine: 25,
      lineCount: 16,
      cc: 3,
      paramCount: 2,
      bodyHash: "abc123",
      cognitiveComplexity: 5,
    };
    expect(func.name).toBe("handleRequest");
    expect(func.cc).toBe(3);
    expect(func.bodyHash).toBe("abc123");
    expect(func.cognitiveComplexity).toBe(5);
  });

  it("constructs a ClassInfo", () => {
    const cls: ClassInfo = {
      name: "UserService",
      methods: ["getUser", "createUser"],
      bases: ["BaseService"],
      kind: "class",
    };
    expect(cls.kind).toBe("class");
    expect(cls.methods).toHaveLength(2);
  });

  it("constructs ClassInfo with interface and type-alias kinds", () => {
    const iface: ClassInfo = {
      name: "IUserRepo",
      methods: ["find"],
      bases: [],
      kind: "interface",
    };
    const alias: ClassInfo = {
      name: "UserId",
      methods: [],
      bases: [],
      kind: "type-alias",
    };
    expect(iface.kind).toBe("interface");
    expect(alias.kind).toBe("type-alias");
  });

  it("constructs an ImportInfo", () => {
    const imp: ImportInfo = {
      specifier: "./auth/login.js",
      resolved: "src/auth/login.ts",
    };
    expect(imp.specifier).toBe("./auth/login.js");
  });

  it("constructs ImportInfo with unresolved import", () => {
    const imp: ImportInfo = {
      specifier: "express",
      resolved: null,
    };
    expect(imp.resolved).toBeNull();
  });

  it("constructs a StructuralAnalysis", () => {
    const sa: StructuralAnalysis = {
      functions: [
        {
          name: "main",
          startLine: 1,
          endLine: 10,
          lineCount: 10,
          cc: 1,
          paramCount: 0,
          bodyHash: "main-hash",
          cognitiveComplexity: 0,
        },
      ],
      classes: [],
      imports: [{ specifier: "./utils.js", resolved: "src/utils.ts" }],
    };
    expect(sa.functions).toHaveLength(1);
    expect(sa.imports).toHaveLength(1);
  });

  it("constructs a FileNode with all fields", () => {
    const node: FileNode = {
      path: "src/auth/login.ts",
      name: "login.ts",
      isDir: false,
      lines: 100,
      logic: 70,
      comments: 20,
      blanks: 10,
      funcs: 5,
      lang: "ts",
      sa: {
        functions: [],
        classes: [],
        imports: [],
      },
    };
    expect(node.path).toBe("src/auth/login.ts");
    expect(node.lang).toBe("ts");
    expect(node.lines).toBe(100);
    expect(node.logic + node.comments + node.blanks).toBe(node.lines);
  });

  it("constructs a FileNode without structural analysis", () => {
    const node: FileNode = {
      path: "src/index.ts",
      name: "index.ts",
      isDir: false,
      lines: 5,
      logic: 5,
      comments: 0,
      blanks: 0,
      funcs: 0,
      lang: "ts",
      sa: undefined,
    };
    expect(node.sa).toBeUndefined();
  });

  it("constructs a directory FileNode with children", () => {
    const child: FileNode = {
      path: "src/auth/login.ts",
      name: "login.ts",
      isDir: false,
      lines: 50,
      logic: 40,
      comments: 5,
      blanks: 5,
      funcs: 2,
      lang: "ts",
      sa: undefined,
    };
    const dir: FileNode = {
      path: "src/auth",
      name: "auth",
      isDir: true,
      lines: 0,
      logic: 0,
      comments: 0,
      blanks: 0,
      funcs: 0,
      lang: "ts",
      sa: undefined,
      children: [child],
    };
    expect(dir.isDir).toBe(true);
    expect(dir.children).toHaveLength(1);
  });

  it("Language type accepts ts and tsx", () => {
    const langs: Language[] = ["ts", "tsx"];
    expect(langs).toHaveLength(2);
  });
});
