import { describe, it, expect } from "vitest";
import { moduleOf } from "./module-boundary.js";

describe("moduleOf", () => {
  it("extracts depth-2 directory from a nested path", () => {
    expect(moduleOf("src/auth/login.ts")).toBe("src/auth");
  });

  it("extracts depth-2 from deeper paths", () => {
    expect(moduleOf("src/auth/middleware/jwt.ts")).toBe("src/auth");
  });

  it("returns depth-1 for files directly under a single directory", () => {
    expect(moduleOf("src/index.ts")).toBe("src");
  });

  it("returns the file itself for root-level files", () => {
    expect(moduleOf("index.ts")).toBe("index.ts");
  });

  it("extracts depth-2 from another nested path", () => {
    expect(moduleOf("src/utils/helpers.ts")).toBe("src/utils");
  });

  it("handles directory path with trailing slash as depth-1", () => {
    // "src/auth/" after normalization has 2 segments — treated as depth-1
    expect(moduleOf("src/auth/")).toBe("src");
  });

  it("normalizes backslashes to forward slashes", () => {
    expect(moduleOf("src\\auth\\login.ts")).toBe("src/auth");
  });
});
