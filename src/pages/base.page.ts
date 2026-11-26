import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Behaviour shared by every page of the site under test: navigation, regional
 * overlays, the primary header and the footer.
 */
export class BasePage {
  readonly acceptCookiesButton: Locator;
  readonly stayOnSiteButton: Locator;
  readonly header: Locator;
  readonly footer: Locator;

  constructor(protected readonly page: Page) {
    this.acceptCookiesButton = page.getByRole('button', { name: 'Agree', exact: true });
    this.stayOnSiteButton = page.getByRole('button', { name: 'No, stay here', exact: true });
    this.header = page.getByRole('navigation').first();
    this.footer = page.getByRole('contentinfo');
  }

  async goto(url: string): Promise<void> {
    if (!url.trim()) {
      throw new Error('Navigation URL is not defined');
    }
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
  }

  async reload(): Promise<void> {
    await this.page.reload();
  }

  /**
   * The cookie banner and the "view our local site?" prompt depend on the
   * visitor's region, so dismiss them whenever they appear instead of waiting.
   */
  async dismissOverlaysWhenShown(): Promise<void> {
    for (const button of [this.acceptCookiesButton, this.stayOnSiteButton]) {
      await this.page.addLocatorHandler(button, async () => {
        await button.click();
      });
    }
  }

  headerLink(name: string): Locator {
    return this.header.getByRole('link', { name, exact: true });
  }

  /** Opens a header mega menu such as Individual, Business or Market. */
  async openHeaderMenu(name: string): Promise<void> {
    // Move away first so a retried hover fires mouseenter again.
    await this.page.mouse.move(0, 0);
    await this.header.getByText(name, { exact: true }).hover();
  }

  footerLink(name: string): Locator {
    return this.footer.getByRole('link', { name, exact: true });
  }

  async openFooterLink(name: string): Promise<void> {
    await this.untilInteractive(async () => {
      await this.footerLink(name).click({ timeout: 5_000 });
    });
  }

  /**
   * Retries an interaction until its outcome is observed. The site renders
   * server-side and ignores input until hydrated, which can take ~20s in
   * Firefox and WebKit; overlays may also close menus mid-interaction.
   */
  protected async untilInteractive(interaction: () => Promise<void>): Promise<void> {
    await expect(interaction).toPass({ intervals: [1_000, 2_000, 5_000], timeout: 45_000 });
  }
}
