# FeatureSpec: Architecture Analysis Tool

## Problem Statement

AIエージェント（Claude Code, Cursor等）がコードを生成する際、局所的には正しいコードを書くが、プロジェクト全体のアーキテクチャ構造を理解していない。人間がIDEでコードを書いていた時代は、ファイルツリーを日常的に見て、依存関係を頭の中で空間的にマッピングしていた。そのため循環依存、レイヤー違反、結合度の肥大化といった構造的問題に自然と気づけた。

AIエージェント主導の開発ではこの空間認識が失われる。エージェントはファイルを「平面的」にしか見ておらず、「この変更がシステム全体でどういう意味を持つか」を判断できない。結果として、セッションを重ねるごとにアーキテクチャが劣化し、エージェント自身のパフォーマンスも悪化するという悪循環が生まれる。

### 現在のワークアラウンド

- 人間がコードレビューで構造的問題を手動で発見（認知コスト高、見落としやすい）
- ESLintの循環依存検出など個別ルールはあるが、全体的な構造品質の可視化・採点はない
- dependency-cruiser、madge等の個別ツールはあるが、統一的なスコアリングやAIワークフロー統合がない

## Alternatives Considered

### A. sentruxをforkしてテレメトリ削除

sentrux（MIT License）は同じ問題を解決するRust製ツール。`update_check.rs`を削除し、プラグイン自動ダウンロードを無効化すれば1日で使える状態になる。

**却下理由**: 他者が書いたコードの内部動作を完全に把握・信頼することが難しい。今回のセキュリティ監査でテレメトリ送信やチェックサム未検証のネイティブバイナリ動的ロードが発見されたように、OSSであっても「何が入っているかわからない」リスクがある。テレメトリ削除だけでは、将来のアップデートで新たなリスクが混入する可能性を排除できない。AIコーディングにより実装コストが大幅に下がった現在、自分が完全に理解・制御できるコードを持つ方がセキュリティ上合理的。

### B. 既存ツールの組み合わせ（dependency-cruiser + madge + ESLint）

dependency-cruiserで循環依存・レイヤー違反、madgeで依存グラフ、ESLintで複雑度ルールを個別に設定し、スコアリングスクリプトで統合する。

**却下理由**: 上記と同じセキュリティ上の理由に加え、ツールごとに解析モデルが異なり統一的なスコアリングが難しい。「blast radius」「安定性」「凝集度」など依存グラフ全体を使った高次メトリクスはこれらのツールでは計算できない。また、AI連携（MCP）への拡張パスが見えない。

### C. TypeScriptでフルスクラッチ（採用）

sentruxのアルゴリズム・設計パターンを参考にしつつ、TypeScriptで再実装する。sentruxが採用しているアルゴリズムは学術文献ベース（McCabe、Martin、Tarjan等）で仕様が明確。AIコーディングにより実装コストは従来より大幅に低い。

**利点**: 全コードが自分の管理下にあり、セキュリティリスクを完全に排除できる。AIコーディングにより実装コストが大幅に低下した現在、アルゴリズムと設計パターンが明確（sentruxの参考実装 + 学術文献）であれば、フルスクラッチでも現実的な工数で実現可能。

## User Stories

### AIエージェントと協働する開発者

プロダクト開発でClaude Codeを使っている。数千ファイル規模のTypeScriptプロジェクトで、AIに機能追加やリファクタリングを依頼する。AIが書いたコードを受け入れる前に、そのコードが全体のアーキテクチャにどう影響するかを確認したい。

**調査時ワークフロー**:
1. `archana scan .` でプロジェクトをスキャンし、現在のスコアを確認
2. 問題箇所（循環依存、god file等）を特定
3. その情報をもとにAIに具体的な指示を出す

**レビュー時ワークフロー（回帰検出）**:
1. AIにコード生成を依頼する前に `archana gate --save .` でベースラインを保存
2. AIがコードを書く
3. `archana gate .` でベースラインと比較。スコアが悪化していれば非ゼロで終了し、劣化した次元と具体的なファイルを表示
4. 悪化があればAIに修正を指示

**CI統合**:
- `archana check .` がルール違反時に exit code 1 で終了
- JSON出力オプション (`--format json`) で機械可読な結果を出力

**エッジケース**:
- tsconfig.jsonがない/複数ある場合: 検出して警告、デフォルトのTypeScript解決にフォールバック
- 構文エラーのあるファイル: スキップしてwarning出力、残りのファイルは正常に解析
- モノレポ（複数packages）: 指定ディレクトリ配下を対象とし、ワークスペース設定があれば読み取る
- node_modules、dist等: デフォルトで除外（.gitignoreに準拠）

### 将来: MCP経由でAIエージェント自身が利用（Milestone 2）

AIエージェントがコード生成前後に自律的にメトリクスを参照し、構造的に問題のある変更を避ける。

## Scope

### In Scope

**全マイルストーン共通**:
- **完全ローカル動作**: 外部通信ゼロ。テレメトリなし、外部ダウンロードなし
- **TypeScript対応**（最優先）、Python対応（第2優先）
- **TypeScriptで開発**: ツール自体をTypeScriptで実装
- **import解決**: `oxc-resolver` npmパッケージを使用（tsconfig.json paths、barrel files、package aliases等を正確に解決）

**Milestone 1 — CLIコア + モジュール構造メトリクス**:

sentruxの指標体系を参考に、5カテゴリ・20+指標を段階的に実装する。Milestone 1ではカテゴリ1（モジュール構造）を中心に、最も価値の高い指標から着手する。

カテゴリ1: モジュール構造（静的解析）— Milestone 1:
| 指標 | 何を測るか | グレード基準 |
|------|-----------|-------------|
| Cycles | 循環依存の数（Tarjan SCC） | 0=A, 7+=F |
| Coupling Score | 不安定モジュールへの依存比率 | ≤0.20=A, >0.70=F |
| Depth | 推移的依存の最大深度 | ≤5=A, >15=F |

カテゴリ2: ファイル・関数レベル — Milestone 1（一部）:
| 指標 | 何を測るか | 閾値 |
|------|-----------|------|
| God Files | fan-out>15のファイル比率 | ≤1%=B |
| Complex Functions | 循環的複雑度>15の関数比率（McCabe） | ≤2%=A |

カテゴリ3: アーキテクチャレベル — Milestone 1（一部）:
| 指標 | 何を測るか | 出典 |
|------|-----------|------|
| Levelization | DAG上の上向き違反エッジ比率 | Lakos 1996 |
| Blast Radius | 1ファイル変更時の推移的影響範囲 | 変更影響分析 |

**設計上の注目点**: 安定した基盤モジュール（fan-in高 & instability低）を自動検出し、そこへの依存はペナルティから除外する（Martin SDP準拠）。

- A〜F採点: sentruxの閾値・採点アルゴリズムを参考に実装
  - 複合グレード = floor(各次元の平均)、最悪次元+1で上限キャップ
- CLIモード: `scan`（メトリクス出力）、`check`（ルールチェック、exit 0/1）、`gate --save / gate`（回帰検出）
- 出力形式: テーブル表示（デフォルト）、JSON（`--format json`）
- ルールエンジン: `.archana/rules.toml` で制約定義（max_cycles、max_coupling、layers、boundaries）

**Milestone 2 — MCP連携 + ファイルレベル指標拡充**:
- stdio MCP server（`archana mcp`）
- scan、health、coupling、cycles、session_start/end等のツール公開
- AIエージェントがセッション前後でスコア比較可能
- カテゴリ2 追加指標:

| 指標 | 何を測るか | 閾値 |
|------|-----------|------|
| Cognitive Complexity | 認知的複雑度>15の関数比率（SonarSource方式） | ≤2%=A |
| Hotspots | 高fan-in+不安定なファイル比率 | ≤1%=B |
| Long Functions | 50行超の関数比率 | ≤5%=A |
| Large Files | 500行超のファイル比率 | ≤5%=A |
| High Params | 引数>4の関数比率 | ≤3%=A |
| Duplication | 関数本体ハッシュによる重複比率 | ≤1%=A |
| Dead Code | 未参照関数の比率 | ≤3%=A |
| Comments | コメント行比率 | ≥8%=A |

- カテゴリ3 追加指標:

| 指標 | 何を測るか | 出典 |
|------|-----------|------|
| Distance from Main Sequence | D=\|A+I-1\| 抽象度と不安定度の理想線距離 | Martin 2003 |
| Attack Surface | エントリポイントから到達可能なファイル比率 | 到達可能性分析 |

- カテゴリ1 追加指標:

| 指標 | 何を測るか | グレード基準 |
|------|-----------|-------------|
| Cohesion | モジュール内ファイル間接続度（spanning tree基準） | ≥0.70=A, <0.10=F |
| Entropy | 依存エッジ分布のShannon情報量 | ≤0.40=A, >0.90=F |

**Milestone 3 — GUI + 進化メトリクス + DSM**:
- Web UIでの構造可視化（トレマップまたはforce-directed graph）
- カテゴリ4: 進化メトリクス（Git履歴ベース）:

| 指標 | 何を測るか | 出典 |
|------|-----------|------|
| Code Churn | 90日間の変更行数集中度 | Nagappan & Ball 2005 |
| Change Coupling | 頻繁に同時変更されるファイルペア | Gall et al. 1998 |
| Bus Factor | 単一著者ファイルの比率（知識の偏り） | Ricca et al. 2011 |
| Code Age | 最終更新からの経過日数 | - |

- カテゴリ5: テスト・構造分析:

| 指標 | 何を測るか |
|------|-----------|
| Test Coverage Gap | テストファイルから推移的に到達されないソースファイル比率 |
| Design Structure Matrix | NxNの依存関係行列（対角線上=違反、クラスタ検出） |

### Out of Scope

- 23言語対応: まずTypeScript + Pythonのみ
- プラグインシステム: 言語追加は直接コードに組み込む（動的ロードしない）
- リアルタイムファイル監視（watchモード）: 初期バージョンではオンデマンドスキャン
- テレメトリ・アップデートチェック・外部通信の一切

## Purpose

### 成功基準

**Milestone 1（CLIコア + 7指標）**:
- 5,000ファイルのTypeScriptプロジェクトを15秒以内にスキャン完了（4コアマシン）
- カテゴリ1-3から選定した7指標（Cycles, Coupling, Depth, God Files, Complex Functions, Levelization, Blast Radius）のA〜Fスコアが出力される
- SDP準拠: 安定基盤モジュールへの依存をペナルティから自動除外
- `gate --save` → コード変更 → `gate` で回帰を検出し、劣化した次元と対象ファイルを表示
- `check` がルール違反時に exit 1 で終了（CI統合可能）
- `--format json` で機械可読な結果を出力

**Milestone 2（MCP連携 + 15指標拡充）**:
- Claude CodeのMCP設定に追加し、エージェントが `scan` → `session_start` → 作業 → `session_end` のワークフローを実行できる
- ファイルレベル8指標 + アーキテクチャ2指標 + モジュール構造2指標を追加し、計19指標

**Milestone 3（GUI + 進化メトリクス + DSM）**:
- ブラウザでプロジェクト構造をインタラクティブに閲覧・探索できる
- Git履歴ベースの進化メトリクス4指標（Churn, Change Coupling, Bus Factor, Code Age）
- テスト・構造分析2指標（Test Coverage Gap, DSM）
- 全25指標の完全な品質ダッシュボード

## Risks

1. **TypeScriptのimport解決の複雑さ**: tsconfig.json paths、barrel files、conditional exports等の組み合わせが膨大。`oxc-resolver` npmパッケージの利用で軽減するが、edge caseでの精度は実プロジェクトで検証が必要
2. **メトリクス閾値の妥当性**: sentruxの閾値を出発点とするが、実プロジェクトで過剰にF判定が出る（false positive）とツールが信頼されなくなる。初期ユーザー（自分自身）のフィードバックでチューニング必要
3. **モノレポ対応**: Nx、Turborepo等のワークスペース構成でのクロスパッケージ依存解決は追加の考慮が必要
4. **動的import / re-export**: `import()`, `export * from` 等の動的パターンは静的解析では完全に捕捉できない。実用上は主要なパターンをカバーし、漏れは許容する方針

## References

- sentrux (アルゴリズム・設計パターンの参考): https://github.com/sentrux/sentrux
- tree-sitter: https://tree-sitter.github.io/ (パーサー基盤)
- tree-sitter Node.js binding: https://github.com/tree-sitter/node-tree-sitter
- oxc-resolver npm: https://www.npmjs.com/package/oxc-resolver (TypeScriptモジュール解決)
- dependency-cruiser (既存ツール、参考): https://github.com/sverweij/dependency-cruiser
- Robert C. Martin "Clean Architecture" (安定度・抽象度・距離の理論)
- McCabe (1976) "A Complexity Measure" (循環的複雑度)
- Constantine & Yourdon (1979) "Structured Design" (結合度・凝集度)
- Tarjan (1972) "Depth-First Search and Linear Graph Algorithms" (SCC検出)
- Lakos (1996) "Large-Scale C++ Software Design" (Levelization)
- Nagappan & Ball (2005) "Use of Relative Code Churn Measures to Predict System Defect Density" (Code Churn)
- Gall et al. (1998) "Detection of Logical Coupling Based on Product Release History" (Change Coupling)
- Ricca et al. (2011) "The Bus Factor in Practice" (Bus Factor)
- SonarSource Cognitive Complexity spec (認知的複雑度)
