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
