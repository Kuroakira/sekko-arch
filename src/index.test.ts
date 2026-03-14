import { describe, it, expect } from "vitest";

describe("sekko-arch project setup", () => {
  it("exports from index without errors", async () => {
    const mod = await import("./index.js");
    expect(mod).toBeDefined();
  });
});
