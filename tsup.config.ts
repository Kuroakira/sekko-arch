import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/cli/index.ts", "src/index.ts"],
  format: ["esm"],
  target: "node20",
  clean: true,
  splitting: false,
  dts: {
    entry: ["src/index.ts"],
  },
  external: ["tree-sitter", "tree-sitter-typescript", "oxc-resolver"],
});
