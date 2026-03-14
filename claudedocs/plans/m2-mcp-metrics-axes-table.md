# Design Axes Table: sekko-arch M2

| # | Axis | Choices | Verdict | Rationale |
|---|------|---------|---------|-----------|
| 1 | MCPツール粒度 | A: 細粒度（15+ツール、メトリクスごと）/ B: 粗粒度（3ツール: scan, session, detail）/ C: ハイブリッド（5-6ツール + フィルタ） | C: ハイブリッド | Design Doc推奨。多数のツールはAIエージェントのツール選択を複雑にする。ほとんどのメトリクスがフルパイプラインを必要とし細粒度のメリットが薄い。フィルタパラメータで柔軟性を確保。 |
| 2 | MCPモジュール構造 | A: モノリシック（server.ts に全ツール）/ B: モジュラー（server.ts + tools/*.ts） | B: モジュラー | Design Doc推奨。1ファイル1関心事の既存規約に合致。個別ツールの独立テストが可能。 |
| 3 | MCPサーバーとパイプラインの接続 | A: CLIラッパー（runScan等を呼ぶ）/ B: executePipeline()直接呼び出し | B: 直接呼び出し | runScan()はconsole.log/process.exitを含みstdio MCP非互換。executePipeline()はPipelineResultを返す純粋関数で直接利用可能。 |
| 4 | セッション状態管理 | A: インメモリ（モジュールレベル変数）/ B: ファイルシステム / C: クライアント提供 | A: インメモリ | Design Doc推奨。stdio MCPは1プロセス=1接続。ファイルシステムはI/O+クリーンアップの負担。クライアント提供はペイロードサイズ問題。 |
| 5 | DimensionGrades拡張方式 | A: 全フィールド必須（breaking change）/ B: 新フィールドをoptional / C: Record<DimensionName, DimensionResult>に移行 | A: 全フィールド必須 | Design Doc推奨。DimensionGradesはmapped type `{ [K in DimensionName]: DimensionResult }` で実装済みなので、DimensionName拡張で自動的に必須フィールドが追加される。optionalはcompositeGrade計算を複雑化。Record型はM3候補。 |
| 6 | FuncInfo拡張方式 | A: bodyHash + cognitiveComplexityを必須追加 / B: optional追加 | A: 必須追加 | Design Doc推奨。パースが成功すれば常に計算可能。optionalにする理由がない。テストは型エラーをガイドに更新。 |
| 7 | 認知的複雑度の計算タイミング | A: enrichWithComplexity内で循環的複雑度と同時計算 / B: 別のenrichWithCognitiveComplexity関数 | A: 同時計算 | AST二重走査を回避。findFunctionNodeは既にノード検索を行っており、同一ノードでCC+CogCを計算可能。ただし実装はsrc/parser/cognitive-complexity.tsに分離。 |
| 8 | bodyHashの計算場所 | A: function-extractors.ts の makeFuncInfo内 / B: 別のenrichment pass | A: makeFuncInfo内 | Design Doc推奨。ASTノードの.textプロパティがmakeFuncInfoで利用可能。別passではノード再検索が必要。 |
| 9 | bodyHashアロー関数のノード選択 | A: parentNode（lexical_declaration）/ B: 内側のarrow_functionノード | B: 内側ノード | Design Doc推奨。parentNodeには変数宣言構文が含まれ、関数本体の比較に不適切。内側ノードの.textは純粋な関数本体のみ。 |
| 10 | 逆方向採点の実装 | A: rawValue反転方式（1-ratio）/ B: gradeDimension()に方向フラグ追加 / C: 閾値の降順定義 | A: rawValue反転 | Design Doc推奨。gradeDimension()の変更不要で影響範囲最小。detailsフィールドで元の値を保持。方向フラグは既存7メトリクスの呼び出しも全て変更が必要。 |
| 11 | 複合グレード計算 | A: 19次元均等適用 / B: カテゴリ別重み付け | A: 均等適用 | Design Doc推奨。computeCompositeGrade()はObject.values()で動的イテレーション済み。重み付けは恣意性を導入。worst+1キャップで深刻な問題は表出する。 |
| 12 | Dead Code検出レベル | A: ファイルレベル（入次数0ファイル）/ B: シンボルレベル（named import追跡） | A: ファイルレベル | Design Doc推奨。シンボルレベルはImportInfo拡張+パーサー+グラフ層の変更が必要でM2スコープ超過。ファイルレベルでも有意なシグナルが得られる。M3候補。 |
| 13 | Duplication検出方式 | A: 正規化テキストハッシュ / B: AST構造ハッシュ / C: トークンシーケンスハッシュ | A: 正規化テキストハッシュ | Design Doc推奨。単純・高速で完全重複を確実に検出。ハッシュのみ保持でメモリ効率維持。AST構造ハッシュは実装複雑度が高い。 |
| 14 | ハッシュアルゴリズム | A: Node.js crypto (SHA-256) / B: 簡易ハッシュ（fnv1a等） | A: SHA-256 | Node.js標準ライブラリで追加依存なし。衝突確率がゼロに近い。パフォーマンスはfnv1aと大差なし（数千関数規模）。 |
| 15 | MCPサーバーのCLI起動 | A: `sekko-arch mcp`サブコマンド / B: 別バイナリ | A: サブコマンド | Design Doc推奨。既存のcommander構造に自然に統合。`npx sekko-arch mcp`でMCP設定が完結。 |
| 16 | MCP依存パッケージ | A: @modelcontextprotocol/sdk + zod / B: 自前実装 | A: SDK利用 | 標準SDKが安定版提供済み。zodはSDKのpeer dependency。自前実装はプロトコル準拠のリスクが高い。 |
| 17 | テストヘルパー戦略 | A: テストごとに19次元DimensionGradesを手動構築 / B: テストヘルパー関数でデフォルト値生成 | B: ヘルパー関数 | 19次元を毎回手動構築するとテストの可読性が低下。ヘルパーでデフォルト値を提供し、テスト対象の次元のみオーバーライド。 |
| 18 | gate.ts baselineの19次元対応 | A: dimensionGrades Recordに全次元を動的に保存 / B: 個別フィールドに19次元追加 | A: 動的Record | 現在のgate.tsはdimensionGradesとして`Record<string, Grade>`を使用し、DIMENSION_NAMESからイテレーション。新次元は自動的に対応。ただし個別比較ロジック（couplingScore等のハードコード）は汎用化が必要。 |
