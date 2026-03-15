# Architecture Analysis: Pre-Group F Refactoring

**Date**: 2026-03-15
**Scope**: Project-wide analysis before M3 Group F (Web visualization) implementation
**Branch**: feature/m3-gui-evolution-dsm

## Self-Scan Results (Post-Refactoring)

| Dimension | Grade | Raw Value | Notes |
|-----------|-------|-----------|-------|
| cycles | A | 0 | No circular imports |
| coupling | B | 0.26 | Good module separation |
| cohesion | A | 0.50 | High |
| entropy | D | 0.78 | metrics/ has 63 files (30% of codebase) |
| godFiles | C | 0.012 | registry.ts (expected, declarative config) |
| complexFn | B | 0.023 | Improved after refactoring |
| cognitiveComplexity | C | 0.094 | Improved from D (0.106) after refactoring |
| depth | C | 10 | Acceptable |
| blastRadius | C | 0.247 | Moderate |
| distanceFromMainSeq | C | 0.682 | src/mcp module |
| attackSurface | D | 0.953 | CLI+MCP entry points, by design |
| busFactor | F | 1.0 | Solo project, structurally unavoidable |
| changeCoupling | D | 0.058 | Natural coupling |
| **Composite** | **D** | — | Driven by busFactor F + attackSurface D |

## Refactoring Performed

### 1. handleToolCall() → Dispatch Table (CC 22 → ~2)
- **File**: `src/mcp/tools/index.ts`
- **Change**: Replaced 6-branch if-cascade with `Record<string, ToolHandler>` dispatch table
- **Impact**: Removed from high CC function list, makes MCP tool addition trivial

### 2. buildImportGraph() → Extract Helper (CC 24 → split)
- **File**: `src/graph/import-graph.ts`
- **Change**: Extracted inner edge-processing loop into `addResolvedEdges()` with `GraphState` interface
- **Impact**: Removed from high CC function list, clearer separation of concerns

## Issues NOT Addressed (By Design)

| Issue | Grade | Reason Not Addressed |
|-------|-------|---------------------|
| entropy D | D | metrics/ reorganization requires 94+ import path updates. Too large for pre-Group F |
| busFactor F | F | Solo project. Structurally unavoidable |
| attackSurface D | D | CLI+MCP entry point architecture is intentional |
| changeCoupling D | D | Natural coupling between scan.ts↔health.ts |
| Remaining high CC functions | C | Algorithm code (BFS, cycle detection, topo sort). Refactoring would reduce clarity |

## Group F Readiness Assessment

**READY** — No blocking issues for Group F (Web visualization):

1. **Pipeline is stable** — `executePipeline()` returns all needed data (snapshot, health, importGraph)
2. **No pipeline changes needed** — Visualization is pure presentation layer
3. **Integration points clear** — Add `visualize` CLI command, create HTML generator
4. **Data available** — moduleAssignments, importGraph edges for DSM; health dimensions for Treemap
5. **Architecture is clean** — Zero cycles, good layering, no coupling issues
