export type Severity = "error" | "warning";

export interface RuleViolation {
  readonly rule: string;
  readonly severity: Severity;
  readonly message: string;
  readonly affectedFiles: readonly string[];
}

export interface RuleCheckResult {
  readonly passed: boolean;
  readonly violations: readonly RuleViolation[];
  readonly rulesChecked: number;
}

export interface ConstraintsConfig {
  readonly max_cycles?: number;
  readonly max_coupling?: number;
  readonly max_cc?: number;
  readonly no_god_files?: boolean;
}

export interface LayerConfig {
  readonly name: string;
  readonly paths: readonly string[];
  readonly order: number;
}

export interface BoundaryConfig {
  readonly from: string;
  readonly to: string;
  readonly reason?: string;
}

export interface IgnoreConfig {
  readonly patterns: readonly string[];
}

export interface EvolutionConfig {
  readonly days?: number;
  readonly changeCouplingThreshold?: number;
  readonly codeAgeThresholdDays?: number;
}

export interface RulesConfig {
  readonly constraints?: ConstraintsConfig;
  readonly layers?: readonly LayerConfig[];
  readonly boundaries?: readonly BoundaryConfig[];
  readonly ignore?: IgnoreConfig;
  readonly evolution?: EvolutionConfig;
}
