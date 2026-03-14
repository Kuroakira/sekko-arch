import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { executePipeline } from "../../cli/scan.js";
import type { DimensionName } from "../../types/metrics.js";

export const healthToolDefinition: Tool = {
  name: "health",
  description:
    "Get a quick health summary of a TypeScript project — composite grade and per-dimension grades without file-level details",
  inputSchema: {
    type: "object" as const,
    properties: {
      path: {
        type: "string",
        description: "Absolute path to the project root",
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

interface HealthArgs {
  readonly path: string;
  readonly include?: readonly string[];
}

export async function handleHealth(
  args: HealthArgs,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  try {
    const scanOptions = args.include?.length
      ? { include: args.include }
      : undefined;
    const { health } = executePipeline(args.path, scanOptions);

    const dimensions: Record<string, string> = {};
    for (const key of Object.keys(health.dimensions) as DimensionName[]) {
      dimensions[key] = health.dimensions[key].grade;
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
