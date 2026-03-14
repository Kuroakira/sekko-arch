import type { HealthReport } from "../../types/metrics.js";
import { formatTable } from "./table.js";
import { formatJson } from "./json.js";

export interface Formatter {
  readonly format: (report: HealthReport) => string;
}

const formatters: Record<string, Formatter> = {
  table: { format: formatTable },
  json: { format: formatJson },
};

export function getFormatter(name: string): Formatter {
  const formatter = formatters[name];
  if (formatter === undefined) {
    const available = Object.keys(formatters).join(", ");
    throw new Error(`Unknown format "${name}". Available formats: ${available}`);
  }
  return formatter;
}
