// Utility: no imports, leaf node
export type LogLevel = "debug" | "info" | "warn" | "error";

export function log(level: LogLevel, message: string): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
}

export function logError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  log("error", message);
}
