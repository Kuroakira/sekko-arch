import type { Tree } from "./ts-grammar.js";
import type { ClassInfo } from "../types/core.js";
import type Parser from "tree-sitter";

type SyntaxNode = Parser.SyntaxNode;

function extractBasesFromHeritage(heritage: SyntaxNode): string[] {
  const bases: string[] = [];
  for (const clause of heritage.namedChildren) {
    if (
      clause.type === "extends_clause" ||
      clause.type === "implements_clause"
    ) {
      for (const child of clause.namedChildren) {
        if (
          child.type === "identifier" ||
          child.type === "type_identifier"
        ) {
          bases.push(child.text);
        }
      }
    }
  }
  return bases;
}

function extractBasesFromExtendsTypeClause(clause: SyntaxNode): string[] {
  const bases: string[] = [];
  for (const child of clause.namedChildren) {
    if (child.type === "type_identifier") {
      bases.push(child.text);
    }
  }
  return bases;
}

function extractMethodNamesFromClassBody(body: SyntaxNode): string[] {
  return body.namedChildren
    .filter((m) => m.type === "method_definition")
    .map((m) => m.childForFieldName("name")?.text ?? "<anonymous>");
}

function extractMethodNamesFromInterfaceBody(body: SyntaxNode): string[] {
  return body.namedChildren
    .filter((m) => m.type === "method_signature")
    .map((m) => m.childForFieldName("name")?.text ?? "<anonymous>");
}

function extractClassDeclaration(node: SyntaxNode): ClassInfo {
  const nameNode = node.childForFieldName("name");
  const name = nameNode?.text ?? "<anonymous>";

  const heritage = node.namedChildren.find(
    (c) => c.type === "class_heritage",
  );
  const bases = heritage ? extractBasesFromHeritage(heritage) : [];

  const body = node.namedChildren.find((c) => c.type === "class_body");
  const methods = body ? extractMethodNamesFromClassBody(body) : [];

  return { name, methods, bases, kind: "class" };
}

function extractInterfaceDeclaration(node: SyntaxNode): ClassInfo {
  const nameNode = node.childForFieldName("name");
  const name = nameNode?.text ?? "<anonymous>";

  const extendsClause = node.namedChildren.find(
    (c) => c.type === "extends_type_clause",
  );
  const bases = extendsClause
    ? extractBasesFromExtendsTypeClause(extendsClause)
    : [];

  const body = node.namedChildren.find((c) => c.type === "interface_body");
  const methods = body ? extractMethodNamesFromInterfaceBody(body) : [];

  return { name, methods, bases, kind: "interface" };
}

function extractTypeAlias(node: SyntaxNode): ClassInfo {
  const nameNode = node.childForFieldName("name");
  const name = nameNode?.text ?? "<anonymous>";
  return { name, methods: [], bases: [], kind: "type-alias" };
}

const CLASS_LIKE_TYPES = new Set([
  "class_declaration",
  "interface_declaration",
  "type_alias_declaration",
]);

function extractClassLike(node: SyntaxNode): ClassInfo | null {
  switch (node.type) {
    case "class_declaration":
      return extractClassDeclaration(node);
    case "interface_declaration":
      return extractInterfaceDeclaration(node);
    case "type_alias_declaration":
      return extractTypeAlias(node);
    default:
      return null;
  }
}

export function extractClasses(tree: Tree): ClassInfo[] {
  const results: ClassInfo[] = [];
  const root = tree.rootNode;

  for (const node of root.namedChildren) {
    if (CLASS_LIKE_TYPES.has(node.type)) {
      const info = extractClassLike(node);
      if (info !== null) {
        results.push(info);
      }
      continue;
    }

    if (node.type === "export_statement") {
      const declaration = node.namedChildren.find((c) =>
        CLASS_LIKE_TYPES.has(c.type),
      );
      if (declaration) {
        const info = extractClassLike(declaration);
        if (info !== null) {
          results.push(info);
        }
      }
    }
  }

  return results;
}
