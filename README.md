# sekko-arch

TypeScriptプロジェクトのアーキテクチャ品質を静的解析し、A〜Fでスコアリングするコマンドラインツール。

AIエージェント主導の開発で失われがちな「プロジェクト全体の構造的健全性」を定量的に可視化し、循環依存・結合度の肥大化・レイヤー違反といった構造劣化を検出する。24の品質指標（静的解析19 + Git履歴ベースの進化メトリクス4 + テストカバレッジギャップ1）をカテゴリ別に表示し、自己完結型HTMLによるTreemap・DSM可視化も提供する。

## インストール

```bash
npm install -g sekko-arch
```

または npx で直接実行:

```bash
npx sekko-arch scan .
```

## 使い方

### scan — メトリクス出力

プロジェクトをスキャンし、24のアーキテクチャ指標をA〜Fで採点する。5カテゴリ（モジュール構造・ファイル/関数・アーキテクチャ・進化・テスト/構造）ごとにグループ表示され、C/D/F評価の次元には問題箇所の詳細（ファイル名・関数名・メトリクス値）が表示される。

```bash
sekko-arch scan .
sekko-arch scan . --format json       # 機械可読なJSON出力
sekko-arch scan . --include src lib   # 特定ディレクトリのみスキャン
```

### check — ルールチェック

`.sekko-arch/rules.toml` に定義した制約に違反がないかチェックする。違反があれば exit code 1 で終了するため、CIに組み込める。

```bash
sekko-arch check .
```

### gate — 回帰検出

コード変更前後のスコアを比較し、品質劣化を検出する。

```bash
# 1. 変更前にベースラインを保存
sekko-arch gate --save .

# 2. コードを変更（AIによる生成など）

# 3. ベースラインと比較
sekko-arch gate .
# → スコアが悪化していれば非ゼロで終了し、劣化した次元と対象ファイルを表示
```

### visualize — Web可視化

プロジェクトをスキャンし、Treemap（ファイルサイズ×品質グレード）とDSM（モジュール間依存行列）を含む自己完結型HTMLレポートを生成する。

```bash
sekko-arch visualize .                        # sekko-arch-report.html を生成
sekko-arch visualize . --output report.html   # 出力先を指定
```

### mcp — AIエージェント連携

MCP（Model Context Protocol）サーバーとして起動し、AIエージェントからのツール呼び出しに応答する。

```bash
sekko-arch mcp   # stdio トランスポートで起動
```

AIエージェントは以下のツールを利用できる:

| ツール | 説明 |
|--------|------|
| `scan` | 全24次元のスキャン結果を取得 |
| `health` | ヘルスレポート（グレードのみ、ファイル詳細なし） |
| `coupling_detail` | カップリングの診断詳細 |
| `cycles_detail` | 循環依存の診断詳細 |
| `session_start` | セッション開始時のベースライン保存 |
| `session_end` | セッション終了時にベースラインと比較 |

## 計測指標（24次元）

### モジュール構造

| 指標 | 内容 |
|------|------|
| Cycles | 循環依存の数（Tarjan SCC） |
| Coupling Score | 不安定モジュールへの依存比率 |
| Cohesion | モジュール内の凝集度（内部エッジ比率） |
| Entropy | 依存分布のShannon エントロピー |

### ファイル・関数レベル

| 指標 | 内容 |
|------|------|
| God Files | fan-out > 15 のファイル比率 |
| Complex Functions | 循環的複雑度 > 15 の関数比率 |
| Cognitive Complexity | SonarSource準拠の認知的複雑度 > 15 の関数比率 |
| Long Functions | 50行超の関数比率 |
| Large Files | 500行超のファイル比率 |
| High Params | パラメータ > 4 の関数比率 |
| Duplication | 正規化ボディハッシュが重複する関数比率 |
| Dead Code | 未参照エクスポート関数の比率 |
| Comments | コメント行比率（低すぎるとペナルティ） |

### アーキテクチャ

| 指標 | 内容 |
|------|------|
| Depth | 推移的依存の最大深度 |
| Levelization | DAG上の上向き違反エッジ比率 |
| Blast Radius | 1ファイル変更時の推移的影響範囲 |
| Distance from Main Sequence | Robert C. Martin の D = \|A + I - 1\| |
| Attack Surface | エントリポイントから到達可能なファイル比率 |
| Hotspots | fan-in高 × 不安定度高のファイル比率 |

### 進化（Git履歴ベース）

| 指標 | 内容 |
|------|------|
| Code Churn | 上位10%ファイルへのチャーン集中度（Nagappan & Ball 2005） |
| Change Coupling | 同一コミットでの高頻度共変更ファイル比率（Gall et al. 1998） |
| Bus Factor | 単一著者のみがコミットしたファイル比率（Ricca et al. 2011） |
| Code Age | 一定期間（デフォルト365日）未更新のファイル比率 |

### テスト・構造

| 指標 | 内容 |
|------|------|
| Test Coverage Gap | テストから推移的に到達不可能なソースファイル比率 |

各指標はA〜Fで採点される。複合グレードは各次元の平均をfloorし、最悪次元+1で上限キャップする。

安定した基盤モジュール（fan-in高 & instability低）への依存はペナルティから自動除外される（Martin SDP準拠）。

Git履歴ベースの進化メトリクスはgitリポジトリ外では自動スキップされ（rawValue=0, grade=A）、残り20指標は正常に計算される。

## スキャン制御

### `--include` オプション

scan / check / gate コマンドで `--include <dirs...>` を指定すると、対象ディレクトリを限定できる。

```bash
sekko-arch scan . --include src lib
```

### `[ignore]` パターン

`.sekko-arch/rules.toml` の `[ignore]` セクションでglob パターンによるファイル除外が可能。

```toml
[ignore]
patterns = [
  "**/*.test.ts",
  "**/fixtures/**",
  "scripts/**",
]
```

`--include`（ホワイトリスト）→ `[ignore]`（ブラックリスト）の順に適用される。

## ルール設定

`.sekko-arch/rules.toml` でプロジェクト固有の制約を定義できる。

```toml
[constraints]
max_cycles = 0
max_coupling = 0.3
max_depth = 10

[layers]
order = ["domain", "application", "infrastructure", "presentation"]

[boundaries]
# モジュール間の禁止依存を定義
deny = [
  { from = "domain", to = "infrastructure" },
]

[evolution]
days = 90                        # Git履歴の収集期間（デフォルト: 90日）
change_coupling_threshold = 5    # 共変更回数の閾値（デフォルト: 5）
code_age_threshold_days = 365    # コード年齢の閾値（デフォルト: 365日）

[ignore]
patterns = ["**/*.test.ts"]
```

## 技術スタック

- **パーサー**: tree-sitter（TypeScript/TSX対応）
- **モジュール解決**: oxc-resolver（tsconfig paths、barrel files、package aliases対応）
- **CLI**: Commander.js
- **MCP**: @modelcontextprotocol/sdk（stdioトランスポート）
- **ルール設定**: TOML（smol-toml）
- **バリデーション**: Zod
- **可視化**: D3.js v7（CDN経由、自己完結型HTML生成）
- **テスト**: Vitest（714テスト）
- **ビルド**: tsup

## 動作環境

- Node.js >= 18

## 開発

```bash
git clone https://github.com/your-username/sekko-arch.git
cd sekko-arch
npm install
npm run build
npm test          # テスト実行
npm run typecheck # 型チェック
npm run lint      # ESLint
npm run format    # Prettier
```

## Acknowledgments

本プロジェクトは [sentrux](https://github.com/morinokami/sentrux) を参考に開発されました。

## ライセンス

MIT
