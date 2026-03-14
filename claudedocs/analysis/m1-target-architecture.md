# Target Architecture Analysis: archana M1

## Module Structure

archana M1 is organized as a 6-phase pipeline with clear module boundaries. The target directory structure:

```
src/
  index.ts              # CLI entry point (commander setup)
  types/
    core.ts             # FileNode, StructuralAnalysis, FuncInfo, ClassInfo, ImportInfo
    snapshot.ts         # Snapshot, ImportGraph types
    metrics.ts          # HealthReport, DimensionGrades, FileMetric, FuncMetric
    rules.ts            # RulesConfig, Constraints, LayerDef, BoundaryRule
  scanner/
    index.ts            # scan orchestrator (file collection + line counting)
    git-files.ts        # git ls-files wrapper
    fs-walk.ts          # fallback filesystem walk
    line-counter.ts     # code/comment/blank classification
  parser/
    index.ts            # tree-sitter parse orchestrator
    ts-grammar.ts       # tree-sitter TypeScript grammar setup
    extractors.ts       # function, class, import extraction from AST
    complexity.ts       # McCabe cyclomatic complexity computation
  graph/
    index.ts            # graph construction orchestrator
    resolver.ts         # oxc-resolver integration for import resolution
    import-graph.ts     # ImportGraph builder (file-to-file edges)
  metrics/
    index.ts            # metrics computation orchestrator
    cycles.ts           # Tarjan SCC (iterative)
    fan-maps.ts         # fan-in / fan-out computation
    coupling.ts         # SDP-aware coupling score + stable module detection
    depth.ts            # max transitive dependency chain
    god-files.ts        # god file detection (fan-out > 15)
    complex-fns.ts      # complex function ratio (CC > 15)
    levelization.ts     # Kahn topological sort + upward violations
    blast-radius.ts     # reverse BFS transitive dependents
    module-boundary.ts  # depth-2 directory module detection + degenerate warnings
  grading/
    index.ts            # per-dimension grading + composite grade
    thresholds.ts       # named grade threshold constants
  rules/
    index.ts            # rules engine orchestrator
    toml-parser.ts      # TOML loading for .archana/rules.toml
    constraints.ts      # constraint rule checking
    layers.ts           # layer direction enforcement
    boundaries.ts       # from/to deny pattern matching
  cli/
    index.ts            # commander setup with scan/check/gate
    scan.ts             # scan command implementation
    check.ts            # check command implementation
    gate.ts             # gate command (--save and compare)
    formatters/
      table.ts          # human-readable table output
      json.ts           # JSON output
  utils/
    glob.ts             # simple glob matching for rules
    module-of.ts        # module_of() helper (depth-2 directory extraction)
```

## Dependency Flow

The dependency graph flows strictly downward through the pipeline phases:

```
cli/ --> scanner/ --> parser/ --> graph/ --> metrics/ --> grading/
 |          |           |          |           |            |
 +----------+-----------+----------+-----------+------------+-- types/
 |
 +--> rules/ --> types/
 +--> cli/formatters/ --> types/
```

Key constraints:
1. `types/` is a leaf module (zero outgoing dependencies) -- the stable foundation
2. `scanner/` depends only on `types/` and `utils/`
3. `parser/` depends on `types/` only
4. `graph/` depends on `types/` and uses oxc-resolver (external)
5. `metrics/` depends on `types/` and `utils/`
6. `grading/` depends on `types/` only
7. `rules/` depends on `types/` only
8. `cli/` is the top-level orchestrator -- depends on everything
9. `utils/` is a leaf module with pure utility functions

## Integration Points

### Phase 1 -> Phase 2: File Collection to Line Counting
- Input: project root path
- Output: `FileNode[]` with path, name, lang, line counts (code/comment/blank)
- scanner/ performs both file collection and line counting in a single pass

### Phase 2 -> Phase 3: Line Counting to Parsing
- Input: `FileNode[]` (TS files only)
- Output: `FileNode[]` enriched with `StructuralAnalysis` (functions, classes, imports)
- Failed parses: skip file with warning, set `sa = undefined` (file still counted in denominators)

### Phase 3 -> Phase 4: Parsing to Graph Construction
- Input: `FileNode[]` with import specifiers in `StructuralAnalysis.imports`
- Output: `ImportGraph` (adjacency list of file-to-file edges)
- oxc-resolver resolves specifiers to absolute paths, then relativized to project root
- Bare npm specifiers (no `.` or `/` prefix) are filtered out

### Phase 4 -> Phase 5: Graph to Metrics
- Input: `ImportGraph` + `FileNode[]`
- Output: raw metric values (cycle count, coupling score, depth, god files, complex fns, levelization ratio, blast radius ratio)

### Phase 5 -> Phase 6: Metrics to Grading + Output
- Input: raw metric values
- Output: `HealthReport` with per-dimension grades + composite grade
- CLI formats as table or JSON

## Review Findings Addressed

1. **Parse failure recovery**: FileNode with `sa = undefined` is included in all denominators (total file count, total function count uses 0 for that file). Warning emitted to stderr.

2. **Worker threads**: Start single-threaded. The parser phase processes files sequentially. If benchmarks show need, `worker_threads` can be added to parser/ without changing the interface (FileNode[] in, FileNode[] out).

3. **Module boundary degenerate cases**: `module-boundary.ts` computes depth-2 modules and emits warnings if:
   - Fewer than 3 modules detected (likely flat structure or wrong root)
   - Any single module contains >80% of files (degenerate grouping)
