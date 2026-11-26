import type { Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';

export class HomePage extends BasePage {
  readonly regulatoryDisclosure: Locator;
  readonly signUpLink: Locator;
  readonly signInLink: Locator;

  constructor(page: Page) {
    super(page);
    this.regulatoryDisclosure = this.footer.getByText(
      'registered as a Recognised Market Operator (Digital Asset Exchange) with the Securities Commission Malaysia',
    );
    this.signUpLink = this.headerLink('Sign up');
    this.signInLink = this.headerLink('Sign in');
  }

  async open(): Promise<void> {
    await this.goto('./');
  }

  /** Opens a product from the Individual hover menu in the header. */
  async openProduct(name: string): Promise<void> {
    await this.untilInteractive(async () => {
      await this.openHeaderMenu('Individual');
      await this.headerLink(name).click({ timeout: 5_000 });
    });
  }
}
