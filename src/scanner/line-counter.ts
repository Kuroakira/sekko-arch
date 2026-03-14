export interface LineCounts {
  readonly lines: number;
  readonly logic: number;
  readonly comments: number;
  readonly blanks: number;
}

interface ParserState {
  inBlockComment: boolean;
  inTemplateLiteral: boolean;
}

/**
 * Count lines in source code, classifying each as code, comment, or blank.
 * Uses a state machine to track block comment and template literal state across lines.
 * A line with both code and comment is classified as code (logic).
 * Blank lines inside block comments are classified as comments.
 */
export function countLines(source: string): LineCounts {
  if (source.length === 0) {
    return { lines: 0, logic: 0, comments: 0, blanks: 0 };
  }

  const lines = source.split("\n");
  // A trailing newline is a line terminator, not a new line
  if (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  let logic = 0;
  let comments = 0;
  let blanks = 0;
  const state: ParserState = { inBlockComment: false, inTemplateLiteral: false };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.length === 0) {
      if (state.inBlockComment) {
        comments++;
      } else if (state.inTemplateLiteral) {
        logic++;
      } else {
        blanks++;
      }
      continue;
    }

    const classification = classifyLine(trimmed, state);
    state.inBlockComment = classification.inBlockComment;
    state.inTemplateLiteral = classification.inTemplateLiteral;

    if (classification.hasCode) {
      logic++;
    } else if (classification.hasComment) {
      comments++;
    }
  }

  return {
    lines: lines.length,
    logic,
    comments,
    blanks,
  };
}

interface LineClassification {
  readonly hasCode: boolean;
  readonly hasComment: boolean;
  readonly inBlockComment: boolean;
  readonly inTemplateLiteral: boolean;
}

function classifyLine(
  trimmed: string,
  state: ParserState,
): LineClassification {
  let hasCode = false;
  let hasComment = false;
  let i = 0;
  let inBlock = state.inBlockComment;
  let inTemplate = state.inTemplateLiteral;

  // If continuing a template literal from previous line, this is code
  if (inTemplate) {
    hasCode = true;
    i = scanTemplateLiteral(trimmed, 0);
    if (i < 0) {
      // Template literal ended; i is negated position after closing backtick
      inTemplate = false;
      i = -i;
    } else {
      // Still in template literal at end of line
      return { hasCode: true, hasComment: false, inBlockComment: false, inTemplateLiteral: true };
    }
  }

  while (i < trimmed.length) {
    if (inBlock) {
      hasComment = true;
      const endIdx = trimmed.indexOf("*/", i);
      if (endIdx === -1) {
        break;
      }
      inBlock = false;
      i = endIdx + 2;
      continue;
    }

    const ch = trimmed[i];

    // Template literal — may span multiple lines
    if (ch === "`") {
      hasCode = true;
      const pos = scanTemplateLiteral(trimmed, i + 1);
      if (pos < 0) {
        // Template ended on this line
        i = -pos;
      } else {
        // Template continues to next line
        return { hasCode: true, hasComment, inBlockComment: false, inTemplateLiteral: true };
      }
      continue;
    }

    // Skip single/double quoted string literals
    if (ch === '"' || ch === "'") {
      hasCode = true;
      i = skipString(trimmed, i);
      continue;
    }

    if (ch === "/" && i + 1 < trimmed.length) {
      const next = trimmed[i + 1];

      if (next === "/") {
        if (!hasCode) {
          hasComment = true;
        }
        break;
      }

      if (next === "*") {
        const endIdx = trimmed.indexOf("*/", i + 2);
        if (endIdx === -1) {
          inBlock = true;
          if (!hasCode) {
            hasComment = true;
          }
          break;
        }
        if (!hasCode) {
          hasComment = true;
        }
        i = endIdx + 2;
        continue;
      }
    }

    if (ch !== " " && ch !== "\t") {
      hasCode = true;
    }
    i++;
  }

  return { hasCode, hasComment, inBlockComment: inBlock, inTemplateLiteral: inTemplate };
}

/**
 * Scan a template literal body starting at `start` (after the opening backtick).
 * Returns negative position (-pos) if the template ends (pos = index after closing backtick).
 * Returns positive position if the template continues past end of line.
 */
function scanTemplateLiteral(source: string, start: number): number {
  let i = start;
  while (i < source.length) {
    if (source[i] === "\\") {
      i += 2;
      continue;
    }
    if (source[i] === "`") {
      return -(i + 1);
    }
    i++;
  }
  return i; // positive = still in template
}

function skipString(source: string, start: number): number {
  const quote = source[start];
  let i = start + 1;

  while (i < source.length) {
    if (source[i] === "\\") {
      i += 2;
      continue;
    }
    if (source[i] === quote) {
      return i + 1;
    }
    i++;
  }

  return i;
}
