import { describe, it, expect } from "vitest";
import { parseAndExtract } from "./index.js";
import { makeFileNode } from "../testing/fixtures.js";

describe("parseAndExtract", () => {
  it("populates StructuralAnalysis with functions, classes, and imports", () => {
    const source = `import { something } from './other';

function greet(name: string): string {
  return "hello " + name;
}

class Greeter {
  say(): string {
    return "hi";
  }
}`;
    const node = makeFileNode();
    const result = parseAndExtract(node, source);

    expect(result.sa).toBeDefined();
    expect(result.sa?.functions.length).toBeGreaterThan(0);
    expect(result.sa?.classes.length).toBeGreaterThan(0);
    expect(result.sa?.imports.length).toBeGreaterThan(0);

    // Verify function extraction
    const greetFn = result.sa?.functions.find((f) => f.name === "greet");
    expect(greetFn).toBeDefined();
    expect(greetFn?.paramCount).toBe(1);

    // Verify class extraction
    const greeterClass = result.sa?.classes.find((c) => c.name === "Greeter");
    expect(greeterClass).toBeDefined();
    expect(greeterClass?.kind).toBe("class");

    // Verify import extraction
    const imp = result.sa?.imports.find((i) => i.specifier === "./other");
    expect(imp).toBeDefined();
  });

  it("computes cyclomatic complexity for functions", () => {
    const source = `function complex(x: number): string {
  if (x > 0) {
    if (x > 10) {
      return "big";
    }
    return "small";
  }
  return "negative";
}`;
    const node = makeFileNode();
    const result = parseAndExtract(node, source);

    const fn = result.sa?.functions.find((f) => f.name === "complex");
    expect(fn).toBeDefined();
    expect(fn?.cc).toBe(3); // 1 base + 2 if statements
  });

  it("updates funcs count on the returned FileNode", () => {
    const source = `function a() {}
function b() {}
function c() {}`;
    const node = makeFileNode();
    const result = parseAndExtract(node, source);

    expect(result.funcs).toBe(3);
  });

  it("handles invalid syntax without crashing", () => {
    const source = `const x: = = = {{{`;
    const node = makeFileNode();
    const result = parseAndExtract(node, source);

    // tree-sitter still produces a partial tree, so sa should exist
    expect(result.sa).toBeDefined();
  });

  it("handles empty source", () => {
    const source = "";
    const node = makeFileNode();
    const result = parseAndExtract(node, source);

    expect(result.sa).toBeDefined();
    expect(result.sa?.functions).toHaveLength(0);
    expect(result.sa?.classes).toHaveLength(0);
    expect(result.sa?.imports).toHaveLength(0);
    expect(result.funcs).toBe(0);
  });

  it("handles TSX files", () => {
    const source = `import React from 'react';
const App = () => <div>Hello</div>;`;
    const node = makeFileNode({ lang: "tsx", name: "app.tsx", path: "src/app.tsx" });
    const result = parseAndExtract(node, source);

    expect(result.sa).toBeDefined();
    expect(result.sa?.functions.length).toBeGreaterThanOrEqual(1);
    expect(result.sa?.imports.length).toBe(1);
  });

  it("preserves original FileNode fields", () => {
    const source = `function foo() {}`;
    const node = makeFileNode({
      path: "src/special.ts",
      name: "special.ts",
      lines: 42,
      logic: 30,
      comments: 10,
      blanks: 2,
    });
    const result = parseAndExtract(node, source);

    expect(result.path).toBe("src/special.ts");
    expect(result.name).toBe("special.ts");
    expect(result.lines).toBe(42);
    expect(result.logic).toBe(30);
    expect(result.comments).toBe(10);
    expect(result.blanks).toBe(2);
  });

  it("computes CC for class methods", () => {
    const source = `class Router {
  route(path: string): void {
    if (path === "/") {
      return;
    }
    if (path === "/about") {
      return;
    }
  }
}`;
    const node = makeFileNode();
    const result = parseAndExtract(node, source);

    const routeFn = result.sa?.functions.find((f) => f.name === "route");
    expect(routeFn).toBeDefined();
    expect(routeFn?.cc).toBe(3); // 1 base + 2 if statements
  });

  it("computes CC for multi-line arrow functions", () => {
    const source = `const handler =
  (req: string) => {
    if (req === "GET") {
      return "ok";
    }
    if (req === "POST") {
      return "created";
    }
    return "not found";
  };`;
    const node = makeFileNode();
    const result = parseAndExtract(node, source);

    const fn = result.sa?.functions.find((f) => f.name === "handler");
    expect(fn).toBeDefined();
    expect(fn?.cc).toBe(3); // 1 base + 2 if statements
  });
});
