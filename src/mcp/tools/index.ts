import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { scanToolDefinition, handleScan } from "./scan.js";
import { healthToolDefinition, handleHealth } from "./health.js";
import {
  couplingDetailToolDefinition,
  handleCouplingDetail,
} from "./coupling-detail.js";
import {
  cyclesDetailToolDefinition,
  handleCyclesDetail,
} from "./cycles-detail.js";
import {
  sessionStartToolDefinition,
  sessionEndToolDefinition,
  handleSessionStart,
  handleSessionEnd,
} from "./session.js";

export const toolDefinitions: Tool[] = [
  scanToolDefinition,
  healthToolDefinition,
  couplingDetailToolDefinition,
  cyclesDetailToolDefinition,
  sessionStartToolDefinition,
  sessionEndToolDefinition,
];

export async function handleToolCall(
  name: string,
  args: Record<string, unknown> | undefined,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  if (name === "scan" && args && typeof args.path === "string") {
    return handleScan({
      path: args.path,
      dimensions: Array.isArray(args.dimensions) ? args.dimensions : undefined,
      include: Array.isArray(args.include) ? args.include : undefined,
    });
  }
  if (name === "health" && args && typeof args.path === "string") {
    return handleHealth({
      path: args.path,
      include: Array.isArray(args.include) ? args.include : undefined,
    });
  }
  if (name === "coupling_detail" && args && typeof args.path === "string") {
    return handleCouplingDetail({ path: args.path });
  }
  if (name === "cycles_detail" && args && typeof args.path === "string") {
    return handleCyclesDetail({ path: args.path });
  }
  if (name === "session_start" && args && typeof args.path === "string") {
    return handleSessionStart({
      path: args.path,
      include: Array.isArray(args.include) ? args.include : undefined,
    });
  }
  if (name === "session_end" && args && typeof args.path === "string") {
    return handleSessionEnd({
      path: args.path,
      include: Array.isArray(args.include) ? args.include : undefined,
    });
  }
  return {
    content: [{ type: "text", text: `Unknown tool: ${name}` }],
  };
}
