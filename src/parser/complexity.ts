import type Parser from "tree-sitter";

const BRANCH_NODE_TYPES: ReadonlySet<string> = new Set([
  "if_statement",
  "for_statement",
  "for_in_statement",
  "while_statement",
  "do_statement",
  "switch_case",
  "switch_default",
  "catch_clause",
  "ternary_expression",
]);

const LOGICAL_OPERATORS: ReadonlySet<string> = new Set(["&&", "||", "??"]);

export function computeComplexity(node: Parser.SyntaxNode): number {
  let complexity = 1;

  const stack: Parser.SyntaxNode[] = [];
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child) {
      stack.push(child);
    }
  }

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    if (BRANCH_NODE_TYPES.has(current.type)) {
      complexity += 1;
    }

    if (current.type === "binary_expression") {
      const operator = current.child(1);
      if (operator && LOGICAL_OPERATORS.has(operator.type)) {
        complexity += 1;
      }
    }

    for (let i = 0; i < current.childCount; i++) {
      const child = current.child(i);
      if (child) {
        stack.push(child);
      }
    }
  }

  return complexity;
}
