# sekko-arch Project Overview

## Purpose
TypeScript CLI that statically analyzes TypeScript project architecture and scores it A-F across 24 dimensions (19 static + 4 git-history evolution + 1 test coverage gap). Built for AI-agent workflows. Includes MCP server and HTML visualization (Treemap + DSM).

## Tech Stack
- TypeScript (ESM only, NodeNext module resolution)
- Node.js >= 18
- tree-sitter + tree-sitter-typescript for parsing
- oxc-resolver for module resolution
- commander.js for CLI
- @modelcontextprotocol/sdk for MCP server
- zod for validation
- vitest for testing
- tsup for bundling
- eslint + prettier for code quality

## Structure
```
src/
  cli/        — Commander.js commands (scan, check, gate, visualize, mcp) + formatters
  parser/     — tree-sitter parsing, imports/functions/classes/complexity extraction
  graph/      — Import dependency graph with adjacency lists, oxc-resolver
  git/        — Git history collection for evolution metrics
  metrics/    — 24 metric computations registered in registry.ts
  grading/    — A-F thresholds per dimension
  rules/      — TOML-based config (.sekko-arch/rules.toml)
  scanner/    — File enumeration via git ls-files or filesystem walk
  mcp/        — MCP server (stdio) with 6 tool handlers
  types/      — Core interfaces
  testing/    — Fixture helpers
  e2e/        — End-to-end tests with fixture project
```

## Pipeline
scan files → parse (tree-sitter) → build import graph (oxc-resolver) → compute metrics → grade → format output
