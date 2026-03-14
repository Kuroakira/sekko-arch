import { describe, it, expect } from "vitest";
import { parseFile } from "./ts-grammar.js";
import { extractImports } from "./extractors.js";

function parseTsSource(source: string) {
  const tree = parseFile(source, "ts");
  if (tree === null) {
    throw new Error("Failed to parse source");
  }
  return tree;
}

describe("extractImports", () => {
  it("extracts static named import", () => {
    const source = `import { foo } from './foo';`;
    const tree = parseTsSource(source);
    const imports = extractImports(tree);

    expect(imports).toHaveLength(1);
    expect(imports[0]?.specifier).toBe("./foo");
    expect(imports[0]?.resolved).toBeNull();
  });

  it("extracts static default import", () => {
    const source = `import React from 'react';`;
    const tree = parseTsSource(source);
    const imports = extractImports(tree);

    expect(imports).toHaveLength(1);
    expect(imports[0]?.specifier).toBe("react");
  });

  it("extracts static namespace import", () => {
    const source = `import * as path from 'path';`;
    const tree = parseTsSource(source);
    const imports = extractImports(tree);

    expect(imports).toHaveLength(1);
    expect(imports[0]?.specifier).toBe("path");
  });

  it("extracts re-export from", () => {
    const source = `export { bar } from './bar';`;
    const tree = parseTsSource(source);
    const imports = extractImports(tree);

    expect(imports).toHaveLength(1);
    expect(imports[0]?.specifier).toBe("./bar");
  });

  it("extracts export * from", () => {
    const source = `export * from './utils';`;
    const tree = parseTsSource(source);
    const imports = extractImports(tree);

    expect(imports).toHaveLength(1);
    expect(imports[0]?.specifier).toBe("./utils");
  });

  it("extracts dynamic import", () => {
    const source = `const mod = import('./lazy-module');`;
    const tree = parseTsSource(source);
    const imports = extractImports(tree);

    expect(imports).toHaveLength(1);
    expect(imports[0]?.specifier).toBe("./lazy-module");
  });

  it("extracts require call", () => {
    const source = `const fs = require('fs');`;
    const tree = parseTsSource(source);
    const imports = extractImports(tree);

    expect(imports).toHaveLength(1);
    expect(imports[0]?.specifier).toBe("fs");
  });

  it("extracts multiple imports from one file", () => {
    const source = `import { a } from './a';
import { b } from './b';
import { c } from './c';`;
    const tree = parseTsSource(source);
    const imports = extractImports(tree);

    expect(imports).toHaveLength(3);
    const specifiers = imports.map((i) => i.specifier);
    expect(specifiers).toContain("./a");
    expect(specifiers).toContain("./b");
    expect(specifiers).toContain("./c");
  });

  it("returns empty array for source with no imports", () => {
    const source = `const x = 1;
function foo() { return x; }`;
    const tree = parseTsSource(source);
    const imports = extractImports(tree);

    expect(imports).toHaveLength(0);
  });

  it("returns empty array for empty source", () => {
    const source = "";
    const tree = parseTsSource(source);
    const imports = extractImports(tree);

    expect(imports).toHaveLength(0);
  });

  it("extracts type import", () => {
    const source = `import type { Foo } from './types';`;
    const tree = parseTsSource(source);
    const imports = extractImports(tree);

    expect(imports).toHaveLength(1);
    expect(imports[0]?.specifier).toBe("./types");
  });

  it("deduplicates imports from the same specifier", () => {
    const source = `import { a } from './shared';
import { b } from './shared';`;
    const tree = parseTsSource(source);
    const imports = extractImports(tree);

    expect(imports).toHaveLength(1);
    expect(imports[0]?.specifier).toBe("./shared");
  });

  it("handles side-effect import", () => {
    const source = `import './polyfill';`;
    const tree = parseTsSource(source);
    const imports = extractImports(tree);

    expect(imports).toHaveLength(1);
    expect(imports[0]?.specifier).toBe("./polyfill");
  });
});
