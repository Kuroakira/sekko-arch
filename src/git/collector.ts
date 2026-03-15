import { execSync } from "node:child_process";
import type { GitHistory, GitCommitInfo, FileChurn } from "./types.js";
import type { EvolutionConfig } from "../types/rules.js";

const COMMIT_SEPARATOR = "---COMMIT_SEPARATOR---";
const FIELD_SEPARATOR = "---FIELD_SEPARATOR---";

function parseNumstatLine(
  line: string,
): { file: string; added: number; deleted: number } | null {
  const trimmed = line.trim();
  if (trimmed === "") return null;

  const parts = trimmed.split("\t");
  if (parts.length < 3) return null;

  const [addedStr, deletedStr, ...fileParts] = parts;
  const file = fileParts.join("\t");

  // Binary files show as "-\t-"
  if (addedStr === "-" || deletedStr === "-") return null;

  // Rename notation contains "=>"
  if (file.includes(" => ")) return null;

  const added = parseInt(addedStr, 10);
  const deleted = parseInt(deletedStr, 10);
  if (isNaN(added) || isNaN(deleted)) return null;

  return { file, added, deleted };
}

function parseGitLogOutput(raw: string): readonly GitCommitInfo[] {
  const chunks = raw.split(COMMIT_SEPARATOR).filter((s) => s.trim() !== "");
  const commits: GitCommitInfo[] = [];

  for (const chunk of chunks) {
    const lines = chunk.trim().split("\n");
    if (lines.length === 0) continue;

    const headerLine = lines[0];
    const headerParts = headerLine.split(FIELD_SEPARATOR);
    if (headerParts.length < 3) continue;

    const [hash, author, dateStr] = headerParts;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) continue;

    const files: string[] = [];
    for (let i = 1; i < lines.length; i++) {
      const parsed = parseNumstatLine(lines[i]);
      if (parsed) {
        files.push(parsed.file);
      }
    }

    commits.push({ hash, author, date, files });
  }

  return commits;
}

function buildFileChurns(
  raw: string,
): ReadonlyMap<string, FileChurn> {
  const chunks = raw.split(COMMIT_SEPARATOR).filter((s) => s.trim() !== "");
  const churns = new Map<string, { added: number; deleted: number }>();

  for (const chunk of chunks) {
    const lines = chunk.trim().split("\n");
    for (let i = 1; i < lines.length; i++) {
      const parsed = parseNumstatLine(lines[i]);
      if (!parsed) continue;

      const existing = churns.get(parsed.file);
      if (existing) {
        existing.added += parsed.added;
        existing.deleted += parsed.deleted;
      } else {
        churns.set(parsed.file, {
          added: parsed.added,
          deleted: parsed.deleted,
        });
      }
    }
  }

  return churns as ReadonlyMap<string, FileChurn>;
}

function buildFileAuthors(
  commits: readonly GitCommitInfo[],
): ReadonlyMap<string, ReadonlySet<string>> {
  const authors = new Map<string, Set<string>>();

  for (const commit of commits) {
    for (const file of commit.files) {
      const existing = authors.get(file);
      if (existing) {
        existing.add(commit.author);
      } else {
        authors.set(file, new Set([commit.author]));
      }
    }
  }

  return authors as ReadonlyMap<string, ReadonlySet<string>>;
}

function buildFileLastModified(
  commits: readonly GitCommitInfo[],
): ReadonlyMap<string, Date> {
  const lastModified = new Map<string, Date>();

  for (const commit of commits) {
    for (const file of commit.files) {
      const existing = lastModified.get(file);
      if (!existing || commit.date > existing) {
        lastModified.set(file, commit.date);
      }
    }
  }

  return lastModified;
}

export function collectGitHistory(
  rootDir: string,
  config?: EvolutionConfig,
): GitHistory | undefined {
  const days = config?.days ?? 90;
  const format = `${COMMIT_SEPARATOR}%n%H${FIELD_SEPARATOR}%aN${FIELD_SEPARATOR}%aI`;
  const cmd = `git log --format="${format}" --numstat --no-merges --since=${days}.days.ago`;

  let raw: string;
  try {
    raw = execSync(cmd, {
      cwd: rootDir,
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch {
    return undefined;
  }

  const commits = parseGitLogOutput(raw);
  const fileChurns = buildFileChurns(raw);
  const fileAuthors = buildFileAuthors(commits);
  const fileLastModified = buildFileLastModified(commits);

  return { fileChurns, commits, fileAuthors, fileLastModified };
}
