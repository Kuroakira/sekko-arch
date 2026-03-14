import type Parser from "tree-sitter";
import { describe, it, expect } from "vitest";
import { parseFile } from "./ts-grammar.js";
import { computeComplexity } from "./complexity.js";

function getFunctionNode(source: string): Parser.SyntaxNode {
  const tree = parseFile(source, "ts");
  if (!tree) {
    throw new Error("Failed to parse source");
  }

  const stack: readonly Parser.SyntaxNode[] = [...tree.rootNode.children];
  const mutableStack = [...stack];

  while (mutableStack.length > 0) {
    const node = mutableStack.pop();
    if (!node) {
      break;
    }
    if (
      node.type === "function_declaration" ||
      node.type === "arrow_function" ||
      node.type === "method_definition"
    ) {
      return node;
    }
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child) {
        mutableStack.push(child);
      }
    }
  }

  throw new Error("No function node found in source");
}

describe("computeComplexity", () => {
  it("returns 1 for a linear function with no branches", () => {
    const source = `function foo() {
  const x = 1;
  const y = 2;
  return x + y;
}`;
    const node = getFunctionNode(source);
    expect(computeComplexity(node)).toBe(1);
  });

  it("returns 2 for a single if statement", () => {
    const source = `function foo(x: number) {
  if (x > 0) {
    return 1;
  }
  return 0;
}`;
    const node = getFunctionNode(source);
    expect(computeComplexity(node)).toBe(2);
  });

  it("returns 2 for if/else (else does not add complexity)", () => {
    const source = `function foo(x: number) {
  if (x > 0) {
    return 1;
  } else {
    return 0;
  }
}`;
    const node = getFunctionNode(source);
    expect(computeComplexity(node)).toBe(2);
  });

  it("returns 3 for if/else-if/else (two if_statements)", () => {
    const source = `function foo(x: number) {
  if (x > 0) {
    return 1;
  } else if (x < 0) {
    return -1;
  } else {
    return 0;
  }
}`;
    const node = getFunctionNode(source);
    expect(computeComplexity(node)).toBe(3);
  });

  it("returns 3 for nested if statements", () => {
    const source = `function foo(x: number, y: number) {
  if (x > 0) {
    if (y > 0) {
      return 1;
    }
  }
  return 0;
}`;
    const node = getFunctionNode(source);
    expect(computeComplexity(node)).toBe(3);
  });

  it("returns 2 for a for loop", () => {
    const source = `function foo(items: number[]) {
  for (let i = 0; i < items.length; i++) {
    console.log(items[i]);
  }
}`;
    const node = getFunctionNode(source);
    expect(computeComplexity(node)).toBe(2);
  });

  it("returns 2 for a while loop", () => {
    const source = `function foo(x: number) {
  while (x > 0) {
    x--;
  }
}`;
    const node = getFunctionNode(source);
    expect(computeComplexity(node)).toBe(2);
  });

  it("returns 4 for switch with 3 cases (1 base + 3 cases)", () => {
    const source = `function foo(x: number) {
  switch (x) {
    case 1:
      return "one";
    case 2:
      return "two";
    default:
      return "other";
  }
}`;
    const node = getFunctionNode(source);
    expect(computeComplexity(node)).toBe(4);
  });

  it("returns 2 for try/catch", () => {
    const source = `function foo() {
  try {
    doSomething();
  } catch (e) {
    handleError(e);
  }
}`;
    const node = getFunctionNode(source);
    expect(computeComplexity(node)).toBe(2);
  });

  it("returns 2 for a ternary expression", () => {
    const source = `function foo(x: number) {
  return x > 0 ? "positive" : "non-positive";
}`;
    const node = getFunctionNode(source);
    expect(computeComplexity(node)).toBe(2);
  });

  it("returns 3 for boolean operators: a && b || c", () => {
    const source = `function foo(a: boolean, b: boolean, c: boolean) {
  return a && b || c;
}`;
    const node = getFunctionNode(source);
    expect(computeComplexity(node)).toBe(3);
  });

  it("returns 2 for nullish coalescing: a ?? b", () => {
    const source = `function foo(a: number | null) {
  return a ?? 0;
}`;
    const node = getFunctionNode(source);
    expect(computeComplexity(node)).toBe(2);
  });

  it("computes correct complexity for a complex function", () => {
    const source = `function process(items: number[]) {
  if (items.length === 0) {
    return [];
  }

  const results: number[] = [];

  for (const item of items) {
    if (item > 0) {
      try {
        const val = item ?? 0;
        results.push(val > 10 ? val : val * 2);
      } catch (e) {
        console.error(e);
      }
    } else if (item < 0) {
      results.push(0);
    }
  }

  return results;
}`;
    // Base: 1
    // if (items.length === 0): +1 = 2
    // for...of: +1 = 3
    // if (item > 0): +1 = 4
    // ??: +1 = 5
    // ternary: +1 = 6
    // catch: +1 = 7
    // else if (item < 0) -- the inner if_statement: +1 = 8
    const node = getFunctionNode(source);
    expect(computeComplexity(node)).toBe(8);
  });

  it("returns 1 for an empty function body", () => {
    const source = `function noop() {}`;
    const node = getFunctionNode(source);
    expect(computeComplexity(node)).toBe(1);
  });

  it("returns 2 for a for...of loop", () => {
    const source = `function foo(items: string[]) {
  for (const item of items) {
    console.log(item);
  }
}`;
    const node = getFunctionNode(source);
    expect(computeComplexity(node)).toBe(2);
  });

  it("returns 2 for a do...while loop", () => {
    const source = `function foo(x: number) {
  do {
    x--;
  } while (x > 0);
}`;
    const node = getFunctionNode(source);
    expect(computeComplexity(node)).toBe(2);
  });

  it("works with arrow functions", () => {
    const source = `const foo = (x: number) => {
  if (x > 0) {
    return x;
  }
  return 0;
};`;
    const node = getFunctionNode(source);
    expect(computeComplexity(node)).toBe(2);
  });
});
