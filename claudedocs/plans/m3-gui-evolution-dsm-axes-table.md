# M3 Axes Table: Web可視化 + 進化メトリクス + DSM

## Axis 1: Git履歴データ収集

| 選択肢 | 利点 | 欠点 | 評価 |
|--------|------|------|------|
| **execSync直接実行（採用）** | 既存パターン（`git ls-files`）との一貫性。新依存ゼロ。`git log --format`カスタム出力の直接解析に最適 | エラーハンドリングが手動。プラットフォーム差異を自前対処 | **採用**: 既存アーキテクチャとの一貫性が最優先。sekko-archが必要とするのは`git log --format`の出力解析のみであり、ラッパーの抽象化レイヤーは不要 |
| simple-git | 7.9M weekly downloads。型付きAPI。エラーハンドリング内蔵 | CVE-2026-28292（CVSS 9.8）RCE脆弱性。新依存追加。`git log --format`カスタム出力ではラッパーのメリットが薄い | 却下: セキュリティリスク + 不要な抽象化 |
| isomorphic-git | Pure JS実装。ブラウザ互換 | CLI専用のsekko-archにブラウザ互換は不要。大規模リポジトリでネイティブgitより遅い。新依存追加 | 却下: ユースケース不一致 |

**コードベース確認**: `src/scanner/git-files.ts`で`execSync("git ls-files", ...)`を使用しており、同パターンの踏襲が自然。

## Axis 2: パイプライン統合方式

| 選択肢 | 利点 | 欠点 | 評価 |
|--------|------|------|------|
| **前段収集方式（採用）** | 既存の同期パイプライン変更不要。git不在時は`undefined`を渡すだけ。関心事の分離が明確 | git収集がパイプラインと直列実行 | **採用**: 既存アーキテクチャへの侵襲が最小。`executePipeline()`の前でgitデータを収集し、`computeHealth()`に渡す |
| 並列フェーズ方式 | File Collectionと並列でI/O効率化 | パイプライン構造の変更が必要。git不在環境の条件分岐がパイプライン内に入り込む | 却下: 構造変更のコストが利点を上回る |
| オンデマンド遅延取得 | 必要時のみgitデータ取得 | MetricContext構築の非同期化が必要。既存の同期フローとの不整合 | 却下: 非同期化は全メトリクスに影響する破壊的変更 |

**コードベース確認**: `buildMetricContext(snapshot: Snapshot)`は同期関数。`computeHealth(snapshot)`も同期。前段収集でオプショナルにgitデータを渡すのが最もクリーン。`computeHealth()`のシグネチャを`computeHealth(snapshot, gitHistory?)`に拡張する。

## Axis 3: HTML生成ライブラリ

| 選択肢 | 利点 | 欠点 | 評価 |
|--------|------|------|------|
| **D3.js CDN（採用）** | Treemap + Matrix（DSM）の両レイアウトを単一ライブラリでカバー。CDN scriptタグ1つで自己完結型HTML。エコシステム最大 | CDN依存（オフライン環境で問題）。学習コスト | **採用**: 2ビュー（Treemap + DSM）のニーズに最適。将来`--inline`オプションでD3 minifiedをHTML内に埋め込む余地あり |
| D3.js inline | オフライン環境対応 | HTMLファイルサイズが300KB+に膨張。初回実装のスコープ超過 | 見送り: M3ではCDN版で十分。`--inline`は将来オプション |
| カスタムSVG生成 | 外部依存ゼロ。ファイルサイズ最小 | Treemap + DSM両方の実装コストが非常に高い。インタラクション実装が困難 | 却下: 実装コストが利点を大幅に上回る |

**コードベース確認**: `package.json`にランタイム依存は7パッケージ。D3.jsはCDN経由のため依存追加なし。

## Axis 4: DSMスコープ

| 選択肢 | 利点 | 欠点 | 評価 |
|--------|------|------|------|
| **可視化専用（採用）** | levelizationとの重複回避。メトリクス数24で管理可能。各メトリクスの独自価値を優先 | DSMから抽出可能な定量指標を見送る | **採用**: Design Doc決定に合致。DSMクラスタ品質はcohesion+couplingの組み合わせとの差別化が弱い |
| メトリクス + 可視化 | DSMクラスタ品質スコアを提供。25メトリクスに | levelizationと重複。cohesion+couplingとの差別化が弱い。「水増しメトリクス」リスク | 却下: 独自の品質シグナルが不十分 |

**コードベース確認**: `computeLevelization()`が既にレイヤー違反比率を計測。DSMメトリクス化は重複。`computeCohesion()`がモジュール内接続度を、`computeCoupling()`がモジュール間結合度を計測しており、DSMクラスタ品質はこれらの組み合わせと実質的に同等。

## Axis 5: テストカバレッジ解析方式

| 選択肢 | 利点 | 欠点 | 評価 |
|--------|------|------|------|
| **軽量別解析（採用）** | 既存19メトリクスのrawValueに影響ゼロ。import解析のみで高速。既存パイプラインのテストファイル除外を維持 | テストファイルのフル構造情報が利用不可（M3では不要） | **採用**: 非侵襲的。gate比較での偽回帰リスクがゼロ |
| パイプライン統合 | テストコード品質メトリクスへの将来拡張が容易 | 既存19メトリクスのrawValueが変化するbreaking change。god files比率、dead code比率のベースが変動 | 却下: breaking changeリスクが高すぎる |

**コードベース確認**: `src/scanner/git-files.ts`の`isTestFile()`は`/\.test\.tsx?$/`パターンで判定。この逆条件でテストファイルを収集する関数を`src/scanner/test-files.ts`に新設。`isTestFile()`は現在unexportedなのでexport追加が必要。

## Axis 6: CLIコマンド設計

| 選択肢 | 利点 | 欠点 | 評価 |
|--------|------|------|------|
| **`visualize`サブコマンド（採用）** | PipelineResultの全データにアクセス可能。Formatter抽象を迂回。HTML出力のセマンティクス（ファイル生成）がtable/json（stdout出力）と異なることを明示 | コマンド数増加（scan/check/gate/mcp/visualize） | **採用**: Design Doc決定に合致。Formatter抽象のインターフェース変更（breaking change）を回避 |
| `--format html` | 既存の`--format`オプションとの一貫性 | `Formatter.format(HealthReport)`のシグネチャ拡張が必要。table/jsonにも不要なデータが渡される。HTML出力はstdoutに適さない | 却下: Formatter抽象のbreaking changeが必要 |

**コードベース確認**: `src/cli/index.ts`で`createProgram()`がCommander.jsプログラムを構築。`scan/check/gate/mcp`の4コマンド。`visualize`追加は同パターンで容易。`PipelineResult`は`src/cli/scan.ts`で定義済みで`{snapshot, health}`を含む。HTML生成には追加で`ImportGraph`（`snapshot.importGraph`経由）と`moduleAssignments`が必要だが、`PipelineResult.snapshot`から全て取得可能。

## Axis 7: 複合グレード方式

| 選択肢 | 利点 | 欠点 | 評価 |
|--------|------|------|------|
| **24メトリクス均等平均（採用）** | M1/M2との一貫性。結果の予測可能性が高い。worst+1キャップで深刻な問題が必ず表出 | 24メトリクスで個別の影響が薄まる | **採用**: Design Doc決定に合致。カテゴリ別表示で視覚的整理を達成し、グレード計算の複雑化を避ける |
| カテゴリ別重み付け | カテゴリの重要度を反映可能 | 重み付けが恣意的。ユーザーごとに「正しい重み」が異なる。結果の予測可能性が低下 | 却下: 恣意性の導入リスク |

**コードベース確認**: `src/grading/grade.ts`の`computeCompositeGrade()`は`DimensionGrades`を受け取り、全次元のgradeToValue平均→floor→worst+1キャップを適用。24メトリクスでもロジック変更不要。`DIMENSION_NAMES.length`が自動的に24になるため、平均計算は自動的に24次元に対応。
