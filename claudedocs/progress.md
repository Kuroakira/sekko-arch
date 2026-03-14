## 2026-03-14 — /claude-praxis:feature-spec: FeatureSpec complete — Architecture Analysis Tool
- Decision: TypeScriptでアーキテクチャ品質分析ツールをフルスクラッチ開発。sentruxのアルゴリズム・閾値を参考に、5カテゴリ・25指標を3マイルストーンで段階実装
- Rationale: OSSのforkではなく自作を選択。理由は「他者のコードは内部動作を完全に信頼できない＋AIコーディングで実装コストが低い現在、自作の方がセキュリティ上合理的」。dependency-cruiser等の組み合わせも、統一スコアリングとMCP拡張パスの欠如で却下
- Scope: M1=CLI+7指標(Cycles,Coupling,Depth,GodFiles,ComplexFunctions,Levelization,BlastRadius), M2=MCP+15指標追加, M3=GUI+進化メトリクス+DSM
- Domain: architecture-analysis, code-quality, developer-tooling

## 2026-03-14 — /claude-praxis:design: G1 complete — Research + Synthesis
- Decision: tree-sitter native + oxc-resolver + hybrid parallelization (async I/O + worker_threads) + immutable snapshots + Commander CLI + TOML config + Vitest. 16 design axes resolved, all with clear winners
- Rationale: Follows sentrux's proven architecture patterns adapted for TypeScript. oxc-resolver mandated by FeatureSpec. Native tree-sitter for performance. Single package for M1 simplicity
- Domain: architecture-analysis

## 2026-03-14 — /claude-praxis:design: G3 complete — Outline + Review
- Decision: 7-section outline (Overview → Context → Goals → Proposal → Design Decisions → Alternatives → Risks). 18 axes mapped to sections. Self-review: all axes covered, FeatureSpec requirements addressed
- Rationale: Concern-based ordering over phase-ordered for better readability. WHY-heavy, HOW-sparse
- Domain: architecture-analysis

## 2026-03-14 — /claude-praxis:design: Design Doc complete — archana M1
- Decision: 6フェーズパイプライン(scan→parse→graph→metrics→grade→output)、不変Snapshot中心のデータモデル、tree-sitter native + oxc-resolver、7メトリクスのA-F採点(SDP準拠coupling含む)、scan/check/gateの3コマンド
- Rationale: sentruxのアーキテクチャをTypeScriptに適応。WHY重視の設計判断(各決定に再検討条件を明記)。レビュー3 Important指摘(パース失敗回復、worker threads要否、モジュール境界)は実装時に対応
- Domain: architecture-analysis

## 2026-03-14 — /claude-praxis:plan: Plan complete — archana M1
- Decision: 40タスク・10フェーズの実装プラン。単一スレッドで開始、ベンチマーク後にworker threads検討。sentruxのRust実装をアルゴリズム参考に使用
- Rationale: パイプライン順（types→scanner→parser→graph→metrics→grading→CLI→rules→integration）で依存関係に沿った順序。各タスクは独立テスト可能なサイズ
- Domain: architecture-analysis

## 2026-03-14 — /claude-praxis:plan: Plan complete — sekko-arch M2 MCP連携 + 指標拡充
- Decision: 32タスク・7グループ(A-G)の実装プラン。M1リファクタリング済みのregistry pattern + MetricContext基盤の上に、12新メトリクス + stdio MCPサーバーを構築。MetricContext moduleEdgesは不要（既存フィールドで計算可能）
- Rationale: 型変更を先に整備(Group A)→パーサー拡張(B)→12メトリクス並列実装(C/D)→統合(E)→MCP(F)→E2E(G)の依存順。テストヘルパー(T04)でbreaking changeの影響を最小化。rawValue反転は各compute関数内で実施（二重反転防止）。gate.tsのrawValue比較ハードコードはM3リファクタリング候補として記録
- Domain: architecture-analysis, mcp-integration

## 2026-03-14 — M2 Group A complete — 型システム・基盤拡張
- Decision: DimensionName 7→19次元、FuncInfo +2フィールド(bodyHash, cognitiveComplexity)、DIMENSION_REGISTRY 19エントリ、既存テスト11ファイル修正。registry.tsに12スタブcomputation + 完全性アサーション追加
- Rationale: 後続Group全体の型基盤を先に整備。スタブcomputationでシステム全体の動作を維持しつつ、Group C/Dで段階的に実装置換する方針。5レビュー全PASS、414テスト全通過
- Files: src/types/metrics.ts, src/types/core.ts, src/dimensions.ts, src/metrics/registry.ts, src/parser/function-extractors.ts, src/testing/fixtures.ts + テスト11ファイル
- Domain: architecture-analysis
