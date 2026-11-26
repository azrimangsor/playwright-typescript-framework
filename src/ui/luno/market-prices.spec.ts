import { test, expect } from '../../utils/fixtures';

test.describe('Luno market prices', () => {
  // Production pages can take ~20s to become interactive in Firefox and WebKit.
  test.describe.configure({ timeout: 90_000 });

  test.beforeEach(async ({ pageManager }) => {
    await pageManager.marketPricesPage.dismissOverlaysWhenShown();
  });

  test.describe('search', () => {
    test('[P1] ZEPHYR-TODO-LUNO-UI-004 - searches for an asset and opens its details', {
      tag: ['@smoke', '@regression'],
    }, async ({ page, pageManager, testData }) => {
      const { marketPricesPage, assetDetailPage } = pageManager;
      const { search } = testData.luno;
      await marketPricesPage.open();

      await marketPricesPage.openSearchResult(search.term, search.resultTitle, search.assetPath);

      await expect(page).toHaveURL(search.assetPath);
      await expect(assetDetailPage.heading(search.assetName)).toBeVisible();
    });
  });

  test.describe('filtering', () => {
    test('[P2] ZEPHYR-TODO-LUNO-UI-005 - filters market prices by category', {
      tag: '@regression',
    }, async ({ pageManager, testData }) => {
      const { marketPricesPage } = pageManager;
      const { category } = testData.luno;
      await marketPricesPage.open();
      await expect(marketPricesPage.assetRow(category.excludedAsset)).toBeVisible();

      await marketPricesPage.filterByCategory(category.name, category.queryValue);

      await expect(marketPricesPage.assetRow(category.excludedAsset)).toBeHidden();
      await expect(marketPricesPage.assetRows.first()).toBeVisible();
    });
  });

  test.describe('asset details', () => {
    test('[P2] ZEPHYR-TODO-LUNO-UI-006 - switches the asset price chart timeframe', {
      tag: '@regression',
    }, async ({ pageManager, testData }) => {
      const { assetDetailPage } = pageManager;
      const { chart } = testData.luno;
      await assetDetailPage.open(chart.assetSlug);
      await expect(assetDetailPage.heading(chart.assetName)).toBeVisible();

      await assetDetailPage.selectTimeframe(chart.timeframe);

      await expect(assetDetailPage.timeframe(chart.defaultTimeframe)).toHaveAttribute('aria-selected', 'false');
      await expect(assetDetailPage.priceChart).toBeVisible();
    });
  });
});
