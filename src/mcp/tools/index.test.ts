import { describe, it, expect, vi } from "vitest";
import { handleToolCall, toolDefinitions } from "./index.js";

// Mock all tool handlers to isolate dispatch logic
vi.mock("./scan.js", () => ({
  scanToolDefinition: { name: "scan" },
  handleScan: vi.fn().mockResolvedValue({
    content: [{ type: "text", text: "scan-result" }],
  }),
}));

vi.mock("./health.js", () => ({
  healthToolDefinition: { name: "health" },
  handleHealth: vi.fn().mockResolvedValue({
    content: [{ type: "text", text: "health-result" }],
  }),
}));

vi.mock("./coupling-detail.js", () => ({
  couplingDetailToolDefinition: { name: "coupling_detail" },
  handleCouplingDetail: vi.fn().mockResolvedValue({
    content: [{ type: "text", text: "coupling-result" }],
  }),
}));

vi.mock("./cycles-detail.js", () => ({
  cyclesDetailToolDefinition: { name: "cycles_detail" },
  handleCyclesDetail: vi.fn().mockResolvedValue({
    content: [{ type: "text", text: "cycles-result" }],
  }),
}));

vi.mock("./session.js", () => ({
  sessionStartToolDefinition: { name: "session_start" },
  sessionEndToolDefinition: { name: "session_end" },
  handleSessionStart: vi.fn().mockResolvedValue({
    content: [{ type: "text", text: "session-start-result" }],
  }),
  handleSessionEnd: vi.fn().mockResolvedValue({
    content: [{ type: "text", text: "session-end-result" }],
  }),
}));

describe("handleToolCall dispatch", () => {
  it("dispatches scan with correct args", async () => {
    const { handleScan } = await import("./scan.js");
    const result = await handleToolCall("scan", {
      path: "/tmp/project",
      dimensions: ["cycles", "coupling"],
      include: ["src"],
    });
    expect(result.content[0].text).toBe("scan-result");
    expect(handleScan).toHaveBeenCalledWith({
      path: "/tmp/project",
      dimensions: ["cycles", "coupling"],
      include: ["src"],
    });
  });

  it("dispatches health with correct args", async () => {
    const { handleHealth } = await import("./health.js");
    const result = await handleToolCall("health", {
      path: "/tmp/project",
      include: ["lib"],
    });
    expect(result.content[0].text).toBe("health-result");
    expect(handleHealth).toHaveBeenCalledWith({
      path: "/tmp/project",
      include: ["lib"],
    });
  });

  it("dispatches coupling_detail with correct args", async () => {
    const { handleCouplingDetail } = await import("./coupling-detail.js");
    const result = await handleToolCall("coupling_detail", {
      path: "/tmp/project",
    });
    expect(result.content[0].text).toBe("coupling-result");
    expect(handleCouplingDetail).toHaveBeenCalledWith({
      path: "/tmp/project",
    });
  });

  it("dispatches cycles_detail with correct args", async () => {
    const { handleCyclesDetail } = await import("./cycles-detail.js");
    const result = await handleToolCall("cycles_detail", {
      path: "/tmp/project",
    });
    expect(result.content[0].text).toBe("cycles-result");
    expect(handleCyclesDetail).toHaveBeenCalledWith({
      path: "/tmp/project",
    });
  });

  it("dispatches session_start with correct args", async () => {
    const { handleSessionStart } = await import("./session.js");
    const result = await handleToolCall("session_start", {
      path: "/tmp/project",
      include: ["src"],
    });
    expect(result.content[0].text).toBe("session-start-result");
    expect(handleSessionStart).toHaveBeenCalledWith({
      path: "/tmp/project",
      include: ["src"],
    });
  });

  it("dispatches session_end with correct args", async () => {
    const { handleSessionEnd } = await import("./session.js");
    const result = await handleToolCall("session_end", {
      path: "/tmp/project",
      include: ["src"],
    });
    expect(result.content[0].text).toBe("session-end-result");
    expect(handleSessionEnd).toHaveBeenCalledWith({
      path: "/tmp/project",
      include: ["src"],
    });
  });

  it("returns unknown tool message for unrecognized tool name", async () => {
    const result = await handleToolCall("nonexistent", { path: "/tmp" });
    expect(result.content[0].text).toBe("Unknown tool: nonexistent");
  });

  it("returns unknown tool message when args is undefined", async () => {
    const result = await handleToolCall("scan", undefined);
    expect(result.content[0].text).toBe("Unknown tool: scan");
  });

  it("returns unknown tool message when path is missing", async () => {
    const result = await handleToolCall("scan", { dimensions: ["cycles"] });
    expect(result.content[0].text).toBe("Unknown tool: scan");
  });

  it("returns unknown tool message when path is not a string", async () => {
    const result = await handleToolCall("scan", { path: 123 });
    expect(result.content[0].text).toBe("Unknown tool: scan");
  });

  it("passes undefined for non-array dimensions in scan", async () => {
    const { handleScan } = await import("./scan.js");
    await handleToolCall("scan", {
      path: "/tmp/project",
      dimensions: "not-an-array",
    });
    expect(handleScan).toHaveBeenCalledWith({
      path: "/tmp/project",
      dimensions: undefined,
      include: undefined,
    });
  });
});

describe("toolDefinitions", () => {
  it("exports all six tool definitions", () => {
    expect(toolDefinitions).toHaveLength(6);
    const names = toolDefinitions.map((t) => t.name);
    expect(names).toContain("scan");
    expect(names).toContain("health");
    expect(names).toContain("coupling_detail");
    expect(names).toContain("cycles_detail");
    expect(names).toContain("session_start");
    expect(names).toContain("session_end");
  });
});
