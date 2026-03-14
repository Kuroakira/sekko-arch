import type { Language } from "../types/core.js";
import Parser from "tree-sitter";
import TypeScriptGrammars from "tree-sitter-typescript";

const { typescript: tsLang, tsx: tsxLang } = TypeScriptGrammars;

const tsParser = new Parser();
tsParser.setLanguage(tsLang);

const tsxParser = new Parser();
tsxParser.setLanguage(tsxLang);

export type Tree = Parser.Tree;

/**
 * Parse a TypeScript/TSX source string into a tree-sitter Tree.
 * Returns null if parsing fails catastrophically (should be rare —
 * tree-sitter produces partial trees even with syntax errors).
 */
export function parseFile(source: string, lang: Language): Tree | null {
  try {
    const parser = lang === "tsx" ? tsxParser : tsParser;
    return parser.parse(source);
  } catch {
    return null;
  }
}
