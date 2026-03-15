# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

sekko-arch is a TypeScript CLI that statically analyzes TypeScript project architecture and scores it A-F across 24 dimensions (19 static + 4 git-history evolution + 1 test coverage gap). Built for AI-agent workflows where structural health degrades during code generation. Includes an MCP server for direct AI agent integration and self-contained HTML visualization (Treemap + DSM).

## Commands

```bash
npm run build          # tsup → dist/ (ESM only)
npm test               # vitest (714 tests)
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
npx sekko-arch scan . --include src lib   # directory filtering
npx sekko-arch check .          # validates .sekko-arch/rules.toml
npx sekko-arch gate --save .    # save baseline, then `gate .` to compare
npx sekko-arch visualize .      # generate self-contained HTML report (Treemap + DSM)
npx sekko-arch mcp              # start MCP server (stdio transport)
```

## Architecture

**Pipeline**: scan files → parse (tree-sitter) → build import graph (oxc-resolver) → compute metrics → grade → format output

Key directories under `src/`:

- **parser/**: tree-sitter-typescript parsing, extracts imports/functions/classes/complexity. Includes `cognitive-complexity.ts` (SonarSource spec) and `function-extractors.ts` (bodyHash, cognitiveComplexity computation)
- **graph/**: Import dependency graph with adjacency + reverse adjacency lists, oxc-resolver for module resolution
- **git/**: Git history collection (`collector.ts`) for evolution metrics. `collectGitHistory()` runs `git log --numstat` and builds `GitHistory` (churns, commits, authors, last-modified). Returns `undefined` in non-git environments for graceful degradation
- **metrics/**: 24 metric computations registered in `registry.ts`, each takes `MetricContext` and returns `DimensionResult`. Includes 4 evolution metrics (`code-churn.ts`, `change-coupling.ts`, `bus-factor.ts`, `code-age.ts`) and test coverage gap (`test-coverage-gap.ts`)
- **grading/**: `DIMENSION_REGISTRY` in `thresholds.ts` defines A-F thresholds per dimension. Composite grade = floor(mean) capped by worst+1
- **rules/**: TOML-based config (`.sekko-arch/rules.toml`) for constraints, layer ordering, boundary enforcement, ignore patterns
- **scanner/**: File enumeration via `git ls-files` (preferred) or filesystem walk fallback. `ignore-filter.ts` for picomatch-based glob filtering, `--include` for directory whitelisting
- **cli/**: Commander.js commands (scan, check, gate, visualize, mcp) + table/JSON formatters. Table formatter shows category headers and problem area details for C/D/F grades. `html-generator.ts` produces self-contained HTML with Treemap + DSM views (D3.js CDN)
- **mcp/**: MCP server (stdio transport) with 6 tool handlers — scan, health, coupling_detail, cycles_detail, session_start, session_end. In-memory session state for baseline comparison
- **types/**: Core interfaces — `FileNode`, `Snapshot`, `ImportGraph`, `HealthReport`, `DimensionResult`, `IgnoreConfig`
- **testing/**: Fixture helpers (`makeHealth`, `makeAdj`, `makeFileNode`) used across all tests

**Central config**: `src/dimensions.ts` exports `DIMENSION_REGISTRY` — single source of truth for 24 dimension names, thresholds, categories, and display metadata. Used by grading, formatters, gate comparison, and MCP tools. Each entry has a `category` field for grouped display.

**MetricContext pattern**: All metrics receive a shared context object containing snapshot, cycle results, fan maps, module assignments, function list, and optional `gitHistory` + `evolutionConfig` — computed once and passed through.

**24 Dimensions** (5 categories):
- Module structure: cycles, coupling, cohesion, entropy
- File/function: godFiles, complexFn, cognitiveComplexity, longFunctions, largeFiles, highParams, duplication, deadCode, comments
- Architecture: depth, levelization, blastRadius, distanceFromMainSeq, attackSurface, hotspots
- Evolution (git-based): codeChurn, changeCoupling, busFactor, codeAge
- Test/structure: testCoverageGap

**Git graceful degradation**: Evolution metrics skip (rawValue=0, grade=A) when git is unavailable. Pipeline is synchronous — git data is collected pre-pipeline and injected via `MetricContext.gitHistory`.

**Filter pipeline**: File collection → `--include` filter (whitelist) → `[ignore]` filter (blacklist) → scanning

## Conventions

- ESM only (NodeNext module resolution), Node.js >= 18
- Tests: `*.test.ts` colocated with source files, use `describe/it/expect` from vitest (globals: false)
- E2E tests in `src/e2e/` use fixture project at `src/e2e/fixtures/`
- Types use `readonly` arrays and properties for immutability
- No `any` (ESLint enforced), unused params prefixed with `_`
- Constants in UPPER_SNAKE_CASE, types in PascalCase
- Documentation and design docs live in `claudedocs/`
- Inverted scoring pattern: cohesion and comments use `rawValue = 1 - ratio` before grading
- Git evolution metrics: each metric handles `gitHistory === undefined` by returning rawValue=0. Registry does not invert these values
- HTML generation bypasses Formatter abstraction — `visualize` command generates HTML directly from PipelineResult
