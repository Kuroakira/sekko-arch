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
