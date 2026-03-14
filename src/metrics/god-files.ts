const GOD_FILE_THRESHOLD = 15;

export function detectGodFiles(
  fanOut: ReadonlyMap<string, number>,
  entryPoints: ReadonlySet<string>,
): string[] {
  const godFiles: string[] = [];

  for (const [file, count] of fanOut) {
    if (count > GOD_FILE_THRESHOLD && !entryPoints.has(file)) {
      godFiles.push(file);
    }
  }

  return godFiles;
}
