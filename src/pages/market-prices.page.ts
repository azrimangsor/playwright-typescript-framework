import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './base.page';

export class MarketPricesPage extends BasePage {
  readonly heading: Locator;
  readonly searchButton: Locator;
  readonly searchDialog: Locator;
  readonly searchInput: Locator;
  readonly assetRows: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Market prices' });
    this.searchButton = page.getByRole('button', { name: 'Search Icon' });
    this.searchDialog = page.getByRole('dialog').filter({ has: page.getByRole('search') });
    this.searchInput = this.searchDialog.getByRole('textbox', { name: 'Search...' });
    // Price rows have no row role; each one is a link to its asset detail page.
    // Hidden copies exist for other breakpoints, so keep only the rendered ones.
    this.assetRows = page.locator('a[href^="./assets/"]').filter({ visible: true });
  }

  async open(category?: string): Promise<void> {
    await this.goto(category ? `./assets?asset-category=${category}` : './assets');
    await expect(this.heading).toBeVisible();
  }

  assetRow(name: string): Locator {
    return this.assetRows.filter({ has: this.page.getByText(name, { exact: true }) });
  }

  searchResult(title: string): Locator {
    return this.searchDialog.getByRole('link').filter({
      has: this.page.getByRole('heading', { name: title, exact: true }),
    });
  }

  /** Searches for an asset and opens the matching result's detail page. */
  async openSearchResult(term: string, title: string, assetPath: RegExp): Promise<void> {
    await this.untilInteractive(async () => {
      if (!assetPath.test(this.page.url())) {
        await this.search(term);
        await this.searchResult(title).click({ timeout: 5_000 });
      }
      await expect(this.page).toHaveURL(assetPath, { timeout: 5_000 });
    });
  }

  private async search(term: string): Promise<void> {
    if (!(await this.searchInput.isVisible())) {
      await this.searchButton.click({ timeout: 5_000 });
    }
    await this.searchInput.fill(term, { timeout: 2_000 });
    await expect(this.searchDialog.getByRole('link').first()).toBeVisible({ timeout: 8_000 });
  }

  async filterByCategory(name: string, queryValue: string): Promise<void> {
    const category = this.page.getByText(name, { exact: true }).filter({ visible: true }).first();
    await this.untilInteractive(async () => {
      await category.click({ timeout: 5_000 });
      await expect(this.page).toHaveURL(new RegExp(`asset-category=${queryValue}`), { timeout: 2_000 });
    });
  }
}
