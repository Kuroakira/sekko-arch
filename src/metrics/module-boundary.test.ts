import { describe, it, expect } from "vitest";
import {
  computeModuleAssignments,
  detectDegenerateCases,
  isSameModule,
} from "./module-boundary.js";

describe("computeModuleAssignments", () => {
  it("assigns depth-2 modules correctly", () => {
    const paths = [
      "src/auth/login.ts",
      "src/auth/signup.ts",
      "src/utils/helpers.ts",
      "src/cli/index.ts",
    ];
    const assignments = computeModuleAssignments(paths);

    expect(assignments.get("src/auth/login.ts")).toBe("src/auth");
    expect(assignments.get("src/auth/signup.ts")).toBe("src/auth");
    expect(assignments.get("src/utils/helpers.ts")).toBe("src/utils");
    expect(assignments.get("src/cli/index.ts")).toBe("src/cli");
  });

  it("handles shallow paths", () => {
    const assignments = computeModuleAssignments(["src/index.ts", "main.ts"]);
    expect(assignments.get("src/index.ts")).toBe("src");
    expect(assignments.get("main.ts")).toBe("main.ts");
  });

  it("returns empty map for empty input", () => {
    const assignments = computeModuleAssignments([]);
    expect(assignments.size).toBe(0);
  });
});

describe("detectDegenerateCases", () => {
  it("warns when fewer than 3 modules", () => {
    const assignments = new Map([
      ["src/auth/login.ts", "src/auth"],
      ["src/auth/signup.ts", "src/auth"],
      ["src/utils/helpers.ts", "src/utils"],
    ]);
    const result = detectDegenerateCases(assignments);
    expect(result.isDegenerate).toBe(true);
    expect(result.warnings.some((w) => w.includes("fewer than 3"))).toBe(true);
  });

  it("warns when one module has >80% of files", () => {
    const assignments = new Map([
      ["src/auth/a.ts", "src/auth"],
      ["src/auth/b.ts", "src/auth"],
      ["src/auth/c.ts", "src/auth"],
      ["src/auth/d.ts", "src/auth"],
      ["src/auth/e.ts", "src/auth"],
      ["src/auth/f.ts", "src/auth"],
      ["src/auth/g.ts", "src/auth"],
      ["src/auth/h.ts", "src/auth"],
      ["src/auth/i.ts", "src/auth"],
      ["src/utils/x.ts", "src/utils"],
    ]);
    const result = detectDegenerateCases(assignments);
    expect(result.isDegenerate).toBe(true);
    expect(result.warnings.some((w) => w.includes("80%"))).toBe(true);
  });

  it("no warnings for healthy distribution", () => {
    const assignments = new Map([
      ["src/auth/a.ts", "src/auth"],
      ["src/utils/b.ts", "src/utils"],
      ["src/cli/c.ts", "src/cli"],
      ["src/graph/d.ts", "src/graph"],
      ["src/metrics/e.ts", "src/metrics"],
    ]);
    const result = detectDegenerateCases(assignments);
    expect(result.isDegenerate).toBe(false);
    expect(result.warnings).toHaveLength(0);
  });
});

describe("isSameModule", () => {
  it("returns true for files in the same module", () => {
    expect(isSameModule("src/auth/login.ts", "src/auth/signup.ts")).toBe(true);
  });

  it("returns false for files in different modules", () => {
    expect(isSameModule("src/auth/login.ts", "src/utils/helpers.ts")).toBe(
      false,
    );
  });

  it("returns true for files in same shallow module", () => {
    expect(isSameModule("src/index.ts", "src/main.ts")).toBe(true);
  });
});
