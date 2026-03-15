## Task T09: Code Churn metric
- src/metrics/code-churn.ts — churn concentration computation (top 10% ratio)
- src/metrics/code-churn.test.ts — 7 test cases

## Task T10: Change Coupling metric
- src/metrics/change-coupling.ts — co-occurrence frequency computation
- src/metrics/change-coupling.test.ts — 9 test cases

## Task T11: Bus Factor metric
- src/metrics/bus-factor.ts — single-author file ratio computation
- src/metrics/bus-factor.test.ts — 6 test cases

## Task T12: Code Age metric
- src/metrics/code-age.ts — stale file ratio computation
- src/metrics/code-age.test.ts — 7 test cases

## Task T13: テストファイル収集
- src/scanner/test-files.ts — テストファイル収集関数 (isTestFile, collectTestFiles)
- src/scanner/test-files.test.ts — テストファイル収集のテスト (9 tests)

## Task T14: テストカバレッジギャップメトリクス
- src/metrics/test-coverage-gap.ts — テストカバレッジギャップ計算 (computeTestCoverageGap, extractTestImports)
- src/metrics/test-coverage-gap.test.ts — テストカバレッジギャップのテスト (9 tests)

## Task T15: METRIC_COMPUTATIONS 24次元統合
- src/metrics/registry.ts — replaced 5 stub computations with real implementations
- src/metrics/registry.test.ts — added graceful degradation tests for evolution metrics

## Task T16: 既存テスト24次元対応
- src/metrics/health.test.ts — updated test descriptions 19→24
- src/cli/formatters/table.test.ts — updated test description + added 5 new dimension label assertions
- src/cli/formatters/json.test.ts — updated test description 19→24
- src/mcp/tools/scan.ts — updated tool description 19→24 dimensions
- src/mcp/tools/scan.test.ts — updated mock with 5 new dimensions, updated assertions 19→24
- src/e2e/self-scan.test.ts — updated test description 19→24
- src/e2e/mcp-integration.test.ts — updated test description 19→24

## Task T17: E2Eテスト24次元対応
- src/e2e/full-pipeline.test.ts — updated test descriptions 19→24

## Task T18-T21: Web Visualization (Group F)
- src/cli/html-generator.ts — HTML report generator (Treemap + DSM views)
- src/cli/html-generator.test.ts — 11 tests for HTML generation
- src/cli/visualize.ts — visualize subcommand implementation
- src/cli/visualize.test.ts — 6 tests for visualize command
- src/cli/index.ts — registered visualize subcommand
