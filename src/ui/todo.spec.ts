import { test, expect } from '../utils/fixtures';

test.describe('TodoMVC', () => {
  test.beforeEach(async ({ pageManager }) => {
    await pageManager.todoPage.goto('./');
  });

  test('[P1] ZEPHYR-TODO-UI-001 - creates and completes a todo', {
    tag: ['@smoke', '@regression'],
  }, async ({ pageManager, testData }) => {
    const { todoPage } = pageManager;
    await todoPage.addTodo(testData.todos.first);

    await expect(todoPage.titles).toHaveText([testData.todos.first]);
    await expect(todoPage.counter).toHaveText('1 item left');

    await todoPage.completeTodo(testData.todos.first);

    await expect(todoPage.item(testData.todos.first).getByRole('checkbox')).toBeChecked();
    await expect(todoPage.counter).toHaveText('0 items left');
  });

  test('[P2] ZEPHYR-TODO-UI-002 - filters active and completed todos', {
    tag: '@regression',
  }, async ({ pageManager, testData }) => {
    const { todoPage } = pageManager;
    await todoPage.addTodo(testData.todos.first);
    await todoPage.addTodo(testData.todos.second);
    await todoPage.completeTodo(testData.todos.first);

    await todoPage.filterBy('Active');
    await expect(todoPage.titles).toHaveText([testData.todos.second]);

    await todoPage.filterBy('Completed');
    await expect(todoPage.titles).toHaveText([testData.todos.first]);

    await todoPage.filterBy('All');
    await expect(todoPage.titles).toHaveText([testData.todos.first, testData.todos.second]);
  });

  test('[P2] ZEPHYR-TODO-UI-003 - preserves todos after reload', {
    tag: '@regression',
  }, async ({ pageManager, testData }) => {
    const { todoPage } = pageManager;
    await todoPage.addTodo(testData.todos.first);
    await todoPage.completeTodo(testData.todos.first);
    await todoPage.addTodo(testData.todos.second);

    await todoPage.reload();

    await expect(todoPage.titles).toHaveText([testData.todos.first, testData.todos.second]);
    await expect(todoPage.item(testData.todos.first).getByRole('checkbox')).toBeChecked();
    await expect(todoPage.item(testData.todos.second).getByRole('checkbox')).not.toBeChecked();
  });

  test('[P2] ZEPHYR-TODO-UI-004 - edits an existing todo', {
    tag: '@regression',
  }, async ({ pageManager, testData }) => {
    const { todoPage } = pageManager;
    await todoPage.addTodo(testData.todos.first);

    await todoPage.editTodo(testData.todos.first, testData.todos.edited);

    await expect(todoPage.titles).toHaveText([testData.todos.edited]);
    await expect(todoPage.counter).toHaveText('1 item left');
  });

  test('[P2] ZEPHYR-TODO-UI-005 - clears only completed todos', {
    tag: '@regression',
  }, async ({ pageManager, testData }) => {
    const { todoPage } = pageManager;
    await todoPage.addTodo(testData.todos.first);
    await todoPage.addTodo(testData.todos.second);
    await todoPage.completeTodo(testData.todos.first);

    await todoPage.clearCompleted();

    await expect(todoPage.titles).toHaveText([testData.todos.second]);
    await expect(todoPage.counter).toHaveText('1 item left');
  });
});
