import { describe, it, expect } from "vitest";
import { checkLayers } from "./layers.js";
import type { LayerConfig } from "../types/rules.js";
import type { ImportEdge } from "../types/snapshot.js";

const controllersLayer: LayerConfig = {
  name: "controllers",
  paths: ["src/controllers/**"],
  order: 0,
};

const servicesLayer: LayerConfig = {
  name: "services",
  paths: ["src/services/**"],
  order: 1,
};

const dataLayer: LayerConfig = {
  name: "data",
  paths: ["src/data/**"],
  order: 2,
};

const layers: LayerConfig[] = [controllersLayer, servicesLayer, dataLayer];

describe("checkLayers", () => {
  it("produces no violation for a valid downward import", () => {
    const edges: ImportEdge[] = [
      { fromFile: "src/controllers/app.ts", toFile: "src/services/auth.ts" },
    ];
    const violations = checkLayers(layers, edges);
    expect(violations).toEqual([]);
  });

  it("produces a violation for an upward import", () => {
    const edges: ImportEdge[] = [
      { fromFile: "src/services/auth.ts", toFile: "src/controllers/app.ts" },
    ];
    const violations = checkLayers(layers, edges);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({
      rule: "layer_violation",
      severity: "error",
      message: expect.stringContaining("services"),
    });
    expect(violations[0].message).toContain("controllers");
    expect(violations[0].affectedFiles).toContain(
      "src/services/auth.ts",
    );
    expect(violations[0].affectedFiles).toContain(
      "src/controllers/app.ts",
    );
  });

  it("produces no violation for a same-layer import", () => {
    const edges: ImportEdge[] = [
      {
        fromFile: "src/services/auth.ts",
        toFile: "src/services/users.ts",
      },
    ];
    const violations = checkLayers(layers, edges);
    expect(violations).toEqual([]);
  });

  it("ignores files not matching any layer", () => {
    const edges: ImportEdge[] = [
      { fromFile: "src/utils/helper.ts", toFile: "src/controllers/app.ts" },
      { fromFile: "src/services/auth.ts", toFile: "src/utils/helper.ts" },
    ];
    const violations = checkLayers(layers, edges);
    expect(violations).toEqual([]);
  });

  it("reports multiple violations from multiple edges", () => {
    const edges: ImportEdge[] = [
      { fromFile: "src/services/auth.ts", toFile: "src/controllers/app.ts" },
      { fromFile: "src/data/repo.ts", toFile: "src/controllers/app.ts" },
    ];
    const violations = checkLayers(layers, edges);
    expect(violations).toHaveLength(2);
    expect(violations[0]).toMatchObject({
      rule: "layer_violation",
      severity: "error",
    });
    expect(violations[1]).toMatchObject({
      rule: "layer_violation",
      severity: "error",
    });
  });
});
