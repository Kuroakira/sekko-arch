import { describe, it, expect } from "vitest";
import { detectGodFiles } from "./god-files.js";

describe("detectGodFiles", () => {
  it("returns empty for no files", () => {
    const result = detectGodFiles(new Map(), new Set());
    expect(result).toHaveLength(0);
  });

  it("detects god file with fan-out > 15", () => {
    const fanOut = new Map([
      ["src/auth/login.ts", 16],
      ["src/utils/helpers.ts", 5],
    ]);
    const result = detectGodFiles(fanOut, new Set());
    expect(result).toContain("src/auth/login.ts");
    expect(result).not.toContain("src/utils/helpers.ts");
  });

  it("excludes entry points", () => {
    const fanOut = new Map([
      ["src/index.ts", 20],
      ["src/main.ts", 18],
      ["src/auth/login.ts", 16],
    ]);
    const entryPoints = new Set(["src/index.ts", "src/main.ts"]);
    const result = detectGodFiles(fanOut, entryPoints);
    expect(result).toContain("src/auth/login.ts");
    expect(result).not.toContain("src/index.ts");
    expect(result).not.toContain("src/main.ts");
  });

  it("does not flag files with fan-out <= 15", () => {
    const fanOut = new Map([
      ["src/auth/login.ts", 15],
      ["src/utils/helpers.ts", 1],
    ]);
    const result = detectGodFiles(fanOut, new Set());
    expect(result).toHaveLength(0);
  });
});
