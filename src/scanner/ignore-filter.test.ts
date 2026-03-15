import { describe, it, expect } from "vitest";
import { filterByIgnorePatterns } from "./ignore-filter.js";

describe("filterByIgnorePatterns", () => {
  it("returns all paths when patterns is empty", () => {
    const paths = ["src/index.ts", "src/utils.ts"];
    const result = filterByIgnorePatterns(paths, []);
    expect(result).toEqual(paths);
  });

  it("excludes paths matching directory glob pattern", () => {
    const paths = [
      "src/index.ts",
      "src/generated/types.ts",
      "src/generated/api.ts",
      "src/utils.ts",
    ];
    const result = filterByIgnorePatterns(paths, ["src/generated/**"]);
    expect(result).toEqual(["src/index.ts", "src/utils.ts"]);
  });

  it("excludes paths matching file extension glob pattern", () => {
    const paths = [
      "src/index.ts",
      "src/types.generated.ts",
      "src/api/client.generated.ts",
    ];
    const result = filterByIgnorePatterns(paths, ["**/*.generated.ts"]);
    expect(result).toEqual(["src/index.ts"]);
  });

  it("applies union of multiple patterns", () => {
    const paths = [
      "src/index.ts",
      "src/generated/types.ts",
      "src/api/client.generated.ts",
      "src/utils.ts",
    ];
    const result = filterByIgnorePatterns(paths, [
      "src/generated/**",
      "**/*.generated.ts",
    ]);
    expect(result).toEqual(["src/index.ts", "src/utils.ts"]);
  });

  it("returns all paths when no pattern matches", () => {
    const paths = ["src/index.ts", "src/utils.ts"];
    const result = filterByIgnorePatterns(paths, ["lib/**"]);
    expect(result).toEqual(paths);
  });

  it("returns empty array when all paths are excluded", () => {
    const paths = ["src/generated/a.ts", "src/generated/b.ts"];
    const result = filterByIgnorePatterns(paths, ["src/generated/**"]);
    expect(result).toEqual([]);
  });
});
