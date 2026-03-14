import { describe, it, expect } from "vitest";
import { parseFile } from "./ts-grammar.js";

describe("parseFile", () => {
  it("parses valid TypeScript source and returns a tree", () => {
    const source = `const x: number = 42;
function greet(name: string): string {
  return "hello " + name;
}`;

    const tree = parseFile(source, "ts");

    expect(tree).toBeDefined();
    expect(tree?.rootNode.type).toBe("program");
    expect(tree?.rootNode.childCount).toBeGreaterThan(0);
  });

  it("parses valid TSX source", () => {
    const source = `const App = () => <div>Hello</div>;`;

    const tree = parseFile(source, "tsx");

    expect(tree).toBeDefined();
    expect(tree?.rootNode.type).toBe("program");
  });

  it("parses empty string as an empty program", () => {
    const tree = parseFile("", "ts");

    expect(tree).toBeDefined();
    expect(tree?.rootNode.childCount).toBe(0);
  });

  it("handles syntax errors gracefully without throwing", () => {
    const source = `const x: = = = {{{`;

    // tree-sitter produces partial parse trees even with errors
    const tree = parseFile(source, "ts");

    expect(tree).toBeDefined();
    expect(tree?.rootNode.hasError).toBe(true);
  });

  it("captures function declarations in the parse tree", () => {
    const source = `function add(a: number, b: number): number {
  return a + b;
}`;

    const tree = parseFile(source, "ts");

    expect(tree).toBeDefined();
    const root = tree?.rootNode;
    expect(root).toBeDefined();
    const funcNode = root?.child(0);
    expect(funcNode).toBeDefined();
    expect(funcNode?.type).toBe("function_declaration");
  });
});
