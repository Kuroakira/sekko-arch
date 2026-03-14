import { dirname, join, relative } from "node:path";
import { realpathSync } from "node:fs";
import { ResolverFactory } from "oxc-resolver";
import type { ImportInfo } from "../types/index.js";

function isRelativeSpecifier(specifier: string): boolean {
  return specifier.startsWith(".") || specifier.startsWith("/");
}

function createResolver(tsconfigPath?: string): ResolverFactory {
  return new ResolverFactory({
    conditionNames: ["import", "node"],
    extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
    extensionAlias: {
      ".js": [".ts", ".tsx", ".js"],
      ".jsx": [".tsx", ".jsx"],
    },
    tsconfig: tsconfigPath ? { configFile: tsconfigPath } : undefined,
  });
}

export function resolveImports(
  filePath: string,
  imports: readonly ImportInfo[],
  rootDir: string,
  tsconfigPath?: string,
): ImportInfo[] {
  const resolver = createResolver(tsconfigPath);
  const realRootDir = realpathSync(rootDir);
  const absoluteDir = dirname(join(realRootDir, filePath));

  const results: ImportInfo[] = [];

  for (const imp of imports) {
    if (!isRelativeSpecifier(imp.specifier)) {
      continue;
    }

    const resolution = resolver.sync(absoluteDir, imp.specifier);

    if (resolution.path) {
      const relativePath = relative(realRootDir, resolution.path).replace(
        /\\/g,
        "/",
      );
      results.push({ specifier: imp.specifier, resolved: relativePath });
    } else {
      results.push({ specifier: imp.specifier, resolved: null });
    }
  }

  return results;
}
