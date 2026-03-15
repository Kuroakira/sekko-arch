## Group A: 型システム・基盤拡張

### T01: DimensionName union拡張
- `src/types/metrics.ts` — 5つの新DimensionNameメンバー追加（24メンバー化）

### T02: DIMENSION_REGISTRY拡張 + categoryフィールド追加
- `src/dimensions.ts` — DimensionCategory型追加、全24エントリにcategory設定、5新次元の閾値定義
- `src/dimensions.test.ts` — 新規：24エントリ検証、カテゴリ妥当性、新閾値テスト
- `src/metrics/registry.ts` — 5つのstub computation追加
- `src/cli/formatters/table.ts` — 5新メトリクスのDETAIL_FORMATTERS追加

### T03: EvolutionConfig型 + rules.tomlパーサー拡張
- `src/types/rules.ts` — EvolutionConfig型追加、RulesConfigにevolutionフィールド
- `src/rules/toml-parser.ts` — toEvolutionConfig()追加、parseRulesFile()でevolutionパース
- `src/rules/toml-parser.test.ts` — evolution関連テスト6件追加

### T04: GitHistory型定義
- `src/git/types.ts` — 新規：GitCommitInfo, FileChurn, GitHistory型
- `src/git/types.test.ts` — 新規：型構築テスト

### T05: テストヘルパー24次元対応
- `src/testing/fixtures.ts` — DEFAULT_RAW_VALUES 5新次元追加

### 既存テスト更新
- `src/types/metrics.test.ts` — 19→24次元アサーション
- `src/metrics/health.test.ts` — 19→24次元アサーション
- `src/cli/scan.test.ts` — 19→24次元アサーション
- `src/cli/index.test.ts` — gateテスト修正、バージョン0.2.0更新
- `src/cli/index.ts` — バージョン0.2.0更新

## Group B: Git履歴モジュール

### T06: Git log収集・解析
- `src/git/collector.ts` — 新規: collectGitHistory関数 (git log解析, churn集計, author追跡)
- `src/git/collector.test.ts` — 新規: 10テスト

### T07: Git モジュールバレル
- `src/git/index.ts` — 新規: barrel re-exports

### T08: MetricContext拡張 + パイプライン前段統合
- `src/metrics/context.ts` — gitHistory?フィールド追加, buildMetricContextシグネチャ拡張
- `src/metrics/context.test.ts` — 新規: 3テスト (with/without gitHistory)
- `src/metrics/health.ts` — computeHealthにgitHistory?パラメータ追加
- `src/cli/scan.ts` — executePipelineにcollectGitHistory呼び出し追加, EvolutionConfig読み込み
