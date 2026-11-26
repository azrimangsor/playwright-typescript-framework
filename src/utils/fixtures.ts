import { test as base, expect } from '@playwright/test';
import { PageManager } from '../pages/pageManager.page';
import { demoData } from '../fixtures/demo-data';

type Fixtures = {
  pageManager: PageManager;
  testData: typeof demoData;
};

export const test = base.extend<Fixtures>({
  pageManager: async ({ page }, use) => {
    await use(new PageManager(page));
  },
  testData: async ({}, use) => {
    await use(demoData);
  },
});

export { expect };
