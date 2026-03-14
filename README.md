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

プロジェクトをスキャンし、7つのアーキテクチャ指標をA〜Fで採点する。

```bash
sekko-arch scan .
sekko-arch scan . --format json   # 機械可読なJSON出力
```

### check — ルールチェック

`.archana/rules.toml` に定義した制約に違反がないかチェックする。違反があれば exit code 1 で終了するため、CIに組み込める。

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

## 計測指標

| カテゴリ | 指標 | 内容 |
|---------|------|------|
| モジュール構造 | Cycles | 循環依存の数（Tarjan SCC） |
| モジュール構造 | Coupling Score | 不安定モジュールへの依存比率 |
| モジュール構造 | Depth | 推移的依存の最大深度 |
| ファイルレベル | God Files | fan-out > 15 のファイル比率 |
| ファイルレベル | Complex Functions | 循環的複雑度 > 15 の関数比率 |
| アーキテクチャ | Levelization | DAG上の上向き違反エッジ比率 |
| アーキテクチャ | Blast Radius | 1ファイル変更時の推移的影響範囲 |

各指標はA〜Fで採点される。複合グレードは各次元の平均をfloorし、最悪次元+1で上限キャップする。

安定した基盤モジュール（fan-in高 & instability低）への依存はペナルティから自動除外される（Martin SDP準拠）。

## ルール設定

`.archana/rules.toml` でプロジェクト固有の制約を定義できる。

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
```

## 技術スタック

- **パーサー**: tree-sitter（TypeScript/TSX対応）
- **モジュール解決**: oxc-resolver（tsconfig paths、barrel files、package aliases対応）
- **CLI**: Commander.js
- **ルール設定**: TOML（smol-toml）
- **テスト**: Vitest
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

- **Milestone 2**: MCP連携（AIエージェントがセッション前後でスコア比較）、指標を19に拡充
- **Milestone 3**: Web UIでの構造可視化、Git履歴ベースの進化メトリクス、DSM

## ライセンス

MIT
