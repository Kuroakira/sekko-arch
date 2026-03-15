#!/usr/bin/env node

import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Command, Option } from "commander";
import { runScan } from "./scan.js";
import { runCheck } from "./check.js";
import { runGate } from "./gate.js";
import { runMcpServer } from "../mcp/server.js";
import { runVisualize } from "./visualize.js";

export function createProgram(): Command {
  const program = new Command();

  program
    .name("sekko-arch")
    .version("0.3.0")
    .description("Architecture analysis CLI")
    .addOption(
      new Option("--format <format>", "output format")
        .choices(["table", "json"])
        .default("table"),
    );

  program
    .command("scan")
    .description("Scan project files and structure")
    .argument("[path]", "path to scan", ".")
    .option("--include <dirs...>", "scan only specified directories")
    .action((scanPath: string, cmdOpts: { include?: string[] }) => {
      const opts = program.opts<{ format: string }>();
      runScan(scanPath, { format: opts.format, include: cmdOpts.include });
    });

  program
    .command("check")
    .description("Run architecture checks")
    .argument("[path]", "path to check", ".")
    .option("--include <dirs...>", "scan only specified directories")
    .action((checkPath: string, cmdOpts: { include?: string[] }) => {
      runCheck(checkPath, { include: cmdOpts.include });
    });

  program
    .command("gate")
    .description("Run quality gate")
    .argument("[path]", "path to gate", ".")
    .option("--save", "save snapshot", false)
    .option("--include <dirs...>", "scan only specified directories")
    .action(
      (gatePath: string, opts: { save: boolean; include?: string[] }) => {
        runGate(gatePath, { save: opts.save, include: opts.include });
      },
    );

  program
    .command("visualize")
    .description("Generate HTML visualization report")
    .argument("[path]", "path to scan", ".")
    .option("--output <file>", "output file path", "sekko-arch-report.html")
    .option("--include <dirs...>", "scan only specified directories")
    .action(
      (
        vizPath: string,
        cmdOpts: { output: string; include?: string[] },
      ) => {
        runVisualize(vizPath, {
          output: cmdOpts.output,
          include: cmdOpts.include,
        });
      },
    );

  program
    .command("mcp")
    .description("Start MCP server for AI agent integration")
    .action(() => {
      runMcpServer().catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`MCP server error: ${message}`);
        process.exit(1);
      });
    });

  return program;
}

const isDirectRun = (() => {
  try {
    const self = fileURLToPath(import.meta.url);
    const arg = realpathSync(process.argv[1]);
    return arg === self;
  } catch {
    return false;
  }
})();

if (isDirectRun) {
  const program = createProgram();
  program.parseAsync(process.argv).catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${message}`);
    process.exit(1);
  });
}
