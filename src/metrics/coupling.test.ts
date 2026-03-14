import { describe, it, expect } from "vitest";
import { computeCoupling } from "./coupling.js";
import type { ImportEdge } from "../types/snapshot.js";

describe("computeCoupling", () => {
  it("returns 0 for no edges", () => {
    const result = computeCoupling([], new Map(), new Map(), new Map());
    expect(result.score).toBe(0);
  });

  it("returns 0 for all intra-module edges", () => {
    const edges: ImportEdge[] = [
      { fromFile: "src/auth/login.ts", toFile: "src/auth/signup.ts" },
    ];
    const modules = new Map([
      ["src/auth/login.ts", "src/auth"],
      ["src/auth/signup.ts", "src/auth"],
    ]);
    const fanIn = new Map([
      ["src/auth/login.ts", 0],
      ["src/auth/signup.ts", 1],
    ]);
    const fanOut = new Map([
      ["src/auth/login.ts", 1],
      ["src/auth/signup.ts", 0],
    ]);

    const result = computeCoupling(edges, modules, fanIn, fanOut);
    expect(result.score).toBe(0);
  });

  it("returns high score for all cross-module edges to unstable targets", () => {
    const edges: ImportEdge[] = [
      { fromFile: "src/auth/login.ts", toFile: "src/utils/helpers.ts" },
      { fromFile: "src/auth/signup.ts", toFile: "src/cli/main.ts" },
    ];
    const modules = new Map([
      ["src/auth/login.ts", "src/auth"],
      ["src/auth/signup.ts", "src/auth"],
      ["src/utils/helpers.ts", "src/utils"],
      ["src/cli/main.ts", "src/cli"],
    ]);
    // Unstable targets: low fan-in, high fan-out
    const fanIn = new Map([
      ["src/auth/login.ts", 0],
      ["src/auth/signup.ts", 0],
      ["src/utils/helpers.ts", 1],
      ["src/cli/main.ts", 1],
    ]);
    const fanOut = new Map([
      ["src/auth/login.ts", 1],
      ["src/auth/signup.ts", 1],
      ["src/utils/helpers.ts", 2],
      ["src/cli/main.ts", 3],
    ]);

    const result = computeCoupling(edges, modules, fanIn, fanOut);
    expect(result.score).toBe(1);
  });

  it("excludes cross-module edges to stable targets", () => {
    const edges: ImportEdge[] = [
      { fromFile: "src/auth/login.ts", toFile: "src/utils/helpers.ts" },
    ];
    const modules = new Map([
      ["src/auth/login.ts", "src/auth"],
      ["src/utils/helpers.ts", "src/utils"],
    ]);
    // Stable target: high fan-in (>=3), low instability (I <= 0.15)
    const fanIn = new Map([
      ["src/auth/login.ts", 0],
      ["src/utils/helpers.ts", 10],
    ]);
    const fanOut = new Map([
      ["src/auth/login.ts", 1],
      ["src/utils/helpers.ts", 0],
    ]);

    const result = computeCoupling(edges, modules, fanIn, fanOut);
    expect(result.score).toBe(0);
  });

  it("computes mixed scenario correctly", () => {
    const edges: ImportEdge[] = [
      { fromFile: "src/auth/login.ts", toFile: "src/utils/stable.ts" }, // stable → excluded
      { fromFile: "src/auth/login.ts", toFile: "src/cli/unstable.ts" }, // unstable → counted
      { fromFile: "src/auth/login.ts", toFile: "src/auth/signup.ts" }, // intra-module → not cross
    ];
    const modules = new Map([
      ["src/auth/login.ts", "src/auth"],
      ["src/auth/signup.ts", "src/auth"],
      ["src/utils/stable.ts", "src/utils"],
      ["src/cli/unstable.ts", "src/cli"],
    ]);
    const fanIn = new Map([
      ["src/auth/login.ts", 0],
      ["src/auth/signup.ts", 1],
      ["src/utils/stable.ts", 5],
      ["src/cli/unstable.ts", 1],
    ]);
    const fanOut = new Map([
      ["src/auth/login.ts", 3],
      ["src/auth/signup.ts", 0],
      ["src/utils/stable.ts", 0],
      ["src/cli/unstable.ts", 2],
    ]);

    const result = computeCoupling(edges, modules, fanIn, fanOut);
    // 2 cross-module edges total, 1 to stable (excluded), 1 to unstable
    // score = 1 / 2 = 0.5
    expect(result.score).toBe(0.5);
  });
});
