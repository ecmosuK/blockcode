import { test as base, expect } from '@playwright/test';

type BlockCodeFixtures = {
  browserErrors: string[];
};

/**
 * Auto fixture that fails a test when the browser reports an uncaught error or
 * logs a console error. These usually mean a broken script, missing asset, or
 * unhandled promise rejection that a pure DOM assertion would miss.
 */
export const test = base.extend<BlockCodeFixtures>({
  browserErrors: [
    async ({ page }, use, testInfo) => {
      const errors: string[] = [];

      page.on('pageerror', (error) => {
        errors.push(`pageerror: ${error.message}`);
      });
      page.on('console', (message) => {
        if (message.type() === 'error') {
          errors.push(`console: ${message.text()}`);
        }
      });

      await use(errors);

      if (errors.length) {
        await testInfo.attach('browser-errors', {
          body: errors.join('\n'),
          contentType: 'text/plain'
        });
      }

      expect(errors, 'Browser errors during E2E test').toEqual([]);
    },
    { auto: true }
  ]
});

export { expect };
