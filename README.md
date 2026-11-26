# Playwright TypeScript Framework

A lean starting point for independent UI and API tests. It uses Playwright Test,
TypeScript, shared fixtures, page objects, and built-in HTML reporting.
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

GitHub Actions installs dependencies and the three browser engines, runs strict
type checking and all examples, and uploads reports. No repository secrets or
write permissions are needed.

For assisted exploration, start the Playwright MCP server configured in
[.vscode/mcp.json](.vscode/mcp.json) through VS Code's MCP controls. Terminal and
CI test runs use the same Playwright configuration without depending on VS Code.

## Scope and future npm packaging

The application-specific tests, data, authentication, password-reset/Mailosaur
tools, Zephyr publishing, AI exploration, custom dashboards/reporters, and Allure
integration have been removed. Only Playwright, TypeScript, and Node.js types
remain as development dependencies.

This is currently a runnable framework template, **not a publishable npm library**.
`private: true` prevents accidental publication. A later packaging step should
define the public API, package name, build outputs, exports, and consumer setup
before enabling publication. Existing local secrets are not erased from Git
history by this cleanup; review repository history before publishing it.
