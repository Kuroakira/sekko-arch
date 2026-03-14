import { describe, it, expect } from "vitest";
import { countLines } from "./line-counter.js";

describe("countLines", () => {
  it("counts pure code lines", () => {
    const source = `const x = 1;
const y = 2;
const z = x + y;`;

    const result = countLines(source);

    expect(result.lines).toBe(3);
    expect(result.logic).toBe(3);
    expect(result.comments).toBe(0);
    expect(result.blanks).toBe(0);
  });

  it("counts blank lines", () => {
    const source = `const x = 1;

const y = 2;

`;

    const result = countLines(source);

    expect(result.lines).toBe(4);
    expect(result.logic).toBe(2);
    expect(result.blanks).toBe(2);
  });

  it("counts single-line comments with //", () => {
    const source = `// This is a comment
const x = 1;
// Another comment`;

    const result = countLines(source);

    expect(result.lines).toBe(3);
    expect(result.logic).toBe(1);
    expect(result.comments).toBe(2);
  });

  it("counts multi-line block comments", () => {
    const source = `/*
 * Block comment
 * continues here
 */
const x = 1;`;

    const result = countLines(source);

    expect(result.lines).toBe(5);
    expect(result.logic).toBe(1);
    expect(result.comments).toBe(4); // no blank lines in this block comment
  });

  it("counts single-line block comments", () => {
    const source = `/* single block */
const x = 1;`;

    const result = countLines(source);

    expect(result.lines).toBe(2);
    expect(result.logic).toBe(1);
    expect(result.comments).toBe(1);
  });

  it("handles inline comments after code as code lines", () => {
    const source = `const x = 1; // inline comment
const y = 2; /* inline block */`;

    const result = countLines(source);

    expect(result.lines).toBe(2);
    expect(result.logic).toBe(2);
    expect(result.comments).toBe(0);
  });

  it("does not treat // inside string literals as comments", () => {
    const source = `const url = "https://example.com";
const path = '//network/share';`;

    const result = countLines(source);

    expect(result.lines).toBe(2);
    expect(result.logic).toBe(2);
    expect(result.comments).toBe(0);
  });

  it("does not treat /* inside string literals as comments", () => {
    const source = `const regex = "/* not a comment */";
const next = 1;`;

    const result = countLines(source);

    expect(result.lines).toBe(2);
    expect(result.logic).toBe(2);
    expect(result.comments).toBe(0);
  });

  it("handles template literals with // inside", () => {
    const source = "const tpl = `https://example.com`;\nconst x = 1;";

    const result = countLines(source);

    expect(result.lines).toBe(2);
    expect(result.logic).toBe(2);
    expect(result.comments).toBe(0);
  });

  it("handles block comment that starts and ends on same line with code before", () => {
    const source = `const x = 1; /* comment */ const y = 2;`;

    const result = countLines(source);

    expect(result.lines).toBe(1);
    expect(result.logic).toBe(1);
  });

  it("handles empty source", () => {
    const result = countLines("");

    expect(result.lines).toBe(0);
    expect(result.logic).toBe(0);
    expect(result.comments).toBe(0);
    expect(result.blanks).toBe(0);
  });

  it("handles mixed content correctly", () => {
    const source = `// Header comment
import { foo } from "./foo";

/**
 * JSDoc comment
 */
export function bar() {
  // inline note
  return foo(); // trailing
}

`;

    const result = countLines(source);

    expect(result.lines).toBe(11); // trailing \n is terminator, not new line
    expect(result.comments).toBe(5); // lines 1, 4, 5, 6, 8
    expect(result.blanks).toBe(2); // lines 3, 11
    expect(result.logic).toBe(4); // lines 2, 7, 9, 10
  });

  it("classifies blank lines inside block comments as comments", () => {
    const source = `/*
 * First line

 * After blank
 */`;

    const result = countLines(source);

    expect(result.lines).toBe(5);
    expect(result.comments).toBe(5); // all 5 lines including blank
    expect(result.blanks).toBe(0);
  });

  it("handles multi-line template literals without treating content as comments", () => {
    const source = `const sql = \`
  SELECT * FROM users // not a comment
  WHERE id = 1 /* also not a comment */
\`;
const x = 1;`;

    const result = countLines(source);

    expect(result.lines).toBe(5);
    expect(result.logic).toBe(5); // all lines are code (template literal content is code)
    expect(result.comments).toBe(0);
  });

  it("resumes normal parsing after template literal ends", () => {
    const source = `const a = \`hello\`;
// this is a comment
const b = 1;`;

    const result = countLines(source);

    expect(result.lines).toBe(3);
    expect(result.logic).toBe(2);
    expect(result.comments).toBe(1);
  });

  it("tracks block comment state across lines", () => {
    const source = `const a = 1;
/* start of block
   still in block
end of block */
const b = 2;`;

    const result = countLines(source);

    expect(result.lines).toBe(5);
    expect(result.logic).toBe(2);
    expect(result.comments).toBe(3);
  });
});
