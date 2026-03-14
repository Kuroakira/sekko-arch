import type { Tree } from "./ts-grammar.js";
import type { ImportInfo } from "../types/core.js";
import type Parser from "tree-sitter";

type SyntaxNode = Parser.SyntaxNode;

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
    if (node.type === "import_statement") {
      const specifier = findSourceString(node);
      if (specifier && !seen.has(specifier)) {
        seen.add(specifier);
        results.push({ specifier, resolved: null });
      }
      continue;
    }

    if (node.type === "export_statement") {
      const specifier = findSourceString(node);
      if (specifier && !seen.has(specifier)) {
        seen.add(specifier);
        results.push({ specifier, resolved: null });
      }
      continue;
    }

    collectDynamicImportsAndRequires(node, seen, results);
  }

  return results;
}
