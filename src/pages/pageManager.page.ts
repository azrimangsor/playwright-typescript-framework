import type { Page } from '@playwright/test';
import { AssetDetailPage } from './asset-detail.page';
import { HomePage } from './home.page';
import { MarketPricesPage } from './market-prices.page';

/** Single entry point to every page object, all sharing the test's Page. */
export class PageManager {
  readonly homePage: HomePage;
  readonly marketPricesPage: MarketPricesPage;
  readonly assetDetailPage: AssetDetailPage;

  constructor(page: Page) {
    this.homePage = new HomePage(page);
    this.marketPricesPage = new MarketPricesPage(page);
    this.assetDetailPage = new AssetDetailPage(page);
  }
}
