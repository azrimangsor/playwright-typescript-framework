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
| ZEPHYR-TODO-UI-001 | Create and complete a todo | P1 |
| ZEPHYR-TODO-UI-002 | Filter active, completed, and all todos | P2 |
| ZEPHYR-TODO-UI-003 | Preserve todo titles and completion state after reload | P2 |
| ZEPHYR-TODO-UI-004 | Edit an existing todo | P2 |
| ZEPHYR-TODO-UI-005 | Clear completed todos without removing active todos | P2 |
| ZEPHYR-TODO-API-001 | Retrieve a post and validate its response contract | P1 |
| ZEPHYR-TODO-API-002 | Filter posts by user and validate every result | P2 |
| ZEPHYR-TODO-API-003 | Return 404 for a missing post | P3 |

`ZEPHYR-TODO-*` values are unassigned placeholders, not actual Zephyr keys.
Replace them with your own test management IDs when adopting the examples.
No Zephyr service or credentials are required.

The five UI cases run in Chromium, Firefox, and WebKit. The three API cases
run once in the `api` project: 18 executions in total, or four for smoke.

```shell
npm run test:smoke
npm run test:regression
```
