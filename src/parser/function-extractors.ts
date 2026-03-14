import { createHash } from "node:crypto";
import type { Tree } from "./ts-grammar.js";
import type { FuncInfo } from "../types/core.js";
import type Parser from "tree-sitter";

type SyntaxNode = Parser.SyntaxNode;

function computeBodyHash(node: SyntaxNode): string {
  const body = node.childForFieldName("body");
  const target = body ?? node;
  const text = target.text;
  const normalized = text
    .replace(/\/\/[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .trim();
  return createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

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
  bodyHashNode?: SyntaxNode,
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
    bodyHash: computeBodyHash(bodyHashNode ?? node),
    cognitiveComplexity: 0,
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
  return makeFuncInfo(name, parentNode, params, value);
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
