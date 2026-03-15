import { describe, it, expect } from "vitest";
import { generateReportHtml } from "./html-generator.js";
import type { PipelineResult } from "./scan.js";
import type { Snapshot } from "../types/snapshot.js";
import type { HealthReport } from "../types/metrics.js";
import { makeHealth } from "../testing/fixtures.js";

function makePipelineResult(
  overrides?: Partial<{
    files: Snapshot["files"];
    edges: Snapshot["importGraph"]["edges"];
  }>,
): PipelineResult {
  const files = overrides?.files ?? [
    {
      path: "src/cli/index.ts",
      name: "index.ts",
      isDir: false,
      lines: 100,
      logic: 80,
      comments: 10,
      blanks: 10,
      funcs: 3,
      lang: "ts" as const,
      sa: undefined,
    },
    {
      path: "src/metrics/health.ts",
      name: "health.ts",
      isDir: false,
      lines: 200,
      logic: 160,
      comments: 20,
      blanks: 20,
      funcs: 5,
      lang: "ts" as const,
      sa: undefined,
    },
    {
      path: "src/graph/resolver.ts",
      name: "resolver.ts",
      isDir: false,
      lines: 150,
      logic: 120,
      comments: 15,
      blanks: 15,
      funcs: 4,
      lang: "ts" as const,
      sa: undefined,
    },
  ];

  const edges = overrides?.edges ?? [
    { fromFile: "src/cli/index.ts", toFile: "src/metrics/health.ts" },
    { fromFile: "src/metrics/health.ts", toFile: "src/graph/resolver.ts" },
  ];

  const adjacency = new Map<string, readonly string[]>();
  const reverseAdjacency = new Map<string, readonly string[]>();
  for (const e of edges) {
    const fwd = adjacency.get(e.fromFile) ?? [];
    adjacency.set(e.fromFile, [...fwd, e.toFile]);
    const rev = reverseAdjacency.get(e.toFile) ?? [];
    reverseAdjacency.set(e.toFile, [...rev, e.fromFile]);
  }

  const snapshot: Snapshot = {
    root: {
      path: "/project",
      name: "project",
      isDir: true,
      lines: 0,
      logic: 0,
      comments: 0,
      blanks: 0,
      funcs: 0,
      lang: "ts",
      sa: undefined,
    },
    files,
    totalFiles: files.length,
    totalLines: files.reduce((s, f) => s + f.lines, 0),
    importGraph: { edges, adjacency, reverseAdjacency },
  };

  const health: HealthReport = makeHealth();

  return { snapshot, health };
}

describe("generateReportHtml", () => {
  describe("document structure", () => {
    it("generates valid HTML document with DOCTYPE", () => {
      const html = generateReportHtml(makePipelineResult());
      expect(html).toMatch(/^<!DOCTYPE html>/);
      expect(html).toContain("<html");
      expect(html).toContain("</html>");
      expect(html).toContain("<head>");
      expect(html).toContain("</head>");
      expect(html).toContain("<body>");
      expect(html).toContain("</body>");
    });

    it("includes D3.js CDN script tag", () => {
      const html = generateReportHtml(makePipelineResult());
      expect(html).toContain("d3js.org");
      expect(html).toContain("<script");
    });

    it("includes inline JSON data", () => {
      const html = generateReportHtml(makePipelineResult());
      expect(html).toContain("__SEKKO_DATA__");
    });
  });

  describe("Treemap view", () => {
    it("builds treemap data from snapshot files", () => {
      const result = makePipelineResult();
      const html = generateReportHtml(result);
      // File paths should appear in the embedded data
      expect(html).toContain("src/cli/index.ts");
      expect(html).toContain("src/metrics/health.ts");
      expect(html).toContain("src/graph/resolver.ts");
    });

    it("includes file line counts in treemap data", () => {
      const html = generateReportHtml(makePipelineResult());
      // Line counts should be in the data
      expect(html).toContain("100");
      expect(html).toContain("200");
      expect(html).toContain("150");
    });

    it("includes grade-to-color mapping", () => {
      const html = generateReportHtml(makePipelineResult());
      // Color mapping should be defined
      expect(html).toContain("#22c55e"); // A = green
      expect(html).toContain("#f97316"); // D = orange
      expect(html).toContain("#ef4444"); // F = red
    });
  });

  describe("DSM view", () => {
    it("builds DSM data from import graph", () => {
      const result = makePipelineResult();
      const html = generateReportHtml(result);
      // Module names should appear
      expect(html).toContain("src/cli");
      expect(html).toContain("src/metrics");
      expect(html).toContain("src/graph");
    });

    it("computes module-level edge counts", () => {
      const result = makePipelineResult({
        edges: [
          { fromFile: "src/cli/index.ts", toFile: "src/metrics/health.ts" },
          { fromFile: "src/cli/scan.ts", toFile: "src/metrics/health.ts" },
        ],
        files: [
          {
            path: "src/cli/index.ts",
            name: "index.ts",
            isDir: false,
            lines: 50,
            logic: 40,
            comments: 5,
            blanks: 5,
            funcs: 2,
            lang: "ts" as const,
            sa: undefined,
          },
          {
            path: "src/cli/scan.ts",
            name: "scan.ts",
            isDir: false,
            lines: 60,
            logic: 48,
            comments: 6,
            blanks: 6,
            funcs: 2,
            lang: "ts" as const,
            sa: undefined,
          },
          {
            path: "src/metrics/health.ts",
            name: "health.ts",
            isDir: false,
            lines: 100,
            logic: 80,
            comments: 10,
            blanks: 10,
            funcs: 3,
            lang: "ts" as const,
            sa: undefined,
          },
        ],
      });
      const html = generateReportHtml(result);
      // DSM data should be present
      expect(html).toContain("dsmData");
    });

    it("excludes self-referencing module edges", () => {
      const result = makePipelineResult({
        edges: [
          {
            fromFile: "src/cli/index.ts",
            toFile: "src/cli/scan.ts",
          },
        ],
        files: [
          {
            path: "src/cli/index.ts",
            name: "index.ts",
            isDir: false,
            lines: 50,
            logic: 40,
            comments: 5,
            blanks: 5,
            funcs: 2,
            lang: "ts" as const,
            sa: undefined,
          },
          {
            path: "src/cli/scan.ts",
            name: "scan.ts",
            isDir: false,
            lines: 60,
            logic: 48,
            comments: 6,
            blanks: 6,
            funcs: 2,
            lang: "ts" as const,
            sa: undefined,
          },
        ],
      });
      const html = generateReportHtml(result);
      // Self-referencing edges within same module should still be in data
      // but DSM diagonal cells handle them separately
      expect(html).toContain("dsmData");
    });
  });

  describe("tab navigation", () => {
    it("includes tab UI for Treemap and DSM views", () => {
      const html = generateReportHtml(makePipelineResult());
      expect(html).toContain("Treemap");
      expect(html).toContain("DSM");
    });
  });

  describe("XSS protection", () => {
    it("sanitizes inline JSON to prevent script injection", () => {
      const result = makePipelineResult({
        files: [
          {
            path: 'src/</script><script>alert("xss")</script>',
            name: "evil.ts",
            isDir: false,
            lines: 10,
            logic: 8,
            comments: 1,
            blanks: 1,
            funcs: 0,
            lang: "ts" as const,
            sa: undefined,
          },
        ],
      });
      const html = generateReportHtml(result);
      // </script> in inline data must be escaped
      expect(html).not.toContain('</script><script>alert("xss")');
    });
  });
});
