import type { Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';

export class TodoPage extends BasePage {
  readonly newTodo: Locator;
  readonly items: Locator;
  readonly titles: Locator;
  readonly counter: Locator;

  constructor(page: Page) {
    super(page);
    this.newTodo = page.getByPlaceholder('What needs to be done?');
    this.items = page.getByTestId('todo-item');
    this.titles = page.getByTestId('todo-title');
    this.counter = page.getByTestId('todo-count');
  }

  async addTodo(title: string): Promise<void> {
    await this.newTodo.fill(title);
    await this.newTodo.press('Enter');
  }

  item(title: string): Locator {
    return this.items.filter({
      has: this.page.getByTestId('todo-title').getByText(title, { exact: true }),
    });
  }

  async completeTodo(title: string): Promise<void> {
    await this.item(title).getByRole('checkbox').check();
  }

  async filterBy(filter: 'All' | 'Active' | 'Completed'): Promise<void> {
    await this.page.getByRole('link', { name: filter, exact: true }).click();
  }

  async editTodo(title: string, replacement: string): Promise<void> {
    const item = this.item(title);
    await item.getByTestId('todo-title').dblclick();
    const editor = this.items.getByRole('textbox');
    await editor.fill(replacement);
    await editor.press('Enter');
  }

  async clearCompleted(): Promise<void> {
    await this.page.getByRole('button', { name: 'Clear completed' }).click();
  }
}
