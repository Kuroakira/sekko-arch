import { resolve } from "node:path";
import { executePipeline } from "./scan.js";
import { parseRulesFile, checkRules } from "../rules/index.js";

export function runCheck(path: string): void {
  const absolutePath = resolve(path);
  const { snapshot, health } = executePipeline(absolutePath);

  const config = parseRulesFile(absolutePath);
  if (config === null) {
    console.error(
      "No .sekko-arch/rules.toml found. Create a rules file to use the check command.",
    );
    process.exit(1);
    return;
  }

  const edges = snapshot.importGraph.edges;
  const result = checkRules(config, health, edges);

  if (result.passed) {
    console.log(
      `All ${String(result.rulesChecked)} rule(s) passed.`,
    );
    return;
  }

  console.error(
    `${String(result.violations.length)} violation(s) found:`,
  );
  for (const violation of result.violations) {
    console.error(
      `  [${violation.severity}] ${violation.rule}: ${violation.message}`,
    );
    if (violation.affectedFiles.length > 0) {
      for (const file of violation.affectedFiles) {
        console.error(`    - ${file}`);
      }
    }
  }

  process.exit(1);
}
