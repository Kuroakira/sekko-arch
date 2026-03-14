export interface GodFilesResult {
  readonly godFiles: readonly string[];
  readonly count: number;
  readonly ratio: number;
}

const GOD_FILE_THRESHOLD = 15;

export function detectGodFiles(
  fanOut: ReadonlyMap<string, number>,
  entryPoints: ReadonlySet<string>,
): GodFilesResult {
  const godFiles: string[] = [];

  for (const [file, count] of fanOut) {
    if (count > GOD_FILE_THRESHOLD && !entryPoints.has(file)) {
      godFiles.push(file);
    }
  }

  const totalFiles = fanOut.size;
  const ratio = totalFiles === 0 ? 0 : godFiles.length / totalFiles;

  return { godFiles, count: godFiles.length, ratio };
}
