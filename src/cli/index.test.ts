import { describe, it, expect } from "vitest";
import { createProgram } from "./index.js";
import { Command } from "commander";

describe("createProgram", () => {
  it("returns a Command instance", () => {
    const program = createProgram();
    expect(program).toBeInstanceOf(Command);
  });

  it("has program name 'sekko-arch'", () => {
    const program = createProgram();
    expect(program.name()).toBe("sekko-arch");
  });

  it("has version 0.1.0", () => {
    const program = createProgram();
    expect(program.version()).toBe("0.1.0");
  });

  it("has a global --format option defaulting to table", async () => {
    const program = createProgram();
    program.exitOverride();
    program.configureOutput({ writeErr: () => {}, writeOut: () => {} });

    await program.parseAsync(["node", "sekko-arch", "scan"]);

    const opts = program.opts<{ format: string }>();
    expect(opts.format).toBe("table");
  });

  it("accepts --format json globally", async () => {
    const program = createProgram();
    program.exitOverride();
    program.configureOutput({ writeErr: () => {}, writeOut: () => {} });

    await program.parseAsync(["node", "sekko-arch", "--format", "json", "scan"]);

    const opts = program.opts<{ format: string }>();
    expect(opts.format).toBe("json");
  });

  it("rejects invalid --format values", async () => {
    const program = createProgram();
    program.exitOverride();
    program.configureOutput({ writeErr: () => {}, writeOut: () => {} });

    await expect(
      program.parseAsync(["node", "sekko-arch", "--format", "xml", "scan"]),
    ).rejects.toThrow();
  });
});

describe("subcommands", () => {
  function findCommand(program: Command, name: string): Command {
    const cmd = program.commands.find((c) => c.name() === name);
    if (!cmd) {
      throw new Error(`subcommand '${name}' not found`);
    }
    return cmd;
  }

  it("has scan subcommand", () => {
    const program = createProgram();
    const scan = findCommand(program, "scan");
    expect(scan.name()).toBe("scan");
  });

  it("has check subcommand", () => {
    const program = createProgram();
    const check = findCommand(program, "check");
    expect(check.name()).toBe("check");
  });

  it("has gate subcommand", () => {
    const program = createProgram();
    const gate = findCommand(program, "gate");
    expect(gate.name()).toBe("gate");
  });

  it("scan accepts optional path defaulting to '.'", async () => {
    const program = createProgram();
    program.exitOverride();
    program.configureOutput({ writeErr: () => {}, writeOut: () => {} });

    let receivedPath: string | undefined;
    const scan = findCommand(program, "scan");
    scan.action((path: string) => {
      receivedPath = path;
    });

    await program.parseAsync(["node", "sekko-arch", "scan"]);

    expect(receivedPath).toBe(".");
  });

  it("scan accepts explicit path", async () => {
    const program = createProgram();
    program.exitOverride();
    program.configureOutput({ writeErr: () => {}, writeOut: () => {} });

    let receivedPath: string | undefined;
    const scan = findCommand(program, "scan");
    scan.action((path: string) => {
      receivedPath = path;
    });

    await program.parseAsync(["node", "sekko-arch", "scan", "/tmp/foo"]);

    expect(receivedPath).toBe("/tmp/foo");
  });

  it("check accepts optional path defaulting to '.'", async () => {
    const program = createProgram();
    program.exitOverride();
    program.configureOutput({ writeErr: () => {}, writeOut: () => {} });

    let receivedPath: string | undefined;
    const check = findCommand(program, "check");
    check.action((path: string) => {
      receivedPath = path;
    });

    await program.parseAsync(["node", "sekko-arch", "check"]);

    expect(receivedPath).toBe(".");
  });

  it("gate accepts optional path defaulting to '.'", async () => {
    const program = createProgram();
    program.exitOverride();
    program.configureOutput({ writeErr: () => {}, writeOut: () => {} });

    let receivedPath: string | undefined;
    const gate = findCommand(program, "gate");
    gate.action((path: string) => {
      receivedPath = path;
    });

    await program.parseAsync(["node", "sekko-arch", "gate"]);

    expect(receivedPath).toBe(".");
  });

  it("gate has --save option", () => {
    const program = createProgram();
    const gate = findCommand(program, "gate");
    const saveOption = gate.options.find((opt) => opt.long === "--save");
    expect(saveOption).toBeDefined();
  });

  it("gate --save defaults to false", async () => {
    const program = createProgram();
    program.exitOverride();
    program.configureOutput({ writeErr: () => {}, writeOut: () => {} });

    await program.parseAsync(["node", "sekko-arch", "gate"]);

    const gate = findCommand(program, "gate");
    expect(gate.opts<{ save: boolean }>().save).toBe(false);
  });

  it("has mcp subcommand", () => {
    const program = createProgram();
    const mcp = findCommand(program, "mcp");
    expect(mcp.name()).toBe("mcp");
  });

  it("gate --save can be enabled", async () => {
    const program = createProgram();
    program.exitOverride();
    program.configureOutput({ writeErr: () => {}, writeOut: () => {} });

    await program.parseAsync(["node", "sekko-arch", "gate", "--save"]);

    const gate = findCommand(program, "gate");
    expect(gate.opts<{ save: boolean }>().save).toBe(true);
  });
});
