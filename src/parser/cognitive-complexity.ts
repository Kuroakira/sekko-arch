import type Parser from "tree-sitter";

type SyntaxNode = Parser.SyntaxNode;

const NESTING_TYPES_EXCLUDING_IF = new Set([
  "for_statement",
  "for_in_statement",
  "while_statement",
  "do_statement",
  "switch_statement",
  "catch_clause",
  "ternary_expression",
]);

const LOGICAL_OPERATORS = new Set(["&&", "||", "??"]);

function collectLogicalOperators(
  node: SyntaxNode,
  operators: string[],
): void {
  if (node.type === "binary_expression") {
    const operator = node.child(1);
    if (operator && LOGICAL_OPERATORS.has(operator.type)) {
      const left = node.child(0);
      const right = node.child(2);
      if (left) collectLogicalOperators(left, operators);
      operators.push(operator.type);
      if (right) collectLogicalOperators(right, operators);
      return;
    }
  }
}

function collectBooleanComplexity(node: SyntaxNode): number {
  const operators: string[] = [];
  collectLogicalOperators(node, operators);

  let complexity = 0;
  let lastOp: string | null = null;
  for (const op of operators) {
    if (lastOp === null || op !== lastOp) {
      complexity += 1;
      lastOp = op;
    }
  }
  return complexity;
}

function walkIfChain(ifNode: SyntaxNode, nesting: number): number {
  let complexity = 0;

  const condition = ifNode.childForFieldName("condition");
  if (condition) complexity += walk(condition, nesting);

  const consequence = ifNode.childForFieldName("consequence");
  if (consequence) complexity += walk(consequence, nesting + 1);

  const alternative = ifNode.childForFieldName("alternative");
  if (alternative) {
    complexity += 1;
    const content = alternative.namedChildren[0];
    if (content?.type === "if_statement") {
      complexity += walkIfChain(content, nesting);
    } else if (content) {
      complexity += walk(content, nesting + 1);
    }
  }

  return complexity;
}

function walk(node: SyntaxNode, nesting: number): number {
  let complexity = 0;

  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (!child) continue;

    if (child.type === "if_statement") {
      complexity += 1 + nesting;
      complexity += walkIfChain(child, nesting);
      continue;
    }

    if (NESTING_TYPES_EXCLUDING_IF.has(child.type)) {
      complexity += 1 + nesting;
      complexity += walk(child, nesting + 1);
      continue;
    }

    if (child.type === "binary_expression") {
      const operator = child.child(1);
      if (operator && LOGICAL_OPERATORS.has(operator.type)) {
        complexity += collectBooleanComplexity(child);
        for (let j = 0; j < child.childCount; j++) {
          const sub = child.child(j);
          if (!sub) continue;
          if (sub.type === "binary_expression") {
            const subOp = sub.child(1);
            if (!subOp || !LOGICAL_OPERATORS.has(subOp.type)) {
              complexity += walk(sub, nesting);
            }
          } else {
            complexity += walk(sub, nesting);
          }
        }
        continue;
      }
    }

    complexity += walk(child, nesting);
  }

  return complexity;
}

export function computeCognitiveComplexity(node: SyntaxNode): number {
  const body = node.childForFieldName("body");
  if (!body) return 0;
  return walk(body, 0);
}
