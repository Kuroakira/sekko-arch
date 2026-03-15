import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { resolve, join } from "node:path";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { DIMENSION_NAMES } from "../dimensions.js";

const FIXTURE_SRC = resolve(import.meta.dirname, "fixtures/sample-project");
const CLI_ENTRY = resolve(import.meta.dirname, "../cli/index.ts");

let testDir: string;

async function createMcpClient(): Promise<{
  readonly client: Client;
  readonly transport: StdioClientTransport;
}> {
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["tsx", CLI_ENTRY, "mcp"],
    cwd: testDir,
    stderr: "pipe",
  });

  const client = new Client(
    { name: "sekko-test-client", version: "1.0.0" },
    { capabilities: {} },
  );

  await client.connect(transport);
  return { client, transport };
}

/**
 * Extracts text from the first content item of a callTool result.
 * Uses runtime checks instead of type assertions.
 */
function extractText(result: unknown): string {
  expect(result).toBeDefined();
  expect(result).toHaveProperty("content");

  const resultObj = result as Record<string, unknown>;
  const content = resultObj["content"];
  expect(Array.isArray(content)).toBe(true);

  const contentArr = content as Array<Record<string, unknown>>;
  expect(contentArr.length).toBeGreaterThan(0);
  expect(contentArr[0]).toHaveProperty("text");

  return String(contentArr[0]["text"]);
}

describe("E2E: MCP integration", () => {
  beforeAll(() => {
    testDir = mkdtempSync(join(tmpdir(), "sekko-mcp-e2e-"));
    cpSync(FIXTURE_SRC, testDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("scan tool returns all 24 dimensions", async () => {
    const { client, transport } = await createMcpClient();

    try {
      const result = await client.callTool({
        name: "scan",
        arguments: { path: testDir },
      });

      const text = extractText(result);
      const parsed: unknown = JSON.parse(text);
      expect(parsed).toHaveProperty("compositeGrade");
      expect(parsed).toHaveProperty("fileCount");
      expect(parsed).toHaveProperty("dimensions");

      const obj = parsed as Record<string, unknown>;
      expect(obj["compositeGrade"]).toMatch(/^[A-DF]$/);
      expect(obj["fileCount"]).toBe(10);

      const dimensions = obj["dimensions"] as Record<string, unknown>;
      const dimensionKeys = Object.keys(dimensions);
      for (const name of DIMENSION_NAMES) {
        expect(dimensionKeys).toContain(name);
      }
      expect(dimensionKeys).toHaveLength(DIMENSION_NAMES.length);
    } finally {
      await transport.close();
    }
  }, 30000);

  it("health tool returns compositeGrade and per-dimension grades", async () => {
    const { client, transport } = await createMcpClient();

    try {
      const result = await client.callTool({
        name: "health",
        arguments: { path: testDir },
      });

      const text = extractText(result);
      const parsed: unknown = JSON.parse(text);
      expect(parsed).toHaveProperty("compositeGrade");
      expect(parsed).toHaveProperty("fileCount");
      expect(parsed).toHaveProperty("dimensions");

      const obj = parsed as Record<string, unknown>;
      expect(obj["compositeGrade"]).toMatch(/^[A-DF]$/);
      expect(obj["fileCount"]).toBe(10);

      const dimensions = obj["dimensions"] as Record<string, unknown>;
      for (const name of DIMENSION_NAMES) {
        expect(dimensions).toHaveProperty(name);
        expect(dimensions[name]).toMatch(/^[A-DF]$/);
      }
    } finally {
      await transport.close();
    }
  }, 30000);

  it("session_start followed by session_end returns diff with no degradation", async () => {
    const { client, transport } = await createMcpClient();

    try {
      const startResult = await client.callTool({
        name: "session_start",
        arguments: { path: testDir },
      });

      const startText = extractText(startResult);
      const startParsed: unknown = JSON.parse(startText);
      expect(startParsed).toHaveProperty("baselineSaved", true);
      expect(startParsed).toHaveProperty("compositeGrade");

      const startObj = startParsed as Record<string, unknown>;
      expect(startObj["compositeGrade"]).toMatch(/^[A-DF]$/);

      const endResult = await client.callTool({
        name: "session_end",
        arguments: { path: testDir },
      });

      const endText = extractText(endResult);
      const endParsed: unknown = JSON.parse(endText);
      expect(endParsed).toHaveProperty("compositeGradeChanged", false);
      expect(endParsed).toHaveProperty("changes");
      expect(endParsed).toHaveProperty("baseline");
      expect(endParsed).toHaveProperty("current");

      const endObj = endParsed as Record<string, unknown>;
      expect(Object.keys(endObj["changes"] as Record<string, unknown>)).toHaveLength(0);

      const baseline = endObj["baseline"] as Record<string, unknown>;
      const current = endObj["current"] as Record<string, unknown>;
      expect(baseline["compositeGrade"]).toBe(current["compositeGrade"]);
    } finally {
      await transport.close();
    }
  }, 30000);

  it("unknown tool returns error message", async () => {
    const { client, transport } = await createMcpClient();

    try {
      const result = await client.callTool({
        name: "nonexistent_tool",
        arguments: { path: testDir },
      });

      const text = extractText(result);
      expect(text).toContain("Unknown tool");
      expect(text).toContain("nonexistent_tool");
    } finally {
      await transport.close();
    }
  }, 30000);
});
