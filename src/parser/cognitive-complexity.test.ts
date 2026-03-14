import { describe, it, expect } from "vitest";
import { computeCognitiveComplexity } from "./cognitive-complexity.js";
import { parseFile } from "./ts-grammar.js";
import type Parser from "tree-sitter";

function getFunctionNode(source: string): Parser.SyntaxNode {
  const tree = parseFile(source, "ts");
  if (!tree) throw new Error("Failed to parse");
  const root = tree.rootNode;
  for (const child of root.namedChildren) {
    if (child.type === "function_declaration") return child;
    if (
      child.type === "export_statement" &&
      child.namedChildren[0]?.type === "function_declaration"
    ) {
      return child.namedChildren[0];
    }
  }
  throw new Error("No function found in source");
}

describe("computeCognitiveComplexity", () => {
  it("returns 0 for linear code", () => {
    const node = getFunctionNode(`function f() {
  const a = 1;
  const b = 2;
  return a + b;
}`);
    expect(computeCognitiveComplexity(node)).toBe(0);
  });

  it("returns 0 for empty function", () => {
    const node = getFunctionNode(`function f() {}`);
    expect(computeCognitiveComplexity(node)).toBe(0);
  });

  it("returns 1 for single if", () => {
    const node = getFunctionNode(`function f(x: number) {
  if (x > 0) {
    return x;
  }
}`);
    expect(computeCognitiveComplexity(node)).toBe(1);
  });

  it("returns 3 for nested if (1 + 1+1)", () => {
    const node = getFunctionNode(`function f(x: number) {
  if (x > 0) {       // +1
    if (x > 10) {     // +1 + 1 nesting
      return x;
    }
  }
}`);
    expect(computeCognitiveComplexity(node)).toBe(3);
  });

  it("handles if/for/while mixed nesting", () => {
    const node = getFunctionNode(`function f(x: number) {
  if (x > 0) {         // +1 (nesting 0)
    for (let i = 0; i < x; i++) {  // +1 + 1 (nesting 1)
      while (i > 0) {  // +1 + 2 (nesting 2)
        break;
      }
    }
  }
}`);
    // 1 + 2 + 3 = 6
    expect(computeCognitiveComplexity(node)).toBe(6);
  });

  it("increments +1 for else (no nesting penalty)", () => {
    const node = getFunctionNode(`function f(x: number) {
  if (x > 0) {    // +1
    return 1;
  } else {         // +1 (no nesting increment)
    return 0;
  }
}`);
    expect(computeCognitiveComplexity(node)).toBe(2);
  });

  it("handles else-if chain", () => {
    const node = getFunctionNode(`function f(x: number) {
  if (x > 10) {       // +1
    return "big";
  } else if (x > 0) { // +1 (else-if as single unit)
    return "small";
  } else {             // +1
    return "negative";
  }
}`);
    expect(computeCognitiveComplexity(node)).toBe(3);
  });

  it("increments +1 for switch (cases do NOT increment)", () => {
    const node = getFunctionNode(`function f(x: string) {
  switch (x) {     // +1
    case "a":
      return 1;
    case "b":
      return 2;
    default:
      return 0;
  }
}`);
    expect(computeCognitiveComplexity(node)).toBe(1);
  });

  it("increments +1 for operator change && to ||", () => {
    const node = getFunctionNode(`function f(a: boolean, b: boolean, c: boolean) {
  if (a && b || c) {  // +1 (if) + +1 (&&) + +1 (||)
    return true;
  }
}`);
    expect(computeCognitiveComplexity(node)).toBe(3);
  });

  it("increments +1 for same operator sequence (first occurrence only)", () => {
    const node = getFunctionNode(`function f(a: boolean, b: boolean, c: boolean) {
  if (a && b && c) {  // +1 (if) + +1 (&&, first occurrence)
    return true;
  }
}`);
    expect(computeCognitiveComplexity(node)).toBe(2);
  });

  it("handles catch clause with nesting", () => {
    const node = getFunctionNode(`function f() {
  try {
    doSomething();
  } catch (e) {      // +1
    if (e) {          // +1 + 1 (nesting)
      throw e;
    }
  }
}`);
    expect(computeCognitiveComplexity(node)).toBe(3);
  });

  it("handles ternary expression with nesting", () => {
    const node = getFunctionNode(`function f(x: number) {
  if (x > 0) {           // +1
    return x > 10 ? 1 : 0; // +1 + 1 (nesting)
  }
}`);
    expect(computeCognitiveComplexity(node)).toBe(3);
  });

  it("handles do-while", () => {
    const node = getFunctionNode(`function f() {
  do {              // +1
    doSomething();
  } while (true);
}`);
    expect(computeCognitiveComplexity(node)).toBe(1);
  });

  it("handles for-in statement", () => {
    const node = getFunctionNode(`function f(obj: Record<string, number>) {
  for (const key in obj) {  // +1
    if (obj[key] > 0) {     // +1 + 1 (nesting)
      return key;
    }
  }
}`);
    expect(computeCognitiveComplexity(node)).toBe(3);
  });
});
