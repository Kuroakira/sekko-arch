# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

sekko-arch is a TypeScript CLI that statically analyzes TypeScript project architecture and scores it A-F across 7 dimensions (cycles, coupling, depth, god-files, complex-functions, levelization, blast-radius). Built for AI-agent workflows where structural health degrades during code generation.

## Commands

```bash
npm run build          # tsup → dist/ (ESM only)
npm test               # vitest (414 tests)
npm run typecheck      # tsc --noEmit
npm run lint           # eslint src/
npm run format         # prettier --write src/
npm run format:check   # prettier --check src/

# Single test file
npx vitest src/metrics/cycles.test.ts

# Single test by name
npx vitest -t "detects a single cycle"

# CLI usage (after build)
npx sekko-arch scan .
npx sekko-arch scan . --format json
npx sekko-arch check .          # validates .archana/rules.toml
npx sekko-arch gate . --save    # save baseline, then `gate .` to compare
```

## Architecture

**Pipeline**: scan files → parse (tree-sitter) → build import graph (oxc-resolver) → compute metrics → grade → format output

Key directories under `src/`:

- **parser/**: tree-sitter-typescript parsing, extracts imports/functions/classes/complexity
- **graph/**: Import dependency graph with adjacency + reverse adjacency lists, oxc-resolver for module resolution
- **metrics/**: 7 metric computations registered in `registry.ts`, each takes `MetricContext` and returns `DimensionResult`
- **grading/**: `DIMENSION_REGISTRY` in `thresholds.ts` defines A-F thresholds per dimension. Composite grade = floor(mean) capped by worst+1
- **rules/**: TOML-based config (`.archana/rules.toml`) for constraints, layer ordering, boundary enforcement
- **scanner/**: File enumeration via `git ls-files` (preferred) or filesystem walk fallback
- **cli/**: Commander.js commands (scan, check, gate) + table/JSON formatters
- **types/**: Core interfaces — `FileNode`, `Snapshot`, `ImportGraph`, `HealthReport`, `DimensionResult`
- **testing/**: Fixture helpers (`makeHealth`, `makeAdj`, `makeFileNode`) used across all tests

**Central config**: `src/dimensions.ts` exports `DIMENSION_REGISTRY` — single source of truth for dimension names, thresholds, and display metadata. Used by grading, formatters, and gate comparison.

**MetricContext pattern**: All metrics receive a shared context object containing snapshot, cycle results, fan maps, module assignments, and function list — computed once and passed through.

## Conventions

- ESM only (NodeNext module resolution), Node.js >= 18
- Tests: `*.test.ts` colocated with source files, use `describe/it/expect` from vitest (globals: false)
- E2E tests in `src/e2e/` use fixture project at `src/e2e/fixtures/`
- Types use `readonly` arrays and properties for immutability
- No `any` (ESLint enforced), unused params prefixed with `_`
- Constants in UPPER_SNAKE_CASE, types in PascalCase
- Documentation and design docs live in `claudedocs/`
