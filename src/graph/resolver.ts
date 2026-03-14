import { dirname, join, relative } from "node:path";
import { realpathSync } from "node:fs";
import { ResolverFactory } from "oxc-resolver";
import type { ImportInfo } from "../types/index.js";

function isRelativeSpecifier(specifier: string): boolean {
  return specifier.startsWith(".") || specifier.startsWith("/");
}

// Cache realpath results to avoid redundant syscalls per file
const realpathCache = new Map<string, string>();

function getRealPath(dir: string): string {
  const cached = realpathCache.get(dir);
  if (cached) return cached;
  const real = realpathSync(dir);
  realpathCache.set(dir, real);
  return real;
}

// Cache resolver instances by tsconfig path to avoid recreation per file
const resolverCache = new Map<string, ResolverFactory>();

function getResolver(tsconfigPath?: string): ResolverFactory {
  const cacheKey = tsconfigPath ?? "__no_tsconfig__";
  const cached = resolverCache.get(cacheKey);
  if (cached) return cached;

  const resolver = new ResolverFactory({
    conditionNames: ["import", "node"],
    extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
    extensionAlias: {
      ".js": [".ts", ".tsx", ".js"],
      ".jsx": [".tsx", ".jsx"],
    },
    tsconfig: tsconfigPath ? { configFile: tsconfigPath } : undefined,
  });

  resolverCache.set(cacheKey, resolver);
  return resolver;
}

export function resolveImports(
  filePath: string,
  imports: readonly ImportInfo[],
  rootDir: string,
  tsconfigPath?: string,
): ImportInfo[] {
  const resolver = getResolver(tsconfigPath);
  const realRootDir = getRealPath(rootDir);
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
