import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { stripVTControlCharacters } from 'node:util';
import type { JSONReportTest } from '@playwright/test/reporter';

export interface DashboardConfig {
  brandName: string;
  platformName: string;
  reportTitle: string;
  environment: string;
  accentColor: string;
  historyLimit: number;
}

interface TestRow {
  title: string;
  suite: string;
  project: string;
  status: JSONReportTest['status'];
  duration: number;
  retries: number;
  error: string;
}

export interface RunSummary {
  id: string;
  label: string;
  startTime: string;
  duration: number;
  total: number;
  passed: number;
  failed: number;
  flaky: number;
  skipped: number;
  errors: number;
}

export interface DashboardData {
  run: RunSummary;
  tests: TestRow[];
  errors: string[];
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonnegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function parseConfig(value: unknown): DashboardConfig {
  if (!object(value)
    || !['brandName', 'platformName', 'reportTitle', 'environment'].every(
      key => typeof value[key] === 'string' && value[key].trim().length > 0,
    )
    || typeof value.accentColor !== 'string'
    || !/^#[\da-f]{6}$/i.test(value.accentColor)
    || typeof value.historyLimit !== 'number'
    || !Number.isInteger(value.historyLimit)
    || value.historyLimit < 1 || value.historyLimit > 100) {
    throw new Error('Invalid dashboard config: provide non-empty branding/environment strings, a six-digit hex accentColor, and historyLimit from 1 to 100.');
  }
  return {
    brandName: String(value.brandName),
    platformName: String(value.platformName),
    reportTitle: String(value.reportTitle),
    environment: String(value.environment),
    accentColor: value.accentColor,
    historyLimit: value.historyLimit,
  };
}

function errorText(value: unknown): string {
  if (!object(value)) throw new Error('Invalid Playwright error entry.');
  if (typeof value.message === 'string') return stripVTControlCharacters(value.message);
  if (typeof value.value === 'string') return stripVTControlCharacters(value.value);
  throw new Error('Playwright error entry has no message or value.');
}

export function summarize(value: unknown, id?: string, label?: string): DashboardData {
  if (!object(value) || !object(value.stats) || !Array.isArray(value.suites)
    || !Array.isArray(value.errors)
    || typeof value.stats.startTime !== 'string'
    || !Number.isFinite(Date.parse(value.stats.startTime))
    || !nonnegative(value.stats.duration)) {
    throw new Error('Invalid Playwright JSON report: expected stats, suites, and errors.');
  }
  const tests: TestRow[] = [];
  function visit(suites: unknown[], parents: string[]): void {
    for (const suite of suites) {
      if (!object(suite) || typeof suite.title !== 'string' || !Array.isArray(suite.specs)
        || (suite.suites !== undefined && !Array.isArray(suite.suites))) {
        throw new Error('Invalid Playwright suite.');
      }
      const path = [...parents, suite.title];
      for (const spec of suite.specs) {
        if (!object(spec) || typeof spec.title !== 'string' || !Array.isArray(spec.tests)) {
          throw new Error('Invalid Playwright spec.');
        }
        for (const test of spec.tests) {
          if (!object(test) || typeof test.projectName !== 'string' || !Array.isArray(test.results)
            || !['expected', 'unexpected', 'flaky', 'skipped'].includes(String(test.status))) {
            throw new Error('Invalid Playwright test.');
          }
          const status = test.status as JSONReportTest['status'];
          let duration = 0;
          const messages: string[] = [];
          for (const result of test.results) {
            if (!object(result) || !nonnegative(result.duration) || !Array.isArray(result.errors)) {
              throw new Error('Invalid Playwright test result.');
            }
            duration += result.duration;
            messages.push(...result.errors.map(errorText));
          }
          tests.push({
            title: spec.title,
            suite: path.join(' / '),
            project: test.projectName,
            status,
            duration,
            retries: Math.max(0, test.results.length - 1),
            error: [...new Set(messages)].join('\n\n'),
          });
        }
      }
      if (Array.isArray(suite.suites)) visit(suite.suites, path);
    }
  }
  visit(value.suites, []);
  const errors = value.errors.map(errorText);
  return {
    run: {
      id: id ?? value.stats.startTime,
      label: label ?? new Date(value.stats.startTime).toLocaleString('en-GB', { timeZone: 'UTC' }) + ' UTC',
      startTime: value.stats.startTime,
      duration: value.stats.duration,
      total: tests.length,
      passed: tests.filter(test => test.status === 'expected').length,
      failed: tests.filter(test => test.status === 'unexpected').length,
      flaky: tests.filter(test => test.status === 'flaky').length,
      skipped: tests.filter(test => test.status === 'skipped').length,
      errors: errors.length,
    },
    tests,
    errors,
  };
}

export function parseHistory(value: unknown): RunSummary[] {
  if (!Array.isArray(value) || !value.every(run => object(run)
    && typeof run.id === 'string' && typeof run.label === 'string'
    && typeof run.startTime === 'string' && Number.isFinite(Date.parse(run.startTime))
    && nonnegative(run.duration)
    && ['total', 'passed', 'failed', 'flaky', 'skipped', 'errors'].every(
      key => nonnegative(run[key]) && Number.isInteger(run[key]),
    )
    && run.total === Number(run.passed) + Number(run.failed) + Number(run.flaky) + Number(run.skipped))) {
    throw new Error('Invalid dashboard history. Restore a valid dashboard/history.json or remove it to start new history.');
  }
  return value as RunSummary[];
}

export function updateHistory(history: RunSummary[], run: RunSummary, limit: number): RunSummary[] {
  return [...history.filter(previous => previous.id !== run.id), run]
    .sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime))
    .slice(-limit);
}

export function escapeHtml(value: string | number): string {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!);
}

function duration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const seconds = Math.round(ms / 1000);
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function rate(passed: number, total: number): string {
  return total ? `${(passed / total * 100).toFixed(2)}%` : 'N/A';
}

function green(run: RunSummary): boolean {
  return run.total > 0 && run.passed === run.total && run.errors === 0;
}

export function renderDashboard(config: DashboardConfig, data: DashboardData, history: RunSummary[]): string {
  const { run, tests } = data;
  const e = escapeHtml;
  const statusLabel = { expected: 'Passed', unexpected: 'Failed', flaky: 'Flaky', skipped: 'Skipped' };
  const health = green(run) ? 'Green' : run.total === 0 && !run.errors ? 'No tests' : 'Attention';
  const groups = new Map<string, TestRow[]>();
  const projects = new Map<string, TestRow[]>();
  for (const test of tests) {
    const key = `${test.project} / ${test.suite}`;
    groups.set(key, [...(groups.get(key) ?? []), test]);
    projects.set(test.project, [...(projects.get(test.project) ?? []), test]);
  }
  const metrics = [
    ['Total tests', run.total, `${groups.size} suites / ${projects.size} projects`, ''],
    ['Passed', run.passed, 'Expected outcomes', 'good'],
    ['Failed / flaky', `${run.failed} / ${run.flaky}`, `${run.skipped} skipped`, run.failed || run.flaky ? 'bad' : ''],
    ['Pass rate', rate(run.passed, run.total), 'Passed / all tests, including skipped', ''],
    ['Duration', duration(run.duration), 'Elapsed wall-clock time', ''],
    ['Run health', health, `${run.errors} run-level errors`, green(run) ? 'good' : 'warn'],
  ];
  const plottedRuns = history.filter(entry => entry.total > 0);
  const points = plottedRuns.map((entry, index) => {
    const x = plottedRuns.length === 1 ? 300 : 40 + index * 520 / (plottedRuns.length - 1);
    const y = 145 - entry.passed / entry.total * 110;
    return { x, y, entry };
  });
  const trend = points.length ? `<svg viewBox="0 0 600 180" role="img" aria-label="Pass rate trend; exact values in run history">
    ${[0, 50, 100].map(tick => `<line x1="40" x2="570" y1="${145 - tick * 1.1}" y2="${145 - tick * 1.1}" class="gridline"/><text x="0" y="${149 - tick * 1.1}">${tick}%</text>`).join('')}
    <polyline points="${points.map(point => `${point.x},${point.y}`).join(' ')}" fill="none" stroke="var(--accent)" stroke-width="2"/>
    ${points.map(({ x, y, entry }) => `<circle cx="${x}" cy="${y}" r="4" fill="var(--accent)"><title>${e(entry.label)}: ${rate(entry.passed, entry.total)}</title></circle>`).join('')}
    </svg>` : '<p>No executed tests in recorded history.</p>';
  const failures = tests.filter(test => test.status === 'unexpected' || test.status === 'flaky');
  const cleanRuns = [...history].reverse().findIndex(entry => !green(entry));
  const streak = cleanRuns === -1 ? history.length : cleanRuns;
  const summaryRow = (name: string, rows: TestRow[]): string => {
    const passed = rows.filter(test => test.status === 'expected').length;
    return `<tr><td>${e(name)}</td><td>${passed}</td><td class="${rows.some(test => test.status === 'unexpected') ? 'bad' : ''}">${rows.filter(test => test.status === 'unexpected').length}</td>
      <td>${rows.filter(test => test.status === 'flaky').length}</td><td>${rows.filter(test => test.status === 'skipped').length}</td>
      <td>${rate(passed, rows.length)}<meter min="0" max="${rows.length}" value="${passed}">${rate(passed, rows.length)}</meter></td></tr>`;
  };
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<title>${e(config.brandName)} | ${e(config.reportTitle)}</title>
<style>
:root{--accent:${config.accentColor};--green:#368c28;--red:#c43b35;--muted:#617080;--line:#dde1e6;--surface:#fff;--bg:#f1f3f5}
*{box-sizing:border-box}body{margin:0;color:#202b36;background:var(--bg);font:13px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}
header{background:#101418;color:white;display:flex;align-items:center;gap:22px;padding:14px 28px}.brand{color:#ff5349;font-size:20px;letter-spacing:1.5px;font-weight:800;overflow-wrap:anywhere}
header span{border-left:1px solid #53606a;padding-left:22px}header a{margin-left:auto;color:#fff}a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}
.breadcrumb{padding:10px 28px;background:#fff;border-bottom:1px solid var(--line);color:var(--muted);font-size:11px}
main{max-width:1700px;margin:auto;padding:22px 28px}h1{font-size:23px;margin:0;font-weight:600}h2{font-size:13px;font-weight:600;margin:0 0 16px}h3{font-size:13px;margin:0}
.heading{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:20px}.subtle,small{color:var(--muted)}small{font-size:11px}.actions{display:flex;gap:8px;flex-wrap:wrap}
.button{display:inline-block;border:1px solid var(--line);border-radius:4px;padding:7px 12px;background:white;color:#243746;font-size:12px}.primary{background:var(--accent);color:white;border-color:var(--accent)}
.metrics{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:1px;background:var(--line);border:1px solid var(--line);margin-bottom:22px}
.metric{background:white;padding:15px}.metric-label{text-transform:uppercase;letter-spacing:.5px;font-size:10px;color:var(--muted)}.value{font-size:26px;line-height:1.4;font-weight:500;overflow-wrap:anywhere}
.good{color:var(--green)}.bad{color:var(--red)}.warn{color:#946200}.section-title{font-size:13px;margin:22px 0 10px}.section-title:before{content:"";display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--accent);margin-right:8px}
.quality{display:grid;grid-template-columns:1.3fr 1fr .8fr;gap:14px}.diagnostics{display:grid;grid-template-columns:1fr 2fr;gap:14px}.bottom{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px}
.card{background:white;border:1px solid var(--line);padding:17px;min-width:0}.card-footer{border-top:1px solid var(--line);margin:18px -17px -17px;padding:9px 17px;text-align:right;font-size:11px}
.chart{width:100%;margin-top:8px}svg{display:block;width:100%;height:auto;max-height:210px}svg text{font:11px system-ui;fill:var(--muted)}.gridline{stroke:var(--line);stroke-dasharray:3 4}
.project{margin:14px 0}.project-label{display:flex;justify-content:space-between;gap:12px;margin-bottom:5px}.bar{height:9px;display:flex;background:#e8ecf0;border-radius:2px;overflow:hidden}.bar span{min-width:0}.passed{background:var(--green)}.failed{background:var(--red)}.flaky{background:#c78d15}.skipped{background:#9ca8b4}
.legend{display:flex;gap:12px;flex-wrap:wrap;margin-top:15px;font-size:11px;color:var(--muted)}.dot{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:4px}
.health{font-size:30px;font-weight:500;margin:12px 0 4px}.facts{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:24px}.notice{background:#f5f7f8;padding:12px;margin-top:14px}
.scroll{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:12px}th{text-align:left;color:var(--muted);font-size:10px;font-weight:500}th,td{padding:9px 8px;border-bottom:1px solid #edf0f2;vertical-align:top}td:first-child{overflow-wrap:anywhere}meter{display:block;width:100%;min-width:70px;height:7px;margin-top:5px;accent-color:var(--green)}
.outcomes{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}.outcome{background:#f8f9fa;padding:14px;border-left:3px solid var(--line)}.outcome strong{display:block;font-size:23px;font-weight:500}
dl{display:grid;grid-template-columns:100px minmax(0,1fr);gap:9px;margin:0}dt{color:var(--muted)}dd{margin:0;overflow-wrap:anywhere}details{margin-top:10px}summary{cursor:pointer;color:var(--accent)}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f8f9fa;padding:12px;font:11px/1.6 monospace;max-height:320px;overflow:auto}
.tools{display:flex;gap:10px;margin-bottom:14px}input,select{font:inherit;border:1px solid var(--line);border-radius:3px;padding:8px;background:white;color:inherit}input{flex:1;min-width:0}.badge{display:inline-block;padding:2px 8px;background:#f0f3f5;border-radius:12px;font-size:11px}
footer{display:flex;justify-content:space-between;gap:16px;margin-top:24px;color:var(--muted);font-size:10px}[hidden]{display:none!important}
@media(max-width:1000px){.metrics{grid-template-columns:repeat(3,1fr)}.quality{grid-template-columns:1fr 1fr}.quality>.card:last-child{grid-column:1/-1}.diagnostics,.bottom{grid-template-columns:1fr}}
@media(max-width:600px){header{padding:14px 16px;flex-wrap:wrap;gap:10px}header span{border:0;padding:0;font-size:11px}main{padding:16px}.breadcrumb{padding:10px 16px}.heading{align-items:flex-start;flex-direction:column}.metrics{grid-template-columns:repeat(2,1fr)}.quality{grid-template-columns:1fr}.outcomes{grid-template-columns:repeat(2,1fr)}footer{flex-direction:column}}
</style></head><body>
<header><div class="brand">${e(config.brandName)}</div><span>${e(config.platformName)}</span><a href="#tests">Test results</a></header>
<div class="breadcrumb">Reports / ${e(config.environment)} / ${e(config.reportTitle)}</div>
<main><div class="heading"><div><h1>${e(config.reportTitle)}</h1><small>${e(config.environment)} &middot; Playwright &middot; ${e(run.label)}</small></div>
<nav class="actions" aria-label="Report actions"><a class="button primary" href="../playwright-report/index.html">Open Playwright report</a><a class="button" href="./history.json" download>Export history</a></nav></div>
<section class="metrics" aria-label="Run summary">${metrics.map(([name, value, note, color]) => `<div class="metric"><div class="metric-label">${e(name)}</div><div class="value ${color}">${e(value)}</div><small>${e(note)}</small></div>`).join('')}</section>
<h2 class="section-title">Quality overview</h2><section class="quality" aria-label="Quality overview">
<article class="card"><h2>Pass rate trend <small> &middot; ${history.length} recorded runs</small></h2><div class="chart">${trend}</div><div class="card-footer"><a href="#history">View run history</a></div></article>
<article class="card"><h2>Execution breakdown</h2>${[...projects].map(([project, rows]) => `<div class="project"><div class="project-label"><span>${e(project)}</span><small>${rows.length} tests</small></div><div class="bar" role="img" aria-label="${e(project)}: ${rows.filter(test => test.status === 'expected').length} passed, ${rows.filter(test => test.status === 'unexpected').length} failed, ${rows.filter(test => test.status === 'flaky').length} flaky, ${rows.filter(test => test.status === 'skipped').length} skipped">${(['expected', 'unexpected', 'flaky', 'skipped'] as const).map(status => `<span class="${statusLabel[status].toLowerCase()}" style="width:${rows.filter(test => test.status === status).length / rows.length * 100}%"></span>`).join('')}</div></div>`).join('') || '<p class="subtle">No project results.</p>'}
<div class="legend">${['Passed', 'Failed', 'Flaky', 'Skipped'].map(label => `<span><i class="dot ${label.toLowerCase()}"></i>${label}</span>`).join('')}</div><div class="card-footer"><a href="#suites">Execution analysis</a></div></article>
<article class="card"><h2>Run health</h2><div class="health ${green(run) ? 'good' : 'warn'}">${health}</div><small>Green requires every test to pass without retries and no run-level errors.</small><div class="facts"><div><small>Consecutive green runs</small><h3>${streak}</h3></div><div><small>Retries performed</small><h3>${tests.reduce((sum, test) => sum + test.retries, 0)}</h3></div></div><div class="notice">Recovery timing is not tracked. History is limited to ${config.historyLimit} recorded runs.</div></article>
</section>
<h2 class="section-title">Engineering diagnostics</h2><section class="diagnostics" aria-label="Engineering diagnostics">
<article class="card"><h2>Failure summary</h2><div class="value ${failures.length || run.errors ? 'bad' : 'good'}">${run.failed + run.flaky + run.errors}</div><small>Failed tests, flaky tests, and run-level errors</small>
${failures.length || run.errors ? `${failures.map(test => `<details><summary>${e(test.project)} &middot; ${e(test.title)} (${statusLabel[test.status]})</summary><pre>${e(test.error || 'No error details were recorded.')}</pre></details>`).join('')}${data.errors.map(error => `<details open><summary>Run-level error</summary><pre>${e(error)}</pre></details>`).join('')}` : `<p class="notice">${run.total ? 'No failed or flaky tests in this execution.' : 'No tests were recorded. Check the test selection and runner output.'}</p>`}
<div class="card-footer"><a href="#tests">View all tests</a></div></article>
<article class="card" id="suites"><h2>Suite health <small> &middot; project / file / describe</small></h2><div class="scroll"><table><thead><tr><th>Suite</th><th>Passed</th><th>Failed</th><th>Flaky</th><th>Skipped</th><th>Pass rate</th></tr></thead><tbody>${[...groups].map(([name, rows]) => summaryRow(name, rows)).join('') || '<tr><td colspan="6">No suites recorded.</td></tr>'}</tbody></table></div></article></section>
<section class="card" style="margin-top:14px" aria-label="Outcome classification"><h2>Outcome classification</h2><div class="outcomes">${[['Passed', run.passed, 'good'], ['Failed', run.failed, 'bad'], ['Flaky', run.flaky, 'warn'], ['Skipped', run.skipped, ''], ['Run errors', run.errors, 'bad']].map(([name, count, color]) => `<div class="outcome"><small>${name}</small><strong class="${color}">${count}</strong></div>`).join('')}</div><small>Product, script, environment, and infrastructure causes are not inferred from error messages.</small></section>
<section class="bottom"><article class="card" id="history"><h2>Run history</h2><div class="scroll"><table><thead><tr><th>Run (UTC)</th><th>Total</th><th>Pass rate</th><th>Duration</th><th>Health</th></tr></thead><tbody>${history.map(entry => `<tr><td>${e(entry.label)}</td><td>${entry.total}</td><td>${rate(entry.passed, entry.total)}</td><td>${duration(entry.duration)}</td><td class="${green(entry) ? 'good' : 'warn'}">${green(entry) ? 'Green' : 'Attention'}</td></tr>`).join('')}</tbody></table></div></article>
<article class="card"><h2>Run context</h2><dl><dt>Environment</dt><dd>${e(config.environment)}</dd><dt>Projects</dt><dd>${e([...projects.keys()].join(', ') || 'None')}</dd><dt>Started (UTC)</dt><dd>${e(new Date(run.startTime).toISOString())}</dd><dt>Run</dt><dd>${e(run.label)}</dd><dt>Framework</dt><dd>Playwright Test</dd><dt>Branding</dt><dd>dashboard.config.json</dd></dl><div class="card-footer"><a href="../playwright-report/index.html">Traces and report details</a></div></article></section>
<section class="card" id="tests" style="margin-top:14px"><h2>Test results</h2><div class="tools"><input type="search" id="search" aria-label="Search tests" placeholder="Search test, suite, or project"><select id="status" aria-label="Filter by outcome"><option value="">All outcomes</option>${Object.entries(statusLabel).map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}</select></div>
<p id="result-count" class="subtle" aria-live="polite">${tests.length} tests</p><div class="scroll"><table><thead><tr><th>Test / suite</th><th>Project</th><th>Outcome</th><th>Duration</th><th>Retries</th></tr></thead><tbody id="test-rows">${tests.map(test => `<tr data-status="${test.status}"><td>${e(test.title)}<br><small>${e(test.suite)}</small>${test.error ? `<details><summary>Attempt errors</summary><pre>${e(test.error)}</pre></details>` : ''}</td><td>${e(test.project)}</td><td><span class="badge ${test.status === 'expected' ? 'good' : test.status === 'unexpected' ? 'bad' : 'warn'}">${statusLabel[test.status]}</span></td><td>${duration(test.duration)}</td><td>${test.retries}</td></tr>`).join('')}</tbody></table></div></section>
<footer><span>Generated from Playwright JSON results &middot; Pass rate = expected outcomes / all test executions. Retries are not counted as separate tests.</span><span>${e(config.brandName)} &middot; ${e(run.label)}</span></footer></main>
<script>
const search = document.getElementById('search');
const status = document.getElementById('status');
function filterTests() {
  let visible = 0;
  for (const row of document.querySelectorAll('#test-rows tr')) {
    row.hidden = !(row.textContent.toLowerCase().includes(search.value.toLowerCase()) && (!status.value || row.dataset.status === status.value));
    if (!row.hidden) visible++;
  }
  document.getElementById('result-count').textContent = visible + ' matching tests';
}
search.addEventListener('input', filterTests);
status.addEventListener('change', filterTests);
</script></body></html>`;
}

async function readHistory(path: string): Promise<RunSummary[]> {
  try {
    return parseHistory(JSON.parse(await readFile(path, 'utf8')));
  } catch (error) {
    if (object(error) && error.code === 'ENOENT') return [];
    throw error;
  }
}

export async function generateDashboard(
  reportPath = 'test-results/results.json',
  configPath = 'dashboard.config.json',
  outputDir = 'dashboard',
): Promise<void> {
  const config = parseConfig(JSON.parse(await readFile(resolve(configPath), 'utf8')));
  const report: unknown = JSON.parse(await readFile(resolve(reportPath), 'utf8'));
  const id = process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT ?? '1'}`
    : undefined;
  const label = process.env.GITHUB_RUN_NUMBER
    ? `#${process.env.GITHUB_RUN_NUMBER} (attempt ${process.env.GITHUB_RUN_ATTEMPT ?? '1'})`
    : undefined;
  const data = summarize(report, id, label);
  const historyPath = resolve(outputDir, 'history.json');
  const history = updateHistory(await readHistory(historyPath), data.run, config.historyLimit);
  await mkdir(resolve(outputDir), { recursive: true });
  await writeFile(resolve(outputDir, 'index.html'), renderDashboard(config, data, history), 'utf8');
  await writeFile(historyPath, JSON.stringify(history, null, 2) + '\n', 'utf8');
  console.log(`Dashboard generated: ${resolve(outputDir, 'index.html')}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await generateDashboard(process.argv[2], process.argv[3]);
}
