import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { executePipeline } from "../../cli/scan.js";
import type { HealthReport, DimensionName } from "../../types/metrics.js";

let baseline: HealthReport | null = null;

export function resetBaseline(): void {
  baseline = null;
}

export const sessionStartToolDefinition: Tool = {
  name: "session_start",
  description:
    "Start an architecture monitoring session — captures a baseline snapshot for later comparison",
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

export const sessionEndToolDefinition: Tool = {
  name: "session_end",
  description:
    "End an architecture monitoring session — compares current state against the baseline and reports changes",
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

interface SessionArgs {
  readonly path: string;
  readonly include?: readonly string[];
}

function buildGradeSummary(
  health: HealthReport,
): Record<string, string> {
  const summary: Record<string, string> = {};
  for (const key of Object.keys(health.dimensions)) {
    const dim = key as DimensionName;
    summary[dim] = health.dimensions[dim].grade;
  }
  return summary;
}

export async function handleSessionStart(
  args: SessionArgs,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  try {
    const scanOptions =
      args.include && args.include.length > 0
        ? { include: args.include }
        : undefined;
    const { health } = executePipeline(args.path, scanOptions);
    baseline = health;

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              baselineSaved: true,
              compositeGrade: health.compositeGrade,
              fileCount: health.fileCount,
              dimensions: buildGradeSummary(health),
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

export async function handleSessionEnd(
  args: SessionArgs,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  try {
    const scanOptions =
      args.include && args.include.length > 0
        ? { include: args.include }
        : undefined;
    const { health } = executePipeline(args.path, scanOptions);

    if (!baseline) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                warning:
                  "No baseline found. Run session_start first. Returning current scan results.",
                current: {
                  compositeGrade: health.compositeGrade,
                  fileCount: health.fileCount,
                  dimensions: buildGradeSummary(health),
                },
              },
              null,
              2,
            ),
          },
        ],
      };
    }

    const changes: Record<string, { from: string; to: string }> = {};
    for (const key of Object.keys(health.dimensions)) {
      const dim = key as DimensionName;
      const baseGrade = baseline.dimensions[dim].grade;
      const currentGrade = health.dimensions[dim].grade;
      if (baseGrade !== currentGrade) {
        changes[dim] = { from: baseGrade, to: currentGrade };
      }
    }

    const result = {
      baseline: {
        compositeGrade: baseline.compositeGrade,
        dimensions: buildGradeSummary(baseline),
      },
      current: {
        compositeGrade: health.compositeGrade,
        fileCount: health.fileCount,
        dimensions: buildGradeSummary(health),
      },
      changes,
      compositeGradeChanged: baseline.compositeGrade !== health.compositeGrade,
    };

    baseline = null;

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
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
