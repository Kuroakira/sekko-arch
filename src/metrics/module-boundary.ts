import { moduleOf } from "../utils/module-of.js";

export function computeModuleAssignments(
  filePaths: readonly string[],
): ReadonlyMap<string, string> {
  const assignments = new Map<string, string>();
  for (const filePath of filePaths) {
    assignments.set(filePath, moduleOf(filePath));
  }
  return assignments;
}

export function detectDegenerateCases(
  moduleAssignments: ReadonlyMap<string, string>,
): { warnings: string[]; isDegenerate: boolean } {
  const warnings: string[] = [];
  const moduleCounts = new Map<string, number>();

  for (const mod of moduleAssignments.values()) {
    moduleCounts.set(mod, (moduleCounts.get(mod) ?? 0) + 1);
  }

  const moduleCount = moduleCounts.size;
  const totalFiles = moduleAssignments.size;

  if (moduleCount < 3) {
    warnings.push(
      `Degenerate: fewer than 3 modules detected (found ${moduleCount})`,
    );
  }

  for (const [mod, count] of moduleCounts) {
    const ratio = count / totalFiles;
    if (ratio > 0.8) {
      warnings.push(
        `Degenerate: module "${mod}" contains >80% of files (${count}/${totalFiles} = ${Math.round(ratio * 100)}%)`,
      );
    }
  }

  return { warnings, isDegenerate: warnings.length > 0 };
}

export function isSameModule(fileA: string, fileB: string): boolean {
  return moduleOf(fileA) === moduleOf(fileB);
}
