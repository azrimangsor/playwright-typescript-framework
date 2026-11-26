Playwright test automation instructions

Framework:

- Use Typescript for writing Playwright tests.
- Existing PLaywright tests are the source of truth for test patterns and practices.
- Follow the structure and conventions used in existing tests.
- Use the MCP server configuration defined in `.vscode/mcp.json` for running Playwright tests.
- Ensure that the MCP server is running before executing Playwright tests.
- Reuse the existing playwright.config.ts
- Reuse existing fixtures, authentication, utilities and page objects
- Do not create a second Playwright configuration file.
- Do not modify existing testes unless required to fix a verified defect

Coverage discovery:

- Use Playwright MCP to explore the application under test.
- Compare the discovered coverage with existing tests to identify gaps.
- Read relevant fixture, page objects, test data and configuration files to understand existing coverage.
- Identify the areas of the application that are covered by existing Playwright tests.
- Ensure that new tests are added for uncovered areas as needed.
- Avoid duplicating coverage for areas that are already well-tested.

Test Implementation

- Prioritize using getByRole, getByLabel, getByPlaceholder, getByText, getByTestId and other accessible queries for selecting elements.
- Avoid using brittle selectors like class names or IDs unless necessary.
- Leverage existing page objects and utilities to interact with the application.
- Write tests that are resilient to UI changes and focus on user interactions.
- Ensure that tests are readable, maintainable, and follow the patterns established in existing tests.
- Each test must be independent and repeatable.
- Do not perform destructive exploration.
- Clean up any test data or state changes made during the test to maintain test isolation.
- Avoid hardcoding test data; use fixtures and configuration files where possible.
- Ensure that tests clean up after themselves to prevent side effects on other tests.
- Use beforeEach and afterEach hooks to set up and tear down test state consistently.
- Avoid relying on the order of test execution to maintain test isolation.
- Use descriptive test names that clearly convey the purpose and expected behavior of the test.
- Avoid long and complex test names; keep them concise and focused on the specific behavior being tested.
- Use comments sparingly to explain the intent of complex test steps, but avoid redundant comments that restate the obvious.
- Put a properplaceholder for the Zypher ID for any new created test cases.
- Put a tag @smoke or @regression according to the playwright-suite-classification.md documentation
- Ensure that test tags and Zypher IDs are consistently applied to all new test cases.

Validation

For every porposed test:

- Verify that the test accurately reflects the intended user interactions and expected outcomes.
- Ensure that assertions are meaningful and validate the correct behavior of the application.
- Avoid over-asserting; focus on the critical aspects of the test scenario.
- Review test results to confirm that tests pass consistently and reliably.
- Use Playwright's built-in debugging tools to investigate and resolve test failures.
- Ensure that any test failures are addressed promptly and do not leave the test suite in a broken state.

Do not add test when no meaningful validation coverage gap is found.
