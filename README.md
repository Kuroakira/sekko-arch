# sekko-arch

TypeScriptプロジェクトのアーキテクチャ品質を静的解析し、A〜Fでスコアリングするコマンドラインツール。

AIエージェント主導の開発で失われがちな「プロジェクト全体の構造的健全性」を定量的に可視化し、循環依存・結合度の肥大化・レイヤー違反といった構造劣化を検出する。

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

プロジェクトをスキャンし、19のアーキテクチャ指標をA〜Fで採点する。C/D/F評価の次元には問題箇所の詳細（ファイル名・関数名・メトリクス値）が表示される。

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

### mcp — AIエージェント連携

MCP（Model Context Protocol）サーバーとして起動し、AIエージェントからのツール呼び出しに応答する。

```bash
sekko-arch mcp   # stdio トランスポートで起動
```

AIエージェントは以下のツールを利用できる:

| ツール | 説明 |
|--------|------|
| `scan` | 全19次元のスキャン結果を取得 |
| `health` | ヘルスレポート（グレードのみ、ファイル詳細なし） |
| `coupling_detail` | カップリングの診断詳細 |
| `cycles_detail` | 循環依存の診断詳細 |
| `session_start` | セッション開始時のベースライン保存 |
| `session_end` | セッション終了時にベースラインと比較 |

## 計測指標（19次元）

### モジュール構造

| 指標 | 内容 |
|------|------|
| Cycles | 循環依存の数（Tarjan SCC） |
| Coupling Score | 不安定モジュールへの依存比率 |
| Depth | 推移的依存の最大深度 |
| Cohesion | モジュール内の凝集度（内部エッジ比率） |
| Entropy | 依存分布のShannon エントロピー |

### ファイル・関数レベル

| 指標 | 内容 |
|------|------|
| God Files | fan-out > 15 のファイル比率 |
| Complex Functions | 循環的複雑度 > 15 の関数比率 |
| Cognitive Complexity | SonarSource準拠の認知的複雑度 > 15 の関数比率 |
| Hotspots | fan-in高 × 不安定度高のファイル比率 |
| Long Functions | 50行超の関数比率 |
| Large Files | 500行超のファイル比率 |
| High Params | パラメータ > 4 の関数比率 |
| Duplication | 正規化ボディハッシュが重複する関数比率 |
| Dead Code | 未参照エクスポート関数の比率 |
| Comments | コメント行比率（低すぎるとペナルティ） |

### アーキテクチャ

| 指標 | 内容 |
|------|------|
| Levelization | DAG上の上向き違反エッジ比率 |
| Blast Radius | 1ファイル変更時の推移的影響範囲 |
| Distance from Main Sequence | Robert C. Martin の D = \|A + I - 1\| |
| Attack Surface | エントリポイントから到達可能なファイル比率 |

各指標はA〜Fで採点される。複合グレードは各次元の平均をfloorし、最悪次元+1で上限キャップする。

安定した基盤モジュール（fan-in高 & instability低）への依存はペナルティから自動除外される（Martin SDP準拠）。

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
- **テスト**: Vitest（579テスト）
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

## ロードマップ

- **Milestone 3**: Web UIでの構造可視化、Git履歴ベースの進化メトリクス、DSM

## ライセンス

MIT
