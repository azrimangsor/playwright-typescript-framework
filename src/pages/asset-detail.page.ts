import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './base.page';

export class AssetDetailPage extends BasePage {
  readonly timeframes: Locator;
  readonly priceChart: Locator;

  constructor(page: Page) {
    super(page);
    this.timeframes = page.getByRole('tablist', { name: 'Select chart timeframe' });
    this.priceChart = page.getByRole('img', { name: /price chart$/ });
  }

  async open(slug: string): Promise<void> {
    await this.goto(`./assets/${slug}`);
  }

  heading(assetName: string): Locator {
    return this.page.getByRole('heading', { name: assetName, exact: true, level: 4 });
  }

  timeframe(name: string): Locator {
    return this.timeframes.getByRole('tab', { name, exact: true });
  }

  async selectTimeframe(name: string): Promise<void> {
    const tab = this.timeframe(name);
    await this.untilInteractive(async () => {
      await tab.click({ timeout: 5_000 });
      await expect(tab).toHaveAttribute('aria-selected', 'true', { timeout: 2_000 });
    });
  }
}
