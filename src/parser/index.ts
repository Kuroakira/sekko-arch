import type { FileNode, StructuralAnalysis, FuncInfo } from "../types/core.js";
import { parseFile } from "./ts-grammar.js";
import { extractFunctions, extractClasses, extractImports } from "./extractors.js";
import { computeComplexity } from "./complexity.js";
import type Parser from "tree-sitter";

const FUNCTION_NODE_TYPES = new Set([
  "function_declaration",
  "generator_function_declaration",
  "arrow_function",
  "method_definition",
]);

const VARIABLE_DECL_TYPES = new Set([
  "lexical_declaration",
  "variable_declaration",
]);

function findArrowInDeclaration(node: Parser.SyntaxNode): Parser.SyntaxNode | null {
  for (const child of node.namedChildren) {
    if (child.type === "variable_declarator") {
      const value = child.childForFieldName("value");
      if (value?.type === "arrow_function") return value;
    }
  }
  return null;
}

function findFunctionNode(
  root: Parser.SyntaxNode,
  funcInfo: FuncInfo,
): Parser.SyntaxNode | null {
  const targetStartRow = funcInfo.startLine - 1; // convert 1-based to 0-based

  const stack: Parser.SyntaxNode[] = [...root.namedChildren];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) continue;

    if (node.startPosition.row === targetStartRow) {
      if (FUNCTION_NODE_TYPES.has(node.type)) {
        return node;
      }
      // Arrow functions use parent declaration's startLine
      if (VARIABLE_DECL_TYPES.has(node.type)) {
        const arrow = findArrowInDeclaration(node);
        if (arrow) return arrow;
      }
    }

    for (const child of node.namedChildren) {
      stack.push(child);
    }
  }

  return null;
}

function enrichFunctions(
  functions: readonly FuncInfo[],
  root: Parser.SyntaxNode,
): FuncInfo[] {
  return functions.map((fn) => {
    const node = findFunctionNode(root, fn);
    if (!node) return fn;
    const cc = computeComplexity(node);
    return { ...fn, cc };
  });
}

export function parseAndExtract(fileNode: FileNode, source: string): FileNode {
  const tree = parseFile(source, fileNode.lang);
  if (!tree) {
    console.warn(`Warning: failed to parse ${fileNode.path} (skipping structural analysis)`);
    return { ...fileNode, sa: undefined };
  }

  const root = tree.rootNode;
  const rawFunctions = extractFunctions(tree);
  const functions = enrichFunctions(rawFunctions, root);
  const classes = extractClasses(tree);
  const imports = extractImports(tree);

  const sa: StructuralAnalysis = { functions, classes, imports };

  return {
    ...fileNode,
    funcs: functions.length,
    sa,
  };
}
