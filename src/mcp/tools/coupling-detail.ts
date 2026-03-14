import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { executePipeline } from "../../cli/scan.js";

export const couplingDetailToolDefinition: Tool = {
  name: "coupling_detail",
  description:
    "Get detailed coupling analysis — per-file coupling scores and the most coupled files",
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

interface CouplingDetailArgs {
  readonly path: string;
}

export async function handleCouplingDetail(
  args: CouplingDetailArgs,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  try {
    const { health } = executePipeline(args.path);
    const dim = health.dimensions.coupling;
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
