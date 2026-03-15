# M3 Architecture Analysis: Web可視化 + 進化メトリクス + DSM + テストカバレッジギャップ

## Current Module Structure and Dependencies

### Pipeline Overview (6 phases)

```
scanFiles() → parseAndExtract() → buildImportGraph() → buildMetricContext() → METRIC_COMPUTATIONS[] → computeCompositeGrade()
   scanner/       parser/             graph/              metrics/context.ts    metrics/registry.ts     grading/grade.ts
```

The pipeline is orchestrated in `src/cli/scan.ts:executePipeline()`, which is synchronous end-to-end. Key data flow:

- `scanFiles()` returns `FileNode[]` (test files excluded at scan time)
- `buildImportGraph()` returns `ImportGraph` with adjacency/reverseAdjacency maps
- `buildMetricContext()` computes derived data (fanMaps, cycles, modules, etc.) once
- `METRIC_COMPUTATIONS[]` iterates 19 entries, each receiving `MetricContext`
- `computeCompositeGrade()` uses floor(mean) capped by worst+1

### Current Module Inventory

| Module | Files | Role |
|--------|-------|------|
| `types/` | `core.ts`, `snapshot.ts`, `metrics.ts`, `rules.ts` | All interfaces and type unions |
| `scanner/` | `git-files.ts`, `fs-walk.ts`, `ignore-filter.ts`, `line-counter.ts`, `index.ts` | File collection, test file exclusion |
| `parser/` | tree-sitter parsing, structural analysis extraction | |
| `graph/` | `import-graph.ts`, `resolver.ts` | ImportGraph construction with oxc-resolver |
| `metrics/` | `context.ts`, `registry.ts`, `health.ts`, `fan-maps.ts`, 19 metric modules | Central metric pipeline |
| `grading/` | `grade.ts`, `thresholds.ts` | Composite grade, threshold lookup |
| `dimensions.ts` | Single file | DIMENSION_REGISTRY: names, labels, thresholds for all dimensions |
| `cli/` | `index.ts`, `scan.ts`, `check.ts`, `gate.ts`, `formatters/` | Commander.js commands, table/json output |
| `mcp/` | `server.ts`, `tools/` (6 tool handlers) | MCP server with scan/health/detail/session tools |
| `rules/` | `toml-parser.ts`, constraints/layers/boundaries | `.sekko-arch/rules.toml` config |

---

## Integration Points for M3 Features

### 1. Five New Metrics: Type System Extension

**Files to modify:**

- `src/types/metrics.ts` — Add 5 members to `DimensionName` union: `"codeChurn"`, `"changeCoupling"`, `"busFactor"`, `"codeAge"`, `"testCoverageGap"` (DSM is visualization-only, not a metric)
- `src/dimensions.ts` — Add 5 `DimensionConfig` entries to `DIMENSION_REGISTRY` with thresholds + `category` field to all 24 entries
- `src/metrics/registry.ts` — Add 5 `MetricComputation` entries to `METRIC_COMPUTATIONS[]`

**Current mechanism is well-designed for extension:**

- `DimensionGrades = { readonly [K in DimensionName]: DimensionResult }` — adding to the union automatically propagates type requirements
- `METRIC_COMPUTATIONS.length !== DIMENSION_NAMES.length` runtime guard catches mismatches
- `DIMENSION_REGISTRY` drives table formatter, grading, and gate comparison automatically

**Impact**: Low friction. The registry pattern was designed for exactly this kind of extension.

### 2. Git History Data: MetricContext Extension

**Files to modify:**

- `src/metrics/context.ts` — Add `gitHistory?: GitHistory` field to `MetricContext` interface, extend `buildMetricContext()` to accept git data
- New file: `src/git/` module for git log parsing and data structures

**New type needed:**

```typescript
interface GitHistory {
  readonly fileChurns: ReadonlyMap<string, { added: number; deleted: number }>;
  readonly commitFiles: readonly { readonly files: readonly string[]; readonly author: string; readonly date: Date }[];
  readonly fileAuthors: ReadonlyMap<string, ReadonlySet<string>>;
  readonly fileLastModified: ReadonlyMap<string, Date>;
}
```

**Current MetricContext has 8 fields** (snapshot, filePaths, fanMaps, moduleAssignments, entryPoints, foundationFiles, allFunctions, cycleResult). Adding `gitHistory` makes 9 — under the 10-field threshold noted in M2 design. Total: 24 metrics (19 existing + 5 new).

**Structural friction**: `buildMetricContext()` is currently synchronous and takes only `Snapshot`. Git data collection requires `child_process` calls (potentially async). Two options:
1. Collect git data before `buildMetricContext()` and pass it in as parameter
2. Make `buildMetricContext()` accept an optional pre-computed `GitHistory`

Option 2 is preferred — keeps the existing synchronous flow and decouples git collection from context building.

### 3. Test Coverage Gap: Scanner + Graph Integration

**Key friction point**: Test files are excluded at scan time in two independent places:

- `src/scanner/git-files.ts:isTestFile()` — filters `*.test.tsx?` from git ls-files output
- `src/scanner/fs-walk.ts` — same `TEST_FILE_PATTERN` applied during filesystem walk
- `EXCLUDED_DIR_SEGMENTS` also filters `testing/` and `fixtures/` directories

**The test coverage gap metric needs test file imports**, but the current pipeline never sees test files.

**Approach (lightweight separate parse):**

1. New function in `src/scanner/` that collects test files only (inverse of current filter)
2. Parse test files' imports only (no full structural analysis needed)
3. Merge test file imports with existing `ImportGraph` to compute transitive reachability
4. Files in `Snapshot.files` not reachable from any test file = gap

**Files to modify:**
- `src/scanner/git-files.ts` — Export `isTestFile()` and `EXCLUDED_DIR_SEGMENTS` (currently private)
- New: `src/scanner/test-files.ts` — Collect test file paths
- New: `src/metrics/test-coverage-gap.ts` — Reachability analysis using graph + test imports

**Import graph reuse**: `src/graph/import-graph.ts:buildImportGraph()` operates on `FileNode[]` — test file `FileNode`s could be passed through the same function to get their resolved imports. The `knownFiles` set would need to include both source and test files for correct resolution.

### 4. Web UI / HTML Visualization

**Files to modify:**
- `src/cli/formatters/index.ts` — Register `html` formatter
- New: `src/cli/formatters/html.ts` — HTML generator with inline D3.js + JSON data
- `src/cli/index.ts` — Either add `--format html` choice or new `visualize` subcommand

**Current formatter interface:**
```typescript
interface Formatter {
  readonly format: (report: HealthReport) => string;
}
```

**Structural friction**: The `Formatter` interface takes only `HealthReport`, but the HTML visualizer needs:
- `HealthReport` for treemap (file sizes, grades)
- `ImportGraph` (or adjacency data) for DSM view
- `Snapshot.files` for file metadata

The current `Formatter` signature is too narrow. Options:
1. Widen the formatter interface to accept `PipelineResult` (snapshot + health)
2. Create a separate visualization pipeline that bypasses the formatter abstraction
3. Pack extra data into `HealthReport` (violates its current clean interface)

**Recommended**: Option 2 — a `visualize` subcommand that calls `executePipeline()` and generates HTML from the full `PipelineResult`. This avoids modifying the existing formatter contract. Optionally, a simplified `--format html` could generate a metrics-only HTML without DSM.

### 5. DSM Visualization (Visualization-Only, Not a Metric)

**Data source**: The existing `ImportGraph.adjacency` map already contains the full dependency matrix. DSM is a direct rendering of this data as an NxN matrix.

**Module-level aggregation**: `src/metrics/module-boundary.ts:computeModuleAssignments()` assigns files to depth-2 directory modules. This can be reused to aggregate the DSM to module level, reducing the matrix from potentially 500+ files to ~10-20 modules.

**No new metric computation needed** — DSM is visualization-only per Design Doc decision. It reuses `moduleAssignments` + `ImportGraph.edges` data already available in the pipeline.

### 6. CLI Command Structure

**Current commands**: `scan`, `check`, `gate`, `mcp`

**Format option**: Currently `--format` is a program-level option with choices `["table", "json"]`. Adding `html` here is straightforward syntactically but semantically awkward because HTML output is multi-KB and includes visualization data beyond what table/json show.

**Recommendation**: Add `visualize` as a new subcommand. It naturally encapsulates the different data requirements (needs `PipelineResult` not just `HealthReport`) and the different output semantics (file generation vs stdout).

### 7. MCP Tool Impact

**Current**: 6 tools, handled via if-chain in `handleToolCall()`.

**M3 additions**: Per Design Doc, 0 new MCP tools. The existing `scan` tool's `dimensions` filter parameter provides access to all 5 new metrics. `visualize` has low MCP value (would only return file path). Current 6 tools remain under the 10-tool threshold.

**No structural friction** — no MCP changes needed in M3 scope.

### 8. rules.toml Extension for Git Config

**Files to modify:**
- `src/types/rules.ts` — Add `EvolutionConfig` interface and `evolution?` field to `RulesConfig`
- `src/rules/toml-parser.ts` — Add `toEvolutionConfig()` parser function

**Current pattern** (constraints, layers, boundaries, ignore) is clean and extensible. Adding `[evolution]` section follows the same pattern exactly.

### 9. Table Formatter: Category Grouping

**Files to modify:**
- `src/cli/formatters/table.ts` — Add category headers when iterating `DIMENSION_REGISTRY`
- `src/dimensions.ts` — Add `category` field to `DimensionConfig`

**Current**: Table formatter iterates `DIMENSION_REGISTRY` in order, printing each dimension as a flat row. 24 rows without grouping would be hard to read.

**Approach**: Add `category: string` to `DimensionConfig`, then group dimensions by category in the formatter. Categories per Design Doc: "モジュール構造", "ファイル・関数", "アーキテクチャ", "進化", "テスト・構造".

### 10. Grading: 24-Metric Composite

**Current formula** in `src/grading/grade.ts`: `min(floor(mean(all_values)), worst + 1)`.

With 24 dimensions, the mean becomes more resistant to individual poor scores. The worst+1 cap ensures a single F still drags composite to at most D. No formula change needed. Design Doc explicitly chose uniform 24-metric average over category-weighted.

**Concern**: With 24 metrics, the probability of at least one dimension scoring poorly increases. The worst+1 cap may make composite grade volatile. This is a design policy question, not a code issue.

---

## Structural Friction Summary

### High Friction

1. **Test file exclusion is deeply embedded**: Both `git-files.ts` and `fs-walk.ts` hardcode test file exclusion at the earliest pipeline stage. The test coverage gap metric needs test file data that the pipeline deliberately discards. A separate test file collection path is required.

2. **Formatter interface is too narrow for HTML**: `Formatter.format(HealthReport)` cannot support DSM visualization which needs `ImportGraph` data. Either the interface must widen or HTML generation must bypass the formatter abstraction.

3. **Pipeline is synchronous, git operations are I/O-heavy**: `executePipeline()` is fully synchronous. Git log parsing for evolution metrics could take seconds on large repos. Either the pipeline stays sync (acceptable for CLI) or git collection happens as a pre-step. Since `execSync` is already used for `git ls-files`, using `execSync` for `git log` is consistent but blocks.

### Medium Friction

4. **`buildMetricContext()` signature**: Currently takes only `Snapshot`. Must be extended to accept optional `GitHistory`. Not difficult but touches a central interface that all 19 existing metrics depend on.

5. **`DimensionConfig` lacks category metadata**: Adding category grouping requires a new field in `DimensionConfig` and changes to every entry in `DIMENSION_REGISTRY` (19 existing + 5 new = 24 total).

6. **`DETAIL_FORMATTERS` in table.ts**: This `Record<DimensionName, DetailFormatter>` must have an entry for every dimension name — adding 5 dimensions requires 5 new formatter entries. Compile-time enforced, so forgetting one is caught.

### Low Friction

7. **`DimensionName` union extension**: TypeScript union type + `DIMENSION_REGISTRY` array is designed for additive changes. Adding 5 members propagates type safety automatically.

8. **MCP tool registration**: Copy-paste pattern, no structural issues.

9. **rules.toml extension**: Follows established parser pattern exactly.

10. **Composite grade formula**: Works unchanged with 25 metrics.

---

## Files Requiring Modification (by priority)

### Must Change
| File | Change |
|------|--------|
| `src/types/metrics.ts` | Add 5 members to `DimensionName` union |
| `src/dimensions.ts` | Add 5 `DimensionConfig` entries + `category` field to all 24 entries |
| `src/metrics/context.ts` | Add optional `gitHistory` to `MetricContext`, extend `buildMetricContext()` |
| `src/metrics/registry.ts` | Add 5 `MetricComputation` entries |
| `src/metrics/health.ts` | Accept optional `GitHistory` and pass to `buildMetricContext()` |
| `src/cli/formatters/table.ts` | Category grouping, 5 new `DETAIL_FORMATTERS` entries |
| `src/cli/scan.ts` | Collect git history pre-pipeline, pass to `computeHealth()`, add `visualize` command logic |
| `src/scanner/git-files.ts` | Export `isTestFile()` for reuse by test-coverage-gap |

### Must Create
| File | Purpose |
|------|---------|
| `src/git/types.ts` | `GitHistory`, `GitCommitInfo` types |
| `src/git/collector.ts` | `git log` execution and parsing |
| `src/git/index.ts` | Module barrel |
| `src/metrics/code-churn.ts` | Churn concentration metric |
| `src/metrics/change-coupling.ts` | Co-change frequency metric |
| `src/metrics/bus-factor.ts` | Author concentration metric |
| `src/metrics/code-age.ts` | File staleness metric |
| `src/metrics/test-coverage-gap.ts` | Reachability-based gap detection |
| `src/scanner/test-files.ts` | Test file collection (inverse of current filter) |
| `src/cli/visualize.ts` | `visualize` subcommand implementation |
| `src/cli/html-generator.ts` | HTML report generator with D3.js CDN, Treemap + DSM |

### Must Change (Secondary)
| File | Change |
|------|---------|
| `src/cli/index.ts` | Add `visualize` subcommand |
| `src/types/rules.ts` | Add `EvolutionConfig` interface |
| `src/rules/toml-parser.ts` | Parse `[evolution]` section |
| `src/testing/fixtures.ts` | Update `DEFAULT_RAW_VALUES` and helpers for 24 dimensions |
