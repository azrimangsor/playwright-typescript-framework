# Playwright suite classification

| Priority | Meaning | Tags |
| --- | --- | --- |
| P1 | Representative critical user journey or API availability | `@smoke`, `@regression` |
| P2 | Important behavior, state management, or data filtering | `@regression` |
| P3 | Supporting behavior and error handling | `@regression` |

Smoke is a subset of regression. Keep test cases independent; do not rely on
another case to create data or establish browser state.

## Public example coverage

| Placeholder Zephyr ID | Scenario | Priority |
| --- | --- | --- |
| ZEPHYR-TODO-LUNO-UI-001 | Open Buy and sell crypto from the Individual header menu | P1 |
| ZEPHYR-TODO-LUNO-UI-002 | Link Sign up and Sign in to the Luno app in a new tab | P2 |
| ZEPHYR-TODO-LUNO-UI-003 | Show the regulatory disclosure and open the risk warning | P3 |
| ZEPHYR-TODO-LUNO-UI-004 | Search for an asset and open its details | P1 |
| ZEPHYR-TODO-LUNO-UI-005 | Filter market prices by category | P2 |
| ZEPHYR-TODO-LUNO-UI-006 | Switch the asset price chart timeframe | P2 |
| ZEPHYR-TODO-API-001 | Retrieve a post and validate its response contract | P1 |
| ZEPHYR-TODO-API-002 | Filter posts by user and validate every result | P2 |
| ZEPHYR-TODO-API-003 | Return 404 for a missing post | P3 |

`ZEPHYR-TODO-*` values are unassigned placeholders, not actual Zephyr keys.
Replace them with your own test management IDs when adopting the examples.
No Zephyr service or credentials are required.

Dashboard generator checks run separately with `npm run test:dashboard`, using
Node's built-in test runner. Their `ZEPHYR-TODO-DASH-*` IDs are also unassigned
placeholders, classified as P2 / `@regression`. They cover aggregation/retries,
safe rendering and branding validation, empty/error runs, bounded history, and
file generation/input failures; they do not add application UI/API coverage.

The six UI cases run in Chromium, Firefox, and WebKit. The three API cases
run once in the `api` project: 21 executions in total, or seven for smoke.

```shell
npm run test:smoke
npm run test:regression
```
