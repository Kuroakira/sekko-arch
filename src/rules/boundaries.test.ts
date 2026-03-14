import { describe, it, expect } from "vitest";
import { checkBoundaries } from "./boundaries.js";
import type { BoundaryConfig, ImportEdge } from "../types/index.js";

describe("checkBoundaries", () => {
  it("generates a violation when an edge matches a boundary rule", () => {
    const boundaries: BoundaryConfig[] = [
      { from: "src/ui/**", to: "src/data/**" },
    ];
    const edges: ImportEdge[] = [
      { fromFile: "src/ui/button.ts", toFile: "src/data/repo.ts" },
    ];
    const violations = checkBoundaries(boundaries, edges);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({
      rule: "boundary_violation",
      severity: "error",
    });
    expect(violations[0].affectedFiles).toContain("src/ui/button.ts");
    expect(violations[0].affectedFiles).toContain("src/data/repo.ts");
  });

  it("produces no violation when no edge matches", () => {
    const boundaries: BoundaryConfig[] = [
      { from: "src/ui/**", to: "src/data/**" },
    ];
    const edges: ImportEdge[] = [
      { fromFile: "src/ui/button.ts", toFile: "src/services/auth.ts" },
    ];
    const violations = checkBoundaries(boundaries, edges);
    expect(violations).toEqual([]);
  });

  it("only triggers matching boundary rules when multiple exist", () => {
    const boundaries: BoundaryConfig[] = [
      { from: "src/ui/**", to: "src/data/**" },
      { from: "src/cli/**", to: "src/data/**" },
    ];
    const edges: ImportEdge[] = [
      { fromFile: "src/cli/main.ts", toFile: "src/data/repo.ts" },
    ];
    const violations = checkBoundaries(boundaries, edges);
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain("src/cli/**");
    expect(violations[0].message).toContain("src/data/**");
  });

  it("includes the reason in the violation message when provided", () => {
    const boundaries: BoundaryConfig[] = [
      {
        from: "src/ui/**",
        to: "src/data/**",
        reason: "UI must not access the data layer directly",
      },
    ];
    const edges: ImportEdge[] = [
      { fromFile: "src/ui/button.ts", toFile: "src/data/repo.ts" },
    ];
    const violations = checkBoundaries(boundaries, edges);
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain(
      "UI must not access the data layer directly",
    );
  });
});
