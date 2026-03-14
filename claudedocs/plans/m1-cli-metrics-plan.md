# Implementation Plan: archana M1

## Overview

archana M1 delivers a TypeScript CLI tool that analyzes architecture quality of TypeScript codebases. It builds a dependency graph using tree-sitter parsing and oxc-resolver import resolution, computes 7 metrics across 3 categories, grades each A-F, and provides scan/check/gate commands for CI integration. Target: 5,000 files in 15 seconds on 4 cores.

The implementation follows the 6-phase pipeline (File Collection -> Line Counting -> Parsing -> Graph Construction -> Metrics -> Output) with 38 tasks organized into 8 implementation groups. Groups are ordered by dependency: foundation first, then each pipeline phase, then CLI on top.

---

## Implementation Groups

| Group | Name | Tasks | Description |
|-------|------|-------|-------------|
| A | Foundation (done) | 1-2 | Project init, dependencies |
| B | Type System (done) | 3-5 | Core, snapshot, metrics, rules types |
| C | Scanner Pipeline (done) | 6-10 | Utils, file collection, line counting |
| D | Parser Pipeline (done) | 11-15 | tree-sitter setup, extraction, complexity |
| E | Graph & Metrics (done) | 16-25 | Import resolution, graph, all 7 metrics |
| F | Grading & Output (done) | 26-31 | Grading, CLI commands, formatters |
| G | Rules Engine | 32-37 | TOML parsing, constraints, check/gate commands |
| H | Polish & Validation | 38-40 | E2E tests, perf benchmark, error handling |

### Dependency Flow

```
A (done) → B (done) → C (done) → D (done) → E (done) → F (done) → G → H
                              ↘ F (grading is independent of rules)
```

---

## Implementation Rules

### TDD徹底

全タスクでRED-GREEN-REFACTORサイクルを厳守する。

1. **RED**: テストを先に書く。実装コードより前にテストファイルを作成し、失敗することを確認する
2. **GREEN**: テストが通る最小限の実装を書く
3. **REFACTOR**: テストが通った状態でリファクタリングする

- テストファイルは実装ファイルと同じディレクトリに `*.test.ts` として配置する
- 各タスク完了時に `npm run typecheck && npm test && npm run build` を全て通すこと
- テストを後回しにしない。テストなしの実装コードをコミットしない
- エッジケース（空入力、不正データ、境界値）を必ずテストに含める

---

## Task List

### Group A: Foundation (done)

### Task 1: Project Initialization

- **Description**: Initialize the TypeScript project with package.json, tsconfig.json, vitest config, tsup config, and .gitignore. Set up the directory structure (src/ with subdirectories: types, scanner, parser, graph, metrics, grading, rules, cli, utils).
- **Files**: `package.json`, `tsconfig.json`, `vitest.config.ts`, `tsup.config.ts`, `.gitignore`, `src/index.ts` (stub)
- **Dependencies**: none
- **Tests**: `npm run build` succeeds, `npm test` runs (with no tests yet)
- **Acceptance criteria**: Project compiles, test runner works, directory structure exists

### Task 2: Install Dependencies

- **Description**: Install production dependencies: tree-sitter, tree-sitter-typescript, oxc-resolver, commander, smol-toml. Install dev dependencies: vitest, tsup, typescript, @types/node.
- **Files**: `package.json` (updated)
- **Dependencies**: Task 1
- **Tests**: All packages install without errors, `import` statements resolve
- **Acceptance criteria**: `npm install` succeeds, native bindings compile

### Group B: Type System (done)

### [DONE] Task 3: Core Types - FileNode and StructuralAnalysis (completed 2026-03-14T09:55)

- **Description**: Define the core data types: `FileNode` (path, name, isDir, lines, logic, comments, blanks, funcs, lang, sa, children), `StructuralAnalysis` (functions, classes, imports), `FuncInfo` (name, startLine, endLine, lineCount, cc, paramCount), `ClassInfo` (name, methods, bases, kind), `ImportInfo` (specifier, resolved).
- **Files**: `src/types/core.ts`
- **Dependencies**: Task 1
- **Tests**: Type compilation check, sample object construction
- **Acceptance criteria**: All types are readonly/immutable where appropriate, match the design doc data model

### [DONE] Task 4: Snapshot and Graph Types (completed 2026-03-14T09:56)

- **Description**: Define `Snapshot` (root FileNode, totalFiles, totalLines, importGraph), `ImportEdge` (fromFile, toFile), `ImportGraph` (edges array + adjacency helpers).
- **Files**: `src/types/snapshot.ts`
- **Dependencies**: Task 3
- **Tests**: Snapshot construction from sample data
- **Acceptance criteria**: Snapshot is immutable after construction

### [DONE] Task 5: Metrics and Report Types (completed 2026-03-14T09:57)

- **Description**: Define `HealthReport`, `DimensionGrades` (7 dimensions: cycles, coupling, depth, godFiles, complexFn, levelization, blastRadius), `FileMetric`, `FuncMetric`, `RuleCheckResult`, `RuleViolation`, `Severity`.
- **Files**: `src/types/metrics.ts`, `src/types/rules.ts`
- **Dependencies**: Task 3
- **Tests**: Type compilation check
- **Acceptance criteria**: All report types match design doc specification

### Group C: Scanner Pipeline (done)

### [DONE] Task 6: Utility - module_of and Glob Matching (completed 2026-03-14T10:07)

- **Description**: Implement `moduleOf(path)` that extracts depth-2 directory (e.g., `src/auth/login.ts` -> `src/auth`). Implement `globMatch(pattern, path)` supporting `*`, `**`, and prefix matching for the rules engine.
- **Files**: `src/utils/module-of.ts`, `src/utils/glob.ts`
- **Dependencies**: Task 1
- **Tests**: Unit tests for moduleOf with various path depths, globMatch with all pattern types
- **Acceptance criteria**: moduleOf matches sentrux's behavior (depth-2 boundary), globMatch handles `dir/*`, `dir/**`, `*.ext`, exact match, prefix match

### [DONE] Task 7: File Scanner - git ls-files (completed 2026-03-14T10:10)

- **Description**: Implement file collection using `child_process.execSync('git ls-files')`. Parse output, filter to `.ts` and `.tsx` extensions. Return array of relative paths.
- **Files**: `src/scanner/git-files.ts`
- **Dependencies**: Task 1
- **Tests**: Unit test with mock execSync, integration test on actual git repo
- **Acceptance criteria**: Returns only tracked TS/TSX files, handles non-git directories gracefully (returns null)

### [DONE] Task 8: File Scanner - Filesystem Walk Fallback (completed 2026-03-14T10:13)

- **Description**: Implement recursive filesystem walk for non-git directories. Respect .gitignore patterns if present. Filter to `.ts`/`.tsx`. Exclude `node_modules`, `dist`, `.git` by default.
- **Files**: `src/scanner/fs-walk.ts`
- **Dependencies**: Task 1
- **Tests**: Unit test with temp directory structure
- **Acceptance criteria**: Correctly walks directories, skips excluded paths, handles symlinks safely

### [DONE] Task 9: File Scanner - Line Counter (completed 2026-03-14T10:18)

- **Description**: Implement line counting that classifies each line as code, comment, or blank. Handle TypeScript comment styles: `//` single-line, `/* */` multi-line blocks. Use a state machine to track block comment state across lines.
- **Files**: `src/scanner/line-counter.ts`
- **Dependencies**: Task 1
- **Tests**: Unit tests with sample TS content including edge cases (string literals containing //, nested comments, template literals)
- **Acceptance criteria**: Accurate classification matching common tools, handles all TS comment patterns

### [DONE] Task 10: File Scanner - Orchestrator (completed 2026-03-14T10:21)

- **Description**: Wire together git-files (or fs-walk fallback) with line counting. Build `FileNode[]` with path, name, lang, and line counts populated. Detect language from extension.
- **Files**: `src/scanner/index.ts`
- **Dependencies**: Tasks 7, 8, 9, 3
- **Tests**: Integration test scanning a small test fixture directory
- **Acceptance criteria**: Returns complete FileNode array with all line count fields populated

### Group D: Parser Pipeline

### [DONE] Task 11: Parser - tree-sitter Setup (completed 2026-03-14T10:29)

- **Description**: Initialize tree-sitter with TypeScript grammar. Create a reusable parser instance. Implement `parseFile(source: string): Tree` wrapper that handles parse failures (returns null + warning).
- **Files**: `src/parser/ts-grammar.ts`
- **Dependencies**: Task 2
- **Tests**: Parse a valid TS file, parse an invalid file (returns null)
- **Acceptance criteria**: tree-sitter parses TypeScript correctly, failures are caught and logged

### [DONE] Task 12: Parser - Function and Class Extraction (completed 2026-03-14T12:03)

- **Description**: Extract functions (name, startLine, endLine, lineCount, paramCount) and classes (name, methods, kind) from a tree-sitter parse tree using query patterns. Handle function declarations, arrow functions, method definitions. Handle class declarations, interfaces, type aliases.
- **Files**: `src/parser/extractors.ts`
- **Dependencies**: Task 11, Task 3
- **Tests**: Unit tests with various TS function/class styles (named, arrow, method, async, generator, interface, type alias)
- **Acceptance criteria**: All common TS function and class patterns are extracted correctly

### [DONE] Task 13: Parser - Cyclomatic Complexity (completed 2026-03-14T12:03)

- **Description**: Compute extended cyclomatic complexity (Myers 1977) per function. Count: if, else if, for, while, do-while, switch case, catch, ternary (?), &&, ||, ??. Use tree-sitter query to capture branch nodes within each function's line range.
- **Files**: `src/parser/complexity.ts`
- **Dependencies**: Task 11
- **Tests**: Unit tests with known-CC functions (linear=1, single if=2, nested=3+, boolean operators)
- **Acceptance criteria**: CC values match manual counting, includes boolean operators (extended CC)

### [DONE] Task 14: Parser - Import Extraction (completed 2026-03-14T12:07)

- **Description**: Extract import specifiers from tree-sitter parse tree. Handle: `import ... from 'x'`, `import('x')`, `export ... from 'x'`, `require('x')`. Store raw specifier strings.
- **Files**: `src/parser/extractors.ts` (extend)
- **Dependencies**: Task 11
- **Tests**: Unit tests with all import styles (static, dynamic, re-export, require)
- **Acceptance criteria**: All static import/export patterns captured, dynamic imports detected

### [DONE] Task 15: Parser - Orchestrator (completed 2026-03-14T12:13)

- **Description**: Wire function/class/import extraction into a single `parseAndExtract(fileNode, source)` function. Populate `FileNode.sa` (StructuralAnalysis). Handle parse failures: set `sa = undefined`, log warning, continue.
- **Files**: `src/parser/index.ts`
- **Dependencies**: Tasks 11, 12, 13, 14, 3
- **Tests**: Integration test parsing a small TS file, verify all SA fields populated
- **Acceptance criteria**: FileNode.sa correctly populated, parse failures produce warning + undefined sa (file still in results)

### Group E: Graph & Metrics (done)

### [DONE] Task 16: Graph - Import Resolution with oxc-resolver (completed 2026-03-14T12:30)

- **Description**: Use oxc-resolver to resolve import specifiers to absolute file paths. Configure with tsconfig.json paths if present. Filter out bare npm specifiers (no `.` or `/` prefix). Relativize resolved paths to project root.
- **Files**: `src/graph/resolver.ts`
- **Dependencies**: Task 2, Task 3
- **Tests**: Unit tests with tsconfig paths, relative imports, bare specifiers (filtered), barrel file re-exports
- **Acceptance criteria**: Correctly resolves TS imports including path aliases, filters npm packages

### [DONE] Task 17: Graph - Import Graph Builder (completed 2026-03-14T12:30)

- **Description**: Build `ImportEdge[]` from resolved imports. For each file's `sa.imports`, resolve each specifier and create an edge. Deduplicate edges. Build adjacency list helper.
- **Files**: `src/graph/import-graph.ts`, `src/graph/index.ts`
- **Dependencies**: Tasks 16, 4
- **Tests**: Integration test with multi-file TS fixture, verify edges match expected dependencies
- **Acceptance criteria**: ImportGraph correctly represents file-to-file dependencies, no self-edges, no npm packages

### [DONE] Task 18: Metrics - Fan-in/Fan-out Maps (completed 2026-03-14T12:23)

- **Description**: Compute per-file fan-in (number of files importing this file) and fan-out (number of files this file imports) from ImportEdge array.
- **Files**: `src/metrics/fan-maps.ts`
- **Dependencies**: Task 4
- **Tests**: Unit test with known edge set, verify fan counts
- **Acceptance criteria**: Correct fan-in/fan-out counts for all files in the graph

### [DONE] Task 19: Metrics - Module Boundary Detection (completed 2026-03-14T12:23)

- **Description**: Compute depth-2 module assignments using `moduleOf()`. Detect degenerate cases: warn if <3 modules or single module has >80% of files. Compute `isSameModule()` for coupling calculations.
- **Files**: `src/metrics/module-boundary.ts`
- **Dependencies**: Task 6
- **Tests**: Unit tests with various directory structures, degenerate case warnings
- **Acceptance criteria**: Module assignments match sentrux behavior, warnings emitted for degenerate cases

### [DONE] Task 20: Metrics - Tarjan SCC (Cycles) (completed 2026-03-14T12:25)

- **Description**: Implement iterative Tarjan's SCC algorithm. Return only SCCs with >1 member (actual cycles). Return cycle count and member files per cycle.
- **Files**: `src/metrics/cycles.ts`
- **Dependencies**: Task 4
- **Tests**: Unit tests: acyclic graph (0 cycles), single cycle, multiple cycles, self-loop (not a cycle)
- **Acceptance criteria**: Correct cycle detection matching sentrux's Tarjan implementation, iterative (no stack overflow)

### [DONE] Task 21: Metrics - Coupling Score (SDP-aware) (completed 2026-03-14T12:28)

- **Description**: Compute coupling score: ratio of cross-module edges to unstable targets vs total edges. Implement stable module detection using cascading instability check (I <= 0.15, fan-in >= 3). Edges to stable modules are excluded from coupling numerator.
- **Files**: `src/metrics/coupling.ts`
- **Dependencies**: Tasks 18, 19, 4
- **Tests**: Unit tests: all-intra-module (0.0), all cross-to-unstable (high), cross-to-stable (excluded), cascading stability
- **Acceptance criteria**: Coupling score matches sentrux's SDP-aware calculation, stable modules correctly identified

### [DONE] Task 22: Metrics - Depth (Max Transitive Chain) (completed 2026-03-14T12:25)

- **Description**: Compute maximum dependency depth using iterative longest-path DFS from seed nodes (entry points or root nodes with fan-in=0). Cap at node count to handle cycles.
- **Files**: `src/metrics/depth.ts`
- **Dependencies**: Task 4
- **Tests**: Unit tests: linear chain (depth=N), tree (depth=max path), cycle (capped), empty graph (0)
- **Acceptance criteria**: Correct max depth matching sentrux implementation

### [DONE] Task 23: Metrics - God Files and Complex Functions (completed 2026-03-14T12:28)

- **Description**: Detect god files (fan-out > 15, excluding entry points). Compute complex function ratio (CC > 15 / total functions). Entry point detection: files named `index.ts`, `main.ts`, or containing `createApp`/`createServer` patterns.
- **Files**: `src/metrics/god-files.ts`, `src/metrics/complex-fns.ts`
- **Dependencies**: Tasks 18, 3
- **Tests**: Unit tests with known fan-out values and CC values
- **Acceptance criteria**: God files correctly identified (entry points excluded), complex function ratio accurate

### [DONE] Task 24: Metrics - Levelization (Kahn Topological Sort) (completed 2026-03-14T12:28)

- **Description**: Implement levelization via Kahn's topological sort on the SCC DAG. Compute per-file levels (0 = leaf). Detect upward violations (edges from lower level to higher level + intra-SCC edges). Compute upward violation ratio.
- **Files**: `src/metrics/levelization.ts`
- **Dependencies**: Tasks 20, 4
- **Tests**: Unit tests: clean DAG (0 violations), cycle (intra-SCC violations), mixed graph
- **Acceptance criteria**: Level assignment and violation detection match sentrux's arch/graph.rs

### [DONE] Task 25: Metrics - Blast Radius (completed 2026-03-14T12:28)

- **Description**: Compute per-file blast radius via reverse BFS. For each file, count how many files are transitively reachable through reverse edges (dependents). Compute max blast radius ratio (max reach / total files). Exclude foundation files (stable modules, high fan-in files, barrel files).
- **Files**: `src/metrics/blast-radius.ts`
- **Dependencies**: Tasks 18, 19, 4
- **Tests**: Unit tests: isolated file (0), linear chain (depth-1 has max), star topology (center has max)
- **Acceptance criteria**: Blast radius matches sentrux's reverse BFS, foundation exclusion for grading

### Group F: Grading & Output (done)

### [DONE] Task 26: Metrics - Orchestrator (completed 2026-03-14T13:28)

- **Description**: Wire all metrics into `computeHealth(snapshot): HealthReport`. Call each metric computation, aggregate results into HealthReport.
- **Files**: `src/metrics/index.ts`
- **Dependencies**: Tasks 18-25, 5
- **Tests**: Integration test with sample snapshot, verify all 7 metrics populated
- **Acceptance criteria**: HealthReport fully populated with all 7 metric values and grades

### [DONE] Task 27: Grading - Per-dimension and Composite (completed 2026-03-14T13:25)

- **Description**: Implement grade thresholds for all 7 dimensions matching the design doc table. Implement composite grade: `min(floor(mean(all_dimension_values)), worst_dimension + 1)`. Grade values: A=4, B=3, C=2, D=1, F=0.
- **Files**: `src/grading/index.ts`, `src/grading/thresholds.ts`
- **Dependencies**: Task 5
- **Tests**: Unit tests for each dimension's threshold boundaries, composite grade edge cases (worst cap)
- **Acceptance criteria**: All thresholds match design doc exactly, composite formula correct

### [DONE] Task 28: CLI - Commander Setup (completed 2026-03-14T13:25)

- **Description**: Set up commander with three subcommands: `scan [path]`, `check [path]`, `gate [--save] [path]`. Default path is `.`. Add `--format` option (table/json, default: table).
- **Files**: `src/cli/index.ts`
- **Dependencies**: Task 2
- **Tests**: Commander parses all subcommands and options correctly
- **Acceptance criteria**: `archana scan .`, `archana check .`, `archana gate --save .` all parse correctly

### [DONE] Task 29: CLI - Scan Command (completed 2026-03-14T13:30)

- **Description**: Implement the scan command: run full pipeline (scanner -> parser -> graph -> metrics -> grading), output results as table or JSON. Wire together all pipeline phases.
- **Files**: `src/cli/scan.ts`
- **Dependencies**: Tasks 10, 15, 17, 26, 27, 28
- **Tests**: Integration test: scan a test fixture project, verify output contains all 7 metrics + composite grade
- **Acceptance criteria**: `archana scan` outputs complete metrics table, `--format json` outputs valid JSON

### [DONE] Task 30: CLI - Table Formatter (completed 2026-03-14T13:25)

- **Description**: Format HealthReport as a human-readable table. Show: metric name, raw value, grade for each of the 7 dimensions. Show composite grade. Use manual string padding (no library dependency).
- **Files**: `src/cli/formatters/table.ts`
- **Dependencies**: Task 5
- **Tests**: Unit test formatting a sample HealthReport
- **Acceptance criteria**: Clean, aligned table output matching design doc specification

### [DONE] Task 31: CLI - JSON Formatter (completed 2026-03-14T13:25)

- **Description**: Format HealthReport as JSON. Include all 7 metrics with raw values and grades, composite grade, and metadata (file count, scan duration).
- **Files**: `src/cli/formatters/json.ts`
- **Dependencies**: Task 5
- **Tests**: Unit test: output is valid JSON, contains all expected fields
- **Acceptance criteria**: Valid JSON output parseable by standard tools

### Group G: Rules Engine

### Task 32: Rules Engine - TOML Parser

- **Description**: Parse `.archana/rules.toml` into `RulesConfig`. Define TOML schema: `[constraints]` (max_cycles, max_coupling, max_cc, etc.), `[[layers]]` (name, paths, order), `[[boundaries]]` (from, to, reason).
- **Files**: `src/rules/toml-parser.ts`
- **Dependencies**: Task 2, Task 5
- **Tests**: Unit tests: parse valid TOML, handle missing file (return null), handle invalid TOML (error message)
- **Acceptance criteria**: Correctly parses all three rule types, graceful error handling

### Task 33: Rules Engine - Constraint Checks

- **Description**: Implement constraint rule checking: max_cycles (cycle count <= N), max_coupling (coupling grade <= X), max_cc (per-function CC <= N), no_god_files (boolean). Return violations with severity and affected files.
- **Files**: `src/rules/constraints.ts`
- **Dependencies**: Tasks 5, 32
- **Tests**: Unit tests: pass/fail for each constraint type
- **Acceptance criteria**: All constraint types enforce correctly, violations include file paths

### Task 34: Rules Engine - Layer and Boundary Checks

- **Description**: Implement layer direction enforcement: layers ordered by position/order field, imports must flow downward only. Implement boundary deny rules: files matching `from` pattern must not import files matching `to` pattern.
- **Files**: `src/rules/layers.ts`, `src/rules/boundaries.ts`
- **Dependencies**: Tasks 6, 5
- **Tests**: Unit tests: valid layer direction, layer violation, boundary violation
- **Acceptance criteria**: Layer and boundary rules match sentrux's rules engine behavior

### Task 35: Rules Engine - Orchestrator

- **Description**: Wire constraint, layer, and boundary checks into `checkRules(config, health, edges): RuleCheckResult`. Return passed/failed, violations list, rules checked count.
- **Files**: `src/rules/index.ts`
- **Dependencies**: Tasks 33, 34
- **Tests**: Integration test with sample rules and health report
- **Acceptance criteria**: All rule types checked, result aggregation correct

### Task 36: CLI - Check Command

- **Description**: Implement check command: load `.archana/rules.toml`, run full pipeline, check rules, print violations, exit 0 (pass) or 1 (violations).
- **Files**: `src/cli/check.ts`
- **Dependencies**: Tasks 29, 35
- **Tests**: Integration test: check with passing rules (exit 0), check with violations (exit 1), missing rules.toml (exit 1 with message)
- **Acceptance criteria**: Correct exit codes, violation messages include files

### Task 37: CLI - Gate Command

- **Description**: Implement gate command. `gate --save`: run pipeline, save baseline to `.archana/baseline.json` (coupling score, cycle count, god file count, complex fn count, max depth, grades). `gate` (compare): load baseline, run pipeline, compare metrics, report degradation, exit 0/1. Degradation thresholds: coupling > baseline + 0.05, any count increase, grade drop.
- **Files**: `src/cli/gate.ts`
- **Dependencies**: Tasks 29, 5
- **Tests**: Integration test: save baseline, degrade a metric, gate detects it
- **Acceptance criteria**: Baseline save/load works, degradation correctly detected, exit codes correct

### Group H: Polish & Validation

### [DONE] Task 38: End-to-End Integration Test (completed 2026-03-14T14:49)

- **Description**: Create a sample TypeScript project fixture (10-20 files with known structure: some cycles, varying complexity, clear modules). Run full `archana scan` and verify all 7 metrics produce expected grades. Run `archana check` with rules and verify pass/fail. Run `archana gate --save` then `gate` and verify no degradation.
- **Files**: `tests/fixtures/sample-project/`, `tests/e2e/full-pipeline.test.ts`
- **Dependencies**: Tasks 29, 36, 37
- **Tests**: E2E test validates entire pipeline
- **Acceptance criteria**: All commands produce correct, reproducible results on the fixture project

### [DONE] Task 39: Performance Validation (completed 2026-03-14T14:53)

- **Description**: Benchmark scan on a larger TypeScript project (or generated fixture). Verify single-threaded performance is within acceptable range. If >15 seconds at 5,000 files, identify bottleneck and document for potential worker_threads optimization.
- **Files**: `tests/bench/scan-performance.test.ts`
- **Dependencies**: Task 29
- **Tests**: Benchmark test measuring scan time
- **Acceptance criteria**: Performance measured and documented. If within 15s, mark as passing. If not, identify bottleneck (likely parser) and document worker_threads migration path.

### [DONE] Task 40: Error Handling Polish (completed 2026-03-14T15:07)

- **Description**: Review all error paths. Ensure: file read failures are skipped with warning (not crash), invalid tsconfig.json produces helpful error, permission denied is handled, empty projects produce a valid (all-A) report. Test edge cases: empty directory, single file, no TS files.
- **Files**: Various (error handling improvements across modules)
- **Dependencies**: Task 38
- **Tests**: Edge case tests for all error scenarios
- **Acceptance criteria**: No unhandled crashes, all error messages are helpful, edge cases produce reasonable output
