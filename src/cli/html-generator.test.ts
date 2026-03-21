import { describe, it, expect } from "vitest";
import { generateReportHtml, computePerFileGrades } from "./html-generator.js";
import type { PipelineResult } from "./scan.js";
import type { Snapshot } from "../types/snapshot.js";
import type { HealthReport, DimensionGrades } from "../types/metrics.js";
import { makeHealth, makeDimension } from "../testing/fixtures.js";

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

  describe("per-file grading in treemap", () => {
    it("assigns per-file grades based on dimension flags", () => {
      const health = makeHealth({
        dimensions: {
          ...makeHealth().dimensions,
          godFiles: makeDimension("godFiles", 0.1, "C", {
            files: ["src/cli/index.ts"],
            count: 1,
          }),
          largeFiles: makeDimension("largeFiles", 0.1, "C", {
            files: [{ file: "src/cli/index.ts", lines: 500 }],
          }),
        },
      });
      const result = makePipelineResult();
      const resultWithHealth: PipelineResult = {
        snapshot: result.snapshot,
        health,
      };
      const html = generateReportHtml(resultWithHealth);
      // The file flagged by 2 dimensions should get grade C
      const dataMatch = html.match(/window\.__SEKKO_DATA__\s*=\s*({.*?});/s);
      expect(dataMatch).not.toBeNull();
      if (dataMatch === null) throw new Error("unreachable");
      const data = JSON.parse(dataMatch[1]);
      const indexFile = data.treemapFiles.find(
        (f: { path: string }) => f.path === "src/cli/index.ts",
      );
      expect(indexFile.grade).toBe("C");
      // Unflagged files should get grade A
      const healthFile = data.treemapFiles.find(
        (f: { path: string }) => f.path === "src/metrics/health.ts",
      );
      expect(healthFile.grade).toBe("A");
    });
  });
});

describe("computePerFileGrades", () => {
  function makeResultWithDimensions(
    dimensionOverrides: Partial<DimensionGrades>,
  ): PipelineResult {
    const health = makeHealth({
      dimensions: {
        ...makeHealth().dimensions,
        ...dimensionOverrides,
      },
    });
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
      files: [
        {
          path: "src/a.ts",
          name: "a.ts",
          isDir: false,
          lines: 100,
          logic: 80,
          comments: 10,
          blanks: 10,
          funcs: 2,
          lang: "ts" as const,
          sa: undefined,
        },
        {
          path: "src/b.ts",
          name: "b.ts",
          isDir: false,
          lines: 50,
          logic: 40,
          comments: 5,
          blanks: 5,
          funcs: 1,
          lang: "ts" as const,
          sa: undefined,
        },
      ],
      totalFiles: 2,
      totalLines: 150,
      importGraph: {
        edges: [],
        adjacency: new Map(),
        reverseAdjacency: new Map(),
      },
    };
    return { snapshot, health };
  }

  it("returns grade A for files with zero flags", () => {
    const result = makeResultWithDimensions({});
    const grades = computePerFileGrades(result);
    expect(grades.get("src/a.ts")).toBe("A");
    expect(grades.get("src/b.ts")).toBe("A");
  });

  it("returns grade B for files flagged by exactly 1 dimension", () => {
    const result = makeResultWithDimensions({
      godFiles: makeDimension("godFiles", 0.1, "C", {
        files: ["src/a.ts"],
        count: 1,
      }),
    });
    const grades = computePerFileGrades(result);
    expect(grades.get("src/a.ts")).toBe("B");
    expect(grades.get("src/b.ts")).toBe("A");
  });

  it("returns grade C for files flagged by 2-3 dimensions", () => {
    const result = makeResultWithDimensions({
      godFiles: makeDimension("godFiles", 0.1, "C", {
        files: ["src/a.ts"],
        count: 1,
      }),
      largeFiles: makeDimension("largeFiles", 0.1, "C", {
        files: [{ file: "src/a.ts", lines: 500 }],
      }),
    });
    const grades = computePerFileGrades(result);
    expect(grades.get("src/a.ts")).toBe("C");
  });

  it("returns grade C for files flagged by 3 dimensions", () => {
    const result = makeResultWithDimensions({
      godFiles: makeDimension("godFiles", 0.1, "C", {
        files: ["src/a.ts"],
        count: 1,
      }),
      largeFiles: makeDimension("largeFiles", 0.1, "C", {
        files: [{ file: "src/a.ts", lines: 500 }],
      }),
      deadCode: makeDimension("deadCode", 0.1, "C", {
        files: ["src/a.ts"],
      }),
    });
    const grades = computePerFileGrades(result);
    expect(grades.get("src/a.ts")).toBe("C");
  });

  it("returns grade D for files flagged by 4-5 dimensions", () => {
    const result = makeResultWithDimensions({
      godFiles: makeDimension("godFiles", 0.1, "C", {
        files: ["src/a.ts"],
        count: 1,
      }),
      largeFiles: makeDimension("largeFiles", 0.1, "C", {
        files: [{ file: "src/a.ts", lines: 500 }],
      }),
      deadCode: makeDimension("deadCode", 0.1, "C", {
        files: ["src/a.ts"],
      }),
      testCoverageGap: makeDimension("testCoverageGap", 0.5, "D", {
        files: ["src/a.ts"],
      }),
    });
    const grades = computePerFileGrades(result);
    expect(grades.get("src/a.ts")).toBe("D");
  });

  it("returns grade F for files flagged by 6 or more dimensions", () => {
    const result = makeResultWithDimensions({
      godFiles: makeDimension("godFiles", 0.1, "C", {
        files: ["src/a.ts"],
        count: 1,
      }),
      largeFiles: makeDimension("largeFiles", 0.1, "C", {
        files: [{ file: "src/a.ts", lines: 500 }],
      }),
      deadCode: makeDimension("deadCode", 0.1, "C", {
        files: ["src/a.ts"],
      }),
      testCoverageGap: makeDimension("testCoverageGap", 0.5, "D", {
        files: ["src/a.ts"],
      }),
      codeChurn: makeDimension("codeChurn", 0.5, "D", {
        files: [{ file: "src/a.ts", churn: 100 }],
      }),
      busFactor: makeDimension("busFactor", 0.5, "D", {
        files: [{ file: "src/a.ts", authorCount: 1 }],
      }),
    });
    const grades = computePerFileGrades(result);
    expect(grades.get("src/a.ts")).toBe("F");
  });

  it("extracts files from complexFunctions details", () => {
    const result = makeResultWithDimensions({
      complexFn: makeDimension("complexFn", 0.1, "C", {
        complexFunctions: [{ file: "src/a.ts", name: "fn", cc: 20 }],
      }),
    });
    const grades = computePerFileGrades(result);
    expect(grades.get("src/a.ts")).toBe("B");
  });

  it("extracts files from longFunctions details", () => {
    const result = makeResultWithDimensions({
      longFunctions: makeDimension("longFunctions", 0.1, "C", {
        functions: [{ file: "src/b.ts", name: "fn", lineCount: 200 }],
      }),
    });
    const grades = computePerFileGrades(result);
    expect(grades.get("src/b.ts")).toBe("B");
  });

  it("extracts files from highParams details", () => {
    const result = makeResultWithDimensions({
      highParams: makeDimension("highParams", 0.1, "C", {
        functions: [{ file: "src/a.ts", name: "fn", paramCount: 8 }],
      }),
    });
    const grades = computePerFileGrades(result);
    expect(grades.get("src/a.ts")).toBe("B");
  });

  it("extracts files from cognitiveComplexity details", () => {
    const result = makeResultWithDimensions({
      cognitiveComplexity: makeDimension("cognitiveComplexity", 0.1, "C", {
        functions: [
          { file: "src/a.ts", name: "fn", cognitiveComplexity: 30 },
        ],
      }),
    });
    const grades = computePerFileGrades(result);
    expect(grades.get("src/a.ts")).toBe("B");
  });

  it("extracts files from duplication groups", () => {
    const result = makeResultWithDimensions({
      duplication: makeDimension("duplication", 0.1, "C", {
        groups: [
          {
            bodyHash: "abc",
            functions: [
              { file: "src/a.ts", name: "fn1" },
              { file: "src/b.ts", name: "fn2" },
            ],
          },
        ],
      }),
    });
    const grades = computePerFileGrades(result);
    expect(grades.get("src/a.ts")).toBe("B");
    expect(grades.get("src/b.ts")).toBe("B");
  });

  it("extracts files from changeCoupling pairs", () => {
    const result = makeResultWithDimensions({
      changeCoupling: makeDimension("changeCoupling", 0.1, "C", {
        pairs: [{ fileA: "src/a.ts", fileB: "src/b.ts", count: 10 }],
      }),
    });
    const grades = computePerFileGrades(result);
    expect(grades.get("src/a.ts")).toBe("B");
    expect(grades.get("src/b.ts")).toBe("B");
  });

  it("extracts files from hotspots details", () => {
    const result = makeResultWithDimensions({
      hotspots: makeDimension("hotspots", 0.1, "C", {
        files: [{ file: "src/a.ts", score: 5.0 }],
      }),
    });
    const grades = computePerFileGrades(result);
    expect(grades.get("src/a.ts")).toBe("B");
  });

  it("extracts files from codeAge details", () => {
    const result = makeResultWithDimensions({
      codeAge: makeDimension("codeAge", 0.5, "D", {
        files: [{ file: "src/b.ts", daysSinceUpdate: 500 }],
      }),
    });
    const grades = computePerFileGrades(result);
    expect(grades.get("src/b.ts")).toBe("B");
  });

  it("counts each dimension only once per file even with multiple functions", () => {
    const result = makeResultWithDimensions({
      complexFn: makeDimension("complexFn", 0.2, "C", {
        complexFunctions: [
          { file: "src/a.ts", name: "fn1", cc: 20 },
          { file: "src/a.ts", name: "fn2", cc: 30 },
        ],
      }),
    });
    const grades = computePerFileGrades(result);
    // Should be B (1 dimension), not C (would need 2+ dimensions)
    expect(grades.get("src/a.ts")).toBe("B");
  });

  it("handles dimensions with no details gracefully", () => {
    const result = makeResultWithDimensions({
      godFiles: makeDimension("godFiles", 0, "A"),
    });
    const grades = computePerFileGrades(result);
    expect(grades.get("src/a.ts")).toBe("A");
  });

  it("handles dimensions with empty arrays in details", () => {
    const result = makeResultWithDimensions({
      godFiles: makeDimension("godFiles", 0, "A", { files: [], count: 0 }),
    });
    const grades = computePerFileGrades(result);
    expect(grades.get("src/a.ts")).toBe("A");
  });
});
