import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { executePipeline } from "../../cli/scan.js";
import type { ScanOptions } from "../../scanner/index.js";
import type { DimensionName } from "../../types/metrics.js";

export const scanToolDefinition: Tool = {
  name: "scan",
  description:
    "Scan a TypeScript project and return architecture health scores across 19 dimensions",
  inputSchema: {
    type: "object" as const,
    properties: {
      path: { type: "string", description: "Absolute path to the project root" },
      dimensions: {
        type: "array",
        items: { type: "string" },
        description: "Optional list of dimension names to filter results",
      },
      include: {
        type: "array",
        items: { type: "string" },
        description: "Optional list of directories to scan (prefix match)",
      },
    },
    required: ["path"],
  },
};

interface ScanArgs {
  readonly path: string;
  readonly dimensions?: readonly string[];
  readonly include?: readonly string[];
}

export async function handleScan(
  args: ScanArgs,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  try {
    const scanOptions: ScanOptions | undefined =
      args.include && args.include.length > 0
        ? { include: args.include }
        : undefined;

    const { health } = executePipeline(args.path, scanOptions);

    let dimensions: Record<string, unknown> = health.dimensions;

    if (args.dimensions && args.dimensions.length > 0) {
      const requestedSet = new Set(args.dimensions);
      const filtered: Record<string, unknown> = {};
      for (const key of Object.keys(health.dimensions) as DimensionName[]) {
        if (requestedSet.has(key)) {
          filtered[key] = health.dimensions[key];
        }
      }
      dimensions = filtered;
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              compositeGrade: health.compositeGrade,
              fileCount: health.fileCount,
              scanDurationMs: health.scanDurationMs,
              dimensions,
            },
            null,
            2,
          ),
        },
      ],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text", text: JSON.stringify({ error: message }) }],
    };
  }
}
