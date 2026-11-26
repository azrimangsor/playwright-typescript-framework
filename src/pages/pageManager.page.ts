import type { Page } from '@playwright/test';
import { TodoPage } from './todo.page';

export class PageManager {
  readonly todoPage: TodoPage;

  constructor(page: Page) {
    this.todoPage = new TodoPage(page);
  }
}
