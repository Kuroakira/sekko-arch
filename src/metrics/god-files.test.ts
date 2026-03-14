import { describe, it, expect } from "vitest";
import { detectGodFiles } from "./god-files.js";

describe("detectGodFiles", () => {
  it("returns empty for no files", () => {
    const result = detectGodFiles(new Map(), new Set());
    expect(result.godFiles).toHaveLength(0);
    expect(result.count).toBe(0);
    expect(result.ratio).toBe(0);
  });

  it("detects god file with fan-out > 15", () => {
    const fanOut = new Map([
      ["src/auth/login.ts", 16],
      ["src/utils/helpers.ts", 5],
    ]);
    const result = detectGodFiles(fanOut, new Set());
    expect(result.godFiles).toContain("src/auth/login.ts");
    expect(result.godFiles).not.toContain("src/utils/helpers.ts");
    expect(result.count).toBe(1);
    expect(result.ratio).toBe(0.5);
  });

  it("excludes entry points", () => {
    const fanOut = new Map([
      ["src/index.ts", 20],
      ["src/main.ts", 18],
      ["src/auth/login.ts", 16],
    ]);
    const entryPoints = new Set(["src/index.ts", "src/main.ts"]);
    const result = detectGodFiles(fanOut, entryPoints);
    expect(result.godFiles).toContain("src/auth/login.ts");
    expect(result.godFiles).not.toContain("src/index.ts");
    expect(result.godFiles).not.toContain("src/main.ts");
    expect(result.count).toBe(1);
  });

  it("does not flag files with fan-out <= 15", () => {
    const fanOut = new Map([
      ["src/auth/login.ts", 15],
      ["src/utils/helpers.ts", 1],
    ]);
    const result = detectGodFiles(fanOut, new Set());
    expect(result.godFiles).toHaveLength(0);
    expect(result.count).toBe(0);
    expect(result.ratio).toBe(0);
  });
});
