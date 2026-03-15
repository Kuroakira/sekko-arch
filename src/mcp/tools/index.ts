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

type ToolCallResult = Promise<{
  content: Array<{ type: "text"; text: string }>;
}>;
type ToolHandler = (args: Record<string, unknown>) => ToolCallResult;

const toolHandlers: Readonly<Record<string, ToolHandler>> = {
  scan: (args) =>
    handleScan({
      path: String(args.path),
      dimensions: Array.isArray(args.dimensions)
        ? args.dimensions
        : undefined,
      include: Array.isArray(args.include) ? args.include : undefined,
    }),
  health: (args) =>
    handleHealth({
      path: String(args.path),
      include: Array.isArray(args.include) ? args.include : undefined,
    }),
  coupling_detail: (args) =>
    handleCouplingDetail({ path: String(args.path) }),
  cycles_detail: (args) =>
    handleCyclesDetail({ path: String(args.path) }),
  session_start: (args) =>
    handleSessionStart({
      path: String(args.path),
      include: Array.isArray(args.include) ? args.include : undefined,
    }),
  session_end: (args) =>
    handleSessionEnd({
      path: String(args.path),
      include: Array.isArray(args.include) ? args.include : undefined,
    }),
};

export async function handleToolCall(
  name: string,
  args: Record<string, unknown> | undefined,
): ToolCallResult {
  const handler = toolHandlers[name];
  if (!handler || !args || typeof args.path !== "string") {
    return {
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
    };
  }
  return handler(args);
}
