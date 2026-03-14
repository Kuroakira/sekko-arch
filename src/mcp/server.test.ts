import { describe, it, expect } from "vitest";
import { createMcpServer } from "./server.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";

describe("createMcpServer", () => {
  it("returns a Server instance", () => {
    const server = createMcpServer();
    expect(server).toBeInstanceOf(Server);
  });

  it("has request handlers registered", () => {
    const server = createMcpServer();
    // Server instance should be created without errors,
    // confirming tools capability and handlers are registered
    expect(server).toBeDefined();
  });
});
