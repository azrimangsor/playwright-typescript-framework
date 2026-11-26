# Playwright TypeScript Framework

A lean starting point for independent UI and API tests. It uses Playwright Test,
TypeScript, shared fixtures, page objects, built-in HTML reporting, and a
configurable engineering dashboard.
No application accounts, secrets, or external reporting services are required.

## Setup

Requires Node.js 24 or newer and npm.

```shell
npm ci
npx playwright install chromium firefox webkit
```

On Linux, use `npx playwright install --with-deps chromium firefox webkit`.

## Run tests

```shell
npm test
npm run test:ui
npm run test:api
npm run test:smoke
npm run test:regression
npm run typecheck
npm run test:list
npm run report
npm run dashboard
npm run test:dashboard
```

Run one browser, repeat tests, or debug a failure:

```shell
npm test -- --project=chromium
npm test -- --project=chromium --repeat-each=2
npm test -- --project=chromium --debug
```

The UI examples use the public [Playwright TodoMVC demo](https://demo.playwright.dev/todomvc/).
They cover creation/completion, filtering, reload persistence, editing, and
clearing completed items. Each test receives a fresh browser context; closing
that context automatically discards its local storage and cookies. No shared
server-side data is changed.

The API examples make read-only GET requests to
[JSONPlaceholder](https://jsonplaceholder.typicode.com/), covering a single post,
user filtering, and a missing post. API request contexts are also isolated and
disposed automatically by Playwright.

Public services require internet access and may be unavailable or rate-limited.
Failures are reported normally, not skipped or replaced with mocked successes.
Examples run with one worker by default to limit public-service traffic and
local browser resource usage. Override with `--workers` when appropriate.

## Structure

```text
playwright.config.ts             One config for UI and API projects
dashboard.config.json            Dashboard branding and history settings
scripts/dashboard.mts            Playwright JSON to standalone HTML dashboard
scripts/dashboard.test.mts       Dashboard generator regression checks
src/
  api/posts.spec.ts              Read-only public API examples
  fixtures/demo-data.ts          Shared, non-sensitive example data
  pages/base.page.ts             Shared navigation
  pages/pageManager.page.ts      Page object composition
  pages/todo.page.ts             TodoMVC interactions and accessible locators
  ui/todo.spec.ts                Independent UI examples
  utils/fixtures.ts              Typed page manager and test data fixtures
```

Tests import `test` and `expect` from the shared fixture module. Add UI interactions
to page objects and assertions to tests. See
[suite classification](docs/playwright-suite-classification.md) for priorities,
tags, and placeholder Zephyr IDs.

## Configuration and reporting

The existing [Playwright config](playwright.config.ts) defines `chromium`,
`firefox`, `webkit`, and `api` projects. WebKit approximates Safari; it is not the
branded Safari browser. API tests do not launch a browser.

`BASE_URL` and `API_BASE_URL` override the example endpoints. Overrides must serve
the same TodoMVC UI or JSONPlaceholder API contract until you adapt the page
objects and tests. For example, in PowerShell:

```powershell
$env:BASE_URL = 'https://demo.playwright.dev/todomvc/'
$env:API_BASE_URL = 'https://jsonplaceholder.typicode.com'
npm test -- --project=chromium --project=api
```

Environment files are not loaded automatically. Legacy local environment files,
authentication caches, and certificates are ignored and unused.

HTML reports are written to `playwright-report`. Failure screenshots and traces
are written to `test-results`; open a trace using
`npx playwright show-trace <trace-file>`. Reports are ignored by Git. Traces can
contain page content and request data; review them before sharing if you later
add authentication.

### Engineering dashboard

After running tests, generate the dashboard:

```shell
npm test
npm run dashboard
```

Open `dashboard/index.html` in your browser. The generated page is self-contained:
no external scripts, fonts, or reporting services are needed. It includes summary
metrics, pass-rate history, per-project execution breakdowns, suite health,
failure details, run context, and searchable/filterable test results. The
Playwright report link opens the existing report with trace and attachment details.
Keep `dashboard` and `playwright-report` beside each other when copying reports.

Customize `dashboard.config.json` instead of editing the generator:

| Setting | Purpose |
| --- | --- |
| `brandName` | Header, browser title, and footer branding (replace `YOUR BRAND` with your organization name) |
| `platformName` | Platform name beside the brand |
| `reportTitle` | Dashboard heading |
| `environment` | Display label, such as `test` or `staging`; does not change test endpoints |
| `accentColor` | Six-digit hex color for buttons and charts |
| `historyLimit` | Number of retained runs, from 1 to 100 |

The generator reads `test-results/results.json`, produced by the JSON reporter
in the existing Playwright config. To supply another report or branding file:

```shell
npm run dashboard -- path/to/results.json path/to/dashboard.config.json
```

Missing/invalid reports, configuration, or history cause an explicit error and a
nonzero exit code. Generating a dashboard from failing test results is supported;
it does not change the test command's exit status. Locally, run the generator
after a failed test command too.

Each project/test combination counts once, even when retried. Passed means an
expected Playwright outcome (including an explicitly expected failure). Flaky,
failed, and skipped outcomes are separate. Pass rate uses all tests, including
skipped tests, as the denominator; an empty run displays `N/A`. Duration is
elapsed run time, while individual test durations include all attempts. Green
requires all tests to have expected outcomes and no run-level errors. The
dashboard does not guess failure root causes or recovery timing.

Local history lives in the ignored `dashboard/history.json`; retain it between
runs, or remove it to reset the trend. Regenerating the same run replaces its
entry rather than duplicating it. Only available history is plotted.

### GitHub Actions

The existing `.github/workflows/playwright.yml` has three independent jobs:

1. **UI and API tests** installs dependencies and browsers, type-checks, runs all
   examples, and uploads `playwright-results` containing the Playwright report
   and raw test results.
2. **Generate dashboard** waits for UI/API tests to finish, downloads their
   results, checks the generator, and builds the dashboard, **even if tests
   fail**. Test failures remain failures; they are not masked. This job is
   skipped if tests never ran or the workflow was cancelled.
3. **Publish dashboard** deploys the generated site to GitHub Pages, only for
   non-PR runs on the repository's default branch. It can publish failing test
   results as long as dashboard generation succeeded. Other branches and pull
   requests do not publish or overwrite the live site.

The **Generate dashboard** summary contains a download link to the
`engineering-dashboard` artifact, which includes `dashboard` and
`playwright-report`. Extract it and open `dashboard/index.html`. Both report
artifacts are retained for seven days. HTML artifacts cannot be viewed directly
inside GitHub Actions; the live browser-viewable link uses GitHub Pages.

#### Enable the clickable live dashboard

1. In repository **Settings > Pages > Build and deployment**, set **Source** to
   **GitHub Actions**. The repository/organization must allow GitHub Pages.
2. If required, approve/configure the `github-pages` deployment environment and
   allow deployments from the default branch.
3. Push this workflow to the default branch, or run **Playwright Tests** manually
   on that branch after the workflow is available there.
4. Open the Actions run summary. Click **View live dashboard** in the **Publish
   dashboard** summary, or use the `github-pages` environment deployment link.

The Pages root redirects to the dashboard. Playwright report links remain
functional because only `dashboard`, `playwright-report`, and the landing page
are staged for publishing, not the repository source or raw results directory.
The live URL shows the most recently deployed default-branch report; it is not
a permanent per-run URL. Use that run's artifact for an archived snapshot.

**Visibility:** GitHub Pages may be publicly accessible even for a private
repository, depending on your plan and organization settings. Confirm access
controls before enabling it. Publishing also exposes the included Playwright
report and any screenshots, traces, or attachments it contains. The workflow
replaces the repository's current Pages site; do not enable it alongside an
existing site you want to preserve.

GitHub Actions caches summary history per branch/PR ref; cache eviction or a new
ref starts fresh history. Parallel runs may restore the same history snapshot,
so the cache is a best-effort trend, not a durable audit log. Reruns have separate
attempt IDs. No repository secrets are needed. Test/dashboard generation jobs
have read-only repository access; only the deployment job receives `pages:
write` and `id-token: write` for GitHub Pages.

Reports include test titles and error details. Review artifacts before sharing
if your tests handle sensitive data.

For assisted exploration, start the Playwright MCP server configured in
[.vscode/mcp.json](.vscode/mcp.json) through VS Code's MCP controls. Terminal and
CI test runs use the same Playwright configuration without depending on VS Code.

## Scope and future npm packaging

The application-specific tests, data, authentication, password-reset/Mailosaur
tools, Zephyr publishing, AI exploration, and Allure integration are not included.
The dashboard uses the built-in Playwright JSON reporter and Node.js; only
Playwright, TypeScript, and Node.js types are development dependencies.

This is currently a runnable framework template, **not a publishable npm library**.
`private: true` prevents accidental publication. A later packaging step should
define the public API, package name, build outputs, exports, and consumer setup
before enabling publication. Existing local secrets are not erased from Git
history by this cleanup; review repository history before publishing it.
