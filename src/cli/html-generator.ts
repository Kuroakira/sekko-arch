import type { PipelineResult } from "./scan.js";
import type { ImportEdge } from "../types/snapshot.js";
import type { Grade } from "../types/metrics.js";
import { moduleOf } from "../metrics/module-boundary.js";

const GRADE_COLORS: Record<Grade, string> = {
  A: "#22c55e",
  B: "#86efac",
  C: "#eab308",
  D: "#f97316",
  F: "#ef4444",
};

interface TreemapFileData {
  readonly path: string;
  readonly lines: number;
  readonly grade: Grade;
}

interface DsmCell {
  readonly from: string;
  readonly to: string;
  readonly count: number;
}

interface ReportData {
  readonly treemapFiles: readonly TreemapFileData[];
  readonly dsmData: {
    readonly modules: readonly string[];
    readonly cells: readonly DsmCell[];
  };
  readonly compositeGrade: Grade;
  readonly gradeColors: Record<Grade, string>;
  readonly fileCount: number;
  readonly totalLines: number;
}

function buildTreemapData(result: PipelineResult): readonly TreemapFileData[] {
  return result.snapshot.files.map((file) => ({
    path: file.path,
    lines: file.lines,
    grade: result.health.compositeGrade,
  }));
}

function buildDsmData(
  edges: readonly ImportEdge[],
  filePaths: readonly string[],
): ReportData["dsmData"] {
  const moduleSet = new Set<string>();
  for (const fp of filePaths) {
    moduleSet.add(moduleOf(fp));
  }
  const modules = [...moduleSet].sort();

  const cellMap = new Map<string, number>();
  for (const edge of edges) {
    const fromMod = moduleOf(edge.fromFile);
    const toMod = moduleOf(edge.toFile);
    if (fromMod === toMod) continue;
    const key = `${fromMod}|${toMod}`;
    cellMap.set(key, (cellMap.get(key) ?? 0) + 1);
  }

  const cells: DsmCell[] = [];
  for (const [key, count] of cellMap) {
    const [from, to] = key.split("|");
    cells.push({ from, to, count });
  }

  return { modules, cells };
}

function sanitizeJson(json: string): string {
  return json.replace(/<\/script/gi, "<\\/script");
}

function generateTreemapScript(): string {
  return `  // Treemap
  (function renderTreemap() {
    var container = document.getElementById('treemap');
    var width = container.clientWidth || window.innerWidth;
    var height = container.clientHeight || (window.innerHeight - 110);

    var root = { name: 'root', children: [] };
    var dirMap = {};
    data.treemapFiles.forEach(function(f) {
      var parts = f.path.split('/');
      var current = root;
      for (var i = 0; i < parts.length - 1; i++) {
        var dirName = parts[i];
        if (!current._childMap) current._childMap = {};
        if (!current._childMap[dirName]) {
          var child = { name: dirName, children: [], _childMap: {} };
          current.children.push(child);
          current._childMap[dirName] = child;
        }
        current = current._childMap[dirName];
      }
      current.children.push({ name: parts[parts.length - 1], value: f.lines, grade: f.grade, path: f.path });
    });

    var hierarchy = d3.hierarchy(root).sum(function(d) { return d.value || 0; });
    d3.treemap().size([width, height]).padding(1)(hierarchy);

    var svg = d3.select('#treemap').append('svg').attr('width', width).attr('height', height);
    var leaves = hierarchy.leaves();

    svg.selectAll('rect')
      .data(leaves)
      .enter().append('rect')
      .attr('class', 'treemap-cell')
      .attr('x', function(d) { return d.x0; })
      .attr('y', function(d) { return d.y0; })
      .attr('width', function(d) { return d.x1 - d.x0; })
      .attr('height', function(d) { return d.y1 - d.y0; })
      .attr('fill', function(d) { return colors[d.data.grade] || '#64748b'; })
      .on('mouseover', function(evt, d) {
        showTooltip(evt, '<strong>' + d.data.path + '</strong><br>' + d.data.value + ' lines / Grade ' + d.data.grade);
      })
      .on('mousemove', function(evt) {
        tooltip.style.left = (evt.pageX + 12) + 'px';
        tooltip.style.top = (evt.pageY - 12) + 'px';
      })
      .on('mouseout', hideTooltip);

    svg.selectAll('text')
      .data(leaves.filter(function(d) { return (d.x1 - d.x0) > 40 && (d.y1 - d.y0) > 14; }))
      .enter().append('text')
      .attr('class', 'treemap-label')
      .attr('x', function(d) { return d.x0 + 3; })
      .attr('y', function(d) { return d.y0 + 12; })
      .text(function(d) { return d.data.name; });
  })();`;
}

function generateDsmScript(): string {
  return `  // DSM
  function renderDsm() {
    var dsm = data.dsmData;
    var modules = dsm.modules;
    var n = modules.length;
    if (n === 0) { document.getElementById('dsm').innerHTML = '<p style="color:#94a3b8;padding:24px">No module dependencies found.</p>'; return; }

    var matrix = [];
    for (var i = 0; i < n; i++) { matrix[i] = []; for (var j = 0; j < n; j++) { matrix[i][j] = 0; } }
    var maxCount = 0;
    dsm.cells.forEach(function(c) {
      var fi = modules.indexOf(c.from);
      var ti = modules.indexOf(c.to);
      if (fi >= 0 && ti >= 0) { matrix[fi][ti] = c.count; if (c.count > maxCount) maxCount = c.count; }
    });

    var cellSize = 40;
    var labelWidth = Math.min(180, Math.max.apply(null, modules.map(function(m) { return m.length * 7; })) + 10);
    var svgW = labelWidth + n * cellSize + 20;
    var svgH = labelWidth + n * cellSize + 20;

    var svg = d3.select('#dsm').append('svg').attr('width', svgW).attr('height', svgH);
    var g = svg.append('g').attr('transform', 'translate(' + labelWidth + ',' + labelWidth + ')');

    // Row labels
    svg.selectAll('.row-label')
      .data(modules)
      .enter().append('text')
      .attr('x', labelWidth - 4)
      .attr('y', function(d, i) { return labelWidth + i * cellSize + cellSize / 2 + 4; })
      .attr('text-anchor', 'end')
      .attr('font-size', '11px')
      .attr('fill', '#94a3b8')
      .text(function(d) { return d; });

    // Column labels
    svg.selectAll('.col-label')
      .data(modules)
      .enter().append('text')
      .attr('transform', function(d, i) { return 'translate(' + (labelWidth + i * cellSize + cellSize / 2) + ',' + (labelWidth - 4) + ') rotate(-45)'; })
      .attr('text-anchor', 'start')
      .attr('font-size', '11px')
      .attr('fill', '#94a3b8')
      .text(function(d) { return d; });

    // Cells
    var colorScale = d3.scaleLinear().domain([0, maxCount || 1]).range(['#1e293b', '#3b82f6']);
    var violationColor = d3.scaleLinear().domain([0, maxCount || 1]).range(['#1e293b', '#ef4444']);

    for (var ri = 0; ri < n; ri++) {
      for (var ci = 0; ci < n; ci++) {
        var val = matrix[ri][ci];
        var isViolation = ri > ci;
        g.append('rect')
          .attr('x', ci * cellSize)
          .attr('y', ri * cellSize)
          .attr('width', cellSize - 1)
          .attr('height', cellSize - 1)
          .attr('fill', ri === ci ? '#334155' : (val > 0 ? (isViolation ? violationColor(val) : colorScale(val)) : '#1e293b'))
          .attr('rx', 2)
          .on('mouseover', (function(r, c, v) {
            return function(evt) {
              if (v > 0) showTooltip(evt, modules[r] + ' \u2192 ' + modules[c] + ': ' + v + ' edge(s)');
            };
          })(ri, ci, val))
          .on('mousemove', function(evt) {
            tooltip.style.left = (evt.pageX + 12) + 'px';
            tooltip.style.top = (evt.pageY - 12) + 'px';
          })
          .on('mouseout', hideTooltip);

        if (val > 0 && ri !== ci) {
          g.append('text')
            .attr('x', ci * cellSize + cellSize / 2)
            .attr('y', ri * cellSize + cellSize / 2 + 4)
            .attr('text-anchor', 'middle')
            .attr('font-size', '11px')
            .attr('fill', '#e2e8f0')
            .text(val);
        }
      }
    }
  }`;
}

function generateAppScript(): string {
  return `(function() {
  var data = window.__SEKKO_DATA__;
  var colors = data.gradeColors;

  // Header
  var badge = document.getElementById('grade-badge');
  badge.textContent = data.compositeGrade;
  badge.style.background = colors[data.compositeGrade];
  document.getElementById('stats').textContent = data.fileCount + ' files / ' + data.totalLines + ' lines';

  // Tabs
  var tabs = document.querySelectorAll('.tab');
  tabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      tabs.forEach(function(t) { t.classList.remove('active'); });
      document.querySelectorAll('.view').forEach(function(v) { v.classList.remove('active'); });
      tab.classList.add('active');
      document.getElementById('view-' + tab.dataset.view).classList.add('active');
      if (tab.dataset.view === 'dsm' && !window.__dsmRendered) { renderDsm(); window.__dsmRendered = true; }
    });
  });

  // Tooltip
  var tooltip = document.getElementById('tooltip');
  function showTooltip(evt, html) {
    tooltip.innerHTML = html;
    tooltip.style.left = (evt.pageX + 12) + 'px';
    tooltip.style.top = (evt.pageY - 12) + 'px';
    tooltip.style.opacity = 1;
  }
  function hideTooltip() { tooltip.style.opacity = 0; }

${generateTreemapScript()}

${generateDsmScript()}
})();`;
}

export function generateReportHtml(result: PipelineResult): string {
  const treemapFiles = buildTreemapData(result);
  const dsmData = buildDsmData(
    result.snapshot.importGraph.edges,
    result.snapshot.files.map((f) => f.path),
  );

  const reportData: ReportData = {
    treemapFiles,
    dsmData,
    compositeGrade: result.health.compositeGrade,
    gradeColors: GRADE_COLORS,
    fileCount: result.snapshot.totalFiles,
    totalLines: result.snapshot.totalLines,
  };

  const dataJson = sanitizeJson(JSON.stringify(reportData));

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>sekko-arch Report</title>
<script src="https://d3js.org/d3.v7.min.js"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; }
  .header { padding: 16px 24px; background: #1e293b; border-bottom: 1px solid #334155; display: flex; align-items: center; gap: 16px; }
  .header h1 { font-size: 20px; font-weight: 600; }
  .grade-badge { display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 8px; font-weight: 700; font-size: 18px; color: #0f172a; }
  .stats { font-size: 13px; color: #94a3b8; }
  .tabs { display: flex; gap: 0; background: #1e293b; border-bottom: 1px solid #334155; }
  .tab { padding: 10px 24px; cursor: pointer; border-bottom: 2px solid transparent; font-size: 14px; color: #94a3b8; transition: all 0.15s; }
  .tab:hover { color: #e2e8f0; }
  .tab.active { color: #e2e8f0; border-bottom-color: #3b82f6; }
  .view { display: none; width: 100%; height: calc(100vh - 110px); }
  .view.active { display: block; }
  .treemap-container { width: 100%; height: 100%; }
  .dsm-container { width: 100%; height: 100%; overflow: auto; padding: 24px; }
  .treemap-cell { stroke: #1e293b; stroke-width: 1px; }
  .treemap-label { font-size: 10px; fill: #0f172a; pointer-events: none; }
  .tooltip { position: absolute; background: #1e293b; border: 1px solid #475569; border-radius: 6px; padding: 8px 12px; font-size: 12px; pointer-events: none; opacity: 0; transition: opacity 0.15s; z-index: 10; }
</style>
</head>
<body>
<script>
  window.__SEKKO_DATA__ = ${dataJson};
</script>
<div class="header">
  <h1>sekko-arch</h1>
  <div class="grade-badge" id="grade-badge"></div>
  <div class="stats" id="stats"></div>
</div>
<div class="tabs">
  <div class="tab active" data-view="treemap">Treemap</div>
  <div class="tab" data-view="dsm">DSM</div>
</div>
<div class="view active" id="view-treemap">
  <div class="treemap-container" id="treemap"></div>
</div>
<div class="view" id="view-dsm">
  <div class="dsm-container" id="dsm"></div>
</div>
<div class="tooltip" id="tooltip"></div>
<script>
${generateAppScript()}
</script>
</body>
</html>`;
}
