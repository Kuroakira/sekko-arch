import { describe, it, expect } from "vitest";
import { createProgram } from "./index.js";
import type { Command } from "commander";

describe("visualize subcommand", () => {
  function findCommand(program: Command, name: string): Command {
    const cmd = program.commands.find((c) => c.name() === name);
    if (!cmd) {
      throw new Error(`subcommand '${name}' not found`);
    }
    return cmd;
  }

  it("is registered as a subcommand", () => {
    const program = createProgram();
    const visualize = findCommand(program, "visualize");
    expect(visualize.name()).toBe("visualize");
  });

  it("accepts optional path defaulting to '.'", async () => {
    const program = createProgram();
    program.exitOverride();
    program.configureOutput({ writeErr: () => {}, writeOut: () => {} });

    let receivedPath: string | undefined;
    const visualize = findCommand(program, "visualize");
    visualize.action((path: string) => {
      receivedPath = path;
    });

    await program.parseAsync(["node", "sekko-arch", "visualize"]);
    expect(receivedPath).toBe(".");
  });

  it("accepts explicit path", async () => {
    const program = createProgram();
    program.exitOverride();
    program.configureOutput({ writeErr: () => {}, writeOut: () => {} });

    let receivedPath: string | undefined;
    const visualize = findCommand(program, "visualize");
    visualize.action((path: string) => {
      receivedPath = path;
    });

    await program.parseAsync(["node", "sekko-arch", "visualize", "/tmp/foo"]);
    expect(receivedPath).toBe("/tmp/foo");
  });

  it("has --output option", () => {
    const program = createProgram();
    const visualize = findCommand(program, "visualize");
    const outputOption = visualize.options.find(
      (opt) => opt.long === "--output",
    );
    expect(outputOption).toBeDefined();
  });

  it("--output defaults to sekko-arch-report.html", () => {
    const program = createProgram();
    const visualize = findCommand(program, "visualize");
    const outputOption = visualize.options.find(
      (opt) => opt.long === "--output",
    );
    expect(outputOption?.defaultValue).toBe("sekko-arch-report.html");
  });
});

describe("runVisualize", () => {
  it("writes HTML file to the specified output path", async () => {
    const { existsSync, unlinkSync, readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const { runVisualize } = await import("./visualize.js");
    const os = await import("node:os");

    const outputPath = join(
      os.tmpdir(),
      `sekko-test-${Date.now()}.html`,
    );

    try {
      // Run against the project itself (quick scan, small scope)
      runVisualize(process.cwd(), {
        output: outputPath,
        include: ["src/types"],
      });

      expect(existsSync(outputPath)).toBe(true);
      const content = readFileSync(outputPath, "utf-8");
      expect(content).toContain("<!DOCTYPE html>");
      expect(content).toContain("d3js.org");
      expect(content).toContain("__SEKKO_DATA__");
    } finally {
      if (existsSync(outputPath)) {
        unlinkSync(outputPath);
      }
    }
  });
});
