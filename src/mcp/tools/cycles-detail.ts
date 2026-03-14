import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { executePipeline } from "../../cli/scan.js";

export const cyclesDetailToolDefinition: Tool = {
  name: "cycles_detail",
  description:
    "Get detailed cycle analysis — list of all detected dependency cycles with file paths",
  inputSchema: {
    type: "object" as const,
    properties: {
      path: {
        type: "string",
        description: "Absolute path to the project root",
      },
    },
    required: ["path"],
  },
};

interface CyclesDetailArgs {
  readonly path: string;
}

export async function handleCyclesDetail(
  args: CyclesDetailArgs,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  try {
    const { health } = executePipeline(args.path);
    const dim = health.dimensions.cycles;
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              grade: dim.grade,
              rawValue: dim.rawValue,
              details: dim.details ?? {},
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
