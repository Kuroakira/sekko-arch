# Implementation Plan: sekko-arch M3 — Web可視化 + 進化メトリクス + DSM

## Overview

sekko-arch M3は3つの柱で構成される: (1) Git履歴に基づく4つの進化メトリクス + テストカバレッジギャップ検出（計24指標）、(2) カテゴリ別表示によるテーブル出力の視認性向上、(3) 静的HTML生成によるWeb可視化（Treemap + DSM）。

M2のregistryパターン、MetricContext、DIMENSION_REGISTRY一元管理が完了済み。新メトリクス追加は`DimensionName` union拡張 + `DIMENSION_REGISTRY`エントリ追加 + `METRIC_COMPUTATIONS`エントリ追加の3箇所変更で完結する。Git履歴データはMetricContextにオプショナルフィールドとして注入し、DSMはメトリクスとしてスコア化せず可視化ツールとして提供する。

---

## Implementation Groups

| Group | Name | Tasks | Description | Status |
|-------|------|-------|-------------|--------|
| A | 型システム・基盤拡張 | T01-T05 | DimensionName 24メンバー化, categoryフィールド追加, EvolutionConfig, GitHistory型, テストヘルパー24次元対応 | **done** (ab22716, 2026-03-15) |
| B | Git履歴モジュール | T06-T08 | `src/git/` — 型定義, git log収集・解析, パイプライン前段統合 | **done** (2026-03-15) |
| C | 進化メトリクス | T09-T12 | 4メトリクス: codeChurn, changeCoupling, busFactor, codeAge | **done** (2026-03-15) |
| D | テストカバレッジギャップ | T13-T14 | テストファイル収集, import解析, 到達可能性計算 | **done** (2026-03-15) |
| E | レジストリ統合・既存テスト更新 | T15-T17 | registry.ts 24次元統合, 既存テスト24次元対応, E2E更新 | **done** (2026-03-15) |
| F | Web可視化 | T18-T21 | `visualize`サブコマンド, HTML Generator, Treemap, DSM | **done** (2026-03-15) |
| G | テーブルフォーマッタ・カテゴリ表示 | T22-T23 | カテゴリヘッダー表示, 5新メトリクスのDETAIL_FORMATTERS | **done** (2026-03-15) |
| H | 統合テスト・検証 | T24-T26 | 自己スキャン24次元, パフォーマンスベンチマーク, Git不在環境テスト | pending |

### Dependency Flow

```
A (型・基盤) → B (Git履歴モジュール) → C (進化メトリクス)
                                      → D (テストカバレッジギャップ)  ← A完了後、Bとは独立
              → E (レジストリ統合)      ← C, D完了後
              → F (Web可視化)          ← E完了後（24次元のHealthReport必要）
              → G (テーブル・カテゴリ)   ← E完了後（24次元のDIMENSION_REGISTRY必要）
              → H (統合テスト)          ← E, F, G完了後
```

**並列化ポイント**:
- C (進化メトリクス4つ) は各メトリクス間で並列実装可能
- D (テストカバレッジギャップ) はBと独立（git履歴不要）、Cと並列実装可能
- F と G はE完了後に並列実装可能

---

## Implementation Rules

### M2から継承

- **TDD徹底**: RED-GREEN-REFACTORサイクル厳守
- テストファイルは実装ファイルと同じディレクトリに `*.test.ts` として配置
- 各タスク完了時に `npm run typecheck && npm test && npm run build` を全て通す
- `.js`拡張子でESM import（`"type": "module"`設定済み）
- MCPサーバーテストではexecSyncではなくspawnSyncを使用
- rawValue反転は各メトリクスのcompute関数で実施（registry.tsでは反転しない）
- メトリクス実装の独立性: 各メトリクスは`src/metrics/{name}.ts`に独立実装。MetricContextを受け取り結果を返す純粋関数

### M3固有ルール

- **breaking changeの回避**: テストファイル処理は軽量別解析方式。既存19メトリクスのrawValueに影響を与えない
- **git不在環境のgraceful degradation**: gitコマンド失敗時は`GitHistory`を`undefined`としてMetricContextに渡し、4つの進化メトリクスをスキップ。残り20メトリクスは正常計算
- **前段収集パターン**: Git履歴データはパイプライン実行前に収集し、`computeHealth()`にオプショナルパラメータとして渡す。パイプライン内部を非同期化しない
- **DSMは可視化専用**: DSMからメトリクスを抽出しない。24メトリクス（19既存 + 5新規）
- **categoryフィールドの全エントリ更新**: DIMENSION_REGISTRYの19既存エントリ全てにcategoryフィールドを追加。コンパイル時に漏れ検出
- **HTML生成はFormatter抽象を迂回**: `visualize`サブコマンドはPipelineResultから直接HTMLを生成。Formatterインターフェース変更なし
- **MCP拡張なし**: M3スコープでは新MCPツール追加ゼロ。既存scanツールのdimensionsフィルタで5新メトリクスにアクセス

### Design Docからの意図的な逸脱

- なし（Design Docの全決定事項をそのまま実装）

---

## Task List

### Group A: 型システム・基盤拡張

#### [DONE] T01: DimensionName union拡張（24メンバー化）(completed 2026-03-15)

- **Description**: `DimensionName`に5つの新メンバーを追加。DimensionGradesはmapped typeなので自動拡張される。
- **Files**: `src/types/metrics.ts`
- **Dependencies**: なし
- **Tests**: `src/types/metrics.test.ts` — 新DimensionNameメンバーの型チェック、24メンバー確認
- **Acceptance**: `DimensionName`が24メンバー。コンパイル通過（後続タスクでDIMENSION_REGISTRYとMETRIC_COMPUTATIONSを追加するまでランタイムエラーの可能性）
- **新DimensionNameメンバー**: `"codeChurn"`, `"changeCoupling"`, `"busFactor"`, `"codeAge"`, `"testCoverageGap"`

#### [DONE] T02: DIMENSION_REGISTRY拡張 + categoryフィールド追加 (completed 2026-03-15)

- **Description**: `DimensionConfig`にcategoryフィールドを追加し、全24エントリにcategoryを設定。5つの新DimensionConfigエントリをDesign Docの閾値テーブルに基づき追加。
- **Files**: `src/dimensions.ts`
- **Dependencies**: T01
- **Tests**: `src/dimensions.test.ts`（既存テスト更新）— 24エントリの存在確認、各エントリのcategory妥当性テスト、新閾値テスト
- **Acceptance**: DIMENSION_REGISTRYが24エントリ。全エントリにcategoryフィールドあり。getDimensionConfig()が5つの新次元名で正しいConfigを返す。
- **categoryマッピング**:
  - モジュール構造: cycles, coupling, cohesion, entropy
  - ファイル・関数: godFiles, complexFn, cognitiveComplexity, longFunctions, largeFiles, highParams, duplication, deadCode, comments
  - アーキテクチャ: depth, levelization, blastRadius, distanceFromMainSeq, attackSurface, hotspots
  - 進化: codeChurn, changeCoupling, busFactor, codeAge
  - テスト・構造: testCoverageGap
- **新閾値定義**:

```
codeChurn:          [0.50, "A"], [0.60, "B"], [0.70, "C"], [0.85, "D"], [Infinity, "F"]
changeCoupling:     [0, "A"], [0.02, "B"], [0.05, "C"], [0.10, "D"], [Infinity, "F"]
busFactor:          [0.20, "A"], [0.35, "B"], [0.50, "C"], [0.70, "D"], [Infinity, "F"]
codeAge:            [0.10, "A"], [0.20, "B"], [0.35, "C"], [0.50, "D"], [Infinity, "F"]
testCoverageGap:    [0.10, "A"], [0.20, "B"], [0.35, "C"], [0.50, "D"], [Infinity, "F"]
```

#### [DONE] T03: EvolutionConfig型 + rules.tomlパーサー拡張 (completed 2026-03-15)

- **Description**: `RulesConfig`に`EvolutionConfig`を追加し、`parseRulesFile()`で`[evolution]`セクションをパースする。
- **Files**: `src/types/rules.ts`, `src/rules/toml-parser.ts`
- **Dependencies**: なし
- **Implementation details**:
  - `src/types/rules.ts`に型追加:
    ```typescript
    export interface EvolutionConfig {
      readonly days?: number;                    // デフォルト: 90
      readonly changeCouplingThreshold?: number;  // デフォルト: 5
      readonly codeAgeThresholdDays?: number;    // デフォルト: 365
    }
    ```
  - `RulesConfig`に`readonly evolution?: EvolutionConfig`を追加
  - `src/rules/toml-parser.ts`に`toEvolutionConfig()`パーサー関数追加
- **Tests**: `src/rules/toml-parser.test.ts`に追加
  - `[evolution]`セクションがない場合: `evolution`がundefined
  - `days`が数値: 正しくパース
  - `change_coupling_threshold`が数値: 正しくパース
  - `code_age_threshold_days`が数値: 正しくパース
  - 全フィールド指定: 全てパース
  - 不正な型: 無視（デフォルト値使用）
- **Acceptance**: `parseRulesFile()`が`[evolution]`セクションを正しくパースして`RulesConfig.evolution`に格納

#### [DONE] T04: GitHistory型定義 (completed 2026-03-15)

- **Description**: `src/git/types.ts`にGitHistory関連の型を定義する。
- **Files**: `src/git/types.ts`（新規作成）
- **Dependencies**: なし
- **Tests**: `src/git/types.test.ts` — 型構築テスト（GitHistory、GitCommitInfoオブジェクトの構築確認）
- **Acceptance**: GitHistory型が定義され、4つの進化メトリクスが参照する全データを保持可能
- **型定義**:
  ```typescript
  export interface GitCommitInfo {
    readonly hash: string;
    readonly author: string;
    readonly date: Date;
    readonly files: readonly string[];
  }

  export interface FileChurn {
    readonly added: number;
    readonly deleted: number;
  }

  export interface GitHistory {
    readonly fileChurns: ReadonlyMap<string, FileChurn>;
    readonly commits: readonly GitCommitInfo[];
    readonly fileAuthors: ReadonlyMap<string, ReadonlySet<string>>;
    readonly fileLastModified: ReadonlyMap<string, Date>;
  }
  ```

#### [DONE] T05: テストヘルパー24次元対応 (completed 2026-03-15)

- **Description**: `src/testing/fixtures.ts`の`DEFAULT_RAW_VALUES`、`makeAllDimensionGrades()`、`makeHealth()`を24次元に拡張。5つの新次元のデフォルト値を追加。
- **Files**: `src/testing/fixtures.ts`
- **Dependencies**: T01, T02
- **Tests**: `src/testing/fixtures.test.ts`（既存テスト更新）— 24次元のDimensionGrades生成確認
- **Acceptance**: テストヘルパーが24次元に対応。既存テストのFuncInfo/DimensionGradesリテラルがコンパイル通過。

#### Group A 実装メモ (実装済み)

- T01+T02をセットで実装（METRIC_COMPUTATIONSのランタイム長さチェック対策）。5つのstub computation（rawValue=0, details付き）を追加
- T02のcategoryフィールド追加に伴い、DIMENSION_REGISTRYの配列順序をカテゴリ別にソート済みに変更
- T05のfixtures.ts更新と同時に、既存テストの19→24次元アサーション更新を実施
- `src/cli/index.test.ts`の`gate --save defaults to false`テスト：baseline.json依存の脆弱なテストをoption解析のみに修正
- CLIバージョンを0.1.0→0.2.0に更新
- 602テスト全パス（元579 + 新23）

---

### Group B: Git履歴モジュール

#### [DONE] T06: Git log収集・解析 (completed 2026-03-15)

- **Description**: `src/git/collector.ts`に`collectGitHistory(rootDir, options?)`関数を実装。`execSync`で`git log --format`を実行し、カスタムフォーマット出力を解析してGitHistory型に変換する。
- **Files**: `src/git/collector.ts`（新規作成）
- **Dependencies**: T04（GitHistory型）
- **Implementation details**:
  - 単一の`git log`呼び出しで全データを取得（コマンド分割を回避）
  - `--since`オプションで期間限定（デフォルト90日）
  - `--no-merges`でマージコミット除外
  - `--numstat`で追加行・削除行を取得
  - カスタム区切り文字でコミット境界を解析
  - git不在環境（execSync失敗時）で`undefined`を返す
  - `EvolutionConfig`のパラメータ（days, changeCouplingThreshold, codeAgeThresholdDays）を受け取り適用
- **Tests**: `src/git/collector.test.ts`
  - git log出力の正しい解析（コミット情報、ファイルチャーン、著者情報、最終更新日）
  - `--since`パラメータの正しい生成
  - git不在環境: `undefined`を返す
  - 空リポジトリ（コミットなし）: 空のGitHistory
  - numstat出力の解析（バイナリファイル、リネームファイルの除外）
- **Acceptance**: gitリポジトリで`collectGitHistory()`が正しいGitHistoryを返す。git不在環境でundefined。

#### [DONE] T07: Git モジュールバレル (completed 2026-03-15)

- **Description**: `src/git/index.ts`にバレルファイルを作成。
- **Files**: `src/git/index.ts`（新規作成）
- **Dependencies**: T04, T06
- **Tests**: なし（re-exportのみ）
- **Acceptance**: `import { collectGitHistory, GitHistory } from "../git/index.js"`が解決可能

#### [DONE] T08: MetricContext拡張 + パイプライン前段統合 (completed 2026-03-15)

- **Description**: MetricContextに`gitHistory?: GitHistory`をオプショナルフィールドとして追加。`buildMetricContext()`にオプショナルパラメータとして`GitHistory`を受け取る。`computeHealth()`のシグネチャを拡張して`GitHistory`を受け取り、`buildMetricContext()`に渡す。`executePipeline()`の前段でgitデータを収集しパイプラインに注入。
- **Files**: `src/metrics/context.ts`, `src/metrics/health.ts`, `src/cli/scan.ts`
- **Dependencies**: T06, T07
- **Implementation details**:
  - `MetricContext`に`readonly gitHistory?: GitHistory`を追加（9フィールド目、10の閾値内）
  - `buildMetricContext(snapshot, gitHistory?)`のシグネチャ拡張
  - `computeHealth(snapshot, gitHistory?)`のシグネチャ拡張
  - `executePipeline()`内で`collectGitHistory()`を呼び出し、`computeHealth(snapshot, gitHistory)`に渡す
  - `EvolutionConfig`は`parseRulesFile()`から取得し、`collectGitHistory()`に渡す
- **Tests**: `src/metrics/context.test.ts`に追加
  - gitHistory付きのMetricContext構築
  - gitHistoryなし（undefined）のMetricContext構築
  - `computeHealth()`のgitHistory受け渡し
- **Acceptance**: MetricContextが9フィールド。git系メトリクスがgitHistoryからデータ取得可能。git不在環境でパイプラインが正常動作。

---

### Group C: 進化メトリクス（4メトリクス）

> 4メトリクスは相互依存なし。各メトリクスは`MetricContext.gitHistory`を参照し、`undefined`の場合はスキップ（rawValue=0, grade="A"）。

#### [DONE] T09: Code Churn（コードチャーン集中度）(completed 2026-03-15)

- **Description**: Nagappan & Ball (2005)の相対チャーン指標を実装。上位10%のファイルがチャーン全体の何%を占めるかを計測。
- **Files**: `src/metrics/code-churn.ts`（新規作成）
- **Dependencies**: T04（GitHistory型）
- **Tests**: `src/metrics/code-churn.test.ts`
  - 変更が均等分散: 低集中度
  - 上位10%が全チャーンの90%: 高集中度
  - 単一ファイルのみ変更: 1.0
  - gitHistory未定義: rawValue=0
  - ファイル数<10: top-1ファイルで計算
  - 空のfileChurns: rawValue=0
- **Acceptance**: rawValueが「上位10%ファイルのチャーン集中度」。Design Docの閾値でA-Fグレード。

#### [DONE] T10: Change Coupling（変更カップリング）(completed 2026-03-15)

- **Description**: Gall et al. (1998)の論理的結合検出に基づく。同一コミットで変更されたファイルペアの共起頻度を計測し、暗黙的な結合を検出。
- **Files**: `src/metrics/change-coupling.ts`（新規作成）
- **Dependencies**: T04（GitHistory型）
- **Tests**: `src/metrics/change-coupling.test.ts`
  - 共起なし: rawValue=0
  - ペアが閾値（デフォルト5）回共起: ファイルが高共起ペアに含まれる
  - 閾値未満の共起: rawValue=0
  - rawValueが「高共起ペアに含まれるファイルの比率」
  - gitHistory未定義: rawValue=0
  - 閾値のカスタマイズ（EvolutionConfigから）
- **Acceptance**: 共起回数ベース（N >= changeCouplingThreshold）で判定。rawValueは「高共起ペアに含まれるファイルの比率」。

#### [DONE] T11: Bus Factor（バス因子）(completed 2026-03-15)

- **Description**: Ricca et al. (2011)のアプローチに基づく。単一著者のみがコミットしたファイルの比率を計測。
- **Files**: `src/metrics/bus-factor.ts`（新規作成）
- **Dependencies**: T04（GitHistory型）
- **Tests**: `src/metrics/bus-factor.test.ts`
  - 全ファイル複数著者: rawValue=0
  - 全ファイル単一著者: rawValue=1.0
  - 混合: 正しい比率
  - gitHistory未定義: rawValue=0
  - fileAuthorsが空: rawValue=0
- **Acceptance**: rawValueが「単一著者ファイルの比率」。Design Docの閾値でA-Fグレード。

#### [DONE] T12: Code Age（コード年齢）(completed 2026-03-15)

- **Description**: 365日以上未更新のファイル比率を計測。codeAgeThresholdDays（デフォルト365）はEvolutionConfigで設定可能。
- **Files**: `src/metrics/code-age.ts`（新規作成）
- **Dependencies**: T04（GitHistory型）
- **Tests**: `src/metrics/code-age.test.ts`
  - 全ファイル最近更新: rawValue=0
  - 全ファイル365日以上前: rawValue=1.0
  - 混合: 正しい比率
  - gitHistory未定義: rawValue=0
  - fileLastModifiedが空: rawValue=0
  - カスタム閾値（EvolutionConfig.codeAgeThresholdDays）
- **Acceptance**: rawValueが「閾値以上未更新のファイル比率」。Design Docの閾値でA-Fグレード。

---

### Group D: テストカバレッジギャップ

#### [DONE] T13: テストファイル収集 (completed 2026-03-15)

- **Description**: `src/scanner/test-files.ts`にテストファイルのみを収集する関数を実装。`isTestFile()`の逆条件で、テストファイルのパスリストを返す。`isTestFile()`を`src/scanner/git-files.ts`からexportする。
- **Files**: `src/scanner/test-files.ts`（新規作成）, `src/scanner/git-files.ts`（export追加）
- **Dependencies**: なし
- **Implementation details**:
  - `git-files.ts`の`isTestFile()`をexportに変更
  - `collectTestFiles(rootDir: string): string[]` — `git ls-files`出力からテストファイルのみをフィルタ
  - `EXCLUDED_DIR_SEGMENTS`で`testing/`、`fixtures/`ディレクトリは引き続き除外（テストヘルパー・フィクスチャはテストカバレッジの判定に使わない）
- **Tests**: `src/scanner/test-files.test.ts`
  - TypeScript テストファイルのみが収集される（`.test.ts`, `.test.tsx`）
  - 非テストファイルは除外
  - `testing/`、`fixtures/`ディレクトリは除外
  - git不在環境: 空配列
- **Acceptance**: テストファイルのパスリストが正しく返される

#### [DONE] T14: テストカバレッジギャップメトリクス (completed 2026-03-15)

- **Description**: テストファイルのimportを軽量解析し、既存ImportGraphと合成して推移的到達可能性を計算。到達不可能なソースファイルの比率を報告。
- **Files**: `src/metrics/test-coverage-gap.ts`（新規作成）
- **Dependencies**: T13
- **Implementation details**:
  - テストファイルのimport文のみを軽量解析（tree-sitterでimport_statement抽出 → oxc-resolverで解決）
  - テストファイルのimportを既存ImportGraphのadjacencyにマージ
  - BFS/DFSでテストファイルから推移的に到達可能なファイルを計算
  - Snapshot内ファイルのうち到達不可能 = ギャップ
  - false positive除外: `.d.ts`ファイル、re-exportのみの`index.ts`（バレルファイル）、エントリポイント（`cli/index.ts`, `main.ts`等）
- **Tests**: `src/metrics/test-coverage-gap.test.ts`
  - 全ファイルテストからreachable: rawValue=0
  - 一部unreachable: 正しい比率
  - `.d.ts`ファイルは除外
  - バレルファイル（re-exportのみ）は除外
  - エントリポイントは除外
  - テストファイルが存在しない: rawValue=0（全ファイルがギャップだが、テストなしの環境でノイズを避けるため）
- **Acceptance**: rawValueが「テストから到達不可能なソースファイルの比率」。既存19メトリクスのrawValueに影響なし。

---

### Group E: レジストリ統合・既存テスト更新

#### [DONE] T15: METRIC_COMPUTATIONS 24次元統合 (completed 2026-03-15)

- **Description**: `src/metrics/registry.ts`のstub computationを実装に置換。5つの新MetricComputationエントリがGroup C/Dのcompute関数を呼び出す。git系メトリクスはgitHistory未定義時にrawValue=0を返す。
- **Files**: `src/metrics/registry.ts`
- **Dependencies**: T09-T14
- **Tests**: `src/metrics/registry.test.ts`（更新）— 24のMetricComputationが登録されていることを確認。gitHistory未定義時のgraceful degradation。
- **Acceptance**: METRIC_COMPUTATIONSが24エントリ。computeHealth()が24次元のHealthReportを生成。

#### [DONE] T16: 既存テスト24次元対応 (completed 2026-03-15)

- **Description**: DimensionName拡張とcategoryフィールド追加による既存テストのコンパイルエラーを修正。T05のテストヘルパーを活用。
- **Files**:
  - `src/types/metrics.test.ts`
  - `src/metrics/health.test.ts`
  - `src/grading/grade.test.ts`
  - `src/cli/formatters/table.test.ts`
  - `src/cli/formatters/json.test.ts`
  - `src/cli/gate.test.ts`
  - `src/cli/scan.test.ts`
  - `src/mcp/tools/*.test.ts`
  - `src/e2e/full-pipeline.test.ts`
- **Dependencies**: T05, T15
- **Tests**: `npm run typecheck && npm test` 全パス
- **Acceptance**: 全既存テストが24次元に対応してパス

#### [DONE] T17: E2Eテスト24次元対応 (completed 2026-03-15)

- **Description**: E2Eテストを24次元に対応。テストフィクスチャプロジェクトでの5新メトリクス計算を検証。git系メトリクスはテストフィクスチャのgitリポジトリ状態に依存するため、graceful degradation（gitHistory未定義→スキップ）の動作確認を含む。
- **Files**: `src/e2e/full-pipeline.test.ts`
- **Dependencies**: T16
- **Tests**: E2Eテストで24次元全てにA-Fグレードが付与されることを確認
- **Acceptance**: フルパイプラインE2Eが24次元で動作

---

### Group F: Web可視化

#### [DONE] T18: `visualize`サブコマンド (completed 2026-03-15)

- **Description**: `src/cli/visualize.ts`に`runVisualize()`関数を実装。`executePipeline()`を呼び出し、PipelineResultの全データからHTMLを生成してファイルに書き出す。`src/cli/index.ts`に`visualize`コマンドを追加。
- **Files**: `src/cli/visualize.ts`（新規作成）, `src/cli/index.ts`
- **Dependencies**: T15（24次元パイプライン）
- **Implementation details**:
  - `runVisualize(path, options?)`がPipelineResultを取得
  - HTMLをファイルに書き出し（デフォルト: `sekko-arch-report.html`）
  - `--output <file>`オプションで出力先を変更可能
  - 生成後にファイルパスをstdoutに出力
- **Tests**: `src/cli/visualize.test.ts`
  - visualizeコマンドのパーステスト
  - HTML出力ファイルの生成確認
  - `--output`オプションの動作
- **Acceptance**: `sekko-arch visualize .`で自己完結型HTMLが生成される

#### [DONE] T19: Treemap HTMLビュー (completed 2026-03-15)

- **Description**: `src/cli/html-generator.ts`にTreemapビューの生成ロジックを実装。ファイルサイズを面積、品質グレードを色で表現。D3.js CDN経由のscriptタグ。
- **Files**: `src/cli/html-generator.ts`（新規作成）
- **Dependencies**: T18
- **Implementation details**:
  - D3.js v7をCDN scriptタグで埋め込み
  - 解析データをinline JSONとして注入
  - ファイルパスをディレクトリ階層でTreemap化
  - 色マッピング: A=green, B=lightgreen, C=yellow, D=orange, F=red
  - ファイルサイズ（行数）を面積に対応
  - ホバーでファイル情報（パス、行数、グレード）を表示
- **Tests**: `src/cli/html-generator.test.ts`
  - 生成HTMLにD3.js CDNスクリプトタグが含まれる
  - 生成HTMLにインラインJSONデータが含まれる
  - TreemapデータがSnapshot.filesから正しく構築される
  - グレード→色マッピングの正しさ
- **Acceptance**: 生成HTMLをブラウザで開いてTreemapが正常にレンダリングされる

#### [DONE] T20: DSM HTMLビュー (completed 2026-03-15)

- **Description**: `src/cli/html-generator.ts`にDSMビューの生成ロジックを追加。モジュール単位のNxN依存行列を表示。
- **Files**: `src/cli/html-generator.ts`
- **Dependencies**: T19
- **Implementation details**:
  - `computeModuleAssignments()`で depth-2ディレクトリベースのモジュール分類
  - ImportGraph.edgesからモジュール間の依存エッジ数を集計
  - D3.jsでNxN行列をSVG描画
  - セル色の濃さで依存エッジ数を表現
  - 下三角行列（レイヤー準拠）と上三角行列（レイヤー違反）を視覚的に区別
  - ホバーでモジュール名とエッジ数を表示
  - Treemapビューとのタブ切り替えUI
- **Tests**: `src/cli/html-generator.test.ts`に追加
  - DSMデータがImportGraphから正しく構築される
  - モジュール間のエッジ数が正しく集計される
  - 自己参照（同一モジュール内エッジ）の処理
- **Acceptance**: 生成HTMLでDSMが正常にレンダリングされ、Treemapとタブ切り替え可能

#### [DONE] T21: HTML Generator統合テスト (completed 2026-03-15)

- **Description**: Treemap + DSMの両ビューを含む完全なHTMLの生成を検証。
- **Files**: `src/cli/html-generator.test.ts`に追加
- **Dependencies**: T19, T20
- **Tests**:
  - 完全なHTMLドキュメント構造（DOCTYPE, head, body, scripts）
  - Treemap + DSMの両ビューデータ含む
  - D3.js CDNスクリプトタグの存在
  - インラインJSONのサニタイズ（XSS対策: `</script>`エスケープ）
- **Acceptance**: 自己完結型HTMLが正しく生成され、ブラウザで閲覧可能

---

### Group G: テーブルフォーマッタ・カテゴリ表示

#### [DONE] T22: カテゴリヘッダー表示 (completed 2026-03-15)

- **Description**: `src/cli/formatters/table.ts`の`formatTable()`にカテゴリヘッダーを追加。DIMENSION_REGISTRYのcategoryフィールドでグループ化し、カテゴリ切り替え時にヘッダー行を挿入。
- **Files**: `src/cli/formatters/table.ts`
- **Dependencies**: T02（categoryフィールド）, T15（24次元統合）
- **Implementation details**:
  - DIMENSION_REGISTRYをcategory順にイテレート
  - カテゴリ切り替え時に空行 + カテゴリ名のヘッダー行を挿入
  - DIMENSION_REGISTRYの配列順序をカテゴリ別にソート済みにする（T02で対応）
- **Tests**: `src/cli/formatters/table.test.ts`に追加
  - 5カテゴリのヘッダーが表示される
  - 各カテゴリ内のメトリクスが正しくグループ化される
  - 24次元の全メトリクスが表示される
- **Acceptance**: tableフォーマッタが5カテゴリヘッダー付きで24メトリクスを表示

#### [DONE] T23: 5新メトリクスのDETAIL_FORMATTERS (completed 2026-03-15)

- **Description**: `DETAIL_FORMATTERS`に5つの新メトリクスのフォーマッタを追加。C/D/Fグレードの問題箇所表示に対応。
- **Files**: `src/cli/formatters/table.ts`
- **Dependencies**: T22
- **Implementation details**:
  - `codeChurn`: `files: Array<{file, churn}>` — 上位ファイルのチャーン量
  - `changeCoupling`: `pairs: Array<{fileA, fileB, count}>` — 高共起ペア一覧
  - `busFactor`: `files: Array<{file, authorCount}>` — 単一著者ファイル一覧
  - `codeAge`: `files: Array<{file, daysSinceUpdate}>` — 古いファイル一覧
  - `testCoverageGap`: `files: string[]` — テスト未到達ファイル一覧
- **Tests**: `src/cli/formatters/table.test.ts`に追加
  - 各新メトリクスのdetails表示が正しいフォーマット
  - 5件超の場合の省略表示
  - detailsが空の場合の処理
- **Acceptance**: 5新メトリクスのC/D/Fグレード時に問題箇所が表示される。`Record<DimensionName, DetailFormatter>`のコンパイル通過。

---

### Group H: 統合テスト・検証

#### T24: 自己スキャン24次元検証

- **Description**: sekko-arch自身を24次元でスキャンし、全メトリクスにA-Fグレードが付与されることを確認。進化メトリクスの閾値妥当性を検証。
- **Files**: `src/e2e/self-scan.test.ts`（更新）
- **Dependencies**: T17
- **Tests**: 自己スキャンで24次元全てがグレード付与される。過剰なF判定がないこと。
- **Acceptance**: 自己スキャンが成功。24次元全てのグレードが確認可能。

#### T25: パフォーマンスベンチマーク

- **Description**: 24次元計算 + git履歴収集のパフォーマンスオーバーヘッドを計測。M2ベンチマークと比較して許容範囲内であることを確認。
- **Files**: `tests/bench/scan-performance.test.ts`（更新）
- **Dependencies**: T17
- **Tests**: 24次元スキャンのベンチマーク。git収集込みの総実行時間。
- **Acceptance**: M2比でパフォーマンス劣化が30%以内（git I/Oの追加を考慮した緩和閾値）

#### T26: Git不在環境テスト

- **Description**: gitリポジトリ外でscanを実行し、graceful degradationを検証。20メトリクス（19静的 + 1テストカバレッジギャップ）が正常計算され、4つの進化メトリクスがスキップ（rawValue=0, grade="A"）されることを確認。
- **Files**: `src/e2e/git-absent.test.ts`（新規作成）
- **Dependencies**: T17
- **Implementation details**:
  - 一時ディレクトリ（git初期化なし）にテスト用TypeScriptファイルを作成
  - `executePipeline()`を実行
  - 4つのgit系メトリクス（codeChurn, changeCoupling, busFactor, codeAge）がrawValue=0
  - 残り20メトリクスが正常にグレード付与
- **Tests**: git不在環境でのフルパイプライン実行
- **Acceptance**: git不在環境で24次元全てにグレードが付与される（git系4つはA）

---

## リスク緩和策

| リスク | 緩和策 |
|--------|--------|
| Git I/Oの大規模リポジトリパフォーマンス | `--since`期間限定（デフォルト90日）。単一`git log`呼び出し。`--no-merges`。前段収集方式のためパイプライン内他フェーズに影響なし |
| テストカバレッジギャップのfalse positive | `.d.ts`、バレルファイル、エントリポイントを自動除外。rules.tomlで追加除外パターン設定可能 |
| 24メトリクスでのworst+1キャップの揮発性 | 閾値を実プロジェクト（sekko-arch自身）で検証・チューニング。カテゴリ別表示で問題カテゴリ特定を容易化 |
| D3.js CDN依存のオフライン環境 | M3ではCDN版で実装。将来`--inline`オプションでD3 minifiedをinline化する余地を残す |
| 進化メトリクス閾値の妥当性 | 自己スキャン（T24）で検証。EvolutionConfigでプロジェクト固有の調整可能 |
| DETAIL_FORMATTERSの同時更新制約 | `Record<DimensionName, DetailFormatter>`のコンパイル時チェックで漏れ検出 |
| categoryフィールド追加による19エントリの一括変更 | コンパイル時に漏れ検出。T02で一括対応 |
| テストファイルのimport解析精度 | 動的importやre-exportチェーンは追跡しない設計判断。false negativeは許容（false positiveよりリスクが低い） |
| HTML生成のXSSリスク | インラインJSONのサニタイズ（`</script>`エスケープ）をT21で検証 |

---

## 実装順序サマリー

```
Phase 1: T01-T05 (型・基盤)              ← 全体の土台。T03, T04は並列可能
Phase 2: T06-T08 (Git履歴モジュール)      ← Phase 1完了後
Phase 3: T09-T14 (5メトリクス)            ← T09-T12はPhase 2完了後、並列実装可能
                                            T13-T14はPhase 1完了後、Phase 2と並列可能
Phase 4: T15-T17 (統合・テスト更新)        ← Phase 3完了後
Phase 5: T18-T23 (Web可視化 + テーブル)    ← Phase 4完了後。F(T18-T21)とG(T22-T23)は並列可能
Phase 6: T24-T26 (統合テスト・検証)        ← Phase 5完了後
```

Phase 3のT09-T12（進化メトリクス4つ）は各メトリクスが独立しているため並列実装可能。T13-T14（テストカバレッジギャップ）はGitHistoryに依存しないため、Phase 2と並列実装可能（Phase 1完了が前提）。Phase 5のGroup FとGroup Gも並列実装可能。
