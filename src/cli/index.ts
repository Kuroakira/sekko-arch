#!/usr/bin/env node

import { Command, Option } from "commander";
import { runScan } from "./scan.js";
import { runCheck } from "./check.js";
import { runGate } from "./gate.js";

export function createProgram(): Command {
  const program = new Command();

  program
    .name("archana")
    .version("0.1.0")
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
    .action((scanPath: string) => {
      const opts = program.opts<{ format: string }>();
      runScan(scanPath, { format: opts.format });
    });

  program
    .command("check")
    .description("Run architecture checks")
    .argument("[path]", "path to check", ".")
    .action((checkPath: string) => {
      runCheck(checkPath);
    });

  program
    .command("gate")
    .description("Run quality gate")
    .argument("[path]", "path to gate", ".")
    .option("--save", "save snapshot", false)
    .action((gatePath: string, opts: { save: boolean }) => {
      runGate(gatePath, { save: opts.save });
    });

  return program;
}

const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith("/cli/index.js") ||
    process.argv[1].endsWith("/cli/index.ts"));

if (isDirectRun) {
  const program = createProgram();
  program.parseAsync(process.argv).catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${message}`);
    process.exit(1);
  });
}
