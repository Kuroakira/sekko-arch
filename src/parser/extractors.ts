import type { Tree } from "./ts-grammar.js";
import type { FuncInfo, ClassInfo, ImportInfo } from "../types/core.js";
import type Parser from "tree-sitter";

type SyntaxNode = Parser.SyntaxNode;

function countParams(paramsNode: SyntaxNode | null): number {
  if (paramsNode === null) {
    return 0;
  }
  return paramsNode.namedChildren.length;
}

function makeFuncInfo(
  name: string,
  node: SyntaxNode,
  paramsNode: SyntaxNode | null,
): FuncInfo {
  const startLine = node.startPosition.row + 1;
  const endLine = node.endPosition.row + 1;
  return {
    name,
    startLine,
    endLine,
    lineCount: endLine - startLine + 1,
    cc: 1,
    paramCount: countParams(paramsNode),
  };
}

function extractFunctionFromDeclaration(node: SyntaxNode): FuncInfo {
  const nameNode = node.childForFieldName("name");
  const name = nameNode?.text ?? "<anonymous>";
  const params = node.childForFieldName("parameters");
  return makeFuncInfo(name, node, params);
}

function extractArrowFromDeclarator(
  declarator: SyntaxNode,
  parentNode: SyntaxNode,
): FuncInfo | null {
  const nameNode = declarator.childForFieldName("name");
  const value = declarator.childForFieldName("value");
  if (value?.type !== "arrow_function") {
    return null;
  }
  const name = nameNode?.text ?? "<anonymous>";
  const params = value.childForFieldName("parameters");
  return makeFuncInfo(name, parentNode, params);
}

function extractMethodsFromClassBody(body: SyntaxNode): FuncInfo[] {
  const results: FuncInfo[] = [];
  for (const member of body.namedChildren) {
    if (member.type === "method_definition") {
      const nameNode = member.childForFieldName("name");
      const name = nameNode?.text ?? "<anonymous>";
      const params = member.childForFieldName("parameters");
      results.push(makeFuncInfo(name, member, params));
    }
  }
  return results;
}

const FUNCTION_TYPES = new Set([
  "function_declaration",
  "generator_function_declaration",
]);

const VARIABLE_DECLARATION_TYPES = new Set([
  "lexical_declaration",
  "variable_declaration",
]);

export function extractFunctions(tree: Tree): FuncInfo[] {
  const results: FuncInfo[] = [];
  const root = tree.rootNode;

  for (const node of root.namedChildren) {
    if (FUNCTION_TYPES.has(node.type)) {
      results.push(extractFunctionFromDeclaration(node));
      continue;
    }

    if (VARIABLE_DECLARATION_TYPES.has(node.type)) {
      for (const child of node.namedChildren) {
        if (child.type === "variable_declarator") {
          const func = extractArrowFromDeclarator(child, node);
          if (func !== null) {
            results.push(func);
          }
        }
      }
      continue;
    }

    if (node.type === "class_declaration") {
      const body = node.namedChildren.find((c) => c.type === "class_body");
      if (body) {
        results.push(...extractMethodsFromClassBody(body));
      }
      continue;
    }

    if (node.type === "export_statement") {
      const declaration = node.namedChildren.find(
        (c) =>
          FUNCTION_TYPES.has(c.type) ||
          VARIABLE_DECLARATION_TYPES.has(c.type) ||
          c.type === "class_declaration",
      );
      if (declaration && FUNCTION_TYPES.has(declaration.type)) {
        results.push(extractFunctionFromDeclaration(declaration));
      } else if (
        declaration &&
        VARIABLE_DECLARATION_TYPES.has(declaration.type)
      ) {
        for (const child of declaration.namedChildren) {
          if (child.type === "variable_declarator") {
            const func = extractArrowFromDeclarator(child, declaration);
            if (func !== null) {
              results.push(func);
            }
          }
        }
      } else if (declaration?.type === "class_declaration") {
        const body = declaration.namedChildren.find(
          (c) => c.type === "class_body",
        );
        if (body) {
          results.push(...extractMethodsFromClassBody(body));
        }
      }
    }
  }

  return results;
}

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

function extractStringLiteral(node: SyntaxNode): string | null {
  const text = node.text;
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    return text.slice(1, -1);
  }
  return null;
}

function findSourceString(node: SyntaxNode): string | null {
  const source = node.childForFieldName("source");
  if (source?.type === "string") {
    const fragment = source.namedChildren.find(
      (c) => c.type === "string_fragment",
    );
    return fragment?.text ?? extractStringLiteral(source);
  }
  return null;
}

function extractSpecifierFromCallArgs(node: SyntaxNode): string | null {
  const args = node.childForFieldName("arguments");
  const firstArg = args?.namedChildren[0];
  if (firstArg?.type !== "string") return null;
  const fragment = firstArg.namedChildren.find(
    (c) => c.type === "string_fragment",
  );
  return fragment?.text ?? extractStringLiteral(firstArg);
}

function isDynamicImportOrRequire(fn: SyntaxNode | null): boolean {
  if (!fn) return false;
  return fn.type === "import" || (fn.type === "identifier" && fn.text === "require");
}

function collectDynamicImportsAndRequires(
  node: SyntaxNode,
  seen: Set<string>,
  results: ImportInfo[],
): void {
  const stack: SyntaxNode[] = [...node.namedChildren];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    if (current.type === "call_expression") {
      const fn = current.childForFieldName("function");
      if (isDynamicImportOrRequire(fn)) {
        const specifier = extractSpecifierFromCallArgs(current);
        if (specifier && !seen.has(specifier)) {
          seen.add(specifier);
          results.push({ specifier, resolved: null });
        }
      }
    }

    for (const child of current.namedChildren) {
      stack.push(child);
    }
  }
}

export function extractImports(tree: Tree): ImportInfo[] {
  const results: ImportInfo[] = [];
  const seen = new Set<string>();
  const root = tree.rootNode;

  for (const node of root.namedChildren) {
    // import ... from 'specifier'
    if (node.type === "import_statement") {
      const specifier = findSourceString(node);
      if (specifier && !seen.has(specifier)) {
        seen.add(specifier);
        results.push({ specifier, resolved: null });
      }
      continue;
    }

    // export { ... } from 'specifier' / export * from 'specifier'
    if (node.type === "export_statement") {
      const specifier = findSourceString(node);
      if (specifier && !seen.has(specifier)) {
        seen.add(specifier);
        results.push({ specifier, resolved: null });
      }
      continue;
    }

    // Dynamic imports and require() calls anywhere in the tree
    collectDynamicImportsAndRequires(node, seen, results);
  }

  return results;
}
