# Architecture Analysis: archana (Self-Scan) — Thorough Mode

**Scope**: プロジェクト全体
**Date**: 2026-03-14
**Mode**: Thorough (Phase 1 + Phase 2)

---

## Phase 1: Overview & Debt Inventory

### Self-Scan Results (archana scan .)

| Dimension | Value | Grade |
|-----------|-------|-------|
| Cycles | 1 | B |
| Coupling | 0.20 | A |
| Depth | 9 | C |
| God Files | 0.00 | A |
| Complex Fns | 0.04 | B |
| Levelization | 0.01 | B |
| Blast Radius | 0.45 | **D** |
| **Composite** | | **C** |

105 files scanned in 1.6ms

---

### Project Structure (57 source files)

```
src/
├── cli/           # CLI commands (scan, check, gate) + formatters
├── scanner/       # File discovery & metadata (git-files, fs-walk, line-counter)
├── parser/        # AST parsing via tree-sitter (extractors, complexity, imports)
├── graph/         # Import graph construction (import-graph, resolver)
├── metrics/       # 7 health dimensions + orchestration hub
├── grading/       # Threshold bands & composite scoring
├── rules/         # Rule checking (constraints, layers, boundaries, TOML parser)
├── types/         # Core type definitions (5 files)
├── utils/         # Utilities (glob, module-of)
├── testing/       # Test helpers (fixtures)
└── e2e/           # End-to-end tests
```

### Pipeline Architecture

```
scanFiles (scanner/)
  → parseAndExtract (parser/)
    → buildImportGraph (graph/)
      → computeHealth (metrics/)
        → 7 metric functions
        → gradeDimension (grading/)
        → computeCompositeGrade (grading/)
```

Entry Points:
- `cli/scan.ts` → `executePipeline()` → pipeline全体を実行
- `cli/check.ts` → pipeline + rules engine
- `cli/gate.ts` → pipeline + baseline比較

---

### Debt Inventory

| # | Issue | Location | Severity | Category | Impact |
|---|-------|----------|----------|----------|--------|
| 1 | **Orchestration hub高fan-out** | `metrics/health.ts` (11 imports) | HIGH | Coupling | Blast Radius D（45%）の主因。1ファイル変更が全メトリクスに波及 |
| 2 | **循環依存 (1 cycle)** | 要特定（テストfixtures関連の可能性） | MEDIUM | Cycles | Grade B; DAG前提のアルゴリズムに影響 |
| 3 | **推移的依存の深さ** | cli → scanner → parser → types (9 hops) | MEDIUM | Layering | Depth C; 変更時の再コンパイルチェーンが長い |
| 4 | **DimensionGrades閉じたインターフェース** | `types/metrics.ts` | MEDIUM | Extensibility | 新メトリクス追加に3ファイル以上の協調変更が必要 |
| 5 | **hardcoded dimension list** | `grading/grade.ts` | MEDIUM | Maintainability | 次元追加のたびに手動更新が必要 |
| 6 | **Levelization違反** | 未特定のエッジ | MEDIUM | Layering | Grade B; DAG前提の破壊 |
| 7 | **parser/extractors.ts肥大化** | `parser/extractors.ts` (364行) | LOW | Complexity | 最大の非テストモジュール; 関心の分離が不十分 |
| 8 | **M2でのfan-out爆発リスク** | `metrics/health.ts` | HIGH | Coupling | 12新メトリクス追加で11→23 importsに膨張予定 |

---

## Phase 2: Deep Dive Results (全8項目)

---

### #1 & #8: Orchestration Hub高fan-out + M2 fan-out爆発リスク

#### 現状

`metrics/health.ts`（167行）が **11の内部import** を持つスター型トポロジの中心:
- 7つのメトリクスモジュール（cycles, coupling, depth, god-files, complex-fns, levelization, blast-radius）
- 2つのグレーディングモジュール（thresholds, grade）
- 2つの共有モジュール（fan-maps, module-boundary）

共有データ構造（fanMaps, moduleAssignments, entryPoints）が`computeHealth()`内で計算され、各メトリクスに暗黙的に渡されている。

#### Blast Radius D（45%）の根本原因

`health.ts`変更時の推移的影響: **19ファイル**
- 3つのCLIコマンド（scan, check, gate）
- 9つのメトリクスモジュール
- 2つの共有モジュール
- 型定義・定数ファイル

#### M2での予測影響（リファクタリングなし）

| 項目 | M1現状 | M2予測 | 変化 |
|------|--------|--------|------|
| health.ts行数 | 167 | 250-300 | +50% |
| health.tsインポート数 | 11 | 23-28 | +110% |
| Blast Radius影響ファイル | 19 | 34-40 | +78% |

#### 推奨: Registry Pattern + Metric Context

**Step 1: MetricContext抽出**
共有データ（fanMaps, moduleAssignments等）を明示的なコンテキストオブジェクトに:
```typescript
interface MetricContext {
  readonly snapshot: Snapshot;
  readonly fanIn: ReadonlyMap<string, number>;
  readonly fanOut: ReadonlyMap<string, number>;
  readonly moduleAssignments: ReadonlyMap<string, string>;
  readonly entryPoints: ReadonlySet<string>;
}
```

**Step 2: MetricDefinition Registry**
各メトリクスをレジストリエントリとして登録:
```typescript
interface MetricDefinition {
  readonly name: DimensionName;
  readonly compute: (ctx: MetricContext) => DimensionResult;
}
const METRIC_REGISTRY: readonly MetricDefinition[] = [...]
```

**結果**: health.tsのimport数 11→5-6（45%削減）。M2メトリクスはレジストリに追加するだけでhealth.tsの変更不要。

---

### #2 & #6: 循環依存 + Levelization違反

#### 循環依存の正体

**E2Eテストフィクスチャ内のサンプルプロジェクト**に存在（archana本体のコードではない）:

```
src/e2e/fixtures/sample-project/src/auth/session.ts
  ↔ 双方向import
src/e2e/fixtures/sample-project/src/auth/login.ts
```

- `session.ts` L2: `import { authenticate } from "./login.js"` — 値import
- `login.ts` L2: `import { createSession, type Session } from "./session.js"` — 値+型import

**意図的に配置されたテスト用の循環依存**。archana本体のコード（src/直下）には循環依存はゼロ。

#### Levelization違反の正体

2つの違反エッジ（全188エッジ中、違反率1.06%）:
1. `login.ts → session.ts`（同一レベルに配置、DAG不可）
2. `session.ts → login.ts`（同上）

循環依存の直接的帰結。循環を含むSCC内のエッジは線形化不可能なため、必然的にlevelization違反となる。

**archana本体のコードには循環もlevelization違反もない**。スコアの低下は意図的なテストフィクスチャに起因。

#### 対応方針

テストフィクスチャとして意図的なので修正不要。ただし、archana自身のスコアリング時にe2eフィクスチャを除外するオプションの検討は有用。

---

### #3: 推移的依存の深さ（Grade C, 9 hops）

#### 最長チェーン

```
0: src/cli/index.test.ts
└→ 1: src/cli/index.ts
   └→ 2: src/cli/check.ts
      └→ 3: src/cli/scan.ts
         └→ 4: src/graph/index.ts         ← barrel再エクスポート
            └→ 5: src/graph/import-graph.ts
               └→ 6: src/graph/resolver.ts
                  └→ 7: src/types/index.ts  ← barrel再エクスポート
                     └→ 8: src/types/snapshot.ts
                        └→ 9: src/types/core.ts
```

#### 削減可能なホップ

| 変更 | 削減 | リスク |
|------|------|--------|
| `graph/index.ts` barrel除去 | -1 | Low（scan.tsのimportパス変更のみ） |
| `types/index.ts` 直接import化 | -1 | Medium（20+ファイルが参照） |
| 型をコンシューマに近接配置 | -2 | High（型システム全体の再構築） |

#### 判断

105ファイル規模で深さ9は**許容範囲**。12-15を超えた場合のみリファクタリングを検討。M2でファイル増加時に再評価。

---

### #4 & #5: 閉じたDimensionGrades + Hardcoded Dimension List

#### 新メトリクス追加に必要な協調変更（現状）

1メトリクス追加するために**6ファイルの同時変更**が必要:

| ファイル | 変更内容 |
|----------|----------|
| `types/metrics.ts` | `DimensionName` union + `DimensionGrades` property追加 |
| `grading/thresholds.ts` | `THRESHOLDS`マップにエントリ追加 |
| `metrics/health.ts` | 計算呼び出し + dimensionsオブジェクト構築に追加 |
| `grading/grade.ts` | compositeグレード配列に値抽出を追加 |
| `cli/formatters/table.ts` | `DIMENSION_LABELS`, `INTEGER_DIMENSIONS`, `DIMENSION_ORDER`に追加 |
| `cli/gate.ts` | `requiredDimensions`配列 + baseline抽出に追加 |

M2で12メトリクス追加 → **6ファイル × 12回の協調変更** = Open/Closed原則違反。

#### 推奨: Metadata-Driven Configuration + Registry

全次元のメタデータを1箇所に集約:
```typescript
// src/config/dimensions.ts (新規)
interface DimensionConfig {
  readonly name: DimensionName;
  readonly label: string;
  readonly thresholds: readonly [number, Grade][];
  readonly isInteger: boolean;
  readonly order: number;
}

const DIMENSION_CONFIGS: readonly DimensionConfig[] = [
  { name: "cycles", label: "Cycles", thresholds: [...], isInteger: true, order: 0 },
  // ...
];
```

各モジュール（thresholds.ts, table.ts, gate.ts, grade.ts）はこのconfigから動的に生成。新メトリクス追加は**1箇所への追加のみ**。

---

### #7: parser/extractors.ts肥大化（364行）

#### 3つの独立したドメイン

| ドメイン | 行範囲 | 行数 | 関数 |
|----------|--------|------|------|
| 関数抽出 | 1-138 | 138 | `extractFunctions` + 5ヘルパー |
| クラス/インターフェース抽出 | 140-266 | 127 | `extractClasses` + 9ヘルパー |
| Import抽出 | 268-364 | 97 | `extractImports` + 3ヘルパー |

**ドメイン間結合ゼロ**: 共有状態なし、相互関数呼び出しなし、型の相互依存なし。

#### 推奨: 3ファイルに分割

```
src/parser/
├── extractors.ts              → barrel再エクスポート (20行)
├── function-extractors.ts     → 関数抽出 (140行)
├── class-extractors.ts        → クラス抽出 (127行)
└── import-extractors.ts       → Import抽出 (97行)
```

影響範囲は`parser/index.ts`のみ（直接importerが1ファイルだけ）。リファクタリングコスト: 約1時間。

---

## Synthesis: 優先度マトリクス

| 優先度 | 項目 | M2ブロッカー？ | 推奨アクション |
|--------|------|---------------|---------------|
| **P0** | #4+#5 DimensionGrades + Hardcoded List | Yes | Metadata-Driven Config導入 |
| **P0** | #1+#8 health.ts fan-out + M2爆発 | Yes | Registry Pattern + MetricContext |
| **P1** | #7 extractors.ts分割 | No | 3ファイルに分割（M2前の準備として有用） |
| **P2** | #3 Depth 9 hops | No | 現状許容。M2後に再評価 |
| **Info** | #2+#6 Cycle + Levelization | No | テストフィクスチャ由来。修正不要 |

### M2着手前の推奨リファクタリング順序

1. **DimensionConfig集約** (#4+#5) — 型システムとメタデータの一元化
2. **Registry Pattern + MetricContext** (#1+#8) — health.tsのfan-out解消
3. **extractors.ts分割** (#7) — 任意だがM2のパーサー拡張前に整理

この3つを先に実施すれば、M2で12メトリクス追加時の変更箇所が**6ファイル×12回 → 1ファイル×12回**に削減される。

---

## Confidence Boundary

### 評価済み
- 全ソースファイルの依存関係トレース
- 循環依存・levelization違反の特定と根本原因
- Blast Radius/Depthの具体的なチェーン特定
- M2拡張時の影響予測

### 未評価
- 実行時パフォーマンス（ベンチマーク未実施）
- テストカバレッジの定量値
- oxc-resolverのedge case（モノレポ、conditional exports等）
- M3のGUI/Git履歴メトリクスへの構造的影響
