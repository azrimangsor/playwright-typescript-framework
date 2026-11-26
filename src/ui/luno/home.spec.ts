import { test, expect } from '../../utils/fixtures';

test.describe('Luno home page', () => {
  // Production pages can take ~20s to become interactive in Firefox and WebKit.
  test.describe.configure({ timeout: 90_000 });

  test.beforeEach(async ({ pageManager }) => {
    await pageManager.homePage.dismissOverlaysWhenShown();
    await pageManager.homePage.open();
  });

  test.describe('navigation', () => {
    test('[P1] ZEPHYR-TODO-LUNO-UI-001 - opens Buy and sell crypto from the Individual menu', {
      tag: ['@smoke', '@regression'],
    }, async ({ page, pageManager, testData }) => {
      await pageManager.homePage.openProduct(testData.luno.product);

      await expect(page).toHaveURL(testData.luno.buyCryptoPath);
    });

    test('[P2] ZEPHYR-TODO-LUNO-UI-002 - links account actions to the Luno app in a new tab', {
      tag: '@regression',
    }, async ({ pageManager, testData }) => {
      const { homePage } = pageManager;
      const { accountApp } = testData.luno;

      // The account app is bot-protected, so verify the hand-off without opening it.
      await expect(homePage.signUpLink).toHaveAttribute('href', accountApp.signUpUrl);
      await expect(homePage.signUpLink).toHaveAttribute('target', '_blank');
      await expect(homePage.signInLink).toHaveAttribute('href', accountApp.signInUrl);
      await expect(homePage.signInLink).toHaveAttribute('target', '_blank');
    });
  });

  test.describe('compliance', () => {
    test('[P3] ZEPHYR-TODO-LUNO-UI-003 - shows the regulatory disclosure and risk warning', {
      tag: '@regression',
    }, async ({ page, pageManager, testData }) => {
      const { homePage } = pageManager;
      await expect(homePage.regulatoryDisclosure).toBeVisible();

      await homePage.openFooterLink('Risk warning');

      await expect(page).toHaveTitle(testData.luno.riskWarningTitle);
    });
  });
});
