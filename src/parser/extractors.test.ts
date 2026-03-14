import { describe, it, expect } from "vitest";
import { parseFile } from "./ts-grammar.js";
import { extractFunctions, extractClasses } from "./extractors.js";

function parseTsSource(source: string) {
  const tree = parseFile(source, "ts");
  if (tree === null) {
    throw new Error("Failed to parse source");
  }
  return tree;
}

describe("extractFunctions", () => {
  it("extracts a named function declaration", () => {
    const source = `function greet(name: string): string {
  return "hello " + name;
}`;
    const tree = parseTsSource(source);
    const funcs = extractFunctions(tree);

    expect(funcs).toHaveLength(1);
    expect(funcs[0]?.name).toBe("greet");
    expect(funcs[0]?.startLine).toBe(1);
    expect(funcs[0]?.endLine).toBe(3);
    expect(funcs[0]?.lineCount).toBe(3);
    expect(funcs[0]?.paramCount).toBe(1);
    expect(funcs[0]?.cc).toBe(1);
  });

  it("extracts an arrow function assigned to const", () => {
    const source = `const add = (a: number, b: number) => {
  return a + b;
};`;
    const tree = parseTsSource(source);
    const funcs = extractFunctions(tree);

    expect(funcs).toHaveLength(1);
    expect(funcs[0]?.name).toBe("add");
    expect(funcs[0]?.startLine).toBe(1);
    expect(funcs[0]?.endLine).toBe(3);
    expect(funcs[0]?.lineCount).toBe(3);
    expect(funcs[0]?.paramCount).toBe(2);
    expect(funcs[0]?.cc).toBe(1);
  });

  it("extracts an async function", () => {
    const source = `async function fetchData(url: string) {
  return await fetch(url);
}`;
    const tree = parseTsSource(source);
    const funcs = extractFunctions(tree);

    expect(funcs).toHaveLength(1);
    expect(funcs[0]?.name).toBe("fetchData");
    expect(funcs[0]?.paramCount).toBe(1);
  });

  it("extracts a generator function", () => {
    const source = `function* range(start: number, end: number) {
  for (let i = start; i < end; i++) {
    yield i;
  }
}`;
    const tree = parseTsSource(source);
    const funcs = extractFunctions(tree);

    expect(funcs).toHaveLength(1);
    expect(funcs[0]?.name).toBe("range");
    expect(funcs[0]?.paramCount).toBe(2);
  });

  it("extracts class methods including constructor", () => {
    const source = `class Calculator {
  constructor(private value: number) {}

  add(n: number): number {
    return this.value + n;
  }

  subtract(n: number): number {
    return this.value - n;
  }
}`;
    const tree = parseTsSource(source);
    const funcs = extractFunctions(tree);

    expect(funcs).toHaveLength(3);
    const names = funcs.map((f) => f.name);
    expect(names).toContain("constructor");
    expect(names).toContain("add");
    expect(names).toContain("subtract");
  });

  it("returns empty array for source with no functions", () => {
    const source = `const x = 1;
const y = "hello";
type Foo = string;`;
    const tree = parseTsSource(source);
    const funcs = extractFunctions(tree);

    expect(funcs).toHaveLength(0);
  });

  it("extracts only top-level functions and class methods, not nested", () => {
    const source = `function outer() {
  function inner() {
    return 1;
  }
  return inner();
}`;
    const tree = parseTsSource(source);
    const funcs = extractFunctions(tree);

    const names = funcs.map((f) => f.name);
    expect(names).toContain("outer");
    expect(names).not.toContain("inner");
  });

  it("extracts arrow function assigned to let", () => {
    const source = `let handler = (event: Event) => {
  console.log(event);
};`;
    const tree = parseTsSource(source);
    const funcs = extractFunctions(tree);

    expect(funcs).toHaveLength(1);
    expect(funcs[0]?.name).toBe("handler");
  });

  it("extracts function with zero parameters", () => {
    const source = `function noop() {}`;
    const tree = parseTsSource(source);
    const funcs = extractFunctions(tree);

    expect(funcs).toHaveLength(1);
    expect(funcs[0]?.paramCount).toBe(0);
    expect(funcs[0]?.lineCount).toBe(1);
  });

  it("uses 1-based line numbers", () => {
    const source = `
function second() {
  return 2;
}`;
    const tree = parseTsSource(source);
    const funcs = extractFunctions(tree);

    expect(funcs).toHaveLength(1);
    expect(funcs[0]?.startLine).toBe(2);
    expect(funcs[0]?.endLine).toBe(4);
    expect(funcs[0]?.lineCount).toBe(3);
  });
});

describe("extractClasses", () => {
  it("extracts a class with extends and implements", () => {
    const source = `class Dog extends Animal implements Barker, Pet {
  bark(): void {
    console.log("woof");
  }

  fetch(item: string): void {
    console.log("fetching " + item);
  }
}`;
    const tree = parseTsSource(source);
    const classes = extractClasses(tree);

    expect(classes).toHaveLength(1);
    expect(classes[0]?.name).toBe("Dog");
    expect(classes[0]?.kind).toBe("class");
    expect(classes[0]?.bases).toContain("Animal");
    expect(classes[0]?.bases).toContain("Barker");
    expect(classes[0]?.bases).toContain("Pet");
    expect(classes[0]?.methods).toContain("bark");
    expect(classes[0]?.methods).toContain("fetch");
  });

  it("extracts an interface with extends", () => {
    const source = `interface Serializable extends Readable {
  serialize(): string;
  deserialize(data: string): void;
}`;
    const tree = parseTsSource(source);
    const classes = extractClasses(tree);

    expect(classes).toHaveLength(1);
    expect(classes[0]?.name).toBe("Serializable");
    expect(classes[0]?.kind).toBe("interface");
    expect(classes[0]?.bases).toContain("Readable");
    expect(classes[0]?.methods).toContain("serialize");
    expect(classes[0]?.methods).toContain("deserialize");
  });

  it("extracts a type alias", () => {
    const source = `type Result = { ok: boolean; value: string };`;
    const tree = parseTsSource(source);
    const classes = extractClasses(tree);

    expect(classes).toHaveLength(1);
    expect(classes[0]?.name).toBe("Result");
    expect(classes[0]?.kind).toBe("type-alias");
    expect(classes[0]?.methods).toHaveLength(0);
    expect(classes[0]?.bases).toHaveLength(0);
  });

  it("returns empty array for source with no classes", () => {
    const source = `const x = 1;
function foo() { return x; }`;
    const tree = parseTsSource(source);
    const classes = extractClasses(tree);

    expect(classes).toHaveLength(0);
  });

  it("extracts a plain class without extends or implements", () => {
    const source = `class Logger {
  log(msg: string): void {
    console.log(msg);
  }
}`;
    const tree = parseTsSource(source);
    const classes = extractClasses(tree);

    expect(classes).toHaveLength(1);
    expect(classes[0]?.name).toBe("Logger");
    expect(classes[0]?.kind).toBe("class");
    expect(classes[0]?.bases).toHaveLength(0);
    expect(classes[0]?.methods).toContain("log");
  });

  it("extracts interface without extends", () => {
    const source = `interface Config {
  port: number;
  host: string;
  start(): void;
}`;
    const tree = parseTsSource(source);
    const classes = extractClasses(tree);

    expect(classes).toHaveLength(1);
    expect(classes[0]?.name).toBe("Config");
    expect(classes[0]?.kind).toBe("interface");
    expect(classes[0]?.bases).toHaveLength(0);
    expect(classes[0]?.methods).toContain("start");
  });

  it("extracts interface extending multiple interfaces", () => {
    const source = `interface Combined extends A, B, C {
  doSomething(): void;
}`;
    const tree = parseTsSource(source);
    const classes = extractClasses(tree);

    expect(classes).toHaveLength(1);
    expect(classes[0]?.bases).toEqual(["A", "B", "C"]);
  });
});

describe("extractFunctions and extractClasses on empty source", () => {
  it("returns empty arrays for empty source", () => {
    const source = "";
    const tree = parseTsSource(source);

    expect(extractFunctions(tree)).toHaveLength(0);
    expect(extractClasses(tree)).toHaveLength(0);
  });
});
