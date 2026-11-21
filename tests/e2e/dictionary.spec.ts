import { test, expect } from './fixtures';
import { BlockCodePage } from './pages/BlockCodePage';

test.describe('Code dictionary', () => {
  test('opens from the toolbar, filters terms, and closes', async ({ page }, testInfo) => {
    const app = new BlockCodePage(page);

    await app.openEditor();
    await app.dictionaryButton.click();

    await expect(app.dictionaryDialog).toBeVisible();
    await expect(app.dictionaryCount).toHaveText(/^\d+ terms$/);
    const totalTerms = Number((await app.dictionaryCount.innerText()).split(' ')[0]);
    expect(totalTerms).toBeGreaterThan(100);

    await app.dictionarySearch.fill('sprite');

    await expect(app.dictionaryCount).toHaveText(/^\d+ of \d+ terms$/);
    const filteredCount = await app.dictionaryEntries.count();
    expect(filteredCount).toBeGreaterThan(0);
    expect(filteredCount).toBeLessThan(totalTerms);
    await expect(app.dictionaryEntries.first()).toContainText(/sprite/i);

    await app.capture(testInfo, 'dictionary-search.png');

    await app.dictionaryCloseButton.click();
    await expect(app.dictionaryDialog).not.toBeVisible();
  });

  test('F opens the dictionary and Escape closes it', async ({ page }) => {
    const app = new BlockCodePage(page);

    await app.openEditor();

    // Move focus away from toolbar buttons and form controls.
    await app.canvas.click({ position: { x: 8, y: 8 } });
    await page.keyboard.press('f');

    await expect(app.dictionaryDialog).toBeVisible();
    await expect(app.dictionaryCount).toHaveText(/^\d+ terms$/);

    await page.keyboard.press('Escape');
    await expect(app.dictionaryDialog).not.toBeVisible();
  });

  test('shows an empty state and recovers when the search is cleared', async ({ page }, testInfo) => {
    const app = new BlockCodePage(page);

    await app.openEditor();
    await app.dictionaryButton.click();
    await app.dictionarySearch.fill('zzzz-no-such-term');

    await expect(app.dictionaryEmpty).toBeVisible();
    await expect(app.dictionaryEmpty).toContainText('No matching terms');
    await expect(app.dictionaryEntries).toHaveCount(0);

    await app.capture(testInfo, 'dictionary-empty.png');

    await app.dictionaryEmpty.getByRole('button', { name: 'Clear search' }).click();

    await expect(app.dictionarySearch).toHaveValue('');
    await expect(app.dictionaryEntries.first()).toBeVisible();
  });
});
