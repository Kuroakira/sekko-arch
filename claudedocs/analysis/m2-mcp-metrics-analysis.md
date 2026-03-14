# M2 Architecture Analysis: MCP連携 + ファイルレベル指標拡充

**Scope**: M2実装に向けたコードベース構造分析
**Date**: 2026-03-14
**Base**: M1完了 + リファクタリング済み（registry pattern, MetricContext, extractors分割, DimensionConfig集約）

---

## 1. 現在のアーキテクチャ状態

### 1.1 パイプライン構造

```
executePipeline() [src/cli/scan.ts]
  ├── scanFiles()           [src/scanner/index.ts]
  ├── parseAndExtract()     [src/parser/index.ts]  (per file)
  │     ├── parseFile()     [src/parser/ts-grammar.ts]
  │     ├── extractFunctions()  [src/parser/function-extractors.ts]
  │     ├── enrichWithComplexity()  [src/parser/index.ts]
  │     ├── extractClasses()  [src/parser/class-extractors.ts]
  │     └── extractImports()  [src/parser/import-extractors.ts]
  ├── buildImportGraph()    [src/graph/import-graph.ts]
  └── computeHealth()       [src/metrics/health.ts]
        ├── buildMetricContext()  [src/metrics/context.ts]
        ├── METRIC_COMPUTATIONS[] iteration  [src/metrics/registry.ts]
        └── computeCompositeGrade()  [src/grading/grade.ts]
```

### 1.2 M1リファクタリング済み要素

| 要素 | 状態 | ファイル |
|------|------|---------|
| DimensionConfig一元管理 | 完了 | `src/dimensions.ts` — DIMENSION_REGISTRY |
| MetricContext | 完了 | `src/metrics/context.ts` — 共有データ集約 |
| METRIC_COMPUTATIONS registry | 完了 | `src/metrics/registry.ts` — 7エントリ |
| extractors分割 | 完了 | `function-extractors.ts`, `class-extractors.ts`, `import-extractors.ts` |
| computeCompositeGrade動的化 | 完了 | `Object.values(dimensions).map()` — ハードコードなし |
| フォーマッタのDIMENSION_REGISTRY依存 | 完了 | table.ts/json.ts共にDIMENSION_REGISTRYからイテレーション |
| gateのDIMENSION_NAMES依存 | 完了 | `DIMENSION_NAMES`配列からイテレーション |

### 1.3 DimensionGrades型の現状

`DimensionGrades`は`{ readonly [K in DimensionName]: DimensionResult }`のmapped typeとして定義済み。`DimensionName`のunion拡張で自動的にフィールドが追加される。`computeHealth()`は`as Record<DimensionName, DimensionResult>`でキャストしている。

**M2影響**: `DimensionName` union拡張 → `DimensionGrades`自動拡張 → `DIMENSION_REGISTRY`への12エントリ追加 → `METRIC_COMPUTATIONS`への12エントリ追加。`computeHealth()`、`computeCompositeGrade()`、フォーマッタ、gateは変更不要。

---

## 2. M2で変更が必要なファイル

### 2.1 型システム拡張

| ファイル | 変更内容 | 影響範囲 |
|----------|----------|----------|
| `src/types/metrics.ts` | `DimensionName`に12メンバー追加 | 全コンパイル（mapped typeで自動伝播） |
| `src/types/core.ts` | `FuncInfo`に`bodyHash: string`, `cognitiveComplexity: number`追加 | パーサー、テスト |

### 2.2 DIMENSION_REGISTRY拡張

| ファイル | 変更内容 |
|----------|----------|
| `src/dimensions.ts` | 12のDimensionConfigエントリ追加 |

### 2.3 パーサー拡張

| ファイル | 変更内容 |
|----------|----------|
| `src/parser/cognitive-complexity.ts` | **新規作成** — SonarSource仕様の認知的複雑度アルゴリズム |
| `src/parser/function-extractors.ts` | `makeFuncInfo`にbodyHash計算を追加 |
| `src/parser/index.ts` | `enrichWithCognitiveComplexity`の追加 |

### 2.4 メトリクス拡張

| ファイル | 変更内容 |
|----------|----------|
| `src/metrics/cohesion.ts` | **新規作成** — モジュール凝集度 |
| `src/metrics/entropy.ts` | **新規作成** — 依存エントロピー |
| `src/metrics/cognitive-complexity.ts` | **新規作成** — 認知的複雑度比率 |
| `src/metrics/hotspots.ts` | **新規作成** — ホットスポット検出 |
| `src/metrics/long-functions.ts` | **新規作成** — 長関数比率 |
| `src/metrics/large-files.ts` | **新規作成** — 大ファイル比率 |
| `src/metrics/high-params.ts` | **新規作成** — 多引数関数比率 |
| `src/metrics/duplication.ts` | **新規作成** — コード重複検出 |
| `src/metrics/dead-code.ts` | **新規作成** — デッドコード検出 |
| `src/metrics/comments.ts` | **新規作成** — コメント比率 |
| `src/metrics/distance-main-seq.ts` | **新規作成** — メインシーケンスからの距離 |
| `src/metrics/attack-surface.ts` | **新規作成** — 攻撃面 |
| `src/metrics/registry.ts` | 12の新MetricComputation追加 |
| `src/metrics/context.ts` | MetricContextフィールドの拡張は不要（既存データで全メトリクス計算可能） |
| `src/metrics/index.ts` | 新メトリクスモジュールのre-export追加 |

### 2.5 MCPサーバー

| ファイル | 変更内容 |
|----------|----------|
| `src/mcp/server.ts` | **新規作成** — McpServer + StdioTransport初期化 |
| `src/mcp/tools/scan.ts` | **新規作成** — scanツールハンドラ |
| `src/mcp/tools/health.ts` | **新規作成** — healthツールハンドラ |
| `src/mcp/tools/coupling-detail.ts` | **新規作成** — カップリング詳細ハンドラ |
| `src/mcp/tools/cycles-detail.ts` | **新規作成** — 循環依存詳細ハンドラ |
| `src/mcp/tools/session.ts` | **新規作成** — session_start/session_endハンドラ |
| `src/cli/index.ts` | `mcp`サブコマンド追加 |
| `package.json` | `@modelcontextprotocol/sdk`, `zod`依存追加 |

### 2.6 既存テスト更新

| ファイル | 変更内容 |
|----------|----------|
| `src/types/metrics.test.ts` | DimensionName/DimensionGrades拡張テスト |
| `src/types/core.test.ts` | FuncInfo新フィールドのテスト |
| `src/dimensions.ts` / `src/constants.test.ts` | 新DimensionConfig追加後の検証 |
| `src/metrics/health.test.ts` | 19次元のHealthReport生成テスト |
| `src/parser/extractors.test.ts` | bodyHash生成テスト |
| `src/parser/index.test.ts` | cognitiveComplexity enrichmentテスト |
| `src/cli/scan.test.ts` | 19次元出力テスト |
| `src/cli/gate.test.ts` | 19次元baseline比較テスト |
| `src/cli/formatters/table.test.ts` | 19次元テーブル出力テスト |
| `src/cli/formatters/json.test.ts` | 19次元JSON出力テスト |
| `src/e2e/` | E2Eテスト19次元対応 |

---

## 3. MetricContext拡張の検討

### 現在のフィールド
- `snapshot`, `filePaths`, `fanMaps`, `moduleAssignments`, `entryPoints`, `foundationFiles`, `allFunctions`, `cycleResult`

### M2で追加が必要なフィールド

**結論: 追加不要**。12の新メトリクスは全て既存のMetricContextフィールドから計算可能。

| メトリクス | 使用するMetricContextフィールド |
|-----------|-------------------------------|
| Cohesion | `snapshot.importGraph.edges` + `moduleAssignments` |
| Entropy | `snapshot.importGraph.edges` + `moduleAssignments` |
| Cognitive Complexity | `allFunctions` (cognitiveComplexityフィールド追加後) |
| Hotspots | `fanMaps` |
| Long Functions | `allFunctions` |
| Large Files | `snapshot.files` |
| High Params | `allFunctions` |
| Duplication | `allFunctions` (bodyHashフィールド追加後) |
| Dead Code | `snapshot.importGraph.reverseAdjacency` + `entryPoints` + `snapshot.files` |
| Comments | `snapshot.files` |
| Distance from Main Seq | `snapshot.files` (ClassInfo) + `fanMaps` + `moduleAssignments` |
| Attack Surface | `snapshot.importGraph.adjacency` + `entryPoints` |

---

## 4. 逆方向採点の統合ポイント

### 対象メトリクス
- **Cohesion**: rawValue = `1 - minCohesion`（高凝集度=良 → 反転して低=良に変換）
- **Comments**: rawValue = `1 - commentRatio`（高コメント率=良 → 反転して低=良に変換）

### 実装箇所
各メトリクスの`compute`関数内（registry.tsのMetricComputation）でrawValueを反転してから`makeDimensionResult()`に渡す。`gradeDimension()`への変更は不要。

`DimensionResult.details`に元の非反転値を保持することで、表示時の直感性を維持。

---

## 5. breaking change影響分析

### FuncInfo拡張の影響

`bodyHash: string`と`cognitiveComplexity: number`を必須フィールドとして追加すると、以下のテストファイルで手動構築している`FuncInfo`オブジェクトが全てコンパイルエラーになる。

影響するテストファイル:
- `src/types/core.test.ts` — FuncInfoリテラル
- `src/metrics/complex-fns.test.ts` — FuncInfoリテラル
- `src/metrics/health.test.ts` — FuncInfoリテラル
- `src/parser/index.test.ts` — FuncInfoリテラル（ただしparseAndExtractの出力で検証している場合は自動対応）

**対策**: テストヘルパー関数（`makeFuncInfo`のテスト版）を作成し、デフォルト値でbodyHashとcognitiveComplexityを埋めることでテスト変更を最小化。

### DimensionName拡張の影響

`DimensionGrades`はmapped typeなので、`DimensionName`拡張で自動的にフィールドが追加される。ただし、テスト内で`DimensionGrades`オブジェクトを手動構築している箇所は全12フィールドの追加が必要。

影響するテストファイル:
- `src/metrics/health.test.ts` — HealthReport全体のアサーション
- `src/grading/grade.test.ts` — computeCompositeGrade入力
- `src/cli/formatters/table.test.ts` — formatTable入力
- `src/cli/formatters/json.test.ts` — formatJson入力

**対策**: テストヘルパー関数（`makeFullDimensionGrades`）を作成し、デフォルトのDimensionResultで全19次元を埋めるユーティリティを提供。

---

## 6. MCPサーバー統合のstdout制約

### 現在のstdout使用箇所

- `console.log()` in `src/cli/scan.ts` (`runScan`) — CLIフォーマット出力
- `console.log()` in `src/cli/gate.ts` (`runGate`) — 結果出力
- `console.warn()` in `src/parser/index.ts` — パース警告（stderr → 安全）
- `console.warn()` in `src/cli/scan.ts` (`executePipeline`) — ファイル読み込み警告（stderr → 安全）

### MCPパス分析

MCPツールは`executePipeline()`を直接呼び出すため、`runScan()`や`runGate()`のconsole.log呼び出しは通過しない。`executePipeline()`内のconsole.warnはstderrに出力されるため安全。

**結論**: MCPパスでstdout汚染の問題なし。
