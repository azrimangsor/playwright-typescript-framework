import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  generateDashboard, parseConfig, parseHistory, renderDashboard, summarize, updateHistory,
} from './dashboard.mts';

const config = parseConfig({
  brandName: 'Example & Co',
  platformName: 'Quality Platform',
  reportTitle: 'Engineering overview',
  environment: 'test',
  accentColor: '#007db8',
  historyLimit: 3,
});

function report() {
  return {
    stats: { startTime: '2026-11-26T01:00:00Z', duration: 7500 },
    errors: [],
    suites: [{
      title: 'example.spec.ts',
      specs: [],
      suites: [{
        title: 'Feature',
        specs: [{
          title: 'validates a journey',
          tests: [
            { projectName: 'chromium', status: 'expected', results: [{ duration: 100, errors: [] }] },
            { projectName: 'firefox', status: 'flaky', results: [
              { duration: 50, errors: [{ message: '\u001b[31mTemporary failure\u001b[39m' }] },
              { duration: 60, errors: [] },
            ] },
            { projectName: 'webkit', status: 'unexpected', results: [
              { duration: 120, errors: [{ message: '<script>alert("failure")</script>' }] },
            ] },
            { projectName: 'api', status: 'skipped', results: [] },
          ],
        }],
      }],
    }],
  };
}

test('[P2] ZEPHYR-TODO-DASH-001 @regression - aggregates nested suites and retries once per test', () => {
  const data = summarize(report());
  assert.deepEqual(data.run, {
    id: '2026-11-26T01:00:00Z',
    label: '26/11/2026, 01:00:00 UTC',
    startTime: '2026-11-26T01:00:00Z',
    duration: 7500,
    total: 4, passed: 1, failed: 1, flaky: 1, skipped: 1, errors: 0,
  });
  assert.equal(data.tests[1].duration, 110);
  assert.equal(data.tests[1].retries, 1);
  assert.equal(data.tests[1].error, 'Temporary failure');
  assert.equal(data.tests[0].suite, 'example.spec.ts / Feature');
  const html = renderDashboard(config, data, [data.run]);
  assert.match(html, /25\.00%/);
  assert.match(html, /Attention/);
  assert.match(html, /Temporary failure/);
});

test('[P2] ZEPHYR-TODO-DASH-002 @regression - escapes branding and error content', () => {
  const data = summarize(report());
  const html = renderDashboard({ ...config, brandName: '</title><script>bad()</script>' }, data, [data.run]);
  assert.ok(html.includes('&lt;/title&gt;&lt;script&gt;bad()&lt;/script&gt;'));
  assert.ok(html.includes('&lt;script&gt;alert(&quot;failure&quot;)&lt;/script&gt;'));
  assert.ok(!html.includes('<script>bad()'));
  assert.ok(!html.includes('<script>alert('));
  assert.throws(() => parseConfig({ ...config, accentColor: 'red; background:url(evil)' }), /Invalid dashboard config/);
});

test('[P2] ZEPHYR-TODO-DASH-003 @regression - handles empty runs and runner errors without reporting green', () => {
  const empty = { ...report(), suites: [] };
  const data = summarize(empty);
  const html = renderDashboard(config, data, [data.run]);
  assert.match(html, /No tests/);
  assert.match(html, /N\/A/);
  assert.ok(!html.includes('NaN'));
  assert.ok(!html.includes('<polyline'));
  const errored = summarize({ ...empty, errors: [{ message: 'Global setup failed' }] });
  const erroredHtml = renderDashboard(config, errored, [errored.run]);
  assert.match(erroredHtml, /Global setup failed/);
  assert.match(erroredHtml, /Attention/);
  assert.throws(() => summarize({}), /Invalid Playwright JSON report/);
  assert.throws(() => parseHistory([{}]), /Invalid dashboard history/);
});

test('[P2] ZEPHYR-TODO-DASH-004 @regression - retains bounded chronological history without duplicates', () => {
  const first = summarize(report(), 'first').run;
  const second = { ...first, id: 'second', startTime: '2026-11-26T02:00:00Z' };
  const third = { ...first, id: 'third', startTime: '2026-11-26T03:00:00Z' };
  const history = updateHistory([second, first], third, 2);
  assert.deepEqual(history.map(run => run.id), ['second', 'third']);
  assert.deepEqual(updateHistory(history, { ...third, passed: 0 }, 2).map(run => run.id), ['second', 'third']);
  assert.deepEqual(parseHistory(history), history);
});

test('[P2] ZEPHYR-TODO-DASH-005 @regression - writes a reusable dashboard and surfaces missing or corrupt input', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'playwright-dashboard-'));
  try {
    const reportPath = join(directory, 'results.json');
    const configPath = join(directory, 'config.json');
    const output = join(directory, 'dashboard');
    await writeFile(reportPath, JSON.stringify(report()));
    await writeFile(configPath, JSON.stringify(config));
    await generateDashboard(reportPath, configPath, output);
    await generateDashboard(reportPath, configPath, output);
    assert.match(await readFile(join(output, 'index.html'), 'utf8'), /Example &amp; Co/);
    assert.equal(parseHistory(JSON.parse(await readFile(join(output, 'history.json'), 'utf8'))).length, 1);
    await assert.rejects(generateDashboard(join(directory, 'missing.json'), configPath, output), /ENOENT/);
    await writeFile(join(output, 'history.json'), '{broken');
    await assert.rejects(generateDashboard(reportPath, configPath, output), SyntaxError);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
