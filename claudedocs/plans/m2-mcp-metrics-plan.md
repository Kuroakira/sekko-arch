# Implementation Plan: sekko-arch M2 — MCP連携 + ファイルレベル指標拡充

## Overview

sekko-arch M2は2つの柱で構成される: (1) stdio MCPサーバーによるAIエージェント連携、(2) 12の新メトリクス（計19指標）によるアーキテクチャ品質計測の拡充。

M1リファクタリングでregistry pattern、MetricContext、DimensionConfig一元管理、extractors分割が完了済み。この基盤の上に、新メトリクス追加は`DimensionName` union拡張 + `DIMENSION_REGISTRY`エントリ追加 + `METRIC_COMPUTATIONS`エントリ追加の3箇所変更で完結する。

---

## Implementation Groups

| Group | Name | Tasks | Description | Status |
|-------|------|-------|-------------|--------|
| A | 型システム・基盤拡張 | T01-T04 | DimensionName拡張, FuncInfo拡張, DIMENSION_REGISTRY拡張, テストヘルパー | **DONE** |
| B | パーサー拡張 | T05-T07 | 認知的複雑度, bodyHash, パーサーオーケストレータ更新 | **DONE** |
| C | ファイル・関数レベルメトリクス | T08-T15 | 8つの新メトリクス実装 | **DONE** |
| D | モジュール・アーキテクチャメトリクス | T16-T19 | 4つの新メトリクス実装 | **DONE** |
| D+ | スキャン対象制御（`rules.toml [ignore]` + `--include`） | T19a-T19e | picomatch導入, rules.toml [ignore]パース, ignoreフィルタ, --includeフィルタ+CLI統合, MCP include | **T19a-T19d DONE** (T19e pending: requires Group F) |
| E | レジストリ統合・既存テスト更新 | T20-T22 | registry.ts統合, 既存テスト19次元対応, E2E更新 | pending |
| E+ | 問題箇所の詳細出力 | T22a-T22d | M1 detailsデータ補完, JSONフォーマッタ, tableフォーマッタ, M2メトリクスdetails | pending |
| F | MCPサーバー | T23-T29 | server.ts, 5ツールハンドラ, CLIサブコマンド | pending |
| G | 統合テスト・検証 | T30-T32 | MCP E2Eテスト, 自己スキャン検証, パフォーマンス検証 | pending |

### Dependency Flow

```
A (型・基盤) → B (パーサー) → C (ファイル・関数メトリクス)
                             → D (モジュール・アーキテクチャメトリクス)
                             → D+ (スキャン対象制御: T19a-T19d)  ← 独立（スキャナー+CLI層のみ）
                             → E (レジストリ統合・テスト更新)  ← C, D, D+(T19a-T19d)完了後
                                                              → E+ (詳細出力)    ← E完了後
                                                              → F (MCPサーバー)  ← E完了後
                                                                → D+ T19e (MCP include) ← F完了後
                                                              → G (統合テスト)   ← E, E+, F, T19e完了後
```

---

## Implementation Rules

### M1から継承

- **TDD徹底**: RED-GREEN-REFACTORサイクル厳守
- テストファイルは実装ファイルと同じディレクトリに `*.test.ts` として配置
- 各タスク完了時に `npm run typecheck && npm test && npm run build` を全て通す

### M2固有ルール

- **breaking changeの段階的導入**: Group Aで型拡張とテストヘルパーを先に整備し、後続グループでのテスト修正を最小化
- **メトリクス実装の独立性**: 各メトリクスは`src/metrics/{name}.ts`に独立実装。MetricContextを受け取り結果を返す純粋関数
- **MCPサーバーのstdout禁止**: MCPパスでは一切のconsole.logを使用しない。ログはstderr経由
- **rawValue反転は各メトリクスのcompute関数で実施**: 逆方向採点（cohesion, comments）のrawValue反転は、各メトリクスのcompute関数内で行う。registry.tsでは反転しない（二重反転防止）
- **Past Learning #1**: `.js`拡張子でESM import（`"type": "module"`設定済み）
- **Past Learning #2**: MCPサーバーテストではexecSyncではなくspawnSyncを使用

### Design Docからの意図的な逸脱

- **MetricContext `moduleEdges`は追加しない**: Design Doc Section 4.4で「M2ではmoduleEdgesを追加する」と記載があるが、コードベース分析の結果、Cohesion/Entropyは既存の`snapshot.importGraph.edges` + `moduleAssignments`から直接計算可能。MetricContextのフィールド追加は不要であり、「神オブジェクト」化リスクの低減のため追加しない

---

## Task List

### Group A: 型システム・基盤拡張 ✅ DONE

#### T01: DimensionName union拡張 ✅

- **Description**: `DimensionName`に12の新メンバーを追加。DimensionGradesはmapped typeなので自動拡張される。
- **Files**: `src/types/metrics.ts`
- **Dependencies**: なし
- **Tests**: `src/types/metrics.test.ts` — 新DimensionNameメンバーの型チェック
- **Acceptance**: `DimensionName`が19メンバー。コンパイル通過（ただし後続タスクでDIMENSION_REGISTRYとMETRIC_COMPUTATIONSを追加するまでランタイムエラーの可能性）
- **新DimensionNameメンバー**: `"cohesion"`, `"entropy"`, `"cognitiveComplexity"`, `"hotspots"`, `"longFunctions"`, `"largeFiles"`, `"highParams"`, `"duplication"`, `"deadCode"`, `"comments"`, `"distanceFromMainSeq"`, `"attackSurface"`

#### T02: FuncInfo拡張 ✅

- **Description**: `FuncInfo`に`bodyHash: string`と`cognitiveComplexity: number`を必須フィールドとして追加。
- **Files**: `src/types/core.ts`
- **Dependencies**: なし
- **Tests**: `src/types/core.test.ts` — 新フィールドを含むFuncInfoオブジェクト構築テスト
- **Acceptance**: FuncInfoが8フィールド（name, startLine, endLine, lineCount, cc, paramCount, bodyHash, cognitiveComplexity）。コンパイル通過。
- **注意**: この変更でFuncInfoリテラルを手動構築している全テストがコンパイルエラーになる。T04のテストヘルパーで対応。

#### T03: DIMENSION_REGISTRY拡張 ✅

- **Description**: `src/dimensions.ts`のDIMENSION_REGISTRYに12の新DimensionConfigエントリを追加。Design Docの閾値テーブルに基づく。
- **Files**: `src/dimensions.ts`
- **Dependencies**: T01
- **Tests**: `src/constants.test.ts`（or新テスト）— 19エントリの存在確認、各エントリの閾値妥当性テスト
- **Acceptance**: DIMENSION_REGISTRYが19エントリ。getDimensionConfig()が12の新次元名で正しいConfigを返す。
- **閾値定義**:

```
cohesion:    [0.30, "A"], [0.50, "B"], [0.70, "C"], [0.90, "D"], [Infinity, "F"]
  ※ rawValue = 1 - minCohesion なので、高凝集度(0.70+)が反転されて0.30以下 → A
entropy:     [0.40, "A"], [0.55, "B"], [0.70, "C"], [0.90, "D"], [Infinity, "F"]
cognitiveComplexity: [0.02, "A"], [0.05, "B"], [0.10, "C"], [0.20, "D"], [Infinity, "F"]
hotspots:    [0, "A"], [0.01, "B"], [0.03, "C"], [0.05, "D"], [Infinity, "F"]
longFunctions: [0.05, "A"], [0.10, "B"], [0.15, "C"], [0.25, "D"], [Infinity, "F"]
largeFiles:  [0.05, "A"], [0.10, "B"], [0.15, "C"], [0.25, "D"], [Infinity, "F"]
highParams:  [0.03, "A"], [0.05, "B"], [0.08, "C"], [0.15, "D"], [Infinity, "F"]
duplication: [0.01, "A"], [0.03, "B"], [0.05, "C"], [0.10, "D"], [Infinity, "F"]
deadCode:    [0.03, "A"], [0.05, "B"], [0.08, "C"], [0.15, "D"], [Infinity, "F"]
comments:    [0.92, "A"], [0.95, "B"], [0.97, "C"], [0.99, "D"], [Infinity, "F"]
  ※ rawValue = 1 - commentRatio なので、コメント率8%(0.08)が反転されて0.92 → A
distanceFromMainSeq: [0.20, "A"], [0.35, "B"], [0.50, "C"], [0.70, "D"], [Infinity, "F"]
attackSurface: [0.30, "A"], [0.45, "B"], [0.60, "C"], [0.80, "D"], [Infinity, "F"]
```

#### T04: テストヘルパー関数 ✅

- **Description**: テスト用ユーティリティ関数を作成。(1) `makeTestFuncInfo(overrides?)` — デフォルト値を持つFuncInfoファクトリ。(2) `makeTestDimensionGrades(overrides?)` — 全19次元をデフォルトDimensionResultで埋めるファクトリ。
- **Files**: `src/testing/fixtures.ts`（既存ファイル更新 — 新規helpers.tsではなくfixtures.tsに既にmakeFuncInfo/makeAllDimensionGradesが存在）
- **Dependencies**: T01, T02
- **Tests**: `src/testing/helpers.test.ts` — ファクトリ関数の動作テスト
- **Acceptance**: 既存テストのFuncInfo/DimensionGradesリテラルをヘルパーに置換可能

#### Group A 実装メモ

- **プラン外の追加対応**:
  - `src/parser/function-extractors.ts`: makeFuncInfoにbodyHash=""、cognitiveComplexity=0のプレースホルダー追加（Group Bで実データに置換）
  - `src/metrics/registry.ts`: 12新次元のstubComputation追加（rawValue=0, grade="A"を返す）。Group C/Dで実装に置換。METRIC_COMPUTATIONS.length === DIMENSION_NAMES.lengthのランタイムアサーション追加
  - `src/dimensions.ts`: cohesion/commentsの反転閾値にコメント追加
  - 既存テスト11ファイルを19次元・新FuncInfoフィールドに対応修正
- **コードレビュー結果**: 5レビュー全PASS。Important指摘4件を対応済み（完全性アサーション追加、テスト説明文修正、閾値コメント追加、fixtures default安定化）

---

### Group B: パーサー拡張 ✅ DONE

#### T05: 認知的複雑度アルゴリズム

- **Description**: SonarSource仕様に基づく認知的複雑度を計算する`computeCognitiveComplexity(node)`関数を実装。3ルール: (1) 制御フローブレーク（if/for/while/catch）で+1、(2) ネストレベルに応じて+N加算、(3) ブーリアン演算子シーケンス変化で+1。
- **Files**: `src/parser/cognitive-complexity.ts`（新規作成）
- **Dependencies**: なし（tree-sitter SyntaxNodeのみ依存）
- **Tests**: `src/parser/cognitive-complexity.test.ts` — SonarSource仕様のテストケース
  - 線形コード: 0
  - 単一if: 1
  - ネストif: 1 + 2 = 3
  - if/for/while混合ネスト
  - else: 0（インクリメントしない）
  - switch case: 0（インクリメントしない）
  - `&&`→`||`演算子変化: +1
  - 同一演算子連続: 0
- **Acceptance**: SonarSource仕様に準拠した値を返す

#### T06: bodyHash計算

- **Description**: `function-extractors.ts`の`makeFuncInfo`にbodyHash計算を追加。ASTノードの`.text`から正規化ハッシュを計算。正規化手順: (1) commentノード除外、(2) 空白正規化、(3) Node.js標準`crypto`モジュールのSHA-256ハッシュ（追加依存なし）。
- **Files**: `src/parser/function-extractors.ts`
- **Dependencies**: T02（FuncInfoにbodyHashフィールドが必要）
- **Tests**: `src/parser/extractors.test.ts`に追加
  - 同一関数本体が同一ハッシュを生成
  - コメントのみ異なる関数が同一ハッシュを生成
  - 空白のみ異なる関数が同一ハッシュを生成
  - 異なる関数本体が異なるハッシュを生成
  - アロー関数: 内側ノード（arrow_function）のテキストを使用
- **Acceptance**: bodyHashフィールドが正しく計算される。アロー関数で正しいノードが使用される。
- **注意**: `extractArrowFromDeclarator`ではbodyHash計算にarrow_functionノードの`.text`を使用し、行範囲にはparentNodeを使用する。makeFuncInfoのシグネチャを拡張してbodyHashSource用のノードを受け取る。

#### T07: パーサーオーケストレータ更新

- **Description**: `src/parser/index.ts`の`enrichWithComplexity`をCCと認知的複雑度の同時計算に拡張。findFunctionNodeで見つけたノードに対して`computeComplexity`と`computeCognitiveComplexity`の両方を呼び出す。
- **Files**: `src/parser/index.ts`
- **Dependencies**: T05, T06
- **Tests**: `src/parser/index.test.ts`に追加
  - parseAndExtractの出力にcognitiveComplexityフィールドが含まれる
  - 既知の関数で正しいcognitiveComplexity値
- **Acceptance**: parseAndExtractが返すFuncInfoにcc、cognitiveComplexity、bodyHash全てが含まれる

---

### Group C: ファイル・関数レベルメトリクス

#### T08: Long Functions メトリクス

- **Description**: 50行超の関数比率を計算する`computeLongFunctionRatio(allFunctions)`を実装。
- **Files**: `src/metrics/long-functions.ts`（新規作成）
- **Dependencies**: T04（テストヘルパー）
- **Tests**: `src/metrics/long-functions.test.ts`
  - 全関数50行以下: 0
  - 一部50行超: 正しい比率
  - 空配列: 0
- **Acceptance**: 正しい比率を返す

#### T09: Large Files メトリクス

- **Description**: 500行超のファイル比率を計算する`computeLargeFileRatio(files)`を実装。
- **Files**: `src/metrics/large-files.ts`（新規作成）
- **Dependencies**: なし
- **Tests**: `src/metrics/large-files.test.ts`
  - 全ファイル500行以下: 0
  - 一部500行超: 正しい比率
  - 空配列: 0
- **Acceptance**: 正しい比率を返す

#### T10: High Params メトリクス

- **Description**: 引数>4の関数比率を計算する`computeHighParamsRatio(allFunctions)`を実装。
- **Files**: `src/metrics/high-params.ts`（新規作成）
- **Dependencies**: T04（テストヘルパー）
- **Tests**: `src/metrics/high-params.test.ts`
  - 全関数4引数以下: 0
  - 一部5引数超: 正しい比率
- **Acceptance**: 正しい比率を返す

#### T11: Cognitive Complexity メトリクス

- **Description**: 認知的複雑度>15の関数比率を計算する`computeCognitiveComplexityRatio(allFunctions)`を実装。
- **Files**: `src/metrics/cognitive-complexity.ts`（新規作成）
- **Dependencies**: T04（テストヘルパー）, T07（cognitiveComplexityフィールド）
- **Tests**: `src/metrics/cognitive-complexity.test.ts`
  - 全関数15以下: 0
  - 一部16以上: 正しい比率
- **Acceptance**: 正しい比率を返す。閾値15はconstants.tsに定数として追加。

#### T12: Duplication メトリクス

- **Description**: bodyHashによる関数重複比率を計算する`computeDuplicationRatio(allFunctions)`を実装。同一bodyHashを持つ関数グループ（2+）の関数数 / 全関数数。
- **Files**: `src/metrics/duplication.ts`（新規作成）
- **Dependencies**: T04（テストヘルパー）, T06（bodyHashフィールド）
- **Tests**: `src/metrics/duplication.test.ts`
  - 全関数ユニーク: 0
  - 2関数が同一ハッシュ: 2/total
  - 3関数が同一ハッシュ: 3/total
  - 空配列: 0
- **Acceptance**: 正しい重複比率を返す

#### T13: Comments メトリクス

- **Description**: コメント行比率を計算する`computeCommentRatio(files)`を実装。`totalCommentLines / totalLines`。逆方向採点のため、rawValueは`1 - ratio`に反転。
- **Files**: `src/metrics/comments.ts`（新規作成）
- **Dependencies**: なし
- **Tests**: `src/metrics/comments.test.ts`
  - コメント率8%: rawValue = 0.92
  - コメント率0%: rawValue = 1.0 (最悪)
  - コメント率50%: rawValue = 0.5
  - 0行ファイルのみ: rawValue = 1.0
- **Acceptance**: 反転されたrawValueを返す。detailsに元のcommentRatioを保持。

#### T14: Hotspots メトリクス

- **Description**: 高fan-in × 高instabilityファイルの比率を計算する`computeHotspotRatio(fanMaps, filePaths)`を実装。`score = fan-in * instability >= 5.0`のファイル比率。
- **Files**: `src/metrics/hotspots.ts`（新規作成）
- **Dependencies**: なし
- **Tests**: `src/metrics/hotspots.test.ts`
  - ホットスポットなし: 0
  - fan-in=10, I=0.5: score=5.0 → ホットスポット
  - fan-in=2, I=0.5: score=1.0 → 非ホットスポット
- **Acceptance**: 正しいホットスポット比率を返す

#### T15: Dead Code メトリクス

- **Description**: 未参照ファイルの関数比率を計算する`computeDeadCodeRatio(reverseAdjacency, entryPoints, files)`を実装。reverseAdjacencyで入次数0かつエントリポイントでないファイルを特定し、そのファイル内の全関数をデッドコード候補として報告。
- **Files**: `src/metrics/dead-code.ts`（新規作成）
- **Dependencies**: なし
- **Tests**: `src/metrics/dead-code.test.ts`
  - 全ファイルが参照されている: 0
  - 入次数0ファイルあり（エントリポイント除外）: 正しい比率
  - エントリポイントは入次数0でも除外
- **Acceptance**: 正しいデッドコード比率を返す
- **注意**: M2スコープはファイルレベル検出。FuncInfoに`isExported`フィールドがないため、入次数0ファイル内の**全関数**（エクスポート・非エクスポート問わず）をデッドコード候補とする。Design Docの「エクスポート関数」の表現とは異なるが、ファイルレベル検出では入次数0=ファイル全体が未参照であるため、全関数をカウントすることが適切。シンボルレベル（named import追跡による個別エクスポート関数の参照判定）はM3候補。

---

### Group D: モジュール・アーキテクチャレベルメトリクス ✅ DONE

#### T16: Cohesion メトリクス

- **Description**: モジュール凝集度を計算する`computeCohesion(edges, moduleAssignments)`を実装。各モジュールの`intra-module edges / (N-1)`を計算し、最低値を報告。逆方向採点のため、rawValueは`1 - minCohesion`に反転。
- **Files**: `src/metrics/cohesion.ts`（新規作成）
- **Dependencies**: なし
- **Tests**: `src/metrics/cohesion.test.ts`
  - 完全接続モジュール: cohesion高 → rawValue低
  - 疎結合モジュール: cohesion低 → rawValue高
  - N<2のモジュール（スキップ）
  - 空グラフ: rawValue = 0
- **Acceptance**: 正しいcohesion値を返す。detailsに元のcohesion値を保持。

#### T17: Entropy メトリクス

- **Description**: 依存エントロピーを計算する`computeEntropy(edges, moduleAssignments)`を実装。Shannon情報量を正規化: `H_norm = H / log2(N)`。
- **Files**: `src/metrics/entropy.ts`（新規作成）
- **Dependencies**: なし
- **Tests**: `src/metrics/entropy.test.ts`
  - 全エッジが1モジュール間: 低エントロピー
  - エッジが均等分散: 高エントロピー
  - モジュール数<2: 0
- **Acceptance**: [0,1]範囲の正規化エントロピー値を返す

#### T18: Distance from Main Sequence メトリクス

- **Description**: Robert C. Martinの`D = |A + I - 1|`を計算する`computeDistanceFromMainSeq(files, fanMaps, moduleAssignments)`を実装。A = (interface数 + type-alias数) / 総クラス数、I = fan-out / (fan-in + fan-out)。全モジュールの最大Dを報告。
- **Files**: `src/metrics/distance-main-seq.ts`（新規作成）
- **Dependencies**: なし
- **Tests**: `src/metrics/distance-main-seq.test.ts`
  - 完全にメインシーケンス上: D=0
  - 具象+不安定（A=0, I=1）: D=0
  - 具象+安定（A=0, I=0）: D=1
  - ClassInfoなし: A=0
- **Acceptance**: 正しいD値を返す

#### T19: Attack Surface メトリクス

- **Description**: エントリポイントから到達可能なファイル比率を計算する`computeAttackSurface(adjacency, entryPoints, totalFiles)`を実装。BFS探索。
- **Files**: `src/metrics/attack-surface.ts`（新規作成）
- **Dependencies**: なし
- **Tests**: `src/metrics/attack-surface.test.ts`
  - 全ファイル到達可能: 1.0
  - 一部到達不可能: 正しい比率
  - エントリポイントなし: 0
- **Acceptance**: 正しい到達可能比率を返す

---

### Group D+: スキャン対象制御（`rules.toml [ignore]` + `--include`）

> スキャン対象の制御機能を2つ追加する。(1) `rules.toml`の`[ignore]`セクションによる除外パターン定義（減算的）、(2) `--include`オプションによるディレクトリ絞り込み（加算的）。スキャナー層・ルールパーサー層・CLI層の変更のみで、メトリクス計算には影響しない。
> 適用順序: ファイル収集 → `--include`フィルタ → `[ignore]`フィルタ → スキャン

#### T19a: `picomatch`パッケージ導入

- **Description**: `picomatch` npmパッケージをdependenciesに追加。軽量なglobマッチングライブラリ（micromatchのコア）。ESM importの解決を確認。
- **Files**: `package.json`
- **Dependencies**: なし
- **Tests**: `npm install`成功、ESM import解決確認
- **Acceptance**: `import picomatch from 'picomatch'`がコンパイル・実行可能

#### T19b: `rules.toml [ignore]`パース拡張

- **Description**: `RulesConfig`に`IgnoreConfig`を追加し、`parseRulesFile()`で`[ignore]`セクションをパースする。
- **Files**: `src/types/rules.ts`, `src/rules/toml-parser.ts`
- **Dependencies**: なし
- **Implementation details**:
  - `src/types/rules.ts`に型追加:
    ```typescript
    export interface IgnoreConfig {
      readonly patterns: readonly string[];
    }
    ```
  - `RulesConfig`に`readonly ignore?: IgnoreConfig`を追加
  - `src/rules/toml-parser.ts`の`parseRulesFile()`に`[ignore]`セクションのパースロジックを追加。`patterns`が文字列配列であることをバリデーション
- **Tests**: `src/rules/toml-parser.test.ts`に追加
  - `[ignore]`セクションがない場合: `ignore`がundefined
  - `patterns`が文字列配列: 正しくパース
  - `patterns`が空配列: 空の`IgnoreConfig`
  - `patterns`に非文字列要素: フィルタして文字列のみ保持
- **Acceptance**: `parseRulesFile()`が`[ignore]`セクションを正しくパースして`RulesConfig.ignore`に格納

#### T19c: `ScanOptions`型 + ignoreフィルタ実装

- **Description**: `src/scanner/ignore-filter.ts`（新規作成）にignoreフィルタリング関数を実装。`src/scanner/index.ts`の`scanFiles()`にオプションオブジェクトとフィルタを統合。
- **Files**: `src/scanner/ignore-filter.ts`（新規作成）, `src/scanner/index.ts`
- **Dependencies**: T19a, T19b
- **Implementation details**:
  - `ScanOptions`型を`src/scanner/index.ts`に追加:
    ```typescript
    export interface ScanOptions {
      readonly include?: readonly string[];
      readonly ignorePatterns?: readonly string[];
    }
    ```
  - `filterByIgnorePatterns(paths: string[], patterns: readonly string[]): string[]` — `picomatch`でパターンコンパイル → マッチするパスを除外
  - `scanFiles(rootDir, options?)`のシグネチャを拡張。`options.ignorePatterns`が未指定の場合は`parseRulesFile(rootDir)`から`ignore.patterns`を読み込み
  - 内部で`--include`フィルタ → `[ignore]`フィルタの順で適用
- **Tests**: `src/scanner/ignore-filter.test.ts`（新規作成）
  - パターンが空配列: 全パスが通過
  - ディレクトリパターン（`src/generated/**`）: マッチするパスが除外
  - globパターン（`**/*.generated.ts`）: マッチするパスが除外
  - 複数パターン: 全パターンの和集合で除外
  - マッチしないパターン: 全パスが通過
- **Acceptance**: `[ignore]`パターンに基づくファイルフィルタリングが正しく動作。`scanFiles()`統合テストで`rules.toml`からパターンを読み込んでフィルタリングすることを検証

#### T19d: `--include`フィルタ + CLI統合

- **Description**: (1) `scanFiles()`内に`--include`プレフィックスマッチフィルタを実装。(2) `src/cli/index.ts`のscan/check/gateコマンドに`--include`オプションを追加。(3) `executePipeline()`のシグネチャを拡張してオプションを伝播。
- **Files**: `src/scanner/index.ts`, `src/cli/index.ts`, `src/cli/scan.ts`, `src/cli/check.ts`, `src/cli/gate.ts`
- **Dependencies**: T19c（ScanOptions型）
- **Implementation details**:
  - `filterByInclude(paths: string[], includes: readonly string[]): string[]` — 指定ディレクトリのプレフィックスにマッチするパスのみを返す。末尾の`/`を正規化
  - `scanFiles()`内で`--include`フィルタを`[ignore]`フィルタの前に適用
  - `--include`が未指定（undefined or 空配列）の場合はフィルタをスキップ
  - Commander.jsの`.option('--include <dirs...>', 'scan only specified directories')`を追加
  - `executePipeline(rootDir, options?)`のシグネチャを拡張し、`ScanOptions`を受け取って`scanFiles()`に渡す
- **Tests**:
  - `src/scanner/index.test.ts`: `--include`フィルタの動作テスト（未指定、単一、複数、末尾`/`、`[ignore]`との併用）
  - `src/cli/index.test.ts`: `--include`オプションのパーステスト
- **Acceptance**: `sekko-arch scan . --include src/api --include src/models`が正しくパースされ、指定ディレクトリのみスキャンされる

#### T19e: MCPツール `include`パラメータ追加

- **Description**: MCPのscan/health/session_start/session_endツールに`include`パラメータを追加。zodスキーマで`include: z.array(z.string()).optional()`を定義し、`executePipeline()`に渡す。
- **Files**: `src/mcp/tools/scan.ts`, `src/mcp/tools/health.ts`, `src/mcp/tools/session.ts`
- **Dependencies**: T19d, T25-T28（MCPツールハンドラ実装後）
- **Tests**: 各MCPツールのテストに`include`パラメータのテストケースを追加
- **Acceptance**: AIエージェントがMCP経由で特定ディレクトリのみスキャン可能

---

### Group E: レジストリ統合・既存テスト更新

#### T20: METRIC_COMPUTATIONS統合

- **Description**: `src/metrics/registry.ts`に12の新MetricComputationエントリを追加。各エントリはGroup C/DのCompute関数を呼び出す。逆方向採点メトリクス（cohesion, comments）のrawValue反転は各compute関数内で実施済みのため、registry層での反転は行わない。
- **Files**: `src/metrics/registry.ts`, `src/metrics/index.ts`（re-export追加）
- **Dependencies**: T03, T08-T19
- **Tests**: `src/metrics/registry.test.ts`（新規） — 19のMetricComputationが登録されていることを確認
- **Acceptance**: METRIC_COMPUTATIONSが19エントリ。computeHealth()が19次元のHealthReportを生成。

#### T21: 既存テスト19次元対応

- **Description**: FuncInfo拡張とDimensionName拡張による既存テストのコンパイルエラーを修正。T04のテストヘルパーを活用。
- **Files**:
  - `src/types/core.test.ts`
  - `src/types/metrics.test.ts`
  - `src/metrics/complex-fns.test.ts`
  - `src/metrics/health.test.ts`
  - `src/grading/grade.test.ts`
  - `src/cli/formatters/table.test.ts`
  - `src/cli/formatters/json.test.ts`
  - `src/cli/gate.test.ts`
  - `src/cli/scan.test.ts`
  - `src/parser/index.test.ts`
  - `src/parser/extractors.test.ts`
- **Dependencies**: T04, T20
- **Tests**: `npm run typecheck && npm test` 全パス
- **Acceptance**: 全既存テストが19次元に対応してパス

#### T22: E2Eテスト19次元対応

- **Description**: E2Eテストを19次元に対応。テストフィクスチャのサンプルプロジェクトで12の新メトリクスが計算されることを検証。
- **Files**: `src/e2e/full-pipeline.test.ts`
- **Dependencies**: T21
- **Tests**: E2Eテストで19次元全てにA-Fグレードが付与されることを確認
- **Acceptance**: フルパイプラインE2Eが19次元で動作

---

### Group E+: 問題箇所の詳細出力

> FeatureSpecのUser Stories「問題箇所を特定」「劣化した次元と対象ファイルを表示」を満たすための追加仕様。M1で`details`データは内部的に保持されていたが、出力に含まれていなかった未達要件の解消。

#### T22a: M1メトリクスのdetailsデータ補完

- **Description**: M1メトリクスのうち、問題箇所の特定に必要なデータが`details`に不足しているものを補完する。
  - **complexFn**: `complexFunctions: Array<{file: string, name: string, cc: number}>` を追加。`allFunctions`にはファイル情報がないため、`MetricContext`経由で`FileNode.sa.functions`からファイルパスと紐付ける。
  - **blastRadius**: `maxBlastRadiusFile: string` を追加。`computeBlastRadius()`の戻り値`perFile`マップから最大値のファイルを特定。
- **Files**: `src/metrics/registry.ts`（complexFnのcompute関数でdetails拡充）, `src/metrics/blast-radius.ts`または`registry.ts`（blastRadiusのdetails拡充）
- **Dependencies**: T20（レジストリ統合完了後）
- **Tests**: 既存テスト更新 + 新テスト
  - complexFn: detailsに`complexFunctions`配列が含まれ、各要素に`file`, `name`, `cc`がある
  - blastRadius: detailsに`maxBlastRadiusFile`が含まれる
- **Acceptance**: 全M1メトリクスのdetailsが「何を直せばいいか」を特定可能なデータを含む

#### T22b: JSONフォーマッタのdetails出力

- **Description**: `src/cli/formatters/json.ts`の`formatJson()`で`details`フィールドを出力に含める。
- **Files**: `src/cli/formatters/json.ts`
- **Dependencies**: T22a
- **Tests**: `src/cli/formatters/json.test.ts`
  - JSON出力の各次元に`details`フィールドが存在
  - detailsの内容が`DimensionResult.details`と一致
  - detailsがundefinedの場合は空オブジェクト`{}`
- **Acceptance**: `--format json`の出力にdetailsが含まれる

#### T22c: tableフォーマッタの問題箇所表示

- **Description**: `src/cli/formatters/table.ts`の`formatTable()`に、グレードC以下の次元について問題箇所サマリーを追加表示するロジックを実装。
  - グレードA/Bは表示しない
  - 各次元最大5件、超過分は `...and N more` で省略
  - 次元ごとにdetails構造に応じたフォーマット関数を実装（cycles→パス表示、complexFn→ファイル:関数名(CC=N)、godFiles→ファイル名リスト等）
- **Files**: `src/cli/formatters/table.ts`
- **Dependencies**: T22a, T22b
- **Tests**: `src/cli/formatters/table.test.ts`
  - グレードA/Bの次元は問題箇所セクションに表示されない
  - グレードC以下の次元は問題箇所が表示される
  - 5件超の場合は省略表示
  - 全次元A/Bの場合は問題箇所セクション自体が表示されない
- **Acceptance**: tableフォーマッタが問題箇所を人間可読な形式で表示

#### T22d: M2新メトリクスのdetails設計

- **Description**: Group C/Dで実装した12の新メトリクスについて、detailsに適切なデータが含まれていることを確認・補完。T22cのフォーマット関数も新メトリクスに対応。
  - longFunctions: `functions: Array<{file, name, lineCount}>`
  - largeFiles: `files: Array<{file, lines}>`
  - highParams: `functions: Array<{file, name, paramCount}>`
  - cognitiveComplexity: `functions: Array<{file, name, cognitiveComplexity}>`
  - duplication: `groups: Array<{bodyHash, functions: Array<{file, name}>}>`
  - deadCode: `files: string[]`（入次数0ファイル一覧）
  - hotspots: `files: Array<{file, score}>`
  - cohesion: `worstModule: string`, `worstCohesion: number`
  - entropy: `normalizedEntropy: number`
  - distanceFromMainSeq: `worstModule: string`, `distance: number`
  - attackSurface: `reachableCount: number`, `totalFiles: number`
  - comments: `commentRatio: number`（元の非反転値）
- **Files**: Group C/Dの各メトリクスファイル, `src/cli/formatters/table.ts`
- **Dependencies**: T22c, T08-T19
- **Tests**: 各メトリクスのテストでdetails内容を検証
- **Acceptance**: 19次元全てのdetailsが充実し、tableフォーマッタで適切に表示される

---

### Group F: MCPサーバー

#### T23: MCP依存パッケージ追加

- **Description**: `@modelcontextprotocol/sdk`と`zod`をdependenciesに追加。
- **Files**: `package.json`
- **Dependencies**: なし
- **Tests**: `npm install`成功、import解決確認
- **Acceptance**: MCP SDKとzodがインストール・利用可能

#### T24: MCPサーバー基盤

- **Description**: `src/mcp/server.ts`にMcpServerインスタンスとStdioServerTransport初期化を実装。`runMcpServer()`関数をエクスポート。ツールハンドラ登録の骨格を作成。
- **Files**: `src/mcp/server.ts`（新規作成）
- **Dependencies**: T23
- **Tests**: `src/mcp/server.test.ts` — McpServerインスタンスが作成され、ツールが登録されることを確認（ユニットテスト）
- **Acceptance**: runMcpServer()が正常に起動・接続可能

#### T25: scanツールハンドラ

- **Description**: `src/mcp/tools/scan.ts`にscanツールを実装。`executePipeline()`を呼び出し、19次元の結果を返却。`dimensions`フィルタパラメータでフィルタリング可能。zodスキーマでパラメータバリデーション。
- **Files**: `src/mcp/tools/scan.ts`（新規作成）
- **Dependencies**: T24, T20（19次元対応パイプライン）
- **Tests**: `src/mcp/tools/scan.test.ts`
  - フルスキャン: 19次元全て返却
  - dimensionsフィルタ: 指定次元のみ返却
  - 不正パス: エラーメッセージ返却
- **Acceptance**: scanツールが正しい結果を返す

#### T26: healthツールハンドラ

- **Description**: `src/mcp/tools/health.ts`にhealthツールを実装。HealthReportのサマリー（compositeGrade + 各次元のgrade）のみ返却。ファイル詳細なし。
- **Files**: `src/mcp/tools/health.ts`（新規作成）
- **Dependencies**: T24
- **Tests**: `src/mcp/tools/health.test.ts`
- **Acceptance**: ヘルスレポートのサマリーが正しく返却される

#### T27: coupling_detail / cycles_detailツールハンドラ

- **Description**: `src/mcp/tools/coupling-detail.ts`と`src/mcp/tools/cycles-detail.ts`に診断ツールを実装。DimensionResultのdetailsフィールドから詳細情報を取得して返却。
- **Files**: `src/mcp/tools/coupling-detail.ts`（新規作成）, `src/mcp/tools/cycles-detail.ts`（新規作成）
- **Dependencies**: T24
- **Tests**: `src/mcp/tools/coupling-detail.test.ts`, `src/mcp/tools/cycles-detail.test.ts`
- **Acceptance**: 詳細診断情報が正しく返却される

#### T28: session_start / session_endツールハンドラ

- **Description**: `src/mcp/tools/session.ts`にセッション管理ツールを実装。モジュールレベル変数でベースラインスナップショットを保持。session_startでパイプライン実行→ベースライン保存→現在のスコア返却。session_endでパイプライン再実行→差分計算→差分レポート返却。
- **Files**: `src/mcp/tools/session.ts`（新規作成）
- **Dependencies**: T24
- **Tests**: `src/mcp/tools/session.test.ts`
  - session_start: ベースライン保存 + 現在スコア返却
  - session_end: 差分計算（改善/劣化の正しい検出）
  - session_start二重呼び出し: ベースライン上書き
  - session_endベースラインなし: エラーメッセージ + フルスキャン結果
- **Acceptance**: セッション管理のライフサイクルが正しく動作。エッジケース処理済み。

#### T29: CLIサブコマンド追加

- **Description**: `src/cli/index.ts`に`mcp`サブコマンドを追加。`runMcpServer()`を呼び出す。
- **Files**: `src/cli/index.ts`
- **Dependencies**: T24
- **Tests**: `src/cli/index.test.ts` — mcpサブコマンドのパーステスト
- **Acceptance**: `sekko-arch mcp`でMCPサーバーが起動

---

### Group G: 統合テスト・検証

#### T30: MCP E2Eテスト

- **Description**: spawnSyncでMCPサーバーを起動し、stdioでJSON-RPCメッセージを送受信するE2Eテスト。scan, health, session_start/session_endの基本フローを検証。
- **Files**: `src/e2e/mcp-integration.test.ts`（新規作成）
- **Dependencies**: T29
- **Tests**:
  - scanツール呼び出し → 19次元の結果
  - session_start → session_end → 差分レポート
  - JSON-RPC形式の正しいレスポンス
- **Acceptance**: stdio MCPプロトコルで正しく通信
- **注意**: Past Learning #2 — spawnSyncを使用してstdout/stderrを分離キャプチャ

#### T31: 自己スキャン検証

- **Description**: sekko-arch自身を19次元でスキャンし、全メトリクスにA-Fグレードが付与されることを確認。閾値の妥当性を検証。
- **Files**: `src/e2e/self-scan.test.ts`（新規作成 or 既存更新）
- **Dependencies**: T22
- **Tests**: 自己スキャンで19次元全てがグレード付与される
- **Acceptance**: 自己スキャンが成功。過剰なF判定がないことを確認（閾値妥当性）

#### T32: パフォーマンス検証

- **Description**: 19次元計算のパフォーマンスオーバーヘッドを計測。M1ベンチマークと比較して許容範囲内であることを確認。
- **Files**: `tests/bench/scan-performance.test.ts`（更新）
- **Dependencies**: T22
- **Tests**: 19次元スキャンのベンチマーク
- **Acceptance**: M1比でパフォーマンス劣化が20%以内

---

## リスク緩和策

| リスク | 緩和策 |
|--------|--------|
| FuncInfo拡張による大量のテストコンパイルエラー | T04でテストヘルパーを先に整備し、T21で一括修正 |
| 認知的複雑度のSonarSource仕様準拠 | T05で公式テストケースベースの単体テストを作成 |
| 逆方向採点の閾値定義ミス | T03でcohesionとcommentsの反転閾値を慎重に定義。自己スキャンT31で検証 |
| MCPサーバーのstdout汚染 | MCPツールはexecutePipeline()直接呼び出し。runScan()は使用しない |
| bodyHashのアロー関数エッジケース | T06でarrow_function内側ノードの単体テスト作成 |
| `picomatch`パッケージのESM互換性 | T19aでESM importを検証。`picomatch` v3+はESM対応済み |
| gate.tsのハードコード比較ロジック | gate.tsのcompareBaseline()は5つのrawValue（couplingScore, cycleCount, godFileRatio, complexFnRatio, maxDepth）のみハードコードで比較。**既知の制限**: 12の新次元はrawValueレベルの劣化検出ができず、compositeGradeの変化またはdimensionGradesのグレード劣化（Record<string, Grade>のループ）でのみ検出される。M3でcompareBaseline()を全次元のrawValue動的比較にリファクタリング予定 |

---

## 実装順序サマリー

```
Phase 1: T01-T04 (型・基盤) ← 全体の土台
Phase 2: T05-T07 (パーサー) ← FuncInfo新フィールドの実データ生成
Phase 3: T08-T19 (12メトリクス) + T19a-T19d (スキャン対象制御) ← 並列実装可能（各メトリクス独立、スキャン対象制御はスキャナー+CLI層のみ）
Phase 4: T20-T22 (統合・テスト更新) ← 全メトリクス + スキャン対象制御揃ってから
Phase 4.5: T22a-T22d (詳細出力) ← M1 details補完 + フォーマッタ拡張
Phase 5: T23-T29 (MCPサーバー) + T19e (MCP includeパラメータ) ← Phase 4完了後（Phase 4.5と並列可能、T19eはF完了後）
Phase 6: T30-T32 (E2E・検証) ← 全体完成後
```

Phase 3のT08-T19は相互依存がないため並列実装可能。T19a-T19dもスキャナー+CLI層のみの変更で他メトリクスと独立しているため並列可能。T19e（MCP includeパラメータ）はMCPツールハンドラ（Group F）の実装後に適用。ただし、全てGroup AとGroup Bに依存するため、Phase 1-2の完了が前提。
